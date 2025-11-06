// バッチ処理管理ユーティリティ（サーバーサイド専用）
// supabaseAdminを使用するためサーバーサイドでのみ実行可能

import { supabaseAdmin } from './supabase-admin'
import type { 
  DailyAnalyticsBatchLog
} from './database-types-official'
import type {
  BatchProcessType,
  BatchExecutionResult,
  BatchScheduleConfig,
  BatchFilterConditions
} from './batch-management-types'

/**
 * バッチ実行可能性チェック
 */
export async function canExecuteBatch(
  processType: BatchProcessType,
  targetDate?: string
): Promise<{ canExecute: boolean; reason?: string; existingLog?: DailyAnalyticsBatchLog }> {
  try {
    const checkDate = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // 同じ日付・処理タイプで実行中または成功したバッチをチェック
    const { data: existingLogs, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .eq('process_type', processType)
      .eq('process_date', checkDate)
      .in('status', ['running', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('❌ Error checking batch execution status:', error)
      return { canExecute: false, reason: 'データベースエラー' }
    }

    if (existingLogs && existingLogs.length > 0) {
      const existingLog = existingLogs[0]
      if (existingLog.status === 'running') {
        return { 
          canExecute: false, 
          reason: '同じ処理が実行中です',
          existingLog 
        }
      }
      if (existingLog.status === 'completed') {
        return { 
          canExecute: false, 
          reason: '既に完了済みです',
          existingLog 
        }
      }
    }

    // 前回失敗から一定時間経過しているかチェック（再実行制限）
    const { data: failedLogs, error: failedError } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .eq('process_type', processType)
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30分以内
      .order('created_at', { ascending: false })
      .limit(1)

    if (failedError) {
      console.error('❌ Error checking failed batch logs:', error)
      return { canExecute: false, reason: 'データベースエラー' }
    }

    if (failedLogs && failedLogs.length > 0) {
      return { 
        canExecute: false, 
        reason: '30分以内に失敗があります。時間をおいて再実行してください'
      }
    }

    return { canExecute: true }

  } catch (error) {
    console.error('❌ Error in canExecuteBatch:', error)
    return { canExecute: false, reason: 'システムエラー' }
  }
}

/**
 * バッチログの記録開始
 */
export async function startBatchLog(
  processType: BatchProcessType,
  targetDate?: string,
  _config?: Partial<BatchScheduleConfig>
): Promise<{ success: boolean; batch_log_id?: number; error?: string }> {
  try {
    const logEntry = {
      process_type: processType,
      process_date: targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'running',
      started_at: new Date().toISOString(),
      processed_users: 0
    }

    const { data, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .insert(logEntry)
      .select('id')
      .single()

    if (error) {
      console.error('❌ Error starting batch log:', error)
      return { success: false, error: error.message }
    }

    return { success: true, batch_log_id: data.id }

  } catch (error) {
    console.error('❌ Error in startBatchLog:', error)
    return { success: false, error: 'システムエラー' }
  }
}

/**
 * バッチログの更新（進行中）
 */
export async function updateBatchProgress(
  batchLogId: number,
  processedUsers: number,
  _warnings: string[] = []
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .update({
        processed_users: processedUsers,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchLogId)

    if (error) {
      console.error('❌ Error updating batch progress:', error)
      return false
    }

    return true

  } catch (error) {
    console.error('❌ Error in updateBatchProgress:', error)
    return false
  }
}

/**
 * バッチログの完了
 */
export async function completeBatchLog(
  batchLogId: number,
  result: Omit<BatchExecutionResult, 'batch_log_id'>
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .update({
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        processed_users: result.processed_users,
        error_message: result.error_message,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchLogId)

    if (error) {
      console.error('❌ Error completing batch log:', error)
      return false
    }

    return true

  } catch (error) {
    console.error('❌ Error in completeBatchLog:', error)
    return false
  }
}

/**
 * バッチ履歴の取得（フィルター付き）
 */
export async function getBatchHistory(
  conditions: BatchFilterConditions = {},
  limit: number = 100
): Promise<{ logs: DailyAnalyticsBatchLog[]; error?: string }> {
  try {
    let query = supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')

    // フィルター条件を適用
    if (conditions.process_type) {
      query = query.eq('process_type', conditions.process_type)
    }

    if (conditions.status) {
      query = query.eq('status', conditions.status)
    }

    if (conditions.days) {
      const daysAgo = new Date(Date.now() - conditions.days * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', daysAgo)
    }

    const { data: logs, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ Error fetching batch history:', error)
      return { logs: [], error: error.message }
    }

    return { logs: logs || [] }

  } catch (error) {
    console.error('❌ Error in getBatchHistory:', error)
    return { logs: [], error: 'システムエラー' }
  }
}

/**
 * 実行中バッチの監視
 */
export async function getRunningBatches(): Promise<{
  batches: DailyAnalyticsBatchLog[]
  error?: string
}> {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .eq('status', 'running')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching running batches:', error)
      return { batches: [], error: error.message }
    }

    return { batches: logs || [] }

  } catch (error) {
    console.error('❌ Error in getRunningBatches:', error)
    return { batches: [], error: 'システムエラー' }
  }
}

/**
 * バッチ統計の取得
 */
export interface BatchStats {
  total_executions: number
  total_batches: number // 下位互換性のため残す
  completed: number
  failed: number
  running: number
  success_rate: number
  avg_processing_time: number
  avg_processing_time_seconds: number
  avg_processed_users: number
  last_successful_run?: string
}

export async function getBatchStats(
  processType?: BatchProcessType,
  days: number = 30
): Promise<{ stats: BatchStats; error?: string }> {
  try {
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    
    let query = supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .gte('created_at', daysAgo)

    if (processType) {
      query = query.eq('process_type', processType)
    }

    const { data: recentLogs, error } = await query

    if (error) {
      console.error('❌ Error fetching batch stats:', error)
      return { 
        stats: {
          total_executions: 0,
          total_batches: 0,
          completed: 0,
          failed: 0,
          running: 0,
          success_rate: 0,
          avg_processing_time: 0,
          avg_processing_time_seconds: 0,
          avg_processed_users: 0
        }, 
        error: error.message 
      }
    }

    const logs = recentLogs || []
    const total = logs.length
    const completed = logs.filter(log => log.status === 'completed').length
    const failed = logs.filter(log => log.status === 'failed').length
    const running = logs.filter(log => log.status === 'running').length
    
    const successRate = total > 0 ? (completed / total) * 100 : 0
    
    const completedLogs = logs.filter(log => log.status === 'completed' && log.completed_at && log.started_at)
    const avgTime = completedLogs.length > 0 
      ? completedLogs.reduce((sum, log) => {
          if (log.completed_at && log.started_at) {
            const duration = new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()
            return sum + (duration / 1000) // 秒に変換
          }
          return sum
        }, 0) / completedLogs.length
      : 0

    // 処理ユーザー数の平均計算
    const avgProcessedUsers = total > 0 
      ? Math.round(logs.reduce((sum, log) => sum + (log.processed_users || 0), 0) / total)
      : 0

    const lastSuccess = logs
      .filter(log => log.status === 'completed')
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())[0]

    return {
      stats: {
        total_executions: total,
        total_batches: total, // 下位互換性
        completed,
        failed,
        running,
        success_rate: Math.round(successRate * 100) / 100,
        avg_processing_time: Math.round(avgTime * 100) / 100,
        avg_processing_time_seconds: Math.round(avgTime * 100) / 100,
        avg_processed_users: avgProcessedUsers,
        last_successful_run: lastSuccess?.created_at || undefined
      }
    }

  } catch (error) {
    console.error('❌ Error in getBatchStats:', error)
    return { 
      stats: {
        total_executions: 0,
        total_batches: 0,
        completed: 0,
        failed: 0,
        running: 0,
        success_rate: 0,
        avg_processing_time: 0,
        avg_processing_time_seconds: 0,
        avg_processed_users: 0
      }, 
      error: 'システムエラー' 
    }
  }
}