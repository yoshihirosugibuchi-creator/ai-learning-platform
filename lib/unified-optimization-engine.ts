import { Question } from './types'
import { UserProfileWithProgress } from './supabase-user'
import { QuizPersonalizationSettings } from './user-quiz-settings'
import { UnifiedQuizType } from './types/quiz'

// 既存機能のインポート
import { getDifficultyDistributionByAccuracy, getDefaultDifficultyDistribution } from './accuracy-calculator'
import { getRandomQuestions } from './questions'

// AI最適化専用分析機能はAPI経由で実行（クライアントサイドでのサーバーサイドコード実行を回避）
// import { getForgettingQuestions, getWeakCategoryQuestions, getRepeatMistakeQuestions } from './review-logic' // Removed: Server-side import causes SUPABASE_SERVICE_ROLE_KEY error

// 学習記録ベースバランス学習インポート - API経由実行に変更
// import { getUserCategoryStats } from './learning-stats' // Removed: Server-side import causes SUPABASE_SERVICE_ROLE_KEY error
import { calculateBalancedDistribution, CategoryLearningStats } from './learning-balance-utils' // Pure function - safe for client-side use

interface AccuracyAnalysis {
  period: '1week' | '1month' | 'all'
  accuracy: number
  confidence: 'high' | 'medium' | 'low'
  sampleSize: number
  hasData: boolean
  correctAnswers: number
  totalAnswers: number
}

interface OptimizationContext {
  accuracy: AccuracyAnalysis
  weakCategories: Question[]
  repeatMistakes: Question[]
  forgettingQuestions: Question[]
  mode: UnifiedQuizType
}

interface OptimalDistribution {
  basic: number
  intermediate: number
  advanced: number
  expert: number
  weak_focus: number      // 苦手分野強化
  memory_refresh: number  // 記憶定着
  mistake_prevention: number // 繰り返しミス防止
}

/**
 * 統合最適化エンジン - 3つのクイズタイプに対応した統一AI最適化システム
 * 
 * 機能:
 * 1. スキルレベル対応難易度出題（learningLevel制限対応）
 * 2. 苦手分野克服（弱点分析・繰り返しミス検出）
 * 3. バランス学習（カテゴリー配分最適化）
 * 4. 記憶定着サポート（忘却曲線活用）
 * 
 * 注意: 復習クイズでは使用しない（復習クイズはREVIEW_NEEDEDフラグベース）
 */
export async function optimizeQuestionsWithAI(
  filteredQuestions: Question[], // 既にフィルタリング済みの問題
  userId: string,
  mode: UnifiedQuizType,
  userProfile?: UserProfileWithProgress | null,
  learningLevelRestriction?: 'basic' | 'intermediate' | 'advanced' | 'expert' | null,
  userSettings?: QuizPersonalizationSettings
): Promise<Question[]> {
  console.log('🤖 Unified AI optimization engine start (filter-separated):', {
    mode,
    preFilteredQuestionsCount: filteredQuestions.length,
    userId: userId.substring(0, 8) + '...',
    hasProfile: !!userProfile,
    learningLevelRestriction,
    hasSettings: !!userSettings
  })

  if (filteredQuestions.length === 0) {
    console.log('⚠️ No filtered questions available, returning empty array')
    return []
  }

  try {
    // 問題数が不足している場合の早期チェック
    if (filteredQuestions.length < 10) {
      console.log('⚠️ Insufficient filtered questions, selecting all available')
      return filteredQuestions.slice(0, 10)
    }

    // 1. 期間限定正答率分析
    const recentAccuracy = await getRecentAccuracyAnalysis(userId, mode, filteredQuestions, userSettings)
    
    // 2. AI最適化要素分析（苦手分野・繰り返しミス・忘却曲線）
    const advancedAnalysis = await performAdvancedAnalysis(userId, filteredQuestions)
    
    // 3. 最適配分計算（learningLevel制限適用）
    const distribution = calculateOptimalDistribution({
      accuracy: recentAccuracy,
      ...advancedAnalysis,
      mode
    }, learningLevelRestriction)
    
    // 4. 最終問題選出（AI特別枠先行選出方式）
    const optimizedQuestions = await selectOptimalQuestions(
      filteredQuestions, 
      distribution, 
      advancedAnalysis,
      10
    )
    
    // 5. バランス学習適用（学習記録ベース配分最適化）
    const finalQuestions = await ensureBalancedLearning(
      optimizedQuestions,
      filteredQuestions,
      userId,
      10
    )

    console.log('✅ Unified AI optimization completed (filter-separated + balanced learning):', {
      mode,
      inputCount: filteredQuestions.length,
      optimizedCount: optimizedQuestions.length,
      finalCount: finalQuestions.length,
      accuracyPeriod: recentAccuracy.period,
      accuracy: `${(recentAccuracy.accuracy * 100).toFixed(1)}%`,
      learningLevelRestriction,
      finalDistribution: countDifficultyDistribution(finalQuestions)
    })

    return finalQuestions

  } catch (error) {
    console.error('❌ Unified AI optimization error:', error)
    
    // エラー時フォールバック: フィルタリング済み問題からランダム選択
    console.log('🔄 Falling back to random selection from filtered questions')
    return getRandomQuestions(filteredQuestions, 10)
  }
}


/**
 * 期間限定正答率分析の取得
 */
async function getRecentAccuracyAnalysis(
  userId: string,
  mode: UnifiedQuizType,
  filteredQuestions: Question[],
  userSettings?: QuizPersonalizationSettings
): Promise<AccuracyAnalysis> {
  try {
    if (mode === 'self-personalized' && userSettings) {
      // セルフパーソナライズ: 選択カテゴリーの正答率分析
      const selectedCategories = [
        ...(userSettings.basicCategories || []),
        ...(userSettings.industryCategories || []),
        ...(userSettings.industrySubcategories || [])
      ]
      
      if (selectedCategories.length === 0) {
        console.warn('⚠️ Self-personalized mode but no categories selected, using fallback')
        return getFallbackAccuracyAnalysis()
      }
      
      return await getAccuracyAnalysisViaAPI(selectedCategories, '1week')
      
    } else if (mode === 'business-ai') {
      // ビジネスAI: 基本カテゴリー全体の正答率分析（業界特化除く）
      const { getMainCategoryIds } = await import('./categories')
      const basicCategoryIds = getMainCategoryIds()
      
      console.log('📊 Business AI mode: analyzing basic categories accuracy', {
        categoriesCount: basicCategoryIds.length,
        categoryIds: basicCategoryIds
      })
      
      return await getAccuracyAnalysisViaAPI(basicCategoryIds, '1week')
      
    } else if (mode === 'category') {
      // カテゴリー指定: 指定カテゴリーの正答率分析
      const targetCategories = Array.from(new Set(filteredQuestions.map(q => q.category)))
      
      if (targetCategories.length === 0) {
        console.warn('⚠️ Category-specific mode but no categories found in filtered questions')
        return getFallbackAccuracyAnalysis()
      }
      
      console.log('📊 Category-specific mode: analyzing target categories accuracy', {
        categoriesCount: targetCategories.length,
        categoryIds: targetCategories
      })
      
      return await getAccuracyAnalysisViaAPI(targetCategories, '1week')
      
    } else {
      console.warn('⚠️ Unknown quiz mode, using fallback', { mode })
      return getFallbackAccuracyAnalysis()
    }
  } catch (error) {
    console.error('❌ Failed to get recent accuracy analysis:', error)
    return getFallbackAccuracyAnalysis()
  }
}

/**
 * フォールバック正答率分析
 */
function getFallbackAccuracyAnalysis(): AccuracyAnalysis {
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

/**
 * API経由正答率分析（既存関数の活用）
 */
async function getAccuracyAnalysisViaAPI(
  selectedCategories: string[],
  preferredPeriod: '1week' | '1month' = '1week'
): Promise<AccuracyAnalysis> {
  try {
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
 * AI最適化要素分析（苦手分野・繰り返しミス・忘却曲線）
 * 注意: 復習クイズでは使用しない - AI最適化専用の分析機能
 */
async function performAdvancedAnalysis(userId: string, questions: Question[]): Promise<{
  weakCategories: Question[]
  repeatMistakes: Question[]
  forgettingQuestions: Question[]
}> {
  console.log('🔍 Performing AI optimization analysis via API (weakness, mistakes, forgetting)')
  
  try {
    // API経由でAI最適化要素分析を実行（サーバーサイドコード実行を回避）
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    
    if (!accessToken) {
      console.warn('⚠️ No access token available for AI analysis, using fallback')
      return {
        weakCategories: [],
        repeatMistakes: [],
        forgettingQuestions: []
      }
    }

    const response = await fetch('/api/ai-optimization/analyze', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`AI analysis API failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`AI analysis failed: ${data.error}`)
    }

    const { weakCategories, repeatMistakes, forgettingQuestions } = data.analysis
    
    // 分析対象問題に含まれるもののみを抽出
    const questionIds = new Set(questions.map(q => q.id))
    
    const relevantWeak = weakCategories.filter((q: Question) => questionIds.has(q.id))
    const relevantMistakes = repeatMistakes.filter((q: Question) => questionIds.has(q.id))
    const relevantForgetting = forgettingQuestions.filter((q: Question) => questionIds.has(q.id))
    
    console.log('📊 Advanced analysis results (API-based):', {
      weakCategories: relevantWeak.length,
      repeatMistakes: relevantMistakes.length,
      forgettingQuestions: relevantForgetting.length,
      totalFromAPI: {
        weak: weakCategories.length,
        mistakes: repeatMistakes.length,
        forgetting: forgettingQuestions.length
      }
    })
    
    return {
      weakCategories: relevantWeak,
      repeatMistakes: relevantMistakes,
      forgettingQuestions: relevantForgetting
    }
  } catch (error) {
    console.error('❌ Advanced analysis error (API-based):', error)
    console.log('🔄 Falling back to empty analysis results')
    return {
      weakCategories: [],
      repeatMistakes: [],
      forgettingQuestions: []
    }
  }
}

/**
 * learningLevel制限時の難易度分布正規化
 */
function adjustDistributionForLearningLevel(
  baseDistribution: Record<string, number>,
  minLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
): Record<string, number> {
  console.log('🎯 Adjusting distribution for learning level:', {
    minLevel,
    originalDistribution: baseDistribution
  })

  const levels = ['basic', 'intermediate', 'advanced', 'expert']
  const minLevelIndex = levels.indexOf(minLevel)

  if (minLevelIndex === -1) {
    console.warn('⚠️ Invalid learning level, using original distribution')
    return baseDistribution
  }

  // 指定レベル以上のみ抽出
  const availableLevels = levels.slice(minLevelIndex)
  const availableDistribution: Record<string, number> = {}
  
  for (const level of availableLevels) {
    availableDistribution[level] = baseDistribution[level] || 0
  }

  // 合計値で正規化（100%になるよう調整）
  const total = Object.values(availableDistribution).reduce((sum, val) => sum + val, 0)
  
  if (total === 0) {
    console.log('🎯 No distribution found for available levels, defaulting to min level')
    return { [minLevel]: 1.0 }
  }

  const normalizedDistribution: Record<string, number> = {}
  for (const [level, ratio] of Object.entries(availableDistribution)) {
    normalizedDistribution[level] = ratio / total
  }

  // 未使用レベルは0に設定
  for (const level of levels) {
    if (!normalizedDistribution[level]) {
      normalizedDistribution[level] = 0
    }
  }

  console.log('🎯 Distribution normalized for learning level:', {
    minLevel,
    original: baseDistribution,
    adjusted: normalizedDistribution,
    totalAdjusted: Object.values(normalizedDistribution).reduce((sum, val) => sum + val, 0)
  })

  return normalizedDistribution
}

/**
 * 最適配分計算（learningLevel制限対応版）
 */
function calculateOptimalDistribution(
  context: OptimizationContext,
  learningLevelRestriction?: 'basic' | 'intermediate' | 'advanced' | 'expert' | null
): OptimalDistribution {
  const { accuracy, weakCategories, repeatMistakes, forgettingQuestions, mode } = context
  
  console.log('🎯 Calculating optimal distribution:', {
    accuracy: `${(accuracy.accuracy * 100).toFixed(1)}%`,
    weakCount: weakCategories.length,
    mistakesCount: repeatMistakes.length,
    forgettingCount: forgettingQuestions.length,
    mode,
    learningLevelRestriction
  })
  
  // 基本難易度配分を取得
  let baseDistribution = accuracy.hasData && accuracy.confidence !== 'low' 
    ? getDifficultyDistributionByAccuracy(accuracy.accuracy)
    : getDefaultDifficultyDistribution()
  
  // learningLevel制限がある場合は難易度分布を正規化
  if (learningLevelRestriction && learningLevelRestriction !== 'basic') {
    console.log('🎯 Applying learning level restriction to distribution')
    const adjustedDistribution = adjustDistributionForLearningLevel(baseDistribution, learningLevelRestriction)
    
    // baseDistributionを正規化版で更新
    baseDistribution = {
      basic: adjustedDistribution.basic || 0,
      intermediate: adjustedDistribution.intermediate || 0,
      advanced: adjustedDistribution.advanced || 0,
      expert: adjustedDistribution.expert || 0
    }
    
    console.log('🎯 Distribution after learning level restriction:', baseDistribution)
  }
  
  // AI最適化要素の統合
  const specialFocusRatio = Math.min(0.4, // 最大40%まで特別枠
    (weakCategories.length + repeatMistakes.length + forgettingQuestions.length) / 30
  )
  
  // 基本配分を調整
  const adjustmentFactor = 1 - specialFocusRatio
  
  const finalDistribution = {
    basic: Math.round((baseDistribution.basic * adjustmentFactor) * 100) / 100,
    intermediate: Math.round((baseDistribution.intermediate * adjustmentFactor) * 100) / 100,
    advanced: Math.round((baseDistribution.advanced * adjustmentFactor) * 100) / 100,
    expert: Math.round((baseDistribution.expert * adjustmentFactor) * 100) / 100,
    weak_focus: Math.round((specialFocusRatio * 0.4) * 100) / 100,
    memory_refresh: Math.round((specialFocusRatio * 0.3) * 100) / 100,
    mistake_prevention: Math.round((specialFocusRatio * 0.3) * 100) / 100
  }
  
  console.log('🎯 Final distribution calculation:', {
    baseAfterRestriction: baseDistribution,
    specialFocusRatio,
    adjustmentFactor,
    finalDistribution
  })
  
  return finalDistribution
}

/**
 * 最終問題選出（AI特別枠先行選出方式 - 要件準拠版）
 */
async function selectOptimalQuestions(
  questions: Question[],
  distribution: OptimalDistribution,
  analysis: { weakCategories: Question[], repeatMistakes: Question[], forgettingQuestions: Question[] },
  targetCount: number = 10
): Promise<Question[]> {
  console.log('🎯 Starting AI special slot priority selection method')
  
  // Step 1: AI特別枠を先行選出（4問）
  const specialQuestions = await selectSpecialSlotQuestions(analysis, questions)
  
  // Step 2: 特別枠の難易度分布を計算
  const specialDifficultyCount = countDifficultyDistribution(specialQuestions)
  
  // Step 3: 目標分布から特別枠分を差し引いて残り6問の配分を計算
  const baseDistribution = {
    basic: distribution.basic,
    intermediate: distribution.intermediate,
    advanced: distribution.advanced,
    expert: distribution.expert
  }
  const remainingNeeded = adjustForSpecialQuestions(baseDistribution, specialDifficultyCount, targetCount)
  
  // Step 4: 残り6問を調整された配分で選出
  const usedIds = new Set(specialQuestions.map(q => q.id))
  const availableQuestions = questions.filter(q => !usedIds.has(q.id))
  const remainingQuestions = selectByAdjustedDistribution(availableQuestions, remainingNeeded, targetCount - specialQuestions.length)
  
  // 最終結果: specialQuestions(4) + remainingQuestions(6) = 10問
  const finalQuestions = [...specialQuestions, ...remainingQuestions]
  
  console.log('✅ AI special slot priority selection completed:', {
    total: finalQuestions.length,
    specialSlots: specialQuestions.length,
    remainingSlots: remainingQuestions.length,
    specialDistribution: specialDifficultyCount,
    finalDistribution: countDifficultyDistribution(finalQuestions)
  })
  
  // 最終シャッフル
  return finalQuestions.sort(() => Math.random() - 0.5).slice(0, targetCount)
}

/**
 * Step 1: AI特別枠先行選出（4問）
 */
async function selectSpecialSlotQuestions(
  analysis: { weakCategories: Question[], repeatMistakes: Question[], forgettingQuestions: Question[] },
  _questions: Question[]
): Promise<Question[]> {
  const specialQuestions: Question[] = []
  const usedIds = new Set<number>()
  
  // 苦手分野強化 2問
  const weakQuestions = analysis.weakCategories.filter(q => !usedIds.has(q.id || 0))
  const shuffledWeak = [...weakQuestions].sort(() => Math.random() - 0.5)
  const selectedWeak = shuffledWeak.slice(0, 2)
  selectedWeak.forEach(q => {
    specialQuestions.push(q)
    usedIds.add(q.id || 0)
  })
  
  // 忘却曲線対象 1問
  const forgettingQuestions = analysis.forgettingQuestions.filter(q => !usedIds.has(q.id || 0))
  const shuffledForgetting = [...forgettingQuestions].sort(() => Math.random() - 0.5)
  const selectedForgetting = shuffledForgetting.slice(0, 1)
  selectedForgetting.forEach(q => {
    specialQuestions.push(q)
    usedIds.add(q.id || 0)
  })
  
  // 繰り返しミス対策 1問
  const mistakeQuestions = analysis.repeatMistakes.filter(q => !usedIds.has(q.id || 0))
  const shuffledMistakes = [...mistakeQuestions].sort(() => Math.random() - 0.5)
  const selectedMistakes = shuffledMistakes.slice(0, 1)
  selectedMistakes.forEach(q => {
    specialQuestions.push(q)
    usedIds.add(q.id || 0)
  })
  
  console.log('🎯 AI special slots selected:', {
    weakCategory: selectedWeak.length,
    forgetting: selectedForgetting.length,
    repeatMistakes: selectedMistakes.length,
    total: specialQuestions.length
  })
  
  return specialQuestions
}

/**
 * Step 2: 難易度分布カウント
 */
function countDifficultyDistribution(questions: Question[]): Record<string, number> {
  const count: Record<string, number> = { basic: 0, intermediate: 0, advanced: 0, expert: 0 }
  
  questions.forEach(q => {
    const difficulty = q.difficulty || 'basic'
    if (difficulty in count) {
      count[difficulty]++
    } else {
      count.basic++
    }
  })
  
  return count
}

/**
 * Step 3: 目標分布から特別枠分を差し引いて残り配分を計算
 */
function adjustForSpecialQuestions(
  targetDistribution: Record<string, number>,
  specialDifficultyCount: Record<string, number>,
  totalCount: number
): Record<string, number> {
  const remainingNeeded: Record<string, number> = {}
  
  // 目標問題数を計算
  const targetCounts: Record<string, number> = {
    basic: Math.round(targetDistribution.basic * totalCount),
    intermediate: Math.round(targetDistribution.intermediate * totalCount),
    advanced: Math.round(targetDistribution.advanced * totalCount),
    expert: Math.round(targetDistribution.expert * totalCount)
  }
  
  // 特別枠分を差し引いて残り必要数を計算
  Object.keys(targetCounts).forEach(difficulty => {
    const target = targetCounts[difficulty] || 0
    const special = specialDifficultyCount[difficulty] || 0
    remainingNeeded[difficulty] = Math.max(0, target - special)
  })
  
  console.log('📊 Distribution adjustment:', {
    target: targetCounts,
    special: specialDifficultyCount,
    remaining: remainingNeeded
  })
  
  return remainingNeeded
}

/**
 * Step 4: 調整された配分で問題選出
 */
function selectByAdjustedDistribution(
  availableQuestions: Question[],
  remainingNeeded: Record<string, number>,
  targetCount: number
): Question[] {
  const selected: Question[] = []
  
  // 難易度別に問題を分類
  const questionsByDifficulty: Record<string, Question[]> = {
    basic: [],
    intermediate: [],
    advanced: [],
    expert: []
  }
  
  availableQuestions.forEach(question => {
    const difficulty = question.difficulty || 'basic'
    if (questionsByDifficulty[difficulty]) {
      questionsByDifficulty[difficulty].push(question)
    } else {
      questionsByDifficulty.basic.push(question)
    }
  })
  
  // 調整された配分に従って選出
  for (const [difficulty, needed] of Object.entries(remainingNeeded)) {
    if (needed > 0) {
      const availableForDifficulty = questionsByDifficulty[difficulty] || []
      const shuffled = [...availableForDifficulty].sort(() => Math.random() - 0.5)
      const selectedForDifficulty = shuffled.slice(0, needed)
      
      selected.push(...selectedForDifficulty)
    }
  }
  
  // 目標数に達していない場合、残りを補完
  if (selected.length < targetCount) {
    const usedIds = new Set(selected.map(q => q.id))
    const remaining = availableQuestions.filter(q => !usedIds.has(q.id))
    const shuffled = [...remaining].sort(() => Math.random() - 0.5)
    const needed = targetCount - selected.length
    
    selected.push(...shuffled.slice(0, needed))
  }
  
  console.log('🎯 Adjusted distribution selection:', {
    selected: selected.length,
    target: targetCount,
    distributionFulfilled: Object.entries(remainingNeeded).map(([d, n]) => 
      `${d}: ${selected.filter(q => (q.difficulty || 'basic') === d).length}/${n}`
    )
  })
  
  return selected.slice(0, targetCount)
}

// 削除済み: selectByDifficultyDistribution
// 理由: selectOptimalQuestions（AI特別枠先行方式）を使用中のため不要

// 削除済み: getDifficultyLevel
// 理由: 数値変換が不要、文字列比較で十分

// 削除済み: normalizeLearningLevel 
// 理由: quiz-filtering.tsに同等の関数が存在

/**
 * 学習記録ベースのバランス学習（パーソナライズ配分最適化）
 * ユーザーの学習履歴を分析して優先すべきカテゴリーを多く配分
 */
export async function ensureBalancedLearning(
  selectedQuestions: Question[],
  availableQuestions: Question[],
  userId: string,
  targetCount: number = 10,
  targetCategories?: string[]
): Promise<Question[]> {
  console.log('⚖️ Applying learning record-based balanced learning')
  
  try {
    // API経由でユーザーの学習統計を取得（サーバーサイドコード実行を回避）
    const categoryStats = await getUserCategoryStatsViaAPI(userId)
    
    if (!categoryStats || categoryStats.length === 0) {
      console.log('ℹ️ No category stats available, using simple balanced distribution')
      return applySimpleBalancedDistribution(selectedQuestions, availableQuestions, targetCount)
    }

    // 対象カテゴリーの特定（targetCategoriesが指定されていない場合は選択された問題から抽出）
    const actualTargetCategories = targetCategories || 
      Array.from(new Set(selectedQuestions.map(q => q.category)))
    
    // calculateBalancedDistribution関数を利用（純粋関数のためクライアント側で実行可能）
    const distribution = calculateBalancedDistribution(categoryStats, actualTargetCategories, targetCount)
    
    if (Object.keys(distribution).length === 0) {
      console.log('ℹ️ No distribution calculated, using simple balanced distribution')
      return applySimpleBalancedDistribution(selectedQuestions, availableQuestions, targetCount)
    }

    // 配分に従って問題を選出
    const balancedQuestions = await selectByLearningBasedDistribution(
      selectedQuestions,
      availableQuestions,
      distribution,
      targetCount
    )

    console.log('⚖️ Learning record-based balanced learning result:', {
      total: balancedQuestions.length,
      distributionApplied: Object.entries(distribution).map(([categoryId, ratio]) => ({
        categoryId,
        targetRatio: `${(ratio * 100).toFixed(1)}%`,
        actualCount: balancedQuestions.filter(q => q.category === categoryId).length
      }))
    })

    return balancedQuestions

  } catch (error) {
    console.error('❌ Error in learning record-based balanced learning:', error)
    return applySimpleBalancedDistribution(selectedQuestions, availableQuestions, targetCount)
  }
}

/**
 * API経由でユーザーのカテゴリー別学習統計を取得
 */
async function getUserCategoryStatsViaAPI(userId: string): Promise<CategoryLearningStats[]> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    
    if (!accessToken) {
      console.warn('⚠️ No access token available for learning stats API')
      return []
    }

    console.log('📊 Fetching category learning stats via API for user:', userId.substring(0, 8) + '...')

    const response = await fetch('/api/learning-stats/categories', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Learning stats API failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`Learning stats failed: ${data.error}`)
    }

    console.log('✅ Category learning stats retrieved via API:', {
      categoriesCount: data.categoryStats.length,
      topCategories: data.categoryStats.slice(0, 3).map((stat: CategoryLearningStats) => ({
        categoryId: stat.categoryId,
        accuracy: `${(stat.accuracy * 100).toFixed(1)}%`,
        totalAnswers: stat.totalAnswers,
        priorityScore: stat.priorityScore.toFixed(2)
      }))
    })

    return data.categoryStats
  } catch (error) {
    console.error('❌ Failed to get category learning stats via API:', error)
    return []
  }
}

/**
 * 学習記録ベースの配分に従って問題を選出
 */
async function selectByLearningBasedDistribution(
  selectedQuestions: Question[],
  availableQuestions: Question[],
  distribution: Record<string, number>,
  targetCount: number
): Promise<Question[]> {
  const balancedQuestions: Question[] = []
  const usedIds = new Set<number>()
  
  // カテゴリー別に問題を分類
  const questionsByCategory: Record<string, Question[]> = {}
  selectedQuestions.forEach(question => {
    const category = question.category
    if (!questionsByCategory[category]) {
      questionsByCategory[category] = []
    }
    questionsByCategory[category].push(question)
  })

  // 配分に従って各カテゴリーから問題を選出
  for (const [categoryId, ratio] of Object.entries(distribution)) {
    const targetForCategory = Math.round(targetCount * ratio)
    const availableForCategory = questionsByCategory[categoryId] || []
    
    // シャッフルして選出
    const shuffled = [...availableForCategory]
      .filter(q => !usedIds.has(q.id || 0))
      .sort(() => Math.random() - 0.5)
    
    const selectedForCategory = shuffled.slice(0, targetForCategory)
    selectedForCategory.forEach(q => {
      balancedQuestions.push(q)
      usedIds.add(q.id || 0)
    })

    console.log(`📊 Category ${categoryId}: selected ${selectedForCategory.length}/${targetForCategory} questions (available: ${availableForCategory.length})`)
  }

  // 目標数に達していない場合は残りの問題から補完
  if (balancedQuestions.length < targetCount) {
    const remainingNeeded = targetCount - balancedQuestions.length
    const unusedSelected = selectedQuestions.filter(q => !usedIds.has(q.id || 0))
    const unusedAvailable = availableQuestions.filter(q => !usedIds.has(q.id || 0))
    
    const candidates = [...unusedSelected, ...unusedAvailable]
    const shuffledCandidates = candidates.sort(() => Math.random() - 0.5)
    const additional = shuffledCandidates.slice(0, remainingNeeded)
    
    balancedQuestions.push(...additional)
    console.log(`📊 Added ${additional.length} additional questions to reach target`)
  }

  return balancedQuestions.slice(0, targetCount)
}

/**
 * シンプルなバランス配分（フォールバック用）
 */
function applySimpleBalancedDistribution(
  selectedQuestions: Question[],
  availableQuestions: Question[],
  targetCount: number
): Question[] {
  console.log('⚖️ Applying simple balanced distribution (fallback)')
  
  const categoryCount = new Map<string, number>()
  const uniqueCategories = Array.from(new Set(selectedQuestions.map(q => q.category)))
  const maxPerCategory = Math.ceil(targetCount / Math.max(uniqueCategories.length, 3))
  
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
  
  // 目標数に足りない場合は利用可能問題から補完
  if (balanced.length < targetCount) {
    const usedIds = new Set(balanced.map(q => q.id))
    const unusedQuestions = availableQuestions.filter(q => !usedIds.has(q.id))
    const needed = targetCount - balanced.length
    
    const shuffled = [...unusedQuestions].sort(() => Math.random() - 0.5)
    balanced.push(...shuffled.slice(0, needed))
  }
  
  console.log('⚖️ Simple balanced learning result:', {
    total: balanced.length,
    categoryDistribution: Object.fromEntries(
      Array.from(categoryCount.entries())
    )
  })
  
  return balanced.slice(0, targetCount)
}