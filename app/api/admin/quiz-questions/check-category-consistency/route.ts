import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 カテゴリーとサブカテゴリーの整合性をチェックします...')

    // 1. quiz_questionsのカテゴリー・サブカテゴリー組み合わせを取得
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_questions')
      .select('category_id, subcategory, subcategory_id')

    if (quizError) {
      throw new Error(`quiz_questions取得エラー: ${quizError.message}`)
    }

    // 2. subcategoriesテーブルのデータを取得
    const { data: subcategoriesData, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('subcategory_id, name, parent_category_id')

    if (subcategoriesError) {
      throw new Error(`subcategories取得エラー: ${subcategoriesError.message}`)
    }

    // 3. categoriesテーブルのデータを取得
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('category_id, name')

    if (categoriesError) {
      throw new Error(`categories取得エラー: ${categoriesError.message}`)
    }

    // サブカテゴリーマップを作成
    const subcategoryMap = new Map(subcategoriesData?.map(sub => [sub.subcategory_id, sub]) || [])
    const categoryMap = new Map(categoriesData?.map(cat => [cat.category_id, cat]) || [])

    // 整合性チェック
    const inconsistencies: Array<{
      id?: number
      category: string
      subcategory: string
      subcategory_id: string
      issue: string
      expectedCategory?: string
      foundInSubcategoriesTable?: boolean
    }> = []

    quizData?.forEach(quiz => {
      // category_levelは特別扱い
      if (quiz.subcategory_id === 'category_level') {
        return
      }

      const subcategoryRecord = subcategoryMap.get(quiz.subcategory_id)
      
      if (!subcategoryRecord) {
        inconsistencies.push({
          category: quiz.category_id,
          subcategory: quiz.subcategory,
          subcategory_id: quiz.subcategory_id,
          issue: 'サブカテゴリーIDがsubcategoriesテーブルに存在しない',
          foundInSubcategoriesTable: false
        })
      } else {
        // カテゴリーとの整合性チェック
        if (quiz.category_id !== subcategoryRecord.parent_category_id) {
          inconsistencies.push({
            category: quiz.category_id,
            subcategory: quiz.subcategory,
            subcategory_id: quiz.subcategory_id,
            issue: 'カテゴリーとサブカテゴリーの関係が不整合',
            expectedCategory: subcategoryRecord.parent_category_id,
            foundInSubcategoriesTable: true
          })
        }

        // サブカテゴリー名の整合性チェック
        if (quiz.subcategory !== subcategoryRecord.name) {
          inconsistencies.push({
            category: quiz.category_id,
            subcategory: quiz.subcategory,
            subcategory_id: quiz.subcategory_id,
            issue: 'サブカテゴリー名が不整合',
            expectedCategory: subcategoryRecord.parent_category_id,
            foundInSubcategoriesTable: true
          })
        }
      }
    })

    // サマリー統計
    const stats = {
      totalQuestions: quizData?.length || 0,
      totalInconsistencies: inconsistencies.length,
      uniqueCategories: new Set(quizData?.map(q => q.category_id)).size,
      uniqueSubcategories: new Set(quizData?.map(q => q.subcategory_id)).size,
      subcategoriesInMaster: subcategoriesData?.length || 0
    }

    // 特に注意すべき問題（RPAとノーコード）
    const rpaNoCodeQuestions = quizData?.filter(q => 
      q.subcategory === '業務システム設計' && 
      (q.category_id === 'ai_digital_utilization' || q.category_id === 'business_process_analysis')
    ) || []

    console.log(`📊 整合性チェック完了: ${inconsistencies.length}件の不整合を発見`)

    return NextResponse.json({
      message: 'カテゴリー・サブカテゴリー整合性チェック完了',
      stats,
      inconsistencies,
      rpaNoCodeQuestions,
      details: {
        categories: Array.from(categoryMap.values()),
        subcategories: Array.from(subcategoryMap.values()).slice(0, 20), // 最初の20件のみ
        totalSubcategories: subcategoryMap.size
      }
    })

  } catch (error) {
    console.error('整合性チェックAPI エラー:', error)
    return NextResponse.json(
      { 
        error: '整合性チェックに失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}