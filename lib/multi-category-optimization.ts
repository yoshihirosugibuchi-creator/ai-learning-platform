import { Question } from './types'
import { UserProfileWithProgress } from './supabase-user'
import { getDifficultyDistributionByAccuracy, getDefaultDifficultyDistribution } from './accuracy-calculator'
import { getRandomQuestions } from './questions'

interface CategoryProgress {
  category_id: string
  correct_answers: number
  total_answers: number
}

interface AccuracyAnalysis {
  period: '1week' | '1month' | 'all'
  accuracy: number
  confidence: 'high' | 'medium' | 'low'
  sampleSize: number
  hasData: boolean
  correctAnswers: number
  totalAnswers: number
}

/**
 * API経由で期間限定正答率分析を実行（クライアントサイド用）
 */
async function getAccuracyAnalysisViaAPI(
  selectedCategories: string[],
  preferredPeriod: '1week' | '1month' = '1week'
): Promise<AccuracyAnalysis> {
  try {
    // Supabaseセッションからアクセストークンを取得
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    
    if (!accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch('/api/quiz/accuracy-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        selectedCategories,
        preferredPeriod
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Analysis failed')
    }

    return data.analysis
  } catch (error) {
    console.error('❌ Failed to get accuracy analysis via API:', error)
    // フォールバック: デフォルト値を返す
    return {
      period: 'all',
      accuracy: 0.7,
      confidence: 'low',
      sampleSize: 0,
      hasData: false,
      correctAnswers: 0,
      totalAnswers: 0
    }
  }
}

/**
 * 複数カテゴリー対応の最適化関数（セルフパーソナライズクイズ用）
 * クライアントサイドではAPI経由で期間限定正答率分析を実行
 */
export async function optimizeMultiCategoryQuestions(
  questions: Question[],
  userId: string,
  userProfile: UserProfileWithProgress | null,
  selectedCategories: string[]
): Promise<Question[]> {
  console.log('🎯 Multi-category optimization for self-personalized quiz (with period-based analysis)', {
    questionsCount: questions.length,
    selectedCategories: selectedCategories.length,
    userId: userId.substring(0, 8) + '...'
  })

  if (questions.length === 0) {
    console.log('⚠️ No questions available, returning empty array')
    return []
  }

  if (!userId || selectedCategories.length === 0) {
    console.log('⚠️ No user ID or selected categories, using random selection')
    return getRandomQuestions(questions, 10)
  }

  try {
    // 1. 期間限定正答率分析を実行（API経由でクライアントサイド対応）
    const multiCategoryAccuracy = await getAccuracyAnalysisViaAPI(
      selectedCategories,
      '1week' // 1週間のデータを優先
    )
    
    console.log('📊 Period-based multi-category accuracy analysis:', {
      selectedCategories,
      period: multiCategoryAccuracy.period,
      accuracy: `${(multiCategoryAccuracy.accuracy * 100).toFixed(1)}%`,
      confidence: multiCategoryAccuracy.confidence,
      hasData: multiCategoryAccuracy.hasData,
      sampleSize: multiCategoryAccuracy.sampleSize
    })

    // 2. データ信頼度が低い場合はデフォルト配分
    if (!multiCategoryAccuracy.hasData || multiCategoryAccuracy.confidence === 'low') {
      console.log('⚠️ Low data confidence, using default distribution')
      return optimizeByDistribution(questions, getDefaultDifficultyDistribution())
    }

    // 3. 正答率に基づく配分（期間限定分析結果を使用）
    const distribution = getDifficultyDistributionByAccuracy(multiCategoryAccuracy.accuracy)
    console.log('🎯 Using difficulty distribution based on period analysis:', {
      accuracy: `${(multiCategoryAccuracy.accuracy * 100).toFixed(1)}%`,
      period: multiCategoryAccuracy.period,
      distribution
    })
    
    return optimizeByDistribution(questions, distribution)

  } catch (error) {
    console.error('❌ Error in period-based multi-category optimization:', error)
    
    // エラー時はフォールバック: 従来の静的分析
    console.log('🔄 Falling back to static category progress analysis')
    const categoryProgress = userProfile?.categoryProgress || []
    const staticAccuracy = calculateMultiCategoryAccuracy(categoryProgress, selectedCategories)
    
    if (!staticAccuracy.hasData || staticAccuracy.confidence === 'low') {
      console.log('⚠️ Static analysis also has low confidence, using default distribution')
      return optimizeByDistribution(questions, getDefaultDifficultyDistribution())
    }
    
    const fallbackDistribution = getDifficultyDistributionByAccuracy(staticAccuracy.accuracy)
    return optimizeByDistribution(questions, fallbackDistribution)
  }
}

/**
 * 選択された複数カテゴリーの総合正答率を計算
 */
function calculateMultiCategoryAccuracy(
  categoryProgress: CategoryProgress[],
  selectedCategories: string[]
): {
  accuracy: number
  confidence: 'high' | 'medium' | 'low'
  hasData: boolean
  sampleSize: number
} {
  if (selectedCategories.length === 0) {
    return {
      accuracy: 0.7, // デフォルト70%
      confidence: 'low',
      hasData: false,
      sampleSize: 0
    }
  }

  // 選択カテゴリーの統計を集計
  let totalCorrect = 0
  let totalAnswers = 0
  let categoriesWithData = 0

  for (const categoryId of selectedCategories) {
    const categoryStats = categoryProgress.find(cp => cp.category_id === categoryId)
    
    if (categoryStats && categoryStats.total_answers > 0) {
      totalCorrect += categoryStats.correct_answers
      totalAnswers += categoryStats.total_answers
      categoriesWithData++
    }
  }

  console.log('📈 Multi-category stats calculation:', {
    selectedCategories: selectedCategories.length,
    categoriesWithData,
    totalAnswers,
    totalCorrect
  })

  // データがない場合
  if (totalAnswers === 0) {
    return {
      accuracy: 0.7, // デフォルト70%
      confidence: 'low',
      hasData: false,
      sampleSize: 0
    }
  }

  // 正答率計算
  const accuracy = totalCorrect / totalAnswers

  // 信頼度判定
  let confidence: 'high' | 'medium' | 'low'
  if (totalAnswers >= 50 && categoriesWithData >= Math.min(selectedCategories.length, 3)) {
    confidence = 'high'
  } else if (totalAnswers >= 20 && categoriesWithData >= 1) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    accuracy,
    confidence,
    hasData: true,
    sampleSize: totalAnswers
  }
}

/**
 * 難易度配分に基づく問題最適化
 */
function optimizeByDistribution(
  questions: Question[],
  distribution: Record<string, number>
): Question[] {
  const targetCount = 10
  
  // 難易度別に問題を分類
  const questionsByDifficulty: Record<string, Question[]> = {
    basic: [],
    intermediate: [],
    advanced: [],
    expert: [],
    mixed: []
  }

  questions.forEach(question => {
    const difficulty = question.difficulty || 'mixed'
    if (questionsByDifficulty[difficulty as string]) {
      questionsByDifficulty[difficulty as string].push(question)
    } else {
      questionsByDifficulty.mixed.push(question)
    }
  })

  console.log('📊 Questions by difficulty:', {
    basic: questionsByDifficulty.basic.length,
    intermediate: questionsByDifficulty.intermediate.length,
    advanced: questionsByDifficulty.advanced.length,
    expert: questionsByDifficulty.expert.length,
    mixed: questionsByDifficulty.mixed.length
  })

  // 配分に従って問題を選択
  const selectedQuestions: Question[] = []
  
  for (const [difficulty, ratio] of Object.entries(distribution)) {
    const targetForThisDifficulty = Math.round(targetCount * ratio)
    const availableQuestions = questionsByDifficulty[difficulty] || []
    
    // ランダムに選択
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, targetForThisDifficulty)
    
    selectedQuestions.push(...selected)
    
    console.log(`📊 ${difficulty}: ${selected.length}/${targetForThisDifficulty} questions (available: ${availableQuestions.length})`)
  }

  // 目標数に足りない場合は、mixed問題や残りの問題から補完
  if (selectedQuestions.length < targetCount) {
    const remainingCount = targetCount - selectedQuestions.length
    const usedIds = new Set(selectedQuestions.map(q => q.id))
    const unusedQuestions = questions.filter(q => !usedIds.has(q.id))
    
    const shuffledUnused = [...unusedQuestions].sort(() => Math.random() - 0.5)
    const additional = shuffledUnused.slice(0, remainingCount)
    
    selectedQuestions.push(...additional)
    
    console.log(`📊 Added ${additional.length} additional questions to reach target`)
  }

  // 最終的にシャッフルして順序をランダム化
  const finalQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5)
  
  console.log('✅ Final multi-category optimization result:', {
    total: finalQuestions.length,
    byDifficulty: {
      basic: finalQuestions.filter(q => q.difficulty === 'basic').length,
      intermediate: finalQuestions.filter(q => q.difficulty === 'intermediate').length,
      advanced: finalQuestions.filter(q => q.difficulty === 'advanced').length,
      expert: finalQuestions.filter(q => q.difficulty === 'expert').length,
      mixed: finalQuestions.filter(q => !q.difficulty || q.difficulty === 'mixed').length
    }
  })

  return finalQuestions.slice(0, targetCount)
}

/**
 * カテゴリーバランスを考慮した問題選出
 * 選択された複数カテゴリーから均等に問題を選出
 */
export function ensureCategoryBalance(
  selectedQuestions: Question[],
  selectedCategories: string[],
  targetCount: number = 10
): Question[] {
  if (selectedCategories.length === 0) {
    return selectedQuestions.slice(0, targetCount)
  }

  const maxPerCategory = Math.ceil(targetCount / selectedCategories.length)
  const categoryCount = new Map<string, number>()
  
  // カテゴリー別カウントを初期化
  selectedCategories.forEach(category => {
    categoryCount.set(category, 0)
  })

  const balanced: Question[] = []
  const remaining = [...selectedQuestions]

  // カテゴリーバランスを保ちながら選出
  while (balanced.length < targetCount && remaining.length > 0) {
    let addedInThisRound = false
    
    for (const question of [...remaining]) {
      const currentCount = categoryCount.get(question.category) || 0
      
      if (currentCount < maxPerCategory && balanced.length < targetCount) {
        balanced.push(question)
        categoryCount.set(question.category, currentCount + 1)
        remaining.splice(remaining.indexOf(question), 1)
        addedInThisRound = true
      }
    }
    
    // 1ラウンドで何も追加できなかった場合は制限を緩和
    if (!addedInThisRound && remaining.length > 0) {
      const nextQuestion = remaining.shift()!
      balanced.push(nextQuestion)
    }
  }

  console.log('⚖️ Category balance result:', {
    total: balanced.length,
    byCategory: Object.fromEntries(
      selectedCategories.map(cat => [
        cat, 
        balanced.filter(q => q.category === cat).length
      ])
    )
  })

  return balanced
}