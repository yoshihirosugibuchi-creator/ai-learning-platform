// hourly_efficiency_data JSONB管理ユーティリティ
// 日本時間ベースの時間帯別効率データの作成・更新・分析機能

import { 
  getCurrentHourJST, 
  getCurrentISOStringJST,
  calculateEfficiency,
  isValidHour 
} from './time-utils'

// hourly_efficiency_data の型定義
export interface HourlyStats {
  quiz_time: number      // 思考時間（秒）
  xp_earned: number      // 獲得XP
  efficiency: number     // 効率（XP/分）
  session_count: number  // セッション回数
}

export interface HourlyEfficiencyData {
  timezone: string
  hourly_stats: Record<string, HourlyStats>  // "00"-"23"
  peak_hours: number[]                       // 効率上位3時間
  total_thinking_time: number                // 総思考時間（秒）
  daily_session_count: number
  last_updated_jst: string
}

/**
 * 空のhourly_efficiency_dataを生成
 */
export function createEmptyHourlyEfficiencyData(): HourlyEfficiencyData {
  return {
    timezone: 'Asia/Tokyo',
    hourly_stats: {},
    peak_hours: [],
    total_thinking_time: 0,
    daily_session_count: 0,
    last_updated_jst: getCurrentISOStringJST()
  }
}

/**
 * 時間帯の初期化
 */
function initializeHourStats(): HourlyStats {
  return {
    quiz_time: 0,
    xp_earned: 0,
    efficiency: 0,
    session_count: 0
  }
}

/**
 * hourly_efficiency_data を更新
 */
export function updateHourlyEfficiencyData(
  existingData: HourlyEfficiencyData | null,
  sessionData: {
    thinkingTime: number  // 秒
    xpEarned: number
    hourJST?: number     // 指定しない場合は現在時刻
  }
): HourlyEfficiencyData {
  const hour = sessionData.hourJST ?? getCurrentHourJST()
  const hourKey = hour.toString().padStart(2, '0')
  
  // 既存データの初期化
  const data: HourlyEfficiencyData = existingData ?? createEmptyHourlyEfficiencyData()
  
  // 時間帯データの初期化（存在しない場合）
  if (!data.hourly_stats[hourKey]) {
    data.hourly_stats[hourKey] = initializeHourStats()
  }
  
  const hourStats = data.hourly_stats[hourKey]
  
  // 時間帯別データ更新
  hourStats.quiz_time += sessionData.thinkingTime
  hourStats.xp_earned += sessionData.xpEarned
  hourStats.session_count += 1
  hourStats.efficiency = calculateEfficiency(hourStats.quiz_time, hourStats.xp_earned)
  
  // 全体データ更新
  data.total_thinking_time += sessionData.thinkingTime
  data.daily_session_count += 1
  data.last_updated_jst = getCurrentISOStringJST()
  
  // ピーク時間の再計算
  data.peak_hours = calculatePeakHours(data.hourly_stats)
  
  return data
}

/**
 * ピーク時間（効率上位3時間）を計算
 */
export function calculatePeakHours(hourlyStats: Record<string, HourlyStats>): number[] {
  const hoursWithEfficiency = Object.entries(hourlyStats)
    .map(([hourStr, stats]) => ({
      hour: parseInt(hourStr),
      efficiency: stats.efficiency,
      sessionCount: stats.session_count
    }))
    .filter(item => item.sessionCount >= 2) // 最低2セッション必要
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 3)
    .map(item => item.hour)
  
  return hoursWithEfficiency
}

/**
 * 最高効率時間を取得（peak_study_hour用）
 */
export function getPeakStudyHour(data: HourlyEfficiencyData): number | null {
  if (data.peak_hours.length === 0) return null
  return data.peak_hours[0]
}

/**
 * 思考時間を分単位で取得（study_time_minutes用）
 */
export function getStudyTimeMinutes(data: HourlyEfficiencyData): number {
  return Math.round(data.total_thinking_time / 60) // 秒を分に変換
}

/**
 * 時間帯別効率分析
 */
export function analyzeHourlyEfficiency(data: HourlyEfficiencyData) {
  const hours = Object.entries(data.hourly_stats)
    .map(([hourStr, stats]) => ({
      hour: parseInt(hourStr),
      ...stats,
      timeSlot: getTimeSlotFromHour(parseInt(hourStr))
    }))
    .filter(item => item.session_count > 0)
    .sort((a, b) => b.efficiency - a.efficiency)

  const topHour = hours[0]
  const averageEfficiency = hours.length > 0 
    ? hours.reduce((sum, h) => sum + h.efficiency, 0) / hours.length 
    : 0

  return {
    topHour: topHour ? {
      hour: topHour.hour,
      efficiency: topHour.efficiency,
      timeSlot: topHour.timeSlot,
      sessionCount: topHour.session_count
    } : null,
    averageEfficiency: Math.round(averageEfficiency * 100) / 100,
    activeHours: hours.length,
    totalSessions: data.daily_session_count,
    totalThinkingTimeMinutes: getStudyTimeMinutes(data)
  }
}

/**
 * 時間から時間帯名を取得
 */
function getTimeSlotFromHour(hour: number): string {
  if (hour >= 6 && hour < 12) return '朝'
  if (hour >= 12 && hour < 18) return '午後'
  if (hour >= 18 && hour < 22) return '夜'
  return '深夜'
}

/**
 * hourly_efficiency_data のバリデーション
 */
export function validateHourlyEfficiencyData(data: unknown): data is HourlyEfficiencyData {
  if (!data || typeof data !== 'object') return false
  
  const obj = data as Record<string, unknown>
  const required = ['timezone', 'hourly_stats', 'peak_hours', 'total_thinking_time', 'daily_session_count']
  if (!required.every(key => key in obj)) return false
  
  // timezone チェック
  if (obj.timezone !== 'Asia/Tokyo') return false
  
  // hourly_stats チェック
  if (typeof obj.hourly_stats !== 'object') return false
  
  // peak_hours チェック
  if (!Array.isArray(obj.peak_hours)) return false
  if (!obj.peak_hours.every((h: unknown) => typeof h === 'number' && isValidHour(h))) return false
  
  // 数値フィールドチェック
  if (typeof obj.total_thinking_time !== 'number' || obj.total_thinking_time < 0) return false
  if (typeof obj.daily_session_count !== 'number' || obj.daily_session_count < 0) return false
  
  return true
}

/**
 * 安全なhourly_efficiency_data パース
 */
export function parseHourlyEfficiencyData(jsonData: unknown): HourlyEfficiencyData {
  if (validateHourlyEfficiencyData(jsonData)) {
    return jsonData
  }
  
  console.warn('Invalid hourly_efficiency_data, creating empty data:', jsonData)
  return createEmptyHourlyEfficiencyData()
}

/**
 * デバッグ用：hourly_efficiency_data の内容を表示
 */
export function logHourlyEfficiencyData(data: HourlyEfficiencyData, label: string = ''): void {
  console.log(`=== Hourly Efficiency Data ${label} ===`)
  console.log('Timezone:', data.timezone)
  console.log('Total thinking time (min):', getStudyTimeMinutes(data))
  console.log('Daily session count:', data.daily_session_count)
  console.log('Peak hours:', data.peak_hours)
  console.log('Active hours:', Object.keys(data.hourly_stats).length)
  console.log('Last updated:', data.last_updated_jst)
  
  if (Object.keys(data.hourly_stats).length > 0) {
    console.log('Hourly breakdown:')
    Object.entries(data.hourly_stats)
      .filter(([_, stats]) => stats.session_count > 0)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([hour, stats]) => {
        console.log(`  ${hour}時: ${stats.efficiency} XP/分 (${stats.session_count}セッション)`)
      })
  }
  console.log('=====================================')
}