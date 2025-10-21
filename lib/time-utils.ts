// 日本時間対応ユーティリティ関数
// 学習分析システムで使用する時間関連の処理を統一

/**
 * 現在の日本時間での時間（0-23）を取得
 */
export function getCurrentHourJST(): number {
  return parseInt(new Date().toLocaleString('ja-JP', { 
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    hour12: false 
  }).split(':')[0])
}

/**
 * 現在の日本時間での日付（YYYY-MM-DD形式）を取得
 */
export function getDateJST(): string {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-')
}

/**
 * 指定した日付の日本時間での日付（YYYY-MM-DD形式）を取得
 */
export function getDateJSTFromDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-')
}

/**
 * 指定した日数前の日本時間での日付を取得
 */
export function getDateNDaysAgoJST(days: number): string {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return getDateJSTFromDate(date)
}

/**
 * 日本時間での現在のISO文字列を取得
 */
export function getCurrentISOStringJST(): string {
  return new Date().toISOString()
}

/**
 * 時間帯（0-23）を時間帯名に変換
 */
export function getTimeSlotName(hour: number): string {
  if (hour >= 6 && hour < 12) return '朝'
  if (hour >= 12 && hour < 18) return '午後'
  if (hour >= 18 && hour < 22) return '夜'
  return '深夜'
}

/**
 * 時間帯の表示用文字列を生成
 */
export function formatHourDisplay(hour: number): string {
  return `${hour}時台（${getTimeSlotName(hour)}）`
}

/**
 * 日付文字列が有効な形式かチェック
 */
export function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  
  const date = new Date(dateStr + 'T00:00:00.000Z')
  return !isNaN(date.getTime())
}

/**
 * 日本時間での時間範囲をチェック
 */
export function isValidHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23
}

/**
 * 効率計算用のヘルパー関数
 */
export function calculateEfficiency(timeSpent: number, xpEarned: number): number {
  if (timeSpent <= 0) return 0
  const timeInMinutes = timeSpent / 60 // 秒を分に変換
  if (timeInMinutes <= 0) return 0
  return Math.round((xpEarned / timeInMinutes) * 100) / 100 // XP/分
}

/**
 * 時間の表示用フォーマット（秒 → 分）
 */
export function formatTimeToMinutes(timeInSeconds: number): number {
  return Math.round(timeInSeconds / 60)
}

/**
 * デバッグ用：現在の日本時間情報を出力
 */
export function logCurrentJSTInfo(): void {
  console.log('=== 日本時間情報 ===')
  console.log('現在時刻 (JST):', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
  console.log('現在の時間:', getCurrentHourJST())
  console.log('現在の日付:', getDateJST())
  console.log('ISO文字列:', getCurrentISOStringJST())
  console.log('===================')
}