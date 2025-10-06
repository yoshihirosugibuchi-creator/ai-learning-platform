/**
 * 正答率計算ユーティリティ
 * ランダムクイズ用の全体正答率計算を提供
 */

interface CategoryProgress {
  category_id: string
  correct_answers: number
  total_answers: number
}

interface OverallAccuracy {
  accuracy: number
  totalCorrect: number
  totalAnswered: number
  confidence: 'high' | 'medium' | 'low'
  hasData: boolean
}

/**
 * カテゴリー進捗データから全体正答率を計算
 */
export function calculateOverallAccuracy(categoryProgress: CategoryProgress[]): OverallAccuracy {
  if (!categoryProgress || categoryProgress.length === 0) {
    return {
      accuracy: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      confidence: 'low',
      hasData: false
    }
  }

  // 全カテゴリーの合計を計算
  const totalCorrect = categoryProgress.reduce((sum, cp) => sum + cp.correct_answers, 0)
  const totalAnswered = categoryProgress.reduce((sum, cp) => sum + cp.total_answers, 0)

  if (totalAnswered === 0) {
    return {
      accuracy: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      confidence: 'low',
      hasData: false
    }
  }

  const accuracy = totalCorrect / totalAnswered

  // データ信頼度を判定
  let confidence: 'high' | 'medium' | 'low'
  if (totalAnswered >= 50) {
    confidence = 'high'
  } else if (totalAnswered >= 20) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    accuracy,
    totalCorrect,
    totalAnswered,
    confidence,
    hasData: true
  }
}

/**
 * 正答率に基づく難易度配分を決定
 */
export function getDifficultyDistributionByAccuracy(accuracy: number): Record<string, number> {
  if (accuracy < 0.5) {
    // 正答率50%未満: 基礎重視
    return { '基礎': 6, '中級': 3, '上級': 1, 'エキスパート': 0 }
  } else if (accuracy < 0.7) {
    // 正答率50-70%: 中級重視
    return { '基礎': 3, '中級': 5, '上級': 2, 'エキスパート': 0 }
  } else if (accuracy < 0.85) {
    // 正答率70-85%: 上級重視
    return { '基礎': 2, '中級': 3, '上級': 4, 'エキスパート': 1 }
  } else {
    // 正答率85%以上: エキスパート重視
    return { '基礎': 1, '中級': 2, '上級': 4, 'エキスパート': 3 }
  }
}

/**
 * デフォルト配分（初回ユーザー用）
 */
export function getDefaultDifficultyDistribution(): Record<string, number> {
  return { '基礎': 4, '中級': 4, '上級': 2, 'エキスパート': 0 }
}

/**
 * type='main'カテゴリーのみの正答率を計算
 */
export function calculateMainCategoryAccuracy(
  categoryProgress: CategoryProgress[], 
  mainCategoryIds: string[]
): OverallAccuracy {
  const mainCategoryProgress = categoryProgress.filter(cp => 
    mainCategoryIds.includes(cp.category_id)
  )
  
  return calculateOverallAccuracy(mainCategoryProgress)
}