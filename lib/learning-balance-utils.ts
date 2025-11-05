/**
 * 学習バランス計算ユーティリティ
 * クライアントサイドで安全に使用可能な純粋関数とタイプ定義
 */

/**
 * カテゴリー別学習統計情報
 */
export interface CategoryLearningStats {
  categoryId: string
  totalAnswers: number     // 学習問題数（回答した問題数）
  accuracy: number         // 正解率
  lastStudiedDays: number  // 最終学習からの経過日数
  priorityScore: number    // 算出優先度（低いほど優先）
  correctAnswers: number   // 正解数
}

/**
 * サブカテゴリー別学習統計情報（カテゴリー指定クイズ用）
 */
export interface SubcategoryLearningStats {
  subcategoryId: string
  categoryId: string       // 親カテゴリー
  totalAnswers: number     // 学習問題数
  accuracy: number         // 正解率
  lastStudiedDays: number  // 最終学習からの経過日数
  priorityScore: number    // 算出優先度（低いほど優先）
  correctAnswers: number   // 正解数
}

/**
 * バランス学習用のカテゴリー配分計算
 * 優先度の高いカテゴリーを多く配分
 */
export function calculateBalancedDistribution(
  categoryStats: CategoryLearningStats[],
  targetCategories: string[],
  totalQuestions: number = 10
): Record<string, number> {
  if (categoryStats.length === 0 || targetCategories.length === 0) {
    return {}
  }

  console.log('⚖️ Calculating balanced distribution:', {
    totalCategories: categoryStats.length,
    targetCategories: targetCategories.length,
    totalQuestions
  })

  // 対象カテゴリーのみを抽出
  const relevantStats = categoryStats.filter(stat => 
    targetCategories.includes(stat.categoryId)
  )

  if (relevantStats.length === 0) {
    console.warn('⚠️ No relevant category stats found')
    return {}
  }

  // 優先度スコアを逆転（高優先度を大きな値に）して重み計算
  const maxPriority = Math.max(...relevantStats.map(s => s.priorityScore))
  const minPriority = Math.min(...relevantStats.map(s => s.priorityScore))
  const range = maxPriority - minPriority || 1

  const distribution: Record<string, number> = {}
  let totalWeight = 0

  // 各カテゴリーの重みを計算
  relevantStats.forEach(stat => {
    // 優先度スコアが低いほど（優先度が高いほど）大きな重みを持つ
    const normalizedPriority = (maxPriority - stat.priorityScore) / range
    const weight = Math.max(0.1, normalizedPriority + 0.2) // 最小10%の重みを保証
    distribution[stat.categoryId] = weight
    totalWeight += weight
  })

  // 正規化して合計を1.0にする
  Object.keys(distribution).forEach(categoryId => {
    distribution[categoryId] = distribution[categoryId] / totalWeight
  })

  console.log('⚖️ Balanced distribution calculated:', {
    distribution: Object.entries(distribution).map(([id, ratio]) => ({
      categoryId: id,
      ratio: `${(ratio * 100).toFixed(1)}%`,
      questions: Math.round(ratio * totalQuestions)
    }))
  })

  return distribution
}

/**
 * カテゴリー別統計の可視化用サマリー
 */
export function getCategoryStatsSummary(stats: CategoryLearningStats[]): {
  mostStudied: CategoryLearningStats | null
  leastStudied: CategoryLearningStats | null
  highestAccuracy: CategoryLearningStats | null
  lowestAccuracy: CategoryLearningStats | null
  mostRecentlyStudied: CategoryLearningStats | null
  longestTimeSinceStudy: CategoryLearningStats | null
} {
  if (stats.length === 0) {
    return {
      mostStudied: null,
      leastStudied: null,
      highestAccuracy: null,
      lowestAccuracy: null,
      mostRecentlyStudied: null,
      longestTimeSinceStudy: null
    }
  }

  const sortedByAnswers = [...stats].sort((a, b) => b.totalAnswers - a.totalAnswers)
  const sortedByAccuracy = [...stats].sort((a, b) => b.accuracy - a.accuracy)
  const sortedByRecency = [...stats].sort((a, b) => a.lastStudiedDays - b.lastStudiedDays)

  return {
    mostStudied: sortedByAnswers[0],
    leastStudied: sortedByAnswers[sortedByAnswers.length - 1],
    highestAccuracy: sortedByAccuracy[0],
    lowestAccuracy: sortedByAccuracy[sortedByAccuracy.length - 1],
    mostRecentlyStudied: sortedByRecency[0],
    longestTimeSinceStudy: sortedByRecency[sortedByRecency.length - 1]
  }
}