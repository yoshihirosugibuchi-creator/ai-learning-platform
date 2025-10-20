import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// クイズ問題分布分析API
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック（admin または system_admin）
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    
    console.log('🔍 Admin: Fetching quiz distribution analysis')
    
    // カテゴリー・サブカテゴリー・難易度別の問題数と出題頻度を取得
    const { data: distributionData, error: distributionError } = await supabaseAdmin
      .from('quiz_questions')
      .select(`
        category_id,
        subcategory_id,
        difficulty,
        id,
        created_at,
        updated_at
      `)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('category_id', { ascending: true })
    
    if (distributionError) {
      console.error('❌ Distribution query error:', distributionError)
      return NextResponse.json(
        { error: 'Failed to fetch distribution data', details: distributionError.message },
        { status: 500 }
      )
    }
    
    // カテゴリー情報を取得（Coming Soonも含む全カテゴリー）
    const { data: categories, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('category_id, name, type, description, is_active, is_visible')
      .eq('is_visible', true)  // 管理画面で表示するカテゴリーのみ
      .order('type, display_order')
    
    if (categoryError) {
      console.error('❌ Categories query error:', categoryError)
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: categoryError.message },
        { status: 500 }
      )
    }
    
    // サブカテゴリー情報を取得
    const { data: subcategories, error: subcategoryError } = await supabaseAdmin
      .from('subcategories')
      .select('subcategory_id, name, parent_category_id, description')
      .order('name', { ascending: true })
    
    if (subcategoryError) {
      console.error('❌ Subcategories query error:', subcategoryError)
      return NextResponse.json(
        { error: 'Failed to fetch subcategories', details: subcategoryError.message },
        { status: 500 }
      )
    }
    
    // スキルレベル情報を取得
    const { data: skillLevels, error: skillError } = await supabaseAdmin
      .from('skill_levels')
      .select('id, name, description')
      .order('display_order', { ascending: true })
    
    if (skillError) {
      console.error('❌ Skill levels query error:', skillError)
      return NextResponse.json(
        { error: 'Failed to fetch skill levels', details: skillError.message },
        { status: 500 }
      )
    }
    
    // 出題頻度データを取得（quiz_answersテーブルから直接、course関連は除外）
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('quiz_answers')
      .select(`
        created_at,
        question_id,
        category_id,
        subcategory_id,
        difficulty
      `)
      .not('question_id', 'like', '%course%')  // course関連のquestion_idを除外
      .order('created_at', { ascending: false })
    
    if (usageError) {
      console.error('❌ Usage data query error:', usageError)
      // エラーでも続行（使用データは補助的）
    }
    
    // データ集計処理 - すべての可能な組み合わせを生成
    const distribution: {[key: string]: any} = {}
    
    // すべての可能な組み合わせを初期化（Coming Soonも含む）
    categories?.forEach(category => {
      const categorySubcategories = subcategories?.filter(sub => sub.parent_category_id === category.category_id) || []
      
      categorySubcategories.forEach(subcategory => {
        skillLevels?.forEach(skillLevel => {
          const key = `${category.category_id}|${subcategory.subcategory_id}|${skillLevel.id}`
          
          distribution[key] = {
            category_id: category.category_id,
            subcategory_id: subcategory.subcategory_id,
            difficulty: skillLevel.id,
            question_count: 0,
            usage_count: 0,
            last_created: null,
            last_used: null
          }
        })
      })
    })
    
    // 実際の問題数集計
    distributionData?.forEach(question => {
      const key = `${question.category_id}|${question.subcategory_id || 'none'}|${question.difficulty || 'unknown'}`
      
      if (distribution[key]) {
        distribution[key].question_count++
        
        // 最新作成日時
        if (question.created_at && (!distribution[key].last_created || question.created_at > distribution[key].last_created)) {
          distribution[key].last_created = question.created_at
        }
      }
    })
    
    // 出題頻度集計
    usageData?.forEach(answer => {
      const key = `${answer.category_id}|${answer.subcategory_id || 'none'}|${answer.difficulty || 'unknown'}`
      
      if (distribution[key]) {
        distribution[key].usage_count += 1  // 1回の回答として集計
        
        // 最新使用日時
        if (answer.created_at && (!distribution[key].last_used || answer.created_at > distribution[key].last_used)) {
          distribution[key].last_used = answer.created_at
        }
      }
    })
    
    // カテゴリー別サマリー
    const categorySummary: {[key: string]: any} = {}
    Object.values(distribution).forEach((item: any) => {
      if (!categorySummary[item.category_id]) {
        const categoryInfo = categories?.find(c => c.category_id === item.category_id)
        categorySummary[item.category_id] = {
          category_id: item.category_id,
          name: categoryInfo?.name || item.category_id,
          type: categoryInfo?.type || 'main',
          description: categoryInfo?.description || '',
          is_active: categoryInfo?.is_active ?? true,
          total_questions: 0,
          total_usage: 0,
          subcategory_count: new Set(),
          difficulty_distribution: {}
        }
      }
      
      categorySummary[item.category_id].total_questions += item.question_count
      categorySummary[item.category_id].total_usage += item.usage_count
      
      if (item.subcategory_id) {
        categorySummary[item.category_id].subcategory_count.add(item.subcategory_id)
      }
      
      if (!categorySummary[item.category_id].difficulty_distribution[item.difficulty]) {
        categorySummary[item.category_id].difficulty_distribution[item.difficulty] = 0
      }
      categorySummary[item.category_id].difficulty_distribution[item.difficulty] += item.question_count
    })
    
    // Set を配列に変換
    Object.values(categorySummary).forEach((category: any) => {
      category.subcategory_count = category.subcategory_count.size
    })
    
    console.log(`✅ Admin: Distribution analysis completed - ${Object.keys(distribution).length} combinations`)
    
    return NextResponse.json({
      success: true,
      distribution: Object.values(distribution),
      category_summary: Object.values(categorySummary),
      metadata: {
        categories,
        subcategories,
        skill_levels: skillLevels,
        total_combinations: Object.keys(distribution).length,
        total_questions: distributionData?.length || 0,
        retrieved_at: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Admin distribution analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}