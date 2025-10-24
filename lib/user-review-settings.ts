import { supabase } from './supabase'

// 復習設定の型定義
export interface ReviewSettings {
  notificationEnabled: boolean      // 復習通知有効フラグ
  notificationIntervalDays: number  // 復習通知間隔（日数）
  createdAt: string
  updatedAt: string
}

// user_settingsテーブルの設定キー
const REVIEW_SETTINGS_KEY = 'review_settings'

/**
 * デフォルト復習設定を取得
 * - 通知有効、7日間隔
 */
export function getDefaultReviewSettings(): ReviewSettings {
  return {
    notificationEnabled: true,
    notificationIntervalDays: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * ユーザーの復習設定を取得
 */
export async function getUserReviewSettings(userId: string): Promise<ReviewSettings> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', REVIEW_SETTINGS_KEY)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('❌ Error fetching review settings:', error)
      return getDefaultReviewSettings()
    }

    // データが存在しない場合はデフォルト設定を返す
    if (!data || !data.setting_value) {
      console.log('📝 No review settings found, returning default')
      return getDefaultReviewSettings()
    }

    const settings = JSON.parse(String(data.setting_value)) as ReviewSettings
    
    // バリデーション: 必須フィールドが存在しない場合はデフォルト値で補完
    const validatedSettings: ReviewSettings = {
      notificationEnabled: settings.notificationEnabled ?? true,
      notificationIntervalDays: settings.notificationIntervalDays ?? 7,
      createdAt: settings.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString() // 取得時に更新
    }

    console.log('✅ Review settings loaded for user:', userId)
    return validatedSettings

  } catch (error) {
    console.error('❌ Error parsing review settings:', error)
    return getDefaultReviewSettings()
  }
}

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
    settings.notificationIntervalDays === defaultSettings.notificationIntervalDays
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