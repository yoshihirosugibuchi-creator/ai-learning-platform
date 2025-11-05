import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * クイズ生成データソース確認用テストAPI
 * GET /api/debug/quiz-data-source-test
 */
export async function GET(_request: NextRequest) {
  try {
    const TEST_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

    console.log('🧪 Testing quiz data source separation...')

    // セルフパーソナライズ用: user_settingsからquiz_personalization取得
    const { data: userSettings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', TEST_USER_ID)
      .eq('setting_key', 'quiz_personalization')
      .single()

    let selfPersonalizedData = null
    if (!settingsError && userSettings?.setting_value) {
      const personalizedSettings = typeof userSettings.setting_value === 'string' 
        ? JSON.parse(userSettings.setting_value) 
        : userSettings.setting_value
      
      selfPersonalizedData = {
        selected_categories: personalizedSettings.basicCategories || [],
        selected_industry_categories: personalizedSettings.industryCategories || [],
        learning_level: personalizedSettings.learningLevel || undefined
      }
    }

    console.log('📊 Self-Personalized data source (quiz_personalization):', {
      data: selfPersonalizedData,
      error: settingsError,
      hasData: !!selfPersonalizedData
    })

    // Business-AI用: usersテーブル確認
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('selected_categories, selected_industry_categories, learning_goals, learning_level')
      .eq('id', TEST_USER_ID)
      .single()

    console.log('🎯 Business-AI data source (users table):', {
      data: userData,
      error: userError
    })

    // データソース比較分析
    const selfCategories = selfPersonalizedData?.selected_categories || []
    const businessAICategories = userData?.selected_categories || []

    const analysis = {
      selfPersonalized: {
        source: 'user_settings.quiz_personalization.basicCategories',
        categories: selfCategories,
        count: Array.isArray(selfCategories) ? selfCategories.length : 0,
        learningLevel: selfPersonalizedData?.learning_level,
        industryCategories: selfPersonalizedData?.selected_industry_categories || []
      },
      businessAI: {
        source: 'users.selected_categories',
        categories: businessAICategories,
        count: Array.isArray(businessAICategories) ? businessAICategories.length : 0,
        learningLevel: userData?.learning_level,
        learningGoals: userData?.learning_goals
      },
      separation: {
        isDifferent: JSON.stringify(selfCategories) !== JSON.stringify(businessAICategories),
        selfHasData: !!selfPersonalizedData && Array.isArray(selfCategories) && selfCategories.length > 0,
        businessHasData: !!businessAICategories && Array.isArray(businessAICategories) && businessAICategories.length > 0,
        bothHaveData: (Array.isArray(selfCategories) && selfCategories.length > 0) && 
                      (Array.isArray(businessAICategories) && businessAICategories.length > 0)
      }
    }

    console.log('🔍 Data source separation analysis:', analysis)

    return NextResponse.json({
      success: true,
      testUserId: TEST_USER_ID,
      selfPersonalizedData: selfPersonalizedData || {},
      userData: userData || {},
      analysis,
      message: analysis.separation.bothHaveData 
        ? (analysis.separation.isDifferent 
          ? '✅ Data sources are properly separated with different data'
          : '⚠️ Data sources contain same data') 
        : (analysis.separation.selfHasData 
          ? '✅ Self-personalized has data, Business-AI uses fallback'
          : '✅ Business-AI has data, Self-personalized will skip generation'),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in quiz data source test:', error)
    return NextResponse.json(
      { error: 'テストの実行に失敗しました', details: error },
      { status: 500 }
    )
  }
}