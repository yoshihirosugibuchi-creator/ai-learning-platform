import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateReviewSet } from '@/lib/precomputed-quiz-engine'

interface ReviewSettingsDB {
  user_id: string
  notification_enabled: boolean
  notification_interval_days: number
  review_questions_count: number
  streak_reminder_enabled: boolean
  weekly_summary_enabled: boolean
  created_at: string
  updated_at: string
}

interface ReviewSettings {
  notificationEnabled: boolean
  notificationIntervalDays: number
  reviewQuestionsCount: number
  streakReminderEnabled: boolean
  weeklySummaryEnabled: boolean
  createdAt: string
  updatedAt: string
}

const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  notificationEnabled: true,
  notificationIntervalDays: 1,
  reviewQuestionsCount: 10,
  streakReminderEnabled: true,
  weeklySummaryEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

/**
 * 復習設定を取得
 */
export async function GET(request: NextRequest) {
  try {
    // Authorization Bearer認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // 復習設定を取得
    const { data, error } = await supabaseAdmin
      .from('review_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // データが存在しない場合はデフォルト設定を返す
        return NextResponse.json({
          success: true,
          settings: DEFAULT_REVIEW_SETTINGS
        })
      }
      throw error
    }

    // データベース形式からフロントエンド形式に変換
    const settings: ReviewSettings = {
      notificationEnabled: data.notification_enabled ?? DEFAULT_REVIEW_SETTINGS.notificationEnabled,
      notificationIntervalDays: data.notification_interval_days ?? DEFAULT_REVIEW_SETTINGS.notificationIntervalDays,
      reviewQuestionsCount: data.review_questions_count ?? DEFAULT_REVIEW_SETTINGS.reviewQuestionsCount,
      streakReminderEnabled: data.streak_reminder_enabled ?? DEFAULT_REVIEW_SETTINGS.streakReminderEnabled,
      weeklySummaryEnabled: data.weekly_summary_enabled ?? DEFAULT_REVIEW_SETTINGS.weeklySummaryEnabled,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('❌ Error fetching review settings:', error)
    return NextResponse.json(
      { success: false, error: '復習設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 復習設定を更新
 */
export async function PUT(request: NextRequest) {
  try {
    // Authorization Bearer認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // リクエストボディを取得
    const settings: Partial<ReviewSettings> = await request.json()

    // バリデーション
    if (settings.reviewQuestionsCount !== undefined && 
        (settings.reviewQuestionsCount < 1 || settings.reviewQuestionsCount > 30)) {
      return NextResponse.json(
        { success: false, error: '復習問題数は1-30問の範囲で設定してください' },
        { status: 400 }
      )
    }

    if (settings.notificationIntervalDays !== undefined && 
        (settings.notificationIntervalDays < 1 || settings.notificationIntervalDays > 7)) {
      return NextResponse.json(
        { success: false, error: '通知間隔は1-7日の範囲で設定してください' },
        { status: 400 }
      )
    }

    // フロントエンド形式からデータベース形式に変換
    const dbSettings: Partial<ReviewSettingsDB> = {
      notification_enabled: settings.notificationEnabled,
      notification_interval_days: settings.notificationIntervalDays,
      review_questions_count: settings.reviewQuestionsCount,
      streak_reminder_enabled: settings.streakReminderEnabled,
      weekly_summary_enabled: settings.weeklySummaryEnabled,
      updated_at: new Date().toISOString()
    }

    // 既存の設定をチェック
    const { data: existingSettings } = await supabaseAdmin
      .from('review_settings')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (existingSettings) {
      // 更新
      const { error } = await supabaseAdmin
        .from('review_settings')
        .update(dbSettings)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      console.log('✅ Review settings updated successfully for user:', user.id)
    } else {
      // 新規作成
      const newSettings: ReviewSettingsDB = {
        user_id: user.id,
        notification_enabled: settings.notificationEnabled ?? DEFAULT_REVIEW_SETTINGS.notificationEnabled,
        notification_interval_days: settings.notificationIntervalDays ?? DEFAULT_REVIEW_SETTINGS.notificationIntervalDays,
        review_questions_count: settings.reviewQuestionsCount ?? DEFAULT_REVIEW_SETTINGS.reviewQuestionsCount,
        streak_reminder_enabled: settings.streakReminderEnabled ?? DEFAULT_REVIEW_SETTINGS.streakReminderEnabled,
        weekly_summary_enabled: settings.weeklySummaryEnabled ?? DEFAULT_REVIEW_SETTINGS.weeklySummaryEnabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabaseAdmin
        .from('review_settings')
        .insert(newSettings)

      if (error) {
        throw error
      }

      console.log('✅ Review settings created successfully for user:', user.id)
    }

    // 復習問題数設定が変更された場合、復習事前セットを再生成
    if (settings.reviewQuestionsCount !== undefined) {
      console.log('🔄 Review questions count changed, regenerating review precomputed sets...')
      
      try {
        const context = {
          userId: user.id,
          forceRegenerate: true // 既存の復習セットを削除して再生成
        }
        
        const result = await generateReviewSet(context)
        
        if (result.generated) {
          console.log(`✅ Review precomputed sets regenerated: ${result.sets_count} sets`)
        } else if (result.skipped) {
          console.log(`ℹ️ Review precomputed sets skipped: ${result.reason}`)
        }
      } catch (error) {
        console.error('❌ Error regenerating review precomputed sets:', error)
        // エラーがあっても設定保存は成功させる（事前セット再生成は副次的な処理）
      }
    }

    return NextResponse.json({
      success: true,
      message: '復習設定を更新しました'
    })

  } catch (error) {
    console.error('❌ Error updating review settings:', error)
    return NextResponse.json(
      { success: false, error: '復習設定の更新に失敗しました' },
      { status: 500 }
    )
  }
}