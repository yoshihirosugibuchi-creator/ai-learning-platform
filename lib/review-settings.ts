import { createClient } from '@supabase/supabase-js'

export interface ReviewSettings {
  notificationEnabled: boolean
  notificationIntervalDays: number
  reviewQuestionsCount: number // 復習問題数（1-30、デフォルト10）
  streakReminderEnabled: boolean
  weeklySummaryEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewSettingsDB {
  user_id: string
  notification_enabled: boolean
  notification_interval_days: number
  review_questions_count: number
  streak_reminder_enabled: boolean
  weekly_summary_enabled: boolean
  created_at: string
  updated_at: string
}

/**
 * デフォルト復習設定
 */
export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  notificationEnabled: true,
  notificationIntervalDays: 1, // 毎日
  reviewQuestionsCount: 10,
  streakReminderEnabled: true,
  weeklySummaryEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

/**
 * ユーザーの復習設定を取得（API経由 - 認証ヘッダー対応）
 */
export async function getUserReviewSettings(_userId: string): Promise<ReviewSettings> {
  try {
    // Supabaseセッションからアクセストークン取得
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    
    if (!token) {
      return DEFAULT_REVIEW_SETTINGS
    }
    
    // API経由で取得（認証ヘッダー付き）
    const response = await fetch('/api/review/settings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return DEFAULT_REVIEW_SETTINGS
      }
      throw new Error(`Failed to fetch settings: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to get review settings')
    }

    return data.settings

  } catch (error) {
    console.error('❌ Failed to get review settings:', error)
    return DEFAULT_REVIEW_SETTINGS
  }
}

/**
 * ユーザーの復習設定を更新（API経由 - 認証ヘッダー対応）
 */
export async function updateUserReviewSettings(
  _userId: string, 
  settings: Partial<ReviewSettings>
): Promise<void> {
  try {
    // Supabaseセッションからアクセストークン取得
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    
    if (!token) {
      throw new Error('認証トークンが見つかりません')
    }

    // API経由で更新（認証ヘッダー付き）
    const response = await fetch('/api/review/settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `設定の更新に失敗しました: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to update review settings')
    }

    console.log('Review settings updated successfully via API')

  } catch (error) {
    console.error('Failed to update review settings:', error)
    throw error
  }
}

/**
 * デフォルト設定かどうかをチェック
 */
export function isDefaultReviewSettings(settings: ReviewSettings): boolean {
  return (
    settings.notificationEnabled === DEFAULT_REVIEW_SETTINGS.notificationEnabled &&
    settings.notificationIntervalDays === DEFAULT_REVIEW_SETTINGS.notificationIntervalDays &&
    settings.reviewQuestionsCount === DEFAULT_REVIEW_SETTINGS.reviewQuestionsCount &&
    settings.streakReminderEnabled === DEFAULT_REVIEW_SETTINGS.streakReminderEnabled &&
    settings.weeklySummaryEnabled === DEFAULT_REVIEW_SETTINGS.weeklySummaryEnabled
  )
}

/**
 * 復習対象問題数を取得
 */
export async function getReviewQuestionsCount(userId: string): Promise<number> {
  try {
    const settings = await getUserReviewSettings(userId)
    return settings.reviewQuestionsCount
  } catch (error) {
    console.error('Failed to get review questions count:', error)
    return DEFAULT_REVIEW_SETTINGS.reviewQuestionsCount
  }
}

/**
 * 復習通知が有効かどうかをチェック
 */
export async function isReviewNotificationEnabled(userId: string): Promise<boolean> {
  try {
    const settings = await getUserReviewSettings(userId)
    return settings.notificationEnabled
  } catch (error) {
    console.error('Failed to check review notification status:', error)
    return DEFAULT_REVIEW_SETTINGS.notificationEnabled
  }
}

/**
 * 復習通知間隔を取得（日数）
 */
export async function getReviewNotificationInterval(userId: string): Promise<number> {
  try {
    const settings = await getUserReviewSettings(userId)
    return settings.notificationIntervalDays
  } catch (error) {
    console.error('Failed to get review notification interval:', error)
    return DEFAULT_REVIEW_SETTINGS.notificationIntervalDays
  }
}

/**
 * 復習設定のバリデーション
 */
export function validateReviewSettings(settings: Partial<ReviewSettings>): string[] {
  const errors: string[] = []

  if (settings.reviewQuestionsCount !== undefined) {
    if (settings.reviewQuestionsCount < 1 || settings.reviewQuestionsCount > 30) {
      errors.push('復習問題数は1〜30の範囲で設定してください')
    }
  }

  if (settings.notificationIntervalDays !== undefined) {
    if (settings.notificationIntervalDays < 1 || settings.notificationIntervalDays > 7) {
      errors.push('通知間隔は1〜7日の範囲で設定してください')
    }
  }

  return errors
}