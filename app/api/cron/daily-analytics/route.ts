// Vercel Cron: 日次分析バッチの自動実行
// 毎日午前2時(JST)に前日データを自動処理

import { NextRequest, NextResponse } from 'next/server'
import { scheduleAutoBatch, BATCH_PROCESS_TYPES } from '@/lib/batch-management'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyBatchFailure } from '@/lib/notification-system'

/**
 * GET /api/cron/daily-analytics
 * Vercel Cron による日次バッチの自動実行
 * 
 * Vercel プロジェクト設定:
 * Functions > Cron Jobs
 * Path: /api/cron/daily-analytics
 * Schedule: 0 17 * * * (UTC) = 毎日午前2時(JST)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[Cron] 日次分析バッチ開始:', new Date().toISOString())

    // 1. Vercel Cron Secret による認証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET 環境変数が設定されていません')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] 認証失敗:', authHeader)
      return NextResponse.json(
        { error: 'Unauthorized cron request' },
        { status: 401 }
      )
    }

    // 2. システム認証トークン取得
    const systemAuthToken = process.env.SYSTEM_AUTH_TOKEN
    if (!systemAuthToken) {
      console.error('[Cron] SYSTEM_AUTH_TOKEN 環境変数が設定されていません')
      return NextResponse.json(
        { error: 'System auth token not configured' },
        { status: 500 }
      )
    }

    // 3. 処理対象日の決定（前日のJST）
    const targetDate = getPreviousDateJST()
    console.log('[Cron] 処理対象日:', targetDate)

    // 4. 自動バッチ実行（全ての処理タイプ）
    const results = await scheduleAutoBatch(
      systemAuthToken,
      [BATCH_PROCESS_TYPES.ALL] // 学習品質スコア + ピーク時間 + 思考時間を一括処理
    )

    const totalProcessedUsers = results.reduce((sum, result) => sum + result.processed_users, 0)
    const totalErrors = results.filter(result => !result.success).length
    const executionTimeSeconds = Math.round((Date.now() - startTime) / 1000)

    // 5. 実行結果の詳細ログ
    console.log('[Cron] バッチ実行結果:')
    results.forEach((result, index) => {
      const status = result.success ? '✅ 成功' : '❌ 失敗'
      console.log(`  ${index + 1}. ${status}: ${result.processed_users}人処理, ${result.total_time_seconds}秒`)
      if (result.error_message) {
        console.log(`     エラー: ${result.error_message}`)
      }
      if (result.warnings.length > 0) {
        console.log(`     警告: ${result.warnings.join(', ')}`)
      }
    })

    // 6. 実行サマリーログをデータベースに記録
    const cronLogId = await recordCronExecution({
      target_date: targetDate,
      processed_users: totalProcessedUsers,
      execution_time_seconds: executionTimeSeconds,
      success_count: results.filter(r => r.success).length,
      error_count: totalErrors,
      details: JSON.stringify(results)
    })

    // 7. 失敗時の通知送信
    if (totalErrors > 0 && cronLogId) {
      try {
        const failedResults = results.filter(r => !r.success)
        const errorMessages = failedResults.map(r => r.error_message || 'Unknown error').join('; ')
        
        await notifyBatchFailure({
          batchLogId: cronLogId,
          processDate: targetDate,
          processType: 'cron_auto_all',
          errorMessage: errorMessages,
          processedUsers: totalProcessedUsers
        })
      } catch (notificationError) {
        console.error('[Cron] 通知送信エラー:', notificationError)
      }
    }

    // 8. レスポンス作成
    const response = {
      success: totalErrors === 0,
      message: totalErrors === 0 
        ? `日次バッチ完了: ${totalProcessedUsers}人処理, ${executionTimeSeconds}秒`
        : `日次バッチ部分失敗: ${totalErrors}件のエラー`,
      execution_summary: {
        target_date: targetDate,
        processed_users: totalProcessedUsers,
        execution_time_seconds: executionTimeSeconds,
        success_count: results.filter(r => r.success).length,
        error_count: totalErrors
      },
      batch_results: results
    }

    console.log('[Cron] 日次分析バッチ完了:', response.message)
    
    return NextResponse.json(response)

  } catch (error) {
    const executionTimeSeconds = Math.round((Date.now() - startTime) / 1000)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    console.error('[Cron] 日次バッチエラー:', errorMessage)

    // エラー発生時もログ記録
    try {
      await recordCronExecution({
        target_date: getPreviousDateJST(),
        processed_users: 0,
        execution_time_seconds: executionTimeSeconds,
        success_count: 0,
        error_count: 1,
        details: JSON.stringify([{ 
          success: false, 
          processed_users: 0, 
          total_time_seconds: executionTimeSeconds,
          error_message: errorMessage,
          warnings: []
        }])
      })
    } catch (logError) {
      console.error('[Cron] エラーログ記録失敗:', logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Cron execution failed',
        details: errorMessage,
        execution_time_seconds: executionTimeSeconds
      },
      { status: 500 }
    )
  }
}

/**
 * 前日日付取得（JST）
 */
function getPreviousDateJST(): string {
  const now = new Date()
  // 日本時間に変換
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  jstNow.setDate(jstNow.getDate() - 1)
  return jstNow.toISOString().split('T')[0]
}

/**
 * Cron実行ログをデータベースに記録
 */
async function recordCronExecution(params: {
  target_date: string
  processed_users: number
  execution_time_seconds: number
  success_count: number
  error_count: number
  details: string
}): Promise<number | null> {
  
  try {
    // cron_execution_logs テーブルがない場合は daily_analytics_batch_log に特別エントリ作成
    const logEntry = {
      process_date: params.target_date,
      process_type: 'cron_auto_all', // Cron自動実行の識別
      status: params.error_count === 0 ? 'completed' : 'failed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      processed_users: params.processed_users,
      error_message: params.error_count > 0 
        ? `${params.error_count}件の処理でエラー発生`
        : null,
      force_reprocess: false
    }

    const { data, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .insert(logEntry)
      .select('id')
      .single()

    if (error) {
      console.error('[Cron] ログ記録エラー:', error.message)
      return null
    } else {
      console.log('[Cron] 実行ログ記録完了')
      return data.id
    }

  } catch (error) {
    console.error('[Cron] ログ記録例外:', error)
    return null
  }
}

/**
 * ヘルスチェック用の軽量エンドポイント
 * Vercel Function のウォームアップにも使用可能
 */
export async function HEAD(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse(null, { status: 401 })
  }
  
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'X-Cron-Status': 'ready',
      'X-Target-Date': getPreviousDateJST()
    }
  })
}