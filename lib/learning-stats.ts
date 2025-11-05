import { supabaseAdmin } from '@/lib/supabase-admin'
import { CategoryLearningStats, SubcategoryLearningStats } from './learning-balance-utils'

/**
 * ユーザーのカテゴリー別学習統計を取得
 * バランス学習で優先すべきカテゴリーを特定
 */
export async function getUserCategoryStats(userId: string): Promise<CategoryLearningStats[]> {
  try {
    console.log('📊 Analyzing user category learning stats for:', userId.substring(0, 8) + '...')

    // quiz_answersから問題別の回答履歴を取得
    const { data: answers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select(`
        category_id,
        created_at,
        is_correct
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500) // 直近500問の回答

    if (error) {
      console.error('❌ Error fetching quiz answers:', error)
      return []
    }

    if (!answers || answers.length === 0) {
      console.log('ℹ️ No quiz answers found for user')
      return []
    }

    // カテゴリー別集計
    const categoryMap = new Map<string, {
      totalAnswers: number
      correctAnswers: number
      lastStudied: Date
    }>()

    answers.forEach(answer => {
      const categoryId = answer.category_id
      if (!categoryId || !answer.created_at) return

      const existing = categoryMap.get(categoryId) || {
        totalAnswers: 0,
        correctAnswers: 0,
        lastStudied: new Date(0)
      }

      const answerDate = new Date(answer.created_at)
      
      categoryMap.set(categoryId, {
        totalAnswers: existing.totalAnswers + 1,
        correctAnswers: existing.correctAnswers + (answer.is_correct ? 1 : 0),
        lastStudied: answerDate > existing.lastStudied ? answerDate : existing.lastStudied
      })
    })

    // 統計情報として変換・優先度計算
    const categoryStats = Array.from(categoryMap.entries()).map(([categoryId, data]) => {
      const accuracy = data.totalAnswers > 0 ? data.correctAnswers / data.totalAnswers : 0
      const daysSinceStudy = Math.floor(
        (Date.now() - data.lastStudied.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 優先度スコア計算（低いほど優先）
      const priorityScore = calculatePriorityScore({
        answerCount: data.totalAnswers,
        accuracy,
        daysSinceStudy
      })

      return {
        categoryId,
        totalAnswers: data.totalAnswers,
        accuracy,
        lastStudiedDays: daysSinceStudy,
        priorityScore,
        correctAnswers: data.correctAnswers
      }
    }).sort((a, b) => a.priorityScore - b.priorityScore) // 優先度順（低い方が優先）

    console.log('📊 Category learning stats computed:', {
      totalCategories: categoryStats.length,
      totalAnswers: answers.length,
      topPriorities: categoryStats.slice(0, 3).map(c => ({
        categoryId: c.categoryId,
        answers: c.totalAnswers,
        accuracy: `${(c.accuracy * 100).toFixed(1)}%`,
        daysSince: c.lastStudiedDays,
        priority: c.priorityScore.toFixed(2)
      }))
    })

    return categoryStats

  } catch (error) {
    console.error('❌ Error in getUserCategoryStats:', error)
    return []
  }
}

/**
 * ユーザーのサブカテゴリー別学習統計を取得（カテゴリー指定クイズ用）
 * 指定カテゴリー内のサブカテゴリー間バランス学習で使用
 */
export async function getUserSubcategoryStats(
  userId: string, 
  categoryId?: string
): Promise<SubcategoryLearningStats[]> {
  try {
    console.log('📊 Analyzing user subcategory learning stats for:', {
      userId: userId.substring(0, 8) + '...',
      categoryId
    })

    // quiz_answersからサブカテゴリー別の回答履歴を取得
    let query = supabaseAdmin
      .from('quiz_answers')
      .select(`
        subcategory_id,
        category_id,
        created_at,
        is_correct
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500) // 直近500問の回答

    // カテゴリー指定がある場合はフィルタリング
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: answers, error } = await query

    if (error) {
      console.error('❌ Error fetching quiz answers for subcategories:', error)
      return []
    }

    if (!answers || answers.length === 0) {
      console.log('ℹ️ No quiz answers found for subcategories')
      return []
    }

    // サブカテゴリー別集計
    const subcategoryMap = new Map<string, {
      totalAnswers: number
      correctAnswers: number
      lastStudied: Date
      categoryId: string
    }>()

    answers.forEach(answer => {
      const subcategoryId = answer.subcategory_id || 'category_level'
      const answerCategoryId = answer.category_id
      
      if (!answer.created_at || !answerCategoryId) return

      const existing = subcategoryMap.get(subcategoryId) || {
        totalAnswers: 0,
        correctAnswers: 0,
        lastStudied: new Date(0),
        categoryId: answerCategoryId
      }

      const answerDate = new Date(answer.created_at)
      
      subcategoryMap.set(subcategoryId, {
        totalAnswers: existing.totalAnswers + 1,
        correctAnswers: existing.correctAnswers + (answer.is_correct ? 1 : 0),
        lastStudied: answerDate > existing.lastStudied ? answerDate : existing.lastStudied,
        categoryId: answerCategoryId
      })
    })

    // 統計情報として変換・優先度計算
    const subcategoryStats = Array.from(subcategoryMap.entries()).map(([subcategoryId, data]) => {
      const accuracy = data.totalAnswers > 0 ? data.correctAnswers / data.totalAnswers : 0
      const daysSinceStudy = Math.floor(
        (Date.now() - data.lastStudied.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 優先度スコア計算（低いほど優先）
      const priorityScore = calculatePriorityScore({
        answerCount: data.totalAnswers,
        accuracy,
        daysSinceStudy
      })

      return {
        subcategoryId,
        categoryId: data.categoryId,
        totalAnswers: data.totalAnswers,
        accuracy,
        lastStudiedDays: daysSinceStudy,
        priorityScore,
        correctAnswers: data.correctAnswers
      }
    }).sort((a, b) => a.priorityScore - b.priorityScore) // 優先度順（低い方が優先）

    console.log('📊 Subcategory learning stats computed:', {
      totalSubcategories: subcategoryStats.length,
      targetCategory: categoryId,
      topPriorities: subcategoryStats.slice(0, 3).map(s => ({
        subcategoryId: s.subcategoryId,
        answers: s.totalAnswers,
        accuracy: `${(s.accuracy * 100).toFixed(1)}%`,
        daysSince: s.lastStudiedDays,
        priority: s.priorityScore.toFixed(2)
      }))
    })

    return subcategoryStats

  } catch (error) {
    console.error('❌ Error in getUserSubcategoryStats:', error)
    return []
  }
}

/**
 * 優先度スコア計算
 * 回答数少ない・正解率低い・時間経過が大きい ほど高優先度（低スコア）
 */
function calculatePriorityScore(stats: {
  answerCount: number
  accuracy: number
  daysSinceStudy: number
}): number {
  const countWeight = 0.4    // 回答数重み
  const accuracyWeight = 0.3 // 正解率重み
  const timeWeight = 0.3     // 時間経過重み

  // 各要素を0-1の範囲で正規化
  const countScore = Math.max(0, 1 - (stats.answerCount / 50))   // 50問を上限（少ないほど高スコア）
  const accuracyScore = Math.max(0, 1 - stats.accuracy)          // 低い正解率ほど高スコア
  const timeScore = Math.min(1, stats.daysSinceStudy / 30)       // 30日を上限（時間経過が長いほど高スコア）

  const finalScore = countScore * countWeight +
                    accuracyScore * accuracyWeight +
                    timeScore * timeWeight

  console.log('🎯 Priority calculation for category:', {
    answerCount: stats.answerCount,
    accuracy: `${(stats.accuracy * 100).toFixed(1)}%`,
    daysSinceStudy: stats.daysSinceStudy,
    scores: {
      count: countScore.toFixed(2),
      accuracy: accuracyScore.toFixed(2),
      time: timeScore.toFixed(2)
    },
    finalScore: finalScore.toFixed(2)
  })

  return finalScore
}

// 純粋関数 calculateBalancedDistribution と getCategoryStatsSummary は
// learning-balance-utils.ts に移動済み（クライアントサイド安全）