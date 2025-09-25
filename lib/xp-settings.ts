import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

// デフォルト設定（フォールバック用）
const DEFAULT_XP_SETTINGS: XPSettings = {
  xp_quiz: {
    basic: 10,
    intermediate: 20,
    advanced: 30,
    expert: 50
  },
  xp_course: {
    basic: 15,
    intermediate: 25,
    advanced: 35,
    expert: 55
  },
  xp_bonus: {
    quiz_accuracy_80: 20,
    quiz_accuracy_100: 30,
    course_completion: 50
  },
  level: {
    overall_threshold: 1000,
    main_category_threshold: 500,
    industry_category_threshold: 1000,
    industry_subcategory_threshold: 500
  },
  skp: {
    quiz_correct: 10,
    quiz_incorrect: 2,
    quiz_perfect_bonus: 50,
    course_correct: 10,
    course_incorrect: 2,
    course_complete_bonus: 50,
    daily_streak_bonus: 10,
    ten_day_streak_bonus: 100
  }
}

// 設定キャッシュ（メモリ内キャッシュ）
let settingsCache: XPSettings | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分間

/**
 * XP設定をデータベースから取得
 */
export async function loadXPSettings(supabaseClient?: SupabaseClient): Promise<XPSettings> {
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
      supabase = createClient(
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
      console.warn('⚠️ Failed to load XP settings, using defaults:', error.message)
      return DEFAULT_XP_SETTINGS
    }

    if (!settings || settings.length === 0) {
      console.warn('⚠️ No XP settings found, using defaults')
      return DEFAULT_XP_SETTINGS
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

    // デフォルト値で不足分を補完
    const finalSettings: XPSettings = {
      xp_quiz: { ...DEFAULT_XP_SETTINGS.xp_quiz, ...loadedSettings.xp_quiz },
      xp_course: { ...DEFAULT_XP_SETTINGS.xp_course, ...loadedSettings.xp_course },
      xp_bonus: { ...DEFAULT_XP_SETTINGS.xp_bonus, ...loadedSettings.xp_bonus },
      level: { ...DEFAULT_XP_SETTINGS.level, ...loadedSettings.level },
      skp: { ...DEFAULT_XP_SETTINGS.skp, ...loadedSettings.skp }
    }

    // キャッシュ更新
    settingsCache = finalSettings
    cacheTimestamp = now

    console.log('✅ XP settings loaded successfully:', {
      quiz_basic: finalSettings.xp_quiz.basic,
      quiz_expert: finalSettings.xp_quiz.expert,
      course_basic: finalSettings.xp_course.basic,
      course_expert: finalSettings.xp_course.expert,
      settings_count: settings.length
    })

    return finalSettings

  } catch (error) {
    console.error('❌ Critical error loading XP settings:', error)
    console.log('🔄 Falling back to default settings')
    return DEFAULT_XP_SETTINGS
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