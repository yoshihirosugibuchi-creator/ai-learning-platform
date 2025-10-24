// バッチ処理管理ユーティリティ
// 重複防止、スケジューリング、監視機能

import { supabaseAdmin } from './supabase-admin'
import type { 
  DailyAnalyticsBatchLog
} from './database-types-official'

// バッチステータス定数
export const BATCH_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const

export type BatchStatus = typeof BATCH_STATUS[keyof typeof BATCH_STATUS]

// バッチ処理タイプ定数（APIと共通）
export const BATCH_PROCESS_TYPES = {
  QUALITY_SCORE: 'quality_score',
  PEAK_HOUR: 'peak_hour', 
  STUDY_TIME: 'study_time_minutes',
  ALL: 'all'
} as const

export type BatchProcessType = typeof BATCH_PROCESS_TYPES[keyof typeof BATCH_PROCESS_TYPES]

// バッチ実行結果の型定義
export interface BatchExecutionResult {
  success: boolean
  batch_log_id?: number
  processed_users: number
  total_time_seconds: number
  error_message?: string
  warnings: string[]
}

// バッチスケジュール設定
export interface BatchScheduleConfig {
  process_type: BatchProcessType
  target_date?: string  // 未指定時は前日
  analysis_period?: number
  auto_retry?: boolean
  max_retries?: number
}

/**
 * バッチ実行可能性チェック
 */
export async function canExecuteBatch(
  processDate: string,
  processType: BatchProcessType,
  forceReprocess: boolean = false
): Promise<{
  canExecute: boolean
  reason?: string
  existingLog?: DailyAnalyticsBatchLog
}> {
  
  try {
    // 1. 同日同タイプの実行状況確認
    const { data: existingLogs, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .eq('process_date', processDate)
      .eq('process_type', processType)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return {
        canExecute: false,
        reason: `実行状況確認エラー: ${error.message}`
      }
    }

    const latestLog = existingLogs?.[0]

    // 2. 完了済みの場合
    if (latestLog?.status === BATCH_STATUS.COMPLETED && !forceReprocess) {
      return {
        canExecute: false,
        reason: '同日・同タイプの処理が既に完了済みです',
        existingLog: latestLog
      }
    }

    // 3. 実行中の場合
    if (latestLog?.status === BATCH_STATUS.RUNNING) {
      // タイムアウトチェック（30分以上経過している場合は強制終了可能）
      const startedAt = new Date(latestLog.started_at)
      const now = new Date()
      const elapsedMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60)
      
      if (elapsedMinutes > 30) {
        console.warn(`[バッチ管理] タイムアウト検出: ${latestLog.id}, 経過時間: ${elapsedMinutes}分`)
        
        // タイムアウトしたログを失敗状態に更新
        await supabaseAdmin
          .from('daily_analytics_batch_log')
          .update({
            status: BATCH_STATUS.FAILED,
            completed_at: new Date().toISOString(),
            error_message: `タイムアウト (${elapsedMinutes}分経過)`,
            updated_at: new Date().toISOString()
          })
          .eq('id', latestLog.id)
        
        return {
          canExecute: true,
          reason: 'タイムアウトした前回実行を終了して新規実行可能'
        }
      }
      
      return {
        canExecute: false,
        reason: '同タイプの処理が実行中です',
        existingLog: latestLog
      }
    }

    // 4. 失敗の場合は再実行可能
    if (latestLog?.status === BATCH_STATUS.FAILED) {
      return {
        canExecute: true,
        reason: '前回実行が失敗のため再実行可能',
        existingLog: latestLog
      }
    }

    // 5. 実行可能
    return {
      canExecute: true,
      reason: forceReprocess ? '強制再実行' : '新規実行'
    }

  } catch (error) {
    return {
      canExecute: false,
      reason: `実行可能性チェックエラー: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * バッチ実行リクエスト
 */
export async function requestBatchExecution(
  config: BatchScheduleConfig,
  authToken: string
): Promise<BatchExecutionResult> {
  
  const targetDate = config.target_date || getPreviousDateJST()
  
  try {
    // 実行可能性チェック
    const canExecute = await canExecuteBatch(
      targetDate,
      config.process_type,
      false // 強制実行は手動で指定
    )

    if (!canExecute.canExecute) {
      return {
        success: false,
        processed_users: 0,
        total_time_seconds: 0,
        error_message: canExecute.reason,
        warnings: []
      }
    }

    // バッチAPI呼び出し
    const response = await fetch('/api/admin/daily-analytics-batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        process_date: targetDate,
        process_type: config.process_type,
        analysis_period: config.analysis_period || 30,
        force_reprocess: false
      })
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        processed_users: 0,
        total_time_seconds: 0,
        error_message: result.error || `HTTP ${response.status}`,
        warnings: []
      }
    }

    return {
      success: result.success,
      batch_log_id: result.batch_log_id,
      processed_users: result.processed_users,
      total_time_seconds: result.total_time_seconds,
      error_message: result.errors?.length > 0 ? result.errors.join('; ') : undefined,
      warnings: result.errors || []
    }

  } catch (error) {
    return {
      success: false,
      processed_users: 0,
      total_time_seconds: 0,
      error_message: `バッチ実行リクエストエラー: ${error instanceof Error ? error.message : String(error)}`,
      warnings: []
    }
  }
}

/**
 * バッチ履歴取得
 */
export async function getBatchHistory(
  filters?: {
    process_type?: BatchProcessType
    status?: BatchStatus
    days?: number
    limit?: number
  }
): Promise<{
  success: boolean
  logs: DailyAnalyticsBatchLog[]
  error_message?: string
}> {
  
  try {
    let query = supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.process_type) {
      query = query.eq('process_type', filters.process_type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.days) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - filters.days)
      query = query.gte('created_at', cutoffDate.toISOString())
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    } else {
      query = query.limit(100) // デフォルト制限
    }

    const { data: logs, error } = await query

    if (error) {
      return {
        success: false,
        logs: [],
        error_message: `履歴取得エラー: ${error.message}`
      }
    }

    return {
      success: true,
      logs: logs || []
    }

  } catch (error) {
    return {
      success: false,
      logs: [],
      error_message: `履歴取得エラー: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * バッチ処理統計取得
 */
export async function getBatchStatistics(days: number = 30): Promise<{
  success: boolean
  statistics?: {
    total_executions: number
    successful_executions: number
    failed_executions: number
    success_rate: number
    avg_processing_time_seconds: number
    avg_processed_users: number
    process_type_breakdown: Record<string, number>
    recent_errors: string[]
  }
  error_message?: string
}> {
  
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: logs, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error_message: `統計取得エラー: ${error.message}`
      }
    }

    if (!logs || logs.length === 0) {
      return {
        success: true,
        statistics: {
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          success_rate: 0,
          avg_processing_time_seconds: 0,
          avg_processed_users: 0,
          process_type_breakdown: {},
          recent_errors: []
        }
      }
    }

    // 統計計算
    const totalExecutions = logs.length
    const successfulExecutions = logs.filter(log => log.status === BATCH_STATUS.COMPLETED).length
    const failedExecutions = logs.filter(log => log.status === BATCH_STATUS.FAILED).length
    const successRate = Math.round((successfulExecutions / totalExecutions) * 100)

    // 完了したログのみで処理時間計算
    const completedLogs = logs.filter(log => 
      log.status === BATCH_STATUS.COMPLETED && 
      log.started_at && 
      log.completed_at
    )

    const avgProcessingTime = completedLogs.length > 0
      ? completedLogs.reduce((sum, log) => {
          const start = new Date(log.started_at!).getTime()
          const end = new Date(log.completed_at!).getTime()
          return sum + ((end - start) / 1000)
        }, 0) / completedLogs.length
      : 0

    const avgProcessedUsers = completedLogs.length > 0
      ? completedLogs.reduce((sum, log) => sum + (log.processed_users || 0), 0) / completedLogs.length
      : 0

    // プロセスタイプ別集計
    const processTypeBreakdown: Record<string, number> = {}
    logs.forEach(log => {
      processTypeBreakdown[log.process_type] = (processTypeBreakdown[log.process_type] || 0) + 1
    })

    // 最近のエラー取得
    const recentErrors = logs
      .filter(log => log.status === BATCH_STATUS.FAILED && log.error_message)
      .slice(0, 5)
      .map(log => `${log.process_date} ${log.process_type}: ${log.error_message}`)

    return {
      success: true,
      statistics: {
        total_executions: totalExecutions,
        successful_executions: successfulExecutions,
        failed_executions: failedExecutions,
        success_rate: successRate,
        avg_processing_time_seconds: Math.round(avgProcessingTime),
        avg_processed_users: Math.round(avgProcessedUsers),
        process_type_breakdown: processTypeBreakdown,
        recent_errors: recentErrors
      }
    }

  } catch (error) {
    return {
      success: false,
      error_message: `統計計算エラー: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 自動バッチスケジューリング（日次実行用）
 */
export async function scheduleAutoBatch(
  authToken: string,
  processTypes: BatchProcessType[] = [BATCH_PROCESS_TYPES.ALL]
): Promise<BatchExecutionResult[]> {
  
  const results: BatchExecutionResult[] = []
  const targetDate = getPreviousDateJST()

  console.log(`[自動バッチ] ${targetDate} の処理開始`)

  for (const processType of processTypes) {
    console.log(`[自動バッチ] プロセスタイプ: ${processType}`)
    
    const result = await requestBatchExecution({
      process_type: processType,
      target_date: targetDate,
      analysis_period: 30,
      auto_retry: true,
      max_retries: 2
    }, authToken)

    results.push(result)

    if (!result.success) {
      console.error(`[自動バッチ] ${processType} 失敗:`, result.error_message)
    } else {
      console.log(`[自動バッチ] ${processType} 成功: ${result.processed_users}人処理`)
    }

    // 連続実行時の負荷軽減
    if (processTypes.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  return results
}

/**
 * 前日日付取得（JST）
 */
function getPreviousDateJST(): string {
  const now = new Date()
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  jstNow.setDate(jstNow.getDate() - 1)
  return jstNow.toISOString().split('T')[0]
}

/**
 * バッチ処理状況の監視
 */
export async function monitorBatchHealth(): Promise<{
  status: 'healthy' | 'warning' | 'critical'
  message: string
  details: {
    stuck_processes: number
    recent_failures: number
    last_successful_run?: string
  }
}> {
  
  try {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 直近24時間のログ取得
    const { data: recentLogs, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      return {
        status: 'critical',
        message: `監視データ取得エラー: ${error.message}`,
        details: { stuck_processes: 0, recent_failures: 0 }
      }
    }

    // スタックしたプロセス検出（30分以上実行中）
    const stuckProcesses = recentLogs?.filter(log => {
      if (log.status !== BATCH_STATUS.RUNNING) return false
      const startedAt = new Date(log.started_at)
      const elapsedMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60)
      return elapsedMinutes > 30
    }).length || 0

    // 直近の失敗数
    const recentFailures = recentLogs?.filter(log => 
      log.status === BATCH_STATUS.FAILED
    ).length || 0

    // 最後の成功実行
    const lastSuccessfulLog = recentLogs?.find(log => 
      log.status === BATCH_STATUS.COMPLETED
    )

    // 健康状態判定
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    let message = 'バッチ処理は正常に動作しています'

    if (stuckProcesses > 0) {
      status = 'critical'
      message = `${stuckProcesses}個のプロセスが停止している可能性があります`
    } else if (recentFailures > 3) {
      status = 'warning'
      message = `直近24時間で${recentFailures}回の失敗が発生しています`
    } else if (!lastSuccessfulLog) {
      status = 'warning'
      message = '直近24時間で成功した実行がありません'
    }

    return {
      status,
      message,
      details: {
        stuck_processes: stuckProcesses,
        recent_failures: recentFailures,
        last_successful_run: lastSuccessfulLog?.completed_at || undefined
      }
    }

  } catch (error) {
    return {
      status: 'critical',
      message: `監視機能エラー: ${error instanceof Error ? error.message : String(error)}`,
      details: { stuck_processes: 0, recent_failures: 0 }
    }
  }
}