// バッチ実行API（管理者専用）
// フロントエンドからのバッチ実行リクエストを処理

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { 
  canExecuteBatch, 
  startBatchLog, 
  completeBatchLog 
} from '@/lib/batch-management-server'
import { 
  BATCH_PROCESS_TYPES, 
  type BatchProcessType,
  type BatchExecutionResult 
} from '@/lib/batch-management-types'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (userRole !== 'system_admin') {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    // リクエストボディの取得
    const { process_type, target_date } = await request.json()

    if (!process_type || !Object.values(BATCH_PROCESS_TYPES).includes(process_type)) {
      return NextResponse.json(
        { error: '有効なprocess_typeが必要です' }, 
        { status: 400 }
      )
    }

    console.log(`🚀 Batch execution request: ${process_type}, target: ${target_date || 'yesterday'}`)

    // バッチ実行可能性チェック
    const { canExecute, reason, existingLog } = await canExecuteBatch(process_type, target_date)
    
    if (!canExecute) {
      console.log(`🚫 Batch execution blocked: ${reason}`)
      return NextResponse.json({
        success: false,
        error_message: reason,
        existing_log: existingLog,
        processed_users: 0,
        total_time_seconds: 0,
        warnings: []
      }, { status: 409 })
    }

    // バッチログ開始
    const { success: logStarted, batch_log_id, error: logError } = await startBatchLog(
      process_type as BatchProcessType,
      target_date
    )

    if (!logStarted || !batch_log_id) {
      return NextResponse.json({
        success: false,
        error_message: `バッチログ開始に失敗: ${logError}`
      }, { status: 500 })
    }

    // ここで実際のバッチ処理を実行
    // 現在は簡単な成功レスポンスを返す
    const result: BatchExecutionResult = {
      success: true,
      batch_log_id,
      processed_users: 0,
      total_time_seconds: 1,
      warnings: []
    }

    // バッチログ完了
    await completeBatchLog(batch_log_id, result)

    console.log(`✅ Batch execution completed: ${process_type}`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error in batch execution API:', error)
    return NextResponse.json(
      { 
        success: false,
        error_message: 'バッチ実行中にエラーが発生しました',
        processed_users: 0,
        total_time_seconds: 0,
        warnings: []
      }, 
      { status: 500 }
    )
  }
}