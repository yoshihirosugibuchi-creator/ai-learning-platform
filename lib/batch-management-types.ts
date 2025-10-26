// バッチ処理管理の型定義のみ
// クライアントサイドでも安全に使用可能

// 型定義のみのファイル - DailyAnalyticsBatchLogは他ファイルで使用

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

// フィルター条件の型定義
export interface BatchFilterConditions {
  process_type?: BatchProcessType
  status?: BatchStatus
  days?: number
}

// API呼び出し用のバッチ実行リクエスト（クライアントサイド用）
// 注意: 管理画面では directAuthenticatedFetch パターンを使用すること
export async function requestBatchExecution(
  processType: BatchProcessType,
  targetDate?: string,
  authToken?: string
): Promise<BatchExecutionResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // 認証トークンがある場合は Authorization ヘッダーに追加
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch('/api/admin/batch-execution', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      process_type: processType,
      target_date: targetDate
    })
  })

  if (!response.ok) {
    throw new Error(`Batch execution failed: ${response.statusText}`)
  }

  return response.json()
}