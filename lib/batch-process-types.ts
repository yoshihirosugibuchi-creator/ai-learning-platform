// バッチ処理タイプ定義

export const BATCH_PROCESS_TYPES = {
  QUALITY_SCORE: 'quality_score',
  PEAK_HOUR: 'peak_hour', 
  STUDY_TIME: 'study_time_minutes',
  ALL: 'all'
} as const

export type BatchProcessType = typeof BATCH_PROCESS_TYPES[keyof typeof BATCH_PROCESS_TYPES]