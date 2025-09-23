import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 サブカテゴリー名とIDの整合性をチェックします...')

    // 修正したサブカテゴリー名の一覧
    const modifiedSubcategories = [
      "AI・機械学習活用",
      "DX戦略・デジタル変革", 
      "データドリブン経営",
      "業務システム設計",
      "継続案件獲得・拡販戦略",
      "プロジェクト炎上対応・リカバリー",
      "ブランディング・ポジショニング",
      "営業戦略・CRM",
      "事業計画・資金調達",
      "多国間三国間取引"
    ]

    // quiz_questionsから修正されたサブカテゴリーのデータを取得
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_questions')
      .select('subcategory, subcategory_id, category_id')
      .in('subcategory', modifiedSubcategories)

    if (quizError) {
      throw new Error(`quiz_questions取得エラー: ${quizError.message}`)
    }

    // subcategoriesテーブルから対応するデータを取得
    const { data: subcategoriesData, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('subcategory_id, name, parent_category_id')
      .in('name', modifiedSubcategories)

    if (subcategoriesError) {
      throw new Error(`subcategories取得エラー: ${subcategoriesError.message}`)
    }

    // サブカテゴリー名からIDへのマッピングを作成
    const nameToIdMap = new Map(subcategoriesData?.map(sub => [sub.name, sub.subcategory_id]) || [])
    const nameToParentMap = new Map(subcategoriesData?.map(sub => [sub.name, sub.parent_category_id]) || [])

    // 整合性チェック
    const inconsistencies: Array<{
      subcategory: string
      currentId: string
      expectedId: string
      currentCategory: string
      expectedCategory: string
      issue: string
    }> = []

    const uniqueQuizData = new Map()
    quizData?.forEach(quiz => {
      const key = `${quiz.subcategory}_${quiz.subcategory_id}_${quiz.category_id}`
      if (!uniqueQuizData.has(key)) {
        uniqueQuizData.set(key, quiz)
      }
    })

    Array.from(uniqueQuizData.values()).forEach(quiz => {
      const expectedId = nameToIdMap.get(quiz.subcategory)
      const expectedCategory = nameToParentMap.get(quiz.subcategory)

      if (expectedId && quiz.subcategory_id !== expectedId) {
        inconsistencies.push({
          subcategory: quiz.subcategory,
          currentId: quiz.subcategory_id,
          expectedId: expectedId,
          currentCategory: quiz.category_id,
          expectedCategory: expectedCategory || '',
          issue: 'サブカテゴリーIDが不整合'
        })
      }

      if (expectedCategory && quiz.category_id !== expectedCategory) {
        inconsistencies.push({
          subcategory: quiz.subcategory,
          currentId: quiz.subcategory_id,
          expectedId: expectedId || '',
          currentCategory: quiz.category_id,
          expectedCategory: expectedCategory,
          issue: 'カテゴリーIDが不整合'
        })
      }
    })

    console.log(`📊 名前・ID整合性チェック完了: ${inconsistencies.length}件の不整合を発見`)

    return NextResponse.json({
      message: 'サブカテゴリー名・ID整合性チェック完了',
      summary: {
        checkedSubcategories: modifiedSubcategories.length,
        foundInQuestions: uniqueQuizData.size,
        foundInMaster: subcategoriesData?.length || 0,
        inconsistencies: inconsistencies.length
      },
      inconsistencies,
      modifiedSubcategories,
      subcategoriesMapping: Object.fromEntries(nameToIdMap),
      categoryMapping: Object.fromEntries(nameToParentMap)
    })

  } catch (error) {
    console.error('名前・ID整合性チェックAPI エラー:', error)
    return NextResponse.json(
      { 
        error: '名前・ID整合性チェックに失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}