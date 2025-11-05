import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * サブカテゴリー処理テスト: セルフパーソナライズでサブカテゴリーまで正しく取得するかテスト
 * GET /api/debug/subcategory-test
 */
export async function GET(_request: NextRequest) {
  try {
    const TEST_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

    console.log('🧪 Testing subcategory processing for self-personalized quiz...')

    // 1. user_settingsからquiz_personalization取得
    const { data: userSettings, error } = await supabaseAdmin
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', TEST_USER_ID)
      .eq('setting_key', 'quiz_personalization')
      .single()

    if (error || !userSettings?.setting_value) {
      return NextResponse.json({ error: 'No quiz personalization settings found' })
    }

    const personalizedSettings = typeof userSettings.setting_value === 'string' 
      ? JSON.parse(userSettings.setting_value) 
      : userSettings.setting_value

    // 2. カテゴリーを整理
    const basicCategories = personalizedSettings.basicCategories || []
    const industryCategories = personalizedSettings.industryCategories || []
    const industrySubcategories = personalizedSettings.industrySubcategories || []
    const allCategories = [...basicCategories, ...industryCategories, ...industrySubcategories]

    console.log('📊 Categories breakdown:', {
      basicCategories,
      industryCategories, 
      industrySubcategories,
      totalCount: allCategories.length
    })

    // 3. category_idでマッチする問題を検索
    const { data: categoryQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory_id, difficulty')
      .in('category_id', allCategories)
      .eq('is_deleted', false)
      .limit(100)

    // 4. subcategory_idでマッチする問題を検索
    const { data: subcategoryQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory_id, difficulty')
      .in('subcategory_id', industrySubcategories)
      .eq('is_deleted', false)
      .limit(100)

    // 5. 修正後のORクエリをテスト
    const { data: combinedQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory_id, difficulty')
      .or(`category_id.in.(${allCategories.join(',')}),subcategory_id.in.(${allCategories.join(',')})`)
      .eq('is_deleted', false)
      .limit(100)

    const analysis = {
      categories: {
        basic: basicCategories,
        industry: industryCategories,
        industrySubcategories: industrySubcategories,
        totalCategories: allCategories.length
      },
      questions: {
        fromCategoryId: categoryQuestions?.length || 0,
        fromSubcategoryId: subcategoryQuestions?.length || 0,
        fromCombinedQuery: combinedQuestions?.length || 0
      },
      sampleQuestions: {
        categoryMatches: categoryQuestions?.slice(0, 3) || [],
        subcategoryMatches: subcategoryQuestions?.slice(0, 3) || [],
        combinedMatches: combinedQuestions?.slice(0, 5) || []
      },
      subcategorySupport: {
        hasSubcategories: industrySubcategories.length > 0,
        subcategoryQuestionsFound: (subcategoryQuestions?.length || 0) > 0,
        improvement: (combinedQuestions?.length || 0) > (categoryQuestions?.length || 0)
      }
    }

    console.log('📊 Subcategory processing analysis:', analysis)

    return NextResponse.json({
      success: true,
      testUserId: TEST_USER_ID,
      analysis,
      message: analysis.subcategorySupport.subcategoryQuestionsFound 
        ? '✅ Subcategories are properly supported and questions found'
        : '⚠️ Subcategories defined but no matching questions found',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in subcategory test:', error)
    return NextResponse.json(
      { error: 'サブカテゴリーテストに失敗しました', details: error },
      { status: 500 }
    )
  }
}