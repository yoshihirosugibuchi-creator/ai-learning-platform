import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * シンプルなデバッグ用: user_settingsテーブルの状況確認
 * GET /api/debug/user-settings-simple
 */
export async function GET(_request: NextRequest) {
  try {
    // 特定ユーザーのIDで直接確認（認証不要のデバッグ用）
    const TEST_USER_ID = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'

    // user_settingsテーブルから全設定を確認
    const { data: allSettings, error: allError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', TEST_USER_ID)

    // review_settings専用確認
    const { data: reviewSettings, error: reviewError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('setting_key', 'review_settings')

    console.log(`🔍 Simple Debug: user_settings for ${TEST_USER_ID}`)
    console.log('All settings count:', allSettings?.length || 0)
    console.log('All settings:', allSettings)
    console.log('Review settings count:', reviewSettings?.length || 0)
    console.log('Review settings:', reviewSettings)

    return NextResponse.json({
      success: true,
      userId: TEST_USER_ID,
      allSettings: allSettings || [],
      reviewSettings: reviewSettings || [],
      errors: { allError, reviewError },
      count: {
        total: allSettings?.length || 0,
        review: reviewSettings?.length || 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in simple debug:', error)
    return NextResponse.json(
      { error: 'デバッグ実行に失敗しました', details: error },
      { status: 500 }
    )
  }
}