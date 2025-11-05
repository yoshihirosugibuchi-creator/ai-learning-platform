import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'

/**
 * デバッグ用: ユーザーの復習設定を直接確認
 * GET /api/debug/review-settings
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // user_settingsテーブルから直接確認
    const { data: allSettings, error: allError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)

    const { data: reviewSettings, error: reviewError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('setting_key', 'review_settings')

    console.log(`🔍 Debug review settings for user ${userId}:`)
    console.log('All settings:', allSettings)
    console.log('Review settings:', reviewSettings)
    console.log('Errors:', { allError, reviewError })

    return NextResponse.json({
      success: true,
      userId,
      allSettings,
      reviewSettings,
      errors: { allError, reviewError },
      count: {
        total: allSettings?.length || 0,
        review: reviewSettings?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Error in debug review settings API:', error)
    return NextResponse.json(
      { error: 'デバッグ実行に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * デバッグ用: 復習設定を強制保存
 * POST /api/debug/review-settings
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { reviewQuestionsCount = 3 } = await request.json()

    const testSettings = {
      notificationEnabled: true,
      notificationIntervalDays: 3,
      reviewQuestionsCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 強制保存
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: 'review_settings',
        setting_value: JSON.stringify(testSettings),
        updated_at: new Date().toISOString()
      })
      .select()

    console.log(`🧪 Debug: Force saved review settings for user ${userId}:`, testSettings)
    console.log('Save result:', { data, error })

    return NextResponse.json({
      success: !error,
      userId,
      savedSettings: testSettings,
      result: { data, error }
    })

  } catch (error) {
    console.error('❌ Error in debug save review settings API:', error)
    return NextResponse.json(
      { error: 'デバッグ保存に失敗しました' },
      { status: 500 }
    )
  }
}