import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database-types-official'

// XP設定の型定義
export interface XPSettings {
  xp_quiz: {
    basic: number
    intermediate: number
    advanced: number
    expert: number
  }
  xp_course: {
    basic: number
    intermediate: number
    advanced: number
    expert: number
  }
  xp_bonus: {
    quiz_accuracy_80: number
    quiz_accuracy_100: number
    course_completion: number
  }
  level: {
    overall_threshold: number
    main_category_threshold: number
    industry_category_threshold: number
    industry_subcategory_threshold: number
  }
  skp: {
    quiz_correct: number
    quiz_incorrect: number
    quiz_perfect_bonus: number
    course_correct: number
    course_incorrect: number
    course_complete_bonus: number
    daily_streak_bonus: number
    ten_day_streak_bonus: number
  }
}

// ⚠️ ハードコード削除: 動的フォールバック設定を使用
// DATABASE_FALLBACK_SETTINGSは scripts/generate-xp-fallback.ts により自動生成されます

// 設定キャッシュ（メモリ内キャッシュ）
let settingsCache: XPSettings | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分間

// フォールバック検出・記録用
interface FallbackRecord {
  timestamp: string
  reason: string
  errorMessage?: string
  settings_count: number
  missing_categories?: string[]
}

let fallbackHistory: FallbackRecord[] = []
const MAX_FALLBACK_HISTORY = 50

/**
 * 動的フォールバック設定を読み込み
 * データベース接続できない場合の最終的なフォールバック
 */
async function loadDynamicFallbackSettings(): Promise<XPSettings> {
  try {
    // 動的生成されたフォールバック設定をインポート
    const { DATABASE_FALLBACK_SETTINGS } = await import('./xp-settings-fallback.generated')
    
    // フォールバック設定の基本検証
    if (!DATABASE_FALLBACK_SETTINGS || !DATABASE_FALLBACK_SETTINGS.xp_quiz) {
      throw new Error('動的フォールバック設定が無効です')
    }
    
    console.log('🔄 Using dynamic fallback settings from database:', {
      quiz_basic: DATABASE_FALLBACK_SETTINGS.xp_quiz.basic,
      course_basic: DATABASE_FALLBACK_SETTINGS.xp_course.basic
    })
    
    return DATABASE_FALLBACK_SETTINGS
    
  } catch (importError) {
    // 動的フォールバックファイルが見つからない場合の最後の手段
    console.error('❌ 動的フォールバック設定の読み込みに失敗:', importError)
    console.warn('⚠️ 緊急フォールバック: 最小限の設定を使用')
    
    // 最小限の設定で動作継続
    return {
      xp_quiz: { basic: 10, intermediate: 20, advanced: 30, expert: 50 },
      xp_course: { basic: 15, intermediate: 25, advanced: 35, expert: 55 },
      xp_bonus: { quiz_accuracy_80: 20, quiz_accuracy_100: 30, course_completion: 50 },
      level: { overall_threshold: 1000, main_category_threshold: 500, industry_category_threshold: 1000, industry_subcategory_threshold: 500 },
      skp: { quiz_correct: 10, quiz_incorrect: 2, quiz_perfect_bonus: 50, course_correct: 10, course_incorrect: 2, course_complete_bonus: 50, daily_streak_bonus: 10, ten_day_streak_bonus: 100 }
    }
  }
}

/**
 * 設定の完全性を検証
 */
function validateSettingsCompleteness(settings: Record<string, Record<string, number>>): string[] {
  const requiredKeys = {
    xp_quiz: ['basic', 'intermediate', 'advanced', 'expert'],
    xp_course: ['basic', 'intermediate', 'advanced', 'expert'],
    xp_bonus: ['quiz_accuracy_80', 'quiz_accuracy_100', 'course_completion'],
    level: ['overall_threshold', 'main_category_threshold', 'industry_category_threshold', 'industry_subcategory_threshold'],
    skp: ['quiz_correct', 'quiz_incorrect', 'quiz_perfect_bonus', 'course_correct', 'course_incorrect', 'course_complete_bonus', 'daily_streak_bonus', 'ten_day_streak_bonus']
  }

  const missingCategories: string[] = []
  
  Object.entries(requiredKeys).forEach(([category, keys]) => {
    if (!settings[category]) {
      missingCategories.push(category)
      return
    }
    
    const missingKeys = keys.filter(key => !(key in settings[category]))
    if (missingKeys.length > 0) {
      missingCategories.push(`${category}(${missingKeys.join(',')})`)
    }
  })
  
  return missingCategories
}

/**
 * フォールバック使用を記録
 */
function recordFallback(reason: string, errorMessage?: string, settingsCount: number = 0, missingCategories?: string[]) {
  const record: FallbackRecord = {
    timestamp: new Date().toISOString(),
    reason,
    errorMessage,
    settings_count: settingsCount,
    missing_categories: missingCategories
  }
  
  fallbackHistory.push(record)
  
  // 履歴サイズを制限
  if (fallbackHistory.length > MAX_FALLBACK_HISTORY) {
    fallbackHistory = fallbackHistory.slice(-MAX_FALLBACK_HISTORY)
  }
  
  console.warn('⚠️ Fallback recorded:', record)
}

/**
 * XP設定をデータベースから取得 (動的フォールバック機能付き)
 * ハードコード削除: 動的に生成されたフォールバック設定を使用
 */
export async function loadXPSettings(supabaseClient?: SupabaseClient<Database>): Promise<XPSettings> {
  try {
    // キャッシュチェック
    const now = Date.now()
    if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('🚀 Using cached XP settings')
      return settingsCache
    }

    console.log('🔄 Loading XP settings from database...')

    // Supabaseクライアントを取得
    let supabase = supabaseClient
    if (!supabase) {
      supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }

    // 全設定を取得
    const { data: settings, error } = await supabase
      .from('xp_level_skp_settings')
      .select('setting_category, setting_key, setting_value')
      .eq('is_active', true)

    if (error) {
      console.warn('⚠️ Failed to load XP settings, using dynamic fallback:', error.message)
      recordFallback('database_error', error.message, 0)
      return await loadDynamicFallbackSettings()
    }

    if (!settings || settings.length === 0) {
      console.warn('⚠️ No XP settings found, using dynamic fallback')
      recordFallback('no_settings_found', undefined, 0)
      return await loadDynamicFallbackSettings()
    }

    // 設定をカテゴリ別に整理
    const loadedSettings: Record<string, Record<string, number>> = {
      xp_quiz: {},
      xp_course: {},
      xp_bonus: {},
      level: {},
      skp: {}
    }

    settings.forEach((setting: { setting_category: string; setting_key: string; setting_value: number }) => {
      const { setting_category, setting_key, setting_value } = setting
      if (loadedSettings[setting_category]) {
        loadedSettings[setting_category][setting_key] = setting_value
      }
    })

    // 重要設定の不足チェック
    const missingCategories = validateSettingsCompleteness(loadedSettings)
    if (missingCategories.length > 0) {
      console.warn('⚠️ Missing critical XP settings categories:', missingCategories)
      recordFallback('incomplete_settings', `Missing: ${missingCategories.join(', ')}`, settings.length, missingCategories)
      
      // 動的フォールバックで不足分を補完
      console.log('🔧 Applying dynamic fallback for missing categories')
      const fallbackSettings = await loadDynamicFallbackSettings()
      
      const finalSettings: XPSettings = {
        xp_quiz: { ...fallbackSettings.xp_quiz, ...loadedSettings.xp_quiz },
        xp_course: { ...fallbackSettings.xp_course, ...loadedSettings.xp_course },
        xp_bonus: { ...fallbackSettings.xp_bonus, ...loadedSettings.xp_bonus },
        level: { ...fallbackSettings.level, ...loadedSettings.level },
        skp: { ...fallbackSettings.skp, ...loadedSettings.skp }
      }
      
      // キャッシュ更新
      settingsCache = finalSettings
      cacheTimestamp = now
      
      return finalSettings
    }

    // 完全な設定が取得できた場合
    const finalSettings: XPSettings = {
      xp_quiz: loadedSettings.xp_quiz as XPSettings['xp_quiz'],
      xp_course: loadedSettings.xp_course as XPSettings['xp_course'],
      xp_bonus: loadedSettings.xp_bonus as XPSettings['xp_bonus'],
      level: loadedSettings.level as XPSettings['level'],
      skp: loadedSettings.skp as XPSettings['skp']
    }

    // キャッシュ更新
    settingsCache = finalSettings
    cacheTimestamp = now

    console.log('✅ XP settings loaded successfully:', {
      quiz_basic: finalSettings.xp_quiz.basic,
      quiz_expert: finalSettings.xp_quiz.expert,
      course_basic: finalSettings.xp_course.basic,
      course_expert: finalSettings.xp_course.expert,
      settings_count: settings.length,
      fallback_used: 'none'
    })

    return finalSettings

  } catch (error) {
    console.error('❌ Critical error loading XP settings:', error)
    console.log('🔄 Falling back to dynamic fallback settings')
    recordFallback('critical_error', error instanceof Error ? error.message : 'Unknown error', 0)
    
    return await loadDynamicFallbackSettings()
  }
}

/**
 * キャッシュをクリア（設定更新後に呼び出し）
 */
export function clearXPSettingsCache(): void {
  settingsCache = null
  cacheTimestamp = 0
  console.log('🗑️ XP settings cache cleared')
}

/**
 * クイズXP計算
 */
export function calculateQuizXP(difficulty: string, settings: XPSettings): number {
  const difficultyKey = difficulty as keyof typeof settings.xp_quiz
  return settings.xp_quiz[difficultyKey] || settings.xp_quiz.basic
}

/**
 * コース学習XP計算
 */
export function calculateCourseXP(difficulty: string, settings: XPSettings): number {
  const difficultyKey = difficulty as keyof typeof settings.xp_course
  return settings.xp_course[difficultyKey] || settings.xp_course.basic
}

/**
 * ボーナスXP計算
 */
export function calculateBonusXP(bonusType: string, settings: XPSettings): number {
  const bonusKey = bonusType as keyof typeof settings.xp_bonus
  return settings.xp_bonus[bonusKey] || 0
}

/**
 * レベル計算
 */
export function calculateLevel(totalXP: number, threshold: number): number {
  return Math.floor(totalXP / threshold) + 1
}

/**
 * 次のレベルまでに必要なXP計算
 */
export function calculateNextLevelXP(totalXP: number, threshold: number): number {
  const currentLevelXP = Math.floor(totalXP / threshold) * threshold
  return currentLevelXP + threshold - totalXP
}

/**
 * SKP計算
 */
export function calculateSKP(
  correct: number,
  incorrect: number,
  isPerfect: boolean,
  settings: XPSettings
): number {
  const baseCorrect = correct * settings.skp.quiz_correct
  const baseIncorrect = incorrect * settings.skp.quiz_incorrect
  const perfectBonus = isPerfect ? settings.skp.quiz_perfect_bonus : 0
  
  return baseCorrect + baseIncorrect + perfectBonus
}

/**
 * フォールバック履歴を取得
 */
export function getFallbackHistory(): FallbackRecord[] {
  return [...fallbackHistory]
}

/**
 * フォールバック統計を取得
 */
export function getFallbackStats(): { 
  total: number
  recent24h: number
  commonReasons: Record<string, number>
  lastFallback?: FallbackRecord
} {
  const now = Date.now()
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  
  const recent24h = fallbackHistory.filter(record => 
    new Date(record.timestamp).getTime() > oneDayAgo
  ).length
  
  const commonReasons: Record<string, number> = {}
  fallbackHistory.forEach(record => {
    commonReasons[record.reason] = (commonReasons[record.reason] || 0) + 1
  })
  
  return {
    total: fallbackHistory.length,
    recent24h,
    commonReasons,
    lastFallback: fallbackHistory[fallbackHistory.length - 1]
  }
}

/**
 * 継続学習SKPボーナス計算
 */
export function calculateStreakBonus(streakDays: number, settings: XPSettings): number {
  let bonus = 0
  
  // 毎日継続ボーナス
  if (streakDays > 0) {
    bonus += streakDays * settings.skp.daily_streak_bonus
  }
  
  // 10日毎の追加ボーナス
  const tenDayBonuses = Math.floor(streakDays / 10)
  if (tenDayBonuses > 0) {
    bonus += tenDayBonuses * settings.skp.ten_day_streak_bonus
  }
  
  return bonus
}