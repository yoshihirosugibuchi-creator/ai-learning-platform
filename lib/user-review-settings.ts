import { supabase } from './supabase'

// 復習設定のキー定数
const REVIEW_SETTINGS_KEY = 'review_settings'

// 復習設定の型定義
export interface ReviewSettings {
  notificationEnabled: boolean      // 復習通知有効フラグ
  notificationIntervalDays: number  // 復習通知間隔（日数）
  reviewQuestionsCount: number      // 復習問題数（1-30、デフォルト10）
  createdAt: string
  updatedAt: string
}

/**
 * デフォルト復習設定を取得
 * - 通知有効、7日間隔
 */
export function getDefaultReviewSettings(): ReviewSettings {
  return {
    notificationEnabled: true,
    notificationIntervalDays: 7,
    reviewQuestionsCount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * ユーザーの復習設定を取得（クライアントサイド用・RLS保護）
 */
export async function getUserReviewSettings(userId: string): Promise<ReviewSettings> {
  try {
    const { data, error } = await supabase
      .from('review_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('❌ Error fetching review settings:', error)
      return getDefaultReviewSettings()
    }

    // データが存在しない場合はデフォルト設定を返す
    if (!data) {
      console.log('📝 No review settings found, returning default')
      return getDefaultReviewSettings()
    }

    // review_settingsテーブルの構造に合わせてマッピング
    const validatedSettings: ReviewSettings = {
      notificationEnabled: data.notification_enabled ?? true,
      notificationIntervalDays: data.notification_interval_days ?? 7,
      reviewQuestionsCount: data.review_questions_count ?? 10,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString()
    }

    console.log('✅ Review settings loaded for user:', userId, {
      reviewQuestionsCount: validatedSettings.reviewQuestionsCount,
      source: 'client-side'
    })
    return validatedSettings

  } catch (error) {
    console.error('❌ Error parsing review settings:', error)
    return getDefaultReviewSettings()
  }
}

// Note: getUserReviewSettingsAdmin function removed 
// Admin operations should be handled via API routes

/**
 * ユーザーの復習設定を保存
 */
export async function saveUserReviewSettings(
  userId: string, 
  settings: Partial<ReviewSettings>
): Promise<boolean> {
  try {
    // 既存設定を取得してマージ
    const currentSettings = await getUserReviewSettings(userId)
    
    const updatedSettings: ReviewSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString()
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: REVIEW_SETTINGS_KEY,
        setting_value: JSON.stringify(updatedSettings),
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('❌ Error saving review settings:', error)
      return false
    }

    console.log('✅ Review settings saved for user:', userId)
    return true

  } catch (error) {
    console.error('❌ Error saving review settings:', error)
    return false
  }
}

/**
 * 復習設定がデフォルトかどうかを判定
 */
export function isDefaultReviewSettings(settings: ReviewSettings): boolean {
  const defaultSettings = getDefaultReviewSettings()
  return (
    settings.notificationEnabled === defaultSettings.notificationEnabled &&
    settings.notificationIntervalDays === defaultSettings.notificationIntervalDays &&
    settings.reviewQuestionsCount === defaultSettings.reviewQuestionsCount
  )
}

/**
 * 復習通知が必要かどうかを判定
 */
export async function shouldShowReviewNotification(
  userId: string,
  lastReviewDate?: Date
): Promise<boolean> {
  try {
    const settings = await getUserReviewSettings(userId)
    
    if (!settings.notificationEnabled) {
      return false
    }

    if (!lastReviewDate) {
      return true // 復習したことがない場合は通知
    }

    const daysSinceLastReview = Math.floor(
      (Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysSinceLastReview >= settings.notificationIntervalDays

  } catch (error) {
    console.error('❌ Error checking review notification:', error)
    return false
  }
}


/**
 * 復習問題数の妥当性をチェック
 */
export function validateReviewQuestionsCount(count: number): number {
  // 1-30問の範囲でクランプ
  return Math.max(1, Math.min(30, Math.floor(count)))
}

/**
 * 次回復習推奨日を計算
 */
export async function getNextReviewDate(
  userId: string,
  lastReviewDate: Date = new Date()
): Promise<Date> {
  try {
    const settings = await getUserReviewSettings(userId)
    const nextDate = new Date(lastReviewDate)
    nextDate.setDate(nextDate.getDate() + settings.notificationIntervalDays)
    return nextDate

  } catch (error) {
    console.error('❌ Error calculating next review date:', error)
    const fallbackDate = new Date()
    fallbackDate.setDate(fallbackDate.getDate() + 7) // デフォルト7日後
    return fallbackDate
  }
}