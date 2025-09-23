/**
 * カテゴリー制御ユーティリティ
 * 
 * 非アクティブカテゴリーのクイズやコース学習制御機能
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface CategoryStatus {
  category_id: string
  name: string
  is_active: boolean
  is_visible: boolean
  type: 'main' | 'industry'
  activation_date?: string
  deactivation_reason?: string
}

export interface CategoryControlResult {
  allowedCategories: string[]
  blockedCategories: string[]
  warnings: string[]
}

/**
 * アクティブなカテゴリーのみを取得
 */
export async function getActiveCategories(): Promise<CategoryStatus[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name, is_active, is_visible, type, activation_date')
    .eq('is_active', true)
    .eq('is_visible', true)
    .order('type, display_order')

  if (error) {
    console.error('Error fetching active categories:', error)
    return []
  }

  return data || []
}

/**
 * クイズ取得時のカテゴリー制御
 */
export async function filterQuizzesByActiveCategories(
  baseQuery: Record<string, unknown>,
  requestedCategory?: string
): Promise<CategoryControlResult> {
  const result: CategoryControlResult = {
    allowedCategories: [],
    blockedCategories: [],
    warnings: []
  }

  try {
    // アクティブなカテゴリーを取得
    const activeCategories = await getActiveCategories()
    const activeCategoryIds = activeCategories.map(cat => cat.category_id)
    
    result.allowedCategories = activeCategoryIds

    // 特定のカテゴリーがリクエストされている場合
    if (requestedCategory) {
      if (!activeCategoryIds.includes(requestedCategory)) {
        const categoryInfo = await getCategoryInfo(requestedCategory)
        result.blockedCategories.push(requestedCategory)
        result.warnings.push(
          `カテゴリー "${categoryInfo?.name || requestedCategory}" は現在利用できません。`
        )
        return result
      }
    }

    return result
  } catch (error) {
    console.error('Error in category control:', error)
    result.warnings.push('カテゴリー制御処理でエラーが発生しました。')
    return result
  }
}

/**
 * コース学習のカテゴリー制御
 */
export async function filterCourseLearningByActiveCategories(): Promise<CategoryControlResult> {
  const result: CategoryControlResult = {
    allowedCategories: [],
    blockedCategories: [],
    warnings: []
  }

  try {
    const activeCategories = await getActiveCategories()
    result.allowedCategories = activeCategories.map(cat => cat.category_id)
    
    // 学習コースデータから非アクティブカテゴリーを使用しているものをチェック
    // (この部分は実際の学習コースデータ構造に応じて実装)
    
    return result
  } catch (error) {
    console.error('Error in course learning category control:', error)
    result.warnings.push('コース学習カテゴリー制御処理でエラーが発生しました。')
    return result
  }
}

/**
 * カテゴリー情報を取得
 */
export async function getCategoryInfo(categoryId: string): Promise<CategoryStatus | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name, is_active, is_visible, type, activation_date')
    .eq('category_id', categoryId)
    .single()

  if (error) {
    console.error('Error fetching category info:', error)
    return null
  }

  return data
}

/**
 * 管理者向け：カテゴリーの一括アクティブ状態チェック
 */
export async function getCategoriesWithUsageStats(): Promise<Array<{
  category: CategoryStatus
  quizCount: number
  activeQuizCount: number
  courseUsage: boolean
}>> {
  try {
    // カテゴリー情報を取得
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('category_id, name, is_active, is_visible, type, activation_date')
      .order('type, display_order')

    if (categoryError) throw categoryError

    // 各カテゴリーのクイズ数を取得
    const result = await Promise.all(
      (categories || []).map(async (category) => {
        const { data: quizzes, error: quizError } = await supabase
          .from('quiz_questions')
          .select('id, is_active')
          .eq('category_id', category.category_id)

        const quizCount = quizzes?.length || 0
        const activeQuizCount = quizzes?.filter(q => q.is_active).length || 0

        return {
          category,
          quizCount,
          activeQuizCount,
          courseUsage: false // TODO: 実際のコース学習データとの照合
        }
      })
    )

    return result
  } catch (error) {
    console.error('Error fetching categories with usage stats:', error)
    return []
  }
}

/**
 * ユーザー向け通知メッセージ生成
 */
export function generateCategoryNotificationMessage(
  blockedCategories: string[],
  categoryNames: Record<string, string>
): string {
  if (blockedCategories.length === 0) {
    return ''
  }

  if (blockedCategories.length === 1) {
    const categoryName = categoryNames[blockedCategories[0]] || blockedCategories[0]
    return `「${categoryName}」カテゴリーは現在ご利用いただけません。他のカテゴリーをお試しください。`
  }

  const categoryNamesList = blockedCategories
    .map(id => categoryNames[id] || id)
    .join('、')
  
  return `「${categoryNamesList}」カテゴリーは現在ご利用いただけません。他のカテゴリーをお試しください。`
}

/**
 * 開発者向け：カテゴリー制御状態のデバッグ情報
 */
export async function getCategoryControlDebugInfo(): Promise<{
  totalCategories: number
  activeCategories: number
  inactiveCategories: number
  categoriesWithQuizzes: number
  categoriesInCourses: number
}> {
  try {
    const { data: allCategories } = await supabase
      .from('categories')
      .select('category_id, is_active, is_visible')

    const { data: categoriesWithQuizzes } = await supabase
      .from('quiz_questions')
      .select('category_id')
      .not('category_id', 'is', null)

    const total = allCategories?.length || 0
    const active = allCategories?.filter(cat => cat.is_active && cat.is_visible).length || 0
    const inactive = total - active
    const withQuizzes = new Set(categoriesWithQuizzes?.map(q => q.category_id)).size || 0

    return {
      totalCategories: total,
      activeCategories: active,
      inactiveCategories: inactive,
      categoriesWithQuizzes: withQuizzes,
      categoriesInCourses: 0 // TODO: 実装
    }
  } catch (error) {
    console.error('Error getting debug info:', error)
    return {
      totalCategories: 0,
      activeCategories: 0,
      inactiveCategories: 0,
      categoriesWithQuizzes: 0,
      categoriesInCourses: 0
    }
  }
}