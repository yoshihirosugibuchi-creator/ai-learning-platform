// 日次分析バッチ処理API
// 学習品質スコア・ピーク時間の自動計算とdaily_xp_records更新

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isSystemAdmin } from '@/lib/auth-helpers'
import { 
  calculateLearningQualityScore
} from '@/lib/learning-quality-calculator'
import { 
  parseHourlyEfficiencyData,
  getPeakStudyHour,
  getStudyTimeMinutes 
} from '@/lib/hourly-efficiency'
import type { 
  DailyXPRecord,
  DailyAnalyticsBatchLog,
  DailyAnalyticsBatchLogInsert 
} from '@/lib/database-types-official'

// バッチ処理タイプ定数
export const BATCH_PROCESS_TYPES = {
  QUALITY_SCORE: 'quality_score',
  PEAK_HOUR: 'peak_hour',
  STUDY_TIME: 'study_time_minutes',
  ALL: 'all'
} as const

type BatchProcessType = typeof BATCH_PROCESS_TYPES[keyof typeof BATCH_PROCESS_TYPES]

// バッチ処理設定
const BATCH_CONFIG = {
  MAX_CONCURRENT_USERS: 50,      // 同時処理ユーザー数
  BATCH_SIZE: 10,                // 1回のDBアクセスでの処理件数
  TIMEOUT_MINUTES: 30,           // タイムアウト時間
  DEFAULT_ANALYSIS_PERIOD: 30    // デフォルト分析期間（日）
} as const

/**
 * POST /api/admin/daily-analytics-batch
 * 日次分析バッチ処理の実行
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authorization Bearer認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 2. 認証方式の判定（ユーザートークン vs サービスロールキー）
    let userId = null
    let isServiceRole = false
    
    // サービスロールキーまたはシステム認証トークンかどうかチェック
    if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('[バッチAPI] ✅ サービスロールキー認証成功')
      isServiceRole = true
    } else if (token === process.env.SYSTEM_AUTH_TOKEN) {
      console.log('[バッチAPI] ✅ システム認証トークン認証成功')
      isServiceRole = true
    } else {
      // ユーザートークンとして認証を試行
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      
      if (authError || !user) {
        return NextResponse.json(
          { error: '認証に失敗しました: 有効なユーザートークン、サービスロールキー、またはシステム認証トークンが必要です' },
          { status: 401 }
        )
      }
      
      userId = user.id
    }

    // 3. システム管理者権限チェック（ユーザートークンの場合のみ）
    if (!isServiceRole) {
      const hasAdminPermission = await isSystemAdmin(userId!)
      if (!hasAdminPermission) {
        return NextResponse.json(
          { error: 'システム管理者権限が必要です' },
          { status: 403 }
        )
      }
    }

    // 4. リクエストパラメータ解析
    const body = await request.json()
    const {
      process_date = new Date().toISOString().split('T')[0], // YYYY-MM-DD
      process_type = BATCH_PROCESS_TYPES.ALL,
      force_reprocess = false,
      user_ids = null, // 特定ユーザーのみ処理（nullで全ユーザー）
      analysis_period = BATCH_CONFIG.DEFAULT_ANALYSIS_PERIOD
    } = body

    console.log(`[日次分析バッチ] 開始: ${process_date}, タイプ: ${process_type}`)

    // 5. 重複実行チェック
    console.log(`[日次分析バッチ] 重複チェック開始: process_date=${process_date}, process_type=${process_type}, force_reprocess=${force_reprocess}`)
    if (!force_reprocess) {
      const duplicateCheck = await checkDuplicateExecution(process_date, process_type)
      console.log(`[日次分析バッチ] 重複チェック結果:`, duplicateCheck)
      
      if (duplicateCheck.isDuplicate) {
        console.log('[日次分析バッチ] ⚠️ 重複実行検知 - 既に処理済み - 409エラーレスポンス送信')
        return NextResponse.json({
          success: false,
          error: '同日・同タイプの処理が既に実行済みです',
          message: '既に処理完了しています。強制再処理にチェックを入れて実行してください。',
          existing_log: duplicateCheck.existingLog,
          duplicate_execution: true,
          processed_users: duplicateCheck.existingLog?.processed_users || 0,
          total_time_seconds: 0
        }, { status: 409 }) // 409 Conflict - 重複実行
      } else {
        console.log('[日次分析バッチ] ✅ 重複なし - 処理続行')
      }
    } else {
      console.log('[日次分析バッチ] 🔄 強制再処理モード - 重複チェックスキップ')
    }

    // 6. バッチログエントリ作成（force_reprocessの場合は既存ログ削除）
    if (force_reprocess) {
      await deleteExistingBatchLogs(process_date, process_type)
    }
    
    const batchLogId = await createBatchLogEntry({
      process_date,
      process_type,
      force_reprocess
    })

    // 7. バッチ処理実行
    const result = await executeBatchProcess({
      batchLogId,
      process_date,
      process_type: process_type as BatchProcessType,
      user_ids,
      analysis_period
    })

    return NextResponse.json({
      success: true,
      message: 'バッチ処理が完了しました',
      batch_log_id: batchLogId,
      processed_users: result.processedUsers,
      total_time_seconds: result.totalTimeSeconds,
      errors: result.errors
    })

  } catch (error) {
    console.error('日次分析バッチ処理エラー:', error)
    return NextResponse.json(
      { 
        error: '日次分析バッチ処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/daily-analytics-batch
 * バッチ処理履歴の取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（POST と同様）
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    const hasAdminPermission = await isSystemAdmin(user.id)
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: 'システム管理者権限が必要です' },
        { status: 403 }
      )
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const process_type = searchParams.get('process_type')
    const status = searchParams.get('status')

    // バッチログ履歴取得
    let query = supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (process_type) {
      query = query.eq('process_type', process_type)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: batchLogs, error } = await query

    if (error) {
      throw new Error(`バッチログ取得エラー: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      batch_logs: batchLogs,
      total_count: batchLogs?.length || 0
    })

  } catch (error) {
    console.error('バッチログ取得エラー:', error)
    return NextResponse.json(
      { error: 'バッチログ取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 重複実行チェック
 */
async function checkDuplicateExecution(
  processDate: string, 
  processType: string
): Promise<{ isDuplicate: boolean; existingLog?: DailyAnalyticsBatchLog }> {
  
  const { data: existingLog, error } = await supabaseAdmin
    .from('daily_analytics_batch_log')
    .select('*')
    .eq('process_date', processDate)
    .eq('process_type', processType)
    .eq('status', 'completed')
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`重複チェックエラー: ${error.message}`)
  }

  return {
    isDuplicate: !!existingLog,
    existingLog: existingLog || undefined
  }
}

/**
 * バッチログエントリ作成
 */
async function createBatchLogEntry(params: {
  process_date: string
  process_type: string
  force_reprocess: boolean
}): Promise<number> {
  
  const logEntry: DailyAnalyticsBatchLogInsert = {
    process_date: params.process_date,
    process_type: params.process_type,
    status: 'running',
    started_at: new Date().toISOString(),
    force_reprocess: params.force_reprocess,
    processed_users: 0
  }

  const { data, error } = await supabaseAdmin
    .from('daily_analytics_batch_log')
    .insert(logEntry)
    .select('id')
    .single()

  if (error) {
    throw new Error(`バッチログ作成エラー: ${error.message}`)
  }

  return data.id
}

/**
 * バッチ処理メイン実行
 */
async function executeBatchProcess(params: {
  batchLogId: number
  process_date: string
  process_type: BatchProcessType
  user_ids?: string[] | null
  analysis_period: number
}): Promise<{
  processedUsers: number
  totalTimeSeconds: number
  errors: string[]
}> {
  
  const startTime = Date.now()
  let processedUsers = 0
  const errors: string[] = []

  try {
    // 処理対象ユーザーの取得
    const targetUsers = await getTargetUsers(params.user_ids, params.process_date)
    console.log(`[バッチ] 処理対象ユーザー: ${targetUsers.length}人`)

    // バッチサイズごとに処理
    for (let i = 0; i < targetUsers.length; i += BATCH_CONFIG.BATCH_SIZE) {
      const batchUsers = targetUsers.slice(i, i + BATCH_CONFIG.BATCH_SIZE)
      
      try {
        await processBatch({
          users: batchUsers,
          process_date: params.process_date,
          process_type: params.process_type,
          analysis_period: params.analysis_period
        })
        
        processedUsers += batchUsers.length
        
        // 進捗更新
        await updateBatchProgress(params.batchLogId, processedUsers)
        
        console.log(`[バッチ] 処理済み: ${processedUsers}/${targetUsers.length}`)
        
      } catch (batchError) {
        const errorMsg = `バッチ処理エラー (ユーザー ${i}-${i + batchUsers.length - 1}): ${batchError}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
      
      // 過負荷防止のため短時間待機
      if (i + BATCH_CONFIG.BATCH_SIZE < targetUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // 完了状態に更新
    await completeBatchLog(params.batchLogId, processedUsers, errors)
    
    const totalTimeSeconds = Math.round((Date.now() - startTime) / 1000)
    console.log(`[バッチ] 完了: ${processedUsers}人処理, ${totalTimeSeconds}秒`)

    return {
      processedUsers,
      totalTimeSeconds,
      errors
    }

  } catch (error) {
    // 失敗状態に更新
    await failBatchLog(params.batchLogId, processedUsers, error instanceof Error ? error.message : String(error))
    throw error
  }
}

/**
 * 処理対象ユーザーの取得
 */
async function getTargetUsers(userIds?: string[] | null, processDate?: string): Promise<string[]> {
  if (userIds && userIds.length > 0) {
    return userIds
  }

  if (!processDate) {
    throw new Error('処理日が指定されていません')
  }

  // 指定日にアクティビティがあったユーザーを取得
  const { data: activeUsers, error } = await supabaseAdmin
    .from('daily_xp_records')
    .select('user_id')
    .eq('date', processDate)
    .order('user_id')

  if (error) {
    throw new Error(`アクティブユーザー取得エラー: ${error.message}`)
  }

  return [...new Set(activeUsers?.map(record => record.user_id) || [])]
}

/**
 * バッチ処理実行（ユーザーグループ単位）
 */
async function processBatch(params: {
  users: string[]
  process_date: string
  process_type: BatchProcessType
  analysis_period: number
}): Promise<void> {
  
  const updates: Array<{
    user_id: string
    date: string
    data: Partial<DailyXPRecord>
  }> = []

  // 各ユーザーのデータ処理
  for (const userId of params.users) {
    try {
      const updateData: Partial<DailyXPRecord> = {}

      // 処理タイプ別の計算実行
      if (params.process_type === BATCH_PROCESS_TYPES.ALL || 
          params.process_type === BATCH_PROCESS_TYPES.QUALITY_SCORE) {
        
        const qualityScore = await calculateLearningQualityScore(
          userId, 
          params.process_date, 
          params.analysis_period
        )
        updateData.learning_quality_score = qualityScore.total_score
      }

      if (params.process_type === BATCH_PROCESS_TYPES.ALL ||
          params.process_type === BATCH_PROCESS_TYPES.PEAK_HOUR ||
          params.process_type === BATCH_PROCESS_TYPES.STUDY_TIME) {
        
        // hourly_efficiency_data から情報取得
        const { data: dailyRecord } = await supabaseAdmin
          .from('daily_xp_records')
          .select('hourly_efficiency_data')
          .eq('user_id', userId)
          .eq('date', params.process_date)
          .single()

        if (dailyRecord?.hourly_efficiency_data) {
          const hourlyData = parseHourlyEfficiencyData(dailyRecord.hourly_efficiency_data)
          
          if (params.process_type === BATCH_PROCESS_TYPES.ALL || 
              params.process_type === BATCH_PROCESS_TYPES.PEAK_HOUR) {
            const peakHour = getPeakStudyHour(hourlyData)
            updateData.peak_study_hour = peakHour
          }
          
          if (params.process_type === BATCH_PROCESS_TYPES.ALL || 
              params.process_type === BATCH_PROCESS_TYPES.STUDY_TIME) {
            updateData.study_time_minutes = getStudyTimeMinutes(hourlyData)
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        updates.push({
          user_id: userId,
          date: params.process_date,
          data: updateData
        })
      }

    } catch (userError) {
      console.error(`ユーザー ${userId} の処理エラー:`, userError)
    }
  }

  // バッチアップデート実行
  if (updates.length > 0) {
    await executeBatchUpdate(updates)
  }
}

/**
 * バッチアップデート実行
 */
async function executeBatchUpdate(updates: Array<{
  user_id: string
  date: string
  data: Partial<DailyXPRecord>
}>): Promise<void> {
  
  for (const update of updates) {
    const { error } = await supabaseAdmin
      .from('daily_xp_records')
      .update(update.data)
      .eq('user_id', update.user_id)
      .eq('date', update.date)

    if (error) {
      console.error(`更新エラー (${update.user_id}):`, error.message)
    }
  }
}

/**
 * バッチ進捗更新
 */
async function updateBatchProgress(batchLogId: number, processedUsers: number): Promise<void> {
  await supabaseAdmin
    .from('daily_analytics_batch_log')
    .update({
      processed_users: processedUsers,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchLogId)
}

/**
 * バッチログ完了
 */
async function completeBatchLog(batchLogId: number, processedUsers: number, errors: string[]): Promise<void> {
  await supabaseAdmin
    .from('daily_analytics_batch_log')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processed_users: processedUsers,
      error_message: errors.length > 0 ? errors.join('; ') : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchLogId)
}

/**
 * バッチログ失敗
 */
async function failBatchLog(batchLogId: number, processedUsers: number, errorMessage: string): Promise<void> {
  await supabaseAdmin
    .from('daily_analytics_batch_log')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      processed_users: processedUsers,
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('id', batchLogId)
}

/**
 * 既存バッチログ削除（force_reprocess用）
 */
async function deleteExistingBatchLogs(processDate: string, processType: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('daily_analytics_batch_log')
    .delete()
    .eq('process_date', processDate)
    .eq('process_type', processType)

  if (error) {
    console.error(`既存バッチログ削除エラー: ${error.message}`)
    // エラーがあっても処理は続行（ログが存在しない場合など）
  } else {
    console.log(`既存バッチログ削除完了: ${processDate}, ${processType}`)
  }
}