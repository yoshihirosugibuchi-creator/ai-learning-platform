/**
 * 弱点分野重点出題システム
 * XP低順カテゴリー優先で学習効率を最大化
 */

import { supabase } from '@/lib/supabase'
import { Question } from './types'
import { assessDataReliability } from './data-reliability'
// import { calculateCategoryPriority, type CategoryPriorityData } from './category-priority' // 将来使用予定
import { getAllCategories } from './categories'

// 弱点分野データ
export interface WeaknessCategory {
  categoryId: string
  categoryName: string
  currentXP: number
  averageAccuracy: number
  sessionCount: number
  lastStudiedDate: string | null
  weaknessLevel: 'critical' | 'high' | 'moderate' | 'minor'
  improvementPotential: number // 0-100
  recommendedQuestions: number
  focusReason: string
}

// 弱点重点学習セッション
export interface WeaknessFocusSession {
  userId: string
  targetWeaknesses: WeaknessCategory[]
  selectedQuestions: Question[]
  sessionType: 'weakness_intensive' | 'balanced_weakness' | 'foundation_building'
  estimatedDuration: number
  difficultyMix: {
    basic: number
    intermediate: number
    advanced: number
    expert: number
  }
  learningGoals: string[]
  dataReliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
  lastUpdated: Date
}

/**
 * 弱点分野を特定し重点出題する問題を選択
 * @param userId ユーザーID
 * @param maxQuestions 最大問題数（デフォルト: 10）
 * @param focusIntensity 集中度（'high' | 'medium' | 'low'）
 * @returns 弱点重点学習セッション
 */
export async function generateWeaknessFocusSession(
  userId: string,
  maxQuestions: number = 10,
  focusIntensity: 'high' | 'medium' | 'low' = 'medium'
): Promise<WeaknessFocusSession> {
  try {
    console.log(`🎯 Generating weakness focus session for user: ${userId}`)
    console.log(`📊 Focus intensity: ${focusIntensity}, Max questions: ${maxQuestions}`)

    // 1. データ信頼度評価
    const reliability = await assessDataReliability(userId)
    console.log(`📈 Data reliability: ${reliability.reliabilityLevel}`)

    // 2. 弱点カテゴリーを特定
    const weaknessCategories = await identifyWeaknessCategories(userId)
    
    if (weaknessCategories.length === 0) {
      console.log(`✨ No significant weaknesses found for user: ${userId}`)
      return generateBalancedSession(userId, maxQuestions, reliability.reliabilityLevel)
    }

    // 3. セッションタイプを決定
    const sessionType = determineWeaknessSessionType(
      weaknessCategories,
      focusIntensity,
      reliability.reliabilityLevel
    )

    // 4. 対象弱点を選択
    const targetWeaknesses = selectTargetWeaknesses(
      weaknessCategories,
      sessionType,
      focusIntensity
    )

    // 5. 問題を選択
    const selectedQuestions = await selectWeaknessQuestions(
      userId,
      targetWeaknesses,
      maxQuestions,
      sessionType
    )

    // 6. 難易度配分を計算
    const difficultyMix = calculateDifficultyMix(selectedQuestions)

    // 7. 学習目標を生成
    const learningGoals = generateLearningGoals(targetWeaknesses, sessionType)

    // 8. 推定時間を計算
    const estimatedDuration = calculateSessionDuration(selectedQuestions, sessionType)

    const session: WeaknessFocusSession = {
      userId,
      targetWeaknesses,
      selectedQuestions,
      sessionType,
      estimatedDuration,
      difficultyMix,
      learningGoals,
      dataReliability: reliability.reliabilityLevel,
      lastUpdated: new Date()
    }

    console.log(`✅ Weakness focus session generated:`, {
      targetWeaknesses: targetWeaknesses.length,
      questions: selectedQuestions.length,
      sessionType,
      duration: `${estimatedDuration}分`
    })

    return session

  } catch (error) {
    console.error('❌ Error in generateWeaknessFocusSession:', error)
    return generateBalancedSession(userId, maxQuestions, 'INSUFFICIENT')
  }
}

/**
 * 弱点カテゴリーを特定
 */
async function identifyWeaknessCategories(userId: string): Promise<WeaknessCategory[]> {
  try {
    console.log(`🔍 Identifying weakness categories for user: ${userId}`)

    // 1. カテゴリー別XPを取得
    const categoryXP = await getUserCategoryXP(userId)
    
    // 2. カテゴリー別学習統計を取得
    const categoryStats = await getUserCategoryStats(userId)
    
    // 3. 全カテゴリーを分析
    const allCategories = await getAllCategories()
    const weaknessCategories: WeaknessCategory[] = []

    for (const category of allCategories) {
      const categoryId = category.id
      const currentXP = categoryXP.get(categoryId) || 0
      const stats = categoryStats.get(categoryId) || {
        accuracy: 0,
        sessions: 0,
        lastStudied: null
      }

      // 弱点レベルを判定
      const weaknessLevel = determineWeaknessLevel(currentXP, stats.accuracy, stats.sessions)
      
      // 弱点でない場合はスキップ
      if (weaknessLevel === 'minor') continue

      // 改善ポテンシャルを計算
      const improvementPotential = calculateImprovementPotential(
        currentXP,
        stats.accuracy,
        stats.sessions
      )

      // 推奨問題数を計算
      const recommendedQuestions = calculateRecommendedQuestions(
        weaknessLevel,
        stats.sessions
      )

      // 集中理由を生成
      const focusReason = generateFocusReason(
        weaknessLevel,
        currentXP,
        stats.accuracy,
        stats.sessions
      )

      weaknessCategories.push({
        categoryId,
        categoryName: category.name,
        currentXP,
        averageAccuracy: stats.accuracy,
        sessionCount: stats.sessions,
        lastStudiedDate: stats.lastStudied,
        weaknessLevel,
        improvementPotential,
        recommendedQuestions,
        focusReason
      })
    }

    // 弱点レベル > 改善ポテンシャル > XP低順でソート
    const sortedWeaknesses = weaknessCategories.sort((a, b) => {
      const levelOrder = { 'critical': 4, 'high': 3, 'moderate': 2, 'minor': 1 }
      const aLevel = levelOrder[a.weaknessLevel]
      const bLevel = levelOrder[b.weaknessLevel]
      
      if (aLevel !== bLevel) return bLevel - aLevel
      if (a.improvementPotential !== b.improvementPotential) {
        return b.improvementPotential - a.improvementPotential
      }
      return a.currentXP - b.currentXP // XP低順
    })

    console.log(`📊 Found ${sortedWeaknesses.length} weakness categories`)
    return sortedWeaknesses

  } catch (error) {
    console.error('Error in identifyWeaknessCategories:', error)
    return []
  }
}

/**
 * ユーザーのカテゴリー別XPを取得
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
 * ユーザーのカテゴリー別学習統計を取得
 */
async function getUserCategoryStats(userId: string): Promise<Map<string, {
  accuracy: number
  sessions: number
  lastStudied: string | null
}>> {
  try {
    // 過去30日間の統計を取得
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
      console.error('Error fetching category stats:', error)
      return new Map()
    }

    const statsMap = new Map<string, {
      accuracy: number
      sessions: number
      lastStudied: string | null
    }>()

    data?.forEach(session => {
      session.quiz_answers?.forEach((answer: { category_id: string; is_correct: boolean; created_at: string | null }) => {
        const categoryId = answer.category_id
        if (!categoryId) return

        if (!statsMap.has(categoryId)) {
          statsMap.set(categoryId, {
            accuracy: 0,
            sessions: 0,
            lastStudied: null
          })
        }

        const stats = statsMap.get(categoryId)!
        stats.sessions += 1

        // 正答率計算（累積平均）
        const currentAccuracy = stats.accuracy
        const newAccuracy = answer.is_correct ? 100 : 0
        stats.accuracy = ((currentAccuracy * (stats.sessions - 1)) + newAccuracy) / stats.sessions

        // 最新学習日更新
        const answerDate = answer.created_at
        if (answerDate && (!stats.lastStudied || answerDate > stats.lastStudied)) {
          stats.lastStudied = answerDate
        }
      })
    })

    return statsMap

  } catch (error) {
    console.error('Error in getUserCategoryStats:', error)
    return new Map()
  }
}

/**
 * 弱点レベルを判定
 */
function determineWeaknessLevel(
  xp: number,
  accuracy: number,
  sessions: number
): 'critical' | 'high' | 'moderate' | 'minor' {
  // 未学習または極端に低いXP
  if (sessions === 0 || xp < 50) {
    return 'critical'
  }

  // 低XP + 低正答率
  if (xp < 200 && accuracy < 60) {
    return 'high'
  }

  // 中程度のXPだが正答率が低い、または低XP
  if ((xp < 500 && accuracy < 70) || xp < 300) {
    return 'moderate'
  }

  // その他は軽微な弱点
  return 'minor'
}

/**
 * 改善ポテンシャルを計算
 */
function calculateImprovementPotential(
  xp: number,
  accuracy: number,
  sessions: number
): number {
  let potential = 0

  // XPベースのポテンシャル（XPが低いほど高ポテンシャル）
  if (xp < 100) potential += 40
  else if (xp < 300) potential += 30
  else if (xp < 500) potential += 20
  else potential += 10

  // 正答率ベースのポテンシャル
  if (accuracy < 50) potential += 30
  else if (accuracy < 70) potential += 20
  else if (accuracy < 80) potential += 10
  else potential += 5

  // セッション数ベースのポテンシャル
  if (sessions === 0) potential += 30
  else if (sessions < 3) potential += 20
  else if (sessions < 10) potential += 10
  else potential += 5

  return Math.min(100, potential)
}

/**
 * 推奨問題数を計算
 */
function calculateRecommendedQuestions(
  weaknessLevel: 'critical' | 'high' | 'moderate' | 'minor',
  sessions: number
): number {
  const baseQuestions = {
    'critical': 5,
    'high': 4,
    'moderate': 3,
    'minor': 2
  }

  let questions = baseQuestions[weaknessLevel]

  // セッション数による調整
  if (sessions === 0) questions += 2
  else if (sessions < 3) questions += 1

  return Math.min(8, questions) // 最大8問
}

/**
 * 集中理由を生成
 */
function generateFocusReason(
  weaknessLevel: 'critical' | 'high' | 'moderate' | 'minor',
  xp: number,
  accuracy: number,
  sessions: number
): string {
  switch (weaknessLevel) {
    case 'critical':
      if (sessions === 0) {
        return `未学習分野です。基礎から着実に学習を始めましょう。`
      } else {
        return `XP ${xp}点と著しく低く、集中的な学習が必要です。`
      }
    case 'high':
      return `XP ${xp}点、正答率${accuracy.toFixed(1)}%と低く、重点的な強化が必要です。`
    case 'moderate':
      return `正答率${accuracy.toFixed(1)}%またはXP ${xp}点が改善の余地があります。`
    default:
      return `さらなるスキル向上のため継続学習をお勧めします。`
  }
}

/**
 * セッションタイプを決定
 */
function determineWeaknessSessionType(
  weaknesses: WeaknessCategory[],
  focusIntensity: 'high' | 'medium' | 'low',
  reliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
): 'weakness_intensive' | 'balanced_weakness' | 'foundation_building' {
  const criticalCount = weaknesses.filter(w => w.weaknessLevel === 'critical').length
  const highCount = weaknesses.filter(w => w.weaknessLevel === 'high').length

  if (reliability === 'HIGH' && focusIntensity === 'high') {
    if (criticalCount >= 2) {
      return 'foundation_building' // 基礎構築
    } else if (criticalCount >= 1 || highCount >= 2) {
      return 'weakness_intensive' // 弱点集中
    } else {
      return 'balanced_weakness' // バランス弱点
    }
  } else {
    return 'foundation_building' // 安全な基礎構築
  }
}

/**
 * 対象弱点を選択
 */
function selectTargetWeaknesses(
  weaknesses: WeaknessCategory[],
  sessionType: 'weakness_intensive' | 'balanced_weakness' | 'foundation_building',
  focusIntensity: 'high' | 'medium' | 'low'
): WeaknessCategory[] {
  const maxTargets = focusIntensity === 'high' ? 2 : focusIntensity === 'medium' ? 3 : 4

  switch (sessionType) {
    case 'weakness_intensive':
      // 最も重要な弱点に集中
      return weaknesses.slice(0, Math.min(2, maxTargets))
    
    case 'balanced_weakness':
      // バランス良く複数の弱点をカバー
      return weaknesses.slice(0, maxTargets)
    
    case 'foundation_building':
      // 基礎レベルの弱点を幅広くカバー
      return weaknesses.slice(0, Math.min(4, maxTargets))
    
    default:
      return weaknesses.slice(0, 3)
  }
}

/**
 * 弱点問題を選択
 */
async function selectWeaknessQuestions(
  userId: string,
  targetWeaknesses: WeaknessCategory[],
  maxQuestions: number,
  _sessionType: 'weakness_intensive' | 'balanced_weakness' | 'foundation_building'
): Promise<Question[]> {
  try {
    const selectedQuestions: Question[] = []

    for (const weakness of targetWeaknesses) {
      const questionsForCategory = Math.min(
        weakness.recommendedQuestions,
        Math.floor(maxQuestions / targetWeaknesses.length)
      )

      // カテゴリーの問題を取得（モック実装）
      console.log(`Selecting ${questionsForCategory} questions for category: ${weakness.categoryName}`)
      
      // 実装時は実際の問題データベースから取得
      // const categoryQuestions = await getQuestionsByCategory(weakness.categoryId, questionsForCategory)
      // selectedQuestions.push(...categoryQuestions)
    }

    return selectedQuestions

  } catch (error) {
    console.error('Error selecting weakness questions:', error)
    return []
  }
}

/**
 * 難易度配分を計算
 */
function calculateDifficultyMix(questions: Question[]): {
  basic: number
  intermediate: number
  advanced: number
  expert: number
} {
  const mix = { basic: 0, intermediate: 0, advanced: 0, expert: 0 }
  
  questions.forEach(q => {
    switch (q.difficulty) {
      case 'basic':
        mix.basic++
        break
      case 'intermediate':
        mix.intermediate++
        break
      case 'advanced':
        mix.advanced++
        break
      case 'expert':
        mix.expert++
        break
    }
  })

  return mix
}

/**
 * 学習目標を生成
 */
function generateLearningGoals(
  targetWeaknesses: WeaknessCategory[],
  sessionType: 'weakness_intensive' | 'balanced_weakness' | 'foundation_building'
): string[] {
  const goals: string[] = []

  switch (sessionType) {
    case 'weakness_intensive':
      goals.push('最重要な弱点分野を集中的に強化')
      targetWeaknesses.slice(0, 2).forEach(w => {
        goals.push(`${w.categoryName}: XP ${w.currentXP} → ${w.currentXP + 100}を目指す`)
      })
      break

    case 'balanced_weakness':
      goals.push('複数の弱点分野をバランス良く改善')
      targetWeaknesses.forEach(w => {
        goals.push(`${w.categoryName}: 正答率${w.averageAccuracy.toFixed(0)}% → 70%以上を目指す`)
      })
      break

    case 'foundation_building':
      goals.push('基礎力全体の底上げを図る')
      goals.push('未学習分野の基本的な理解を構築')
      goals.push('学習習慣の定着と継続的な成長')
      break
  }

  return goals
}

/**
 * セッション時間を計算
 */
function calculateSessionDuration(
  questions: Question[],
  sessionType: 'weakness_intensive' | 'balanced_weakness' | 'foundation_building'
): number {
  const baseTime = questions.length * 4 // 弱点問題は通常より長め

  const typeMultiplier = {
    'weakness_intensive': 1.3, // 解説重視
    'balanced_weakness': 1.1,
    'foundation_building': 1.2 // 基礎説明重視
  }

  return Math.round(baseTime * typeMultiplier[sessionType])
}

/**
 * バランス型セッションを生成（フォールバック）
 */
async function generateBalancedSession(
  userId: string,
  maxQuestions: number,
  reliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
): Promise<WeaknessFocusSession> {
  return {
    userId,
    targetWeaknesses: [],
    selectedQuestions: [],
    sessionType: 'foundation_building',
    estimatedDuration: 20,
    difficultyMix: { basic: 5, intermediate: 3, advanced: 2, expert: 0 },
    learningGoals: [
      '基礎的な学習習慣を身につける',
      '様々な分野の基本概念を理解する',
      '継続的な学習ペースを確立する'
    ],
    dataReliability: reliability,
    lastUpdated: new Date()
  }
}