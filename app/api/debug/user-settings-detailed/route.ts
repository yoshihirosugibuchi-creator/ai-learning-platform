import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * user_settingsテーブル詳細確認
 * GET /api/debug/user-settings-detailed
 */
export async function GET(_request: NextRequest) {
  try {
    const TEST_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

    console.log('🔍 Detailed user_settings investigation...')

    // 1. すべてのuser_settingsを確認
    const { data: allSettings, error: allError } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', TEST_USER_ID)

    console.log('📊 All user_settings for user:', {
      count: allSettings?.length || 0,
      settings: allSettings,
      error: allError
    })

    // 2. 特定のsetting_keyでフィルター
    const targetKeys = ['selected_categories', 'selected_industry_categories', 'learning_goals', 'learning_level']
    const filteredResults: any = {}

    for (const key of targetKeys) {
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .eq('setting_key', key)

      filteredResults[key] = {
        data: data || [],
        error,
        count: data?.length || 0
      }
      console.log(`🔍 Setting key '${key}':`, filteredResults[key])
    }

    // 3. user_settingsテーブルの全体構造確認
    const { data: sampleSettings, error: sampleError } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .limit(5)

    console.log('📋 Sample user_settings (any user):', {
      sample: sampleSettings,
      error: sampleError
    })

    // 4. 元のクエリを再実行
    const { data: originalQuery, error: originalError } = await supabaseAdmin
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', TEST_USER_ID)
      .in('setting_key', targetKeys)

    console.log('🔄 Original query result:', {
      data: originalQuery,
      error: originalError,
      count: originalQuery?.length || 0
    })

    return NextResponse.json({
      success: true,
      testUserId: TEST_USER_ID,
      results: {
        allSettings: allSettings || [],
        filteredByKey: filteredResults,
        sampleSettings: sampleSettings || [],
        originalQuery: originalQuery || []
      },
      errors: {
        allError,
        sampleError,
        originalError
      },
      analysis: {
        totalSettingsForUser: allSettings?.length || 0,
        hasAnySettings: (allSettings?.length || 0) > 0,
        targetKeysFound: Object.keys(filteredResults).filter(key => 
          filteredResults[key].count > 0
        )
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in detailed user settings check:', error)
    return NextResponse.json(
      { error: '詳細確認に失敗しました', details: error },
      { status: 500 }
    )
  }
}