/**
 * カテゴリー選択優先順位システム
 * ユーザーの学習履歴とXP分析に基づく最適なカテゴリー推奨
 */

import { supabase } from '@/lib/supabase'
import { assessDataReliability, type DataReliabilityLevel } from './data-reliability'
import { AdaptiveFallbackSystem } from './fallback-strategy'
import { getAllCategories } from './categories'

// カテゴリー優先度データ
export interface CategoryPriorityData {
  categoryId: string
  categoryName: string
  priority: 'weakness' | 'recent_activity' | 'high_performance' | 'new_content' | 'balanced'
  xpPoints: number
  accuracyRate: number
  recentSessions: number
  lastStudiedDate: string | null
  strengthLevel: 'weak' | 'developing' | 'proficient' | 'mastery'
  recommendationReason: string
  priorityScore: number
}

// カテゴリー推奨結果
export interface CategoryRecommendation {
  userId: string
  recommendedCategories: CategoryPriorityData[]
  dataReliability: DataReliabilityLevel
  recommendationStrategy: 'weakness_focus' | 'balanced_growth' | 'strength_building' | 'exploration'
  lastUpdated: Date
  totalCategoriesAnalyzed: number
  userLearningProfile: {
    totalXP: number
    averageAccuracy: number
    activeLearningDays: number
    preferredDifficulties: string[]
  }
}

/**
 * ユーザー向けカテゴリー優先順位を計算
 * @param userId ユーザーID
 * @param maxRecommendations 推奨カテゴリー数（デフォルト: 5）
 * @returns カテゴリー推奨結果
 */
export async function calculateCategoryPriority(
  userId: string,
  maxRecommendations: number = 5
): Promise<CategoryRecommendation> {
  try {
    console.log(`🎯 Calculating category priority for user: ${userId}`)

    // 1. データ信頼度評価
    const reliability = await assessDataReliability(userId)
    console.log(`📊 Data reliability: ${reliability.reliabilityLevel}`)

    // 2. フォールバック戦略の適用
    const fallbackSystem = new AdaptiveFallbackSystem()
    const categoryRecommendations = await fallbackSystem.getCategoryRecommendationsWithFallback(
      userId,
      await getAllCategoryIds()
    )

    if (categoryRecommendations.source === 'default') {
      console.log(`⚡ Using default category recommendations due to insufficient data`)
      return await generateDefaultRecommendation(userId, maxRecommendations)
    }

    // 3. 詳細分析実行
    const [xpData, sessionData, userProfile] = await Promise.all([
      getUserCategoryXP(userId),
      getUserCategorySessionStats(userId),
      getUserLearningProfile(userId)
    ])

    // 4. カテゴリー優先度計算
    const categoryPriorities = await calculateCategoryPriorities(
      userId,
      xpData,
      sessionData,
      reliability.reliabilityLevel
    )

    // 5. 推奨戦略決定
    const strategy = determineRecommendationStrategy(reliability.reliabilityLevel, userProfile, categoryPriorities)

    // 6. 最終推奨リスト作成
    const finalRecommendations = selectRecommendedCategories(
      categoryPriorities,
      strategy,
      maxRecommendations
    )

    const result: CategoryRecommendation = {
      userId,
      recommendedCategories: finalRecommendations,
      dataReliability: reliability.reliabilityLevel,
      recommendationStrategy: strategy,
      lastUpdated: new Date(),
      totalCategoriesAnalyzed: categoryPriorities.length,
      userLearningProfile: userProfile
    }

    console.log(`✅ Category priority calculated:`, {
      strategy,
      recommendations: finalRecommendations.length,
      topCategory: finalRecommendations[0]?.categoryName,
      reliability: reliability.reliabilityLevel
    })

    return result

  } catch (error) {
    console.error('❌ Error in calculateCategoryPriority:', error)
    return await generateDefaultRecommendation(userId, maxRecommendations)
  }
}

/**
 * ユーザーのカテゴリー別XPデータを取得
 */
async function getUserCategoryXP(userId: string): Promise<Map<string, number>> {
  try {
    console.log(`📊 Fetching category XP data for user: ${userId}`)

    const { data, error } = await supabase
      .from('user_category_xp_stats_v2')
      .select('category_id, total_xp')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching category XP:', error)
      return new Map()
    }

    const xpMap = new Map<string, number>()
    data?.forEach(record => {
      xpMap.set(record.category_id, record.total_xp || 0)
    })

    console.log(`📈 Found XP data for ${xpMap.size} categories`)
    return xpMap

  } catch (error) {
    console.error('Error in getUserCategoryXP:', error)
    return new Map()
  }
}

/**
 * ユーザーのカテゴリー別学習セッション統計を取得
 */
async function getUserCategorySessionStats(userId: string): Promise<Map<string, {
  sessions: number
  accuracy: number
  lastStudied: string | null
  totalQuestions: number
}>> {
  try {
    console.log(`📚 Fetching category session stats for user: ${userId}`)

    // 過去30日間のセッションデータを取得
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('quiz_sessions')
      .select(`
        id,
        created_at,
        quiz_answers (
          category_id,
          is_correct,
          created_at
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .not('completed_at', 'is', null)

    if (error) {
      console.error('Error fetching session stats:', error)
      return new Map()
    }

    // カテゴリー別統計を集計
    const statsMap = new Map<string, {
      sessions: number
      accuracy: number
      lastStudied: string | null
      totalQuestions: number
    }>()

    data?.forEach(session => {
      session.quiz_answers?.forEach((answer: { category_id: string; is_correct: boolean; created_at: string | null }) => {
        const categoryId = answer.category_id
        if (!categoryId) return

        if (!statsMap.has(categoryId)) {
          statsMap.set(categoryId, {
            sessions: 0,
            accuracy: 0,
            lastStudied: null,
            totalQuestions: 0
          })
        }

        const stats = statsMap.get(categoryId)!
        stats.sessions += 1
        stats.totalQuestions += 1
        
        if (answer.is_correct) {
          stats.accuracy = ((stats.accuracy * (stats.totalQuestions - 1)) + 100) / stats.totalQuestions
        } else {
          stats.accuracy = (stats.accuracy * (stats.totalQuestions - 1)) / stats.totalQuestions
        }

        // 最新の学習日を更新
        const answerDate = answer.created_at
        if (answerDate && (!stats.lastStudied || answerDate > stats.lastStudied)) {
          stats.lastStudied = answerDate
        }
      })
    })

    console.log(`📊 Found session stats for ${statsMap.size} categories`)
    return statsMap

  } catch (error) {
    console.error('Error in getUserCategorySessionStats:', error)
    return new Map()
  }
}

/**
 * ユーザーの総合学習プロフィールを取得
 */
async function getUserLearningProfile(userId: string): Promise<{
  totalXP: number
  averageAccuracy: number
  activeLearningDays: number
  preferredDifficulties: string[]
}> {
  try {
    // XP合計を実際のデータから取得
    const { data: xpData } = await supabase
      .from('user_xp_stats_v2')
      .select('total_xp')
      .eq('user_id', userId)
      .single()
    
    const totalXP = xpData?.total_xp || 0

    // 正答率と学習日数（過去30日）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: sessionData } = await supabase
      .from('quiz_sessions')
      .select(`
        created_at,
        quiz_answers (
          is_correct,
          difficulty
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .not('completed_at', 'is', null)

    let totalQuestions = 0
    let correctAnswers = 0
    const activeDays = new Set<string>()
    const difficultyCount = new Map<string, number>()

    sessionData?.forEach(session => {
      if (session.created_at) {
        const dateKey = new Date(session.created_at).toISOString().split('T')[0]
        activeDays.add(dateKey)
      }

      session.quiz_answers?.forEach((answer: { is_correct: boolean; difficulty?: string }) => {
        totalQuestions++
        if (answer.is_correct) correctAnswers++

        const difficulty = answer.difficulty
        if (difficulty) {
          difficultyCount.set(difficulty, (difficultyCount.get(difficulty) || 0) + 1)
        }
      })
    })

    const averageAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    const activeLearningDays = activeDays.size

    // 好む難易度（回答数が多い順）
    const preferredDifficulties = Array.from(difficultyCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([difficulty]) => difficulty)

    return {
      totalXP,
      averageAccuracy,
      activeLearningDays,
      preferredDifficulties
    }

  } catch (error) {
    console.error('Error in getUserLearningProfile:', error)
    return {
      totalXP: 0,
      averageAccuracy: 0,
      activeLearningDays: 0,
      preferredDifficulties: []
    }
  }
}

/**
 * カテゴリー優先度を計算
 */
async function calculateCategoryPriorities(
  userId: string,
  xpData: Map<string, number>,
  sessionData: Map<string, { sessions: number; accuracy: number; lastStudied: string | null; totalQuestions: number }>,
  reliability: DataReliabilityLevel
): Promise<CategoryPriorityData[]> {
  const categories = await getAllCategories()
  const priorities: CategoryPriorityData[] = []

  for (const category of categories) {
    const categoryId = category.id
    const xp = xpData.get(categoryId) || 0
    const sessions = sessionData.get(categoryId) || {
      sessions: 0,
      accuracy: 0,
      lastStudied: null,
      totalQuestions: 0
    }

    // 強度レベル判定
    const strengthLevel = determineStrengthLevel(xp, sessions.accuracy, sessions.sessions)
    
    // 優先度タイプ決定
    const priority = determinePriorityType(xp, sessions, strengthLevel)
    
    // 優先度スコア計算
    const priorityScore = calculatePriorityScore(
      xp,
      sessions.accuracy,
      sessions.sessions,
      sessions.lastStudied,
      strengthLevel,
      reliability
    )

    // 推奨理由生成
    const recommendationReason = generateRecommendationReason(priority, strengthLevel, xp, sessions)

    priorities.push({
      categoryId,
      categoryName: category.name,
      priority,
      xpPoints: xp,
      accuracyRate: sessions.accuracy,
      recentSessions: sessions.sessions,
      lastStudiedDate: sessions.lastStudied,
      strengthLevel,
      recommendationReason,
      priorityScore
    })
  }

  return priorities.sort((a, b) => b.priorityScore - a.priorityScore)
}

/**
 * カテゴリーの強度レベルを判定
 */
function determineStrengthLevel(xp: number, accuracy: number, sessions: number): 'weak' | 'developing' | 'proficient' | 'mastery' {
  if (sessions === 0 || xp === 0) {
    return 'weak'
  }

  if (xp >= 1000 && accuracy >= 85 && sessions >= 10) {
    return 'mastery'
  } else if (xp >= 500 && accuracy >= 70 && sessions >= 5) {
    return 'proficient'
  } else if (xp >= 100 && sessions >= 3) {
    return 'developing'
  } else {
    return 'weak'
  }
}

/**
 * 優先度タイプを決定
 */
function determinePriorityType(
  xp: number,
  sessions: { lastStudied: string | null; accuracy: number; sessions: number },
  strengthLevel: string
): 'weakness' | 'recent_activity' | 'high_performance' | 'new_content' | 'balanced' {
  if (strengthLevel === 'weak') {
    return 'weakness'
  }

  if (sessions.lastStudied) {
    const daysSinceLastStudy = Math.floor(
      (Date.now() - new Date(sessions.lastStudied).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceLastStudy <= 3) {
      return 'recent_activity'
    }
  }

  if (strengthLevel === 'mastery' && sessions.accuracy >= 90) {
    return 'high_performance'
  }

  if (sessions.sessions === 0) {
    return 'new_content'
  }

  return 'balanced'
}

/**
 * 優先度スコアを計算
 */
function calculatePriorityScore(
  xp: number,
  accuracy: number,
  sessions: number,
  lastStudied: string | null,
  strengthLevel: string,
  reliability: DataReliabilityLevel
): number {
  let score = 0

  // 弱点カテゴリーに高いスコア
  if (strengthLevel === 'weak') {
    score += 50
  } else if (strengthLevel === 'developing') {
    score += 30
  }

  // 最近の学習活動
  if (lastStudied) {
    const daysSinceLastStudy = Math.floor(
      (Date.now() - new Date(lastStudied).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysSinceLastStudy <= 3) {
      score += 20
    } else if (daysSinceLastStudy <= 7) {
      score += 10
    }
  }

  // 新規コンテンツボーナス
  if (sessions === 0) {
    score += 25
  }

  // データ信頼度による調整
  if (reliability === 'HIGH') {
    score *= 1.2
  } else if (reliability === 'LOW') {
    score *= 0.8
  }

  // XPの逆相関（XPが低いほど高スコア）
  const maxXP = 2000
  const xpScore = Math.max(0, (maxXP - xp) / maxXP * 20)
  score += xpScore

  return Math.round(score)
}

/**
 * 推奨理由を生成
 */
function generateRecommendationReason(
  priority: string,
  strengthLevel: string,
  xp: number,
  _sessions: { accuracy: number; sessions: number; lastStudied: string | null }
): string {
  switch (priority) {
    case 'weakness':
      return `弱点分野です。XP ${xp}点で強化が必要です。`
    case 'recent_activity':
      return `最近学習した分野です。継続して理解を深めましょう。`
    case 'high_performance':
      return `得意分野です。より高度な内容に挑戦してみましょう。`
    case 'new_content':
      return `未学習の分野です。新しい知識を身につけるチャンスです。`
    case 'balanced':
      return `バランス良く学習を進めている分野です。`
    default:
      return `学習を続けることで理解が深まります。`
  }
}

/**
 * 推奨戦略を決定
 */
function determineRecommendationStrategy(
  reliability: DataReliabilityLevel,
  _userProfile: { totalXP: number; averageAccuracy: number; activeLearningDays: number; preferredDifficulties: string[] },
  priorities: CategoryPriorityData[]
): 'weakness_focus' | 'balanced_growth' | 'strength_building' | 'exploration' {
  const weakCategories = priorities.filter(p => p.strengthLevel === 'weak').length
  const masteryCategories = priorities.filter(p => p.strengthLevel === 'mastery').length

  if (reliability === 'HIGH') {
    if (weakCategories >= 3) {
      return 'weakness_focus'
    } else if (masteryCategories >= 2) {
      return 'strength_building'
    } else {
      return 'balanced_growth'
    }
  } else {
    return 'exploration'
  }
}

/**
 * 最終推奨カテゴリーを選択
 */
function selectRecommendedCategories(
  priorities: CategoryPriorityData[],
  strategy: string,
  maxRecommendations: number
): CategoryPriorityData[] {
  let selected: CategoryPriorityData[] = []

  switch (strategy) {
    case 'weakness_focus':
      // 弱点カテゴリーを優先
      selected = priorities
        .filter(p => p.strengthLevel === 'weak' || p.strengthLevel === 'developing')
        .slice(0, maxRecommendations)
      break

    case 'strength_building':
      // 得意分野の強化
      selected = priorities
        .filter(p => p.strengthLevel === 'proficient' || p.strengthLevel === 'mastery')
        .slice(0, maxRecommendations)
      break

    case 'balanced_growth':
      // バランス重視
      const weak = priorities.filter(p => p.strengthLevel === 'weak').slice(0, 2)
      const developing = priorities.filter(p => p.strengthLevel === 'developing').slice(0, 2)
      const newContent = priorities.filter(p => p.priority === 'new_content').slice(0, 1)
      selected = [...weak, ...developing, ...newContent].slice(0, maxRecommendations)
      break

    case 'exploration':
    default:
      // 探索重視
      selected = priorities.slice(0, maxRecommendations)
      break
  }

  // 不足分を上位から補充
  if (selected.length < maxRecommendations) {
    const remaining = priorities.filter(p => !selected.includes(p))
    selected.push(...remaining.slice(0, maxRecommendations - selected.length))
  }

  return selected
}

/**
 * デフォルト推奨を生成
 */
async function generateDefaultRecommendation(
  userId: string,
  maxRecommendations: number
): Promise<CategoryRecommendation> {
  const categories = await getAllCategories()
  
  // 人気カテゴリーを基本推奨
  const popularCategories = [
    'communication_presentation',
    'logical_thinking_problem_solving',
    'strategy_management',
    'marketing_sales',
    'ai_digital_utilization'
  ]

  const recommendations: CategoryPriorityData[] = categories
    .filter(cat => popularCategories.includes(cat.id))
    .slice(0, maxRecommendations)
    .map((cat, index) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      priority: 'new_content' as const,
      xpPoints: 0,
      accuracyRate: 0,
      recentSessions: 0,
      lastStudiedDate: null,
      strengthLevel: 'weak' as const,
      recommendationReason: '人気の高い基礎分野です。まずはここから始めましょう。',
      priorityScore: 50 - index * 5
    }))

  return {
    userId,
    recommendedCategories: recommendations,
    dataReliability: 'INSUFFICIENT',
    recommendationStrategy: 'exploration',
    lastUpdated: new Date(),
    totalCategoriesAnalyzed: categories.length,
    userLearningProfile: {
      totalXP: 0,
      averageAccuracy: 0,
      activeLearningDays: 0,
      preferredDifficulties: []
    }
  }
}

/**
 * 全カテゴリーIDを取得
 */
async function getAllCategoryIds(): Promise<string[]> {
  const categories = await getAllCategories()
  return categories.map(cat => cat.id)
}