/**
 * ユーザー設定・重点カテゴリー管理システム
 * 統合マトリックス方式でカテゴリー×難易度の最適配分を実現
 */

import { supabase } from '@/lib/supabase'
import { getAllCategories } from './categories'

// ユーザー学習設定
export interface UserLearningPreferences {
  userId: string
  priorityCategories: string[] // 重点カテゴリーID配列
  preferredDifficulties: string[] // 好む難易度配列
  learningGoals: {
    dailyQuestions: number
    weeklyHours: number
    focusAreas: string[]
  }
  avoidanceSettings: {
    difficultiesToAvoid: string[]
    categoriesToMinimize: string[]
  }
  lastUpdated: Date
}

// 問題配分マトリックス
export interface QuestionMatrix {
  [categoryId: string]: {
    basic: number
    intermediate: number
    advanced: number
    expert: number
    total: number
    source: string
  }
}

// マトリックス配分結果
export interface MatrixAllocation {
  userId: string
  totalQuestions: number
  matrix: QuestionMatrix
  allocationStrategy: 'review_priority' | 'balanced_growth' | 'weakness_focus'
  difficultyDistribution: {
    basic: number
    intermediate: number
    advanced: number
    expert: number
  }
  categoryDistribution: {
    categoryId: string
    categoryName: string
    questionCount: number
    percentage: number
  }[]
  estimatedDuration: number
  lastCalculated: Date
}

/**
 * ユーザーの学習設定を取得
 * @param userId ユーザーID
 * @returns ユーザー学習設定
 */
export async function getUserLearningPreferences(userId: string): Promise<UserLearningPreferences> {
  try {
    console.log(`📊 Fetching learning preferences for user: ${userId}`)

    // user_settingsテーブルから設定を取得
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', userId)
      .in('setting_key', ['priority_categories', 'preferred_difficulties', 'learning_goals'])

    if (error) {
      console.error('Error fetching user preferences:', error)
    }
    
    // 設定データを解析
    const preferences: Partial<UserLearningPreferences> = {}
    
    data?.forEach(setting => {
      try {
        const value = typeof setting.setting_value === 'string' 
          ? JSON.parse(setting.setting_value)
          : setting.setting_value
        
        switch (setting.setting_key) {
          case 'priority_categories':
            preferences.priorityCategories = Array.isArray(value) ? value : []
            break
          case 'preferred_difficulties':
            preferences.preferredDifficulties = Array.isArray(value) ? value : ['basic', 'intermediate']
            break
          case 'learning_goals':
            preferences.learningGoals = value || {
              dailyQuestions: 10,
              weeklyHours: 5,
              focusAreas: []
            }
            break
        }
      } catch (parseError) {
        console.error(`Error parsing setting ${setting.setting_key}:`, parseError)
      }
    })

    // デフォルト設定（取得したデータで上書き）
    const defaultPreferences: UserLearningPreferences = {
      userId,
      priorityCategories: preferences.priorityCategories || [],
      preferredDifficulties: preferences.preferredDifficulties || ['basic', 'intermediate'],
      learningGoals: preferences.learningGoals || {
        dailyQuestions: 10,
        weeklyHours: 5,
        focusAreas: []
      },
      avoidanceSettings: {
        difficultiesToAvoid: [],
        categoriesToMinimize: []
      },
      lastUpdated: new Date()
    }

    return defaultPreferences

  } catch (error) {
    console.error('Error in getUserLearningPreferences:', error)
    return {
      userId,
      priorityCategories: [],
      preferredDifficulties: ['basic', 'intermediate'],
      learningGoals: { dailyQuestions: 10, weeklyHours: 5, focusAreas: [] },
      avoidanceSettings: { difficultiesToAvoid: [], categoriesToMinimize: [] },
      lastUpdated: new Date()
    }
  }
}

/**
 * ユーザーの学習設定を更新
 * @param userId ユーザーID
 * @param preferences 更新する設定
 * @returns 更新成功可否
 */
export async function updateUserLearningPreferences(
  userId: string,
  preferences: Partial<UserLearningPreferences>
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`💾 Updating learning preferences for user: ${userId}`)

    // user_settingsテーブルに設定を保存
    const updates = []
    
    if (preferences.priorityCategories !== undefined) {
      updates.push({
        user_id: userId,
        setting_key: 'priority_categories',
        setting_value: JSON.stringify(preferences.priorityCategories)
      })
    }
    
    if (preferences.preferredDifficulties !== undefined) {
      updates.push({
        user_id: userId,
        setting_key: 'preferred_difficulties',
        setting_value: JSON.stringify(preferences.preferredDifficulties)
      })
    }
    
    if (preferences.learningGoals !== undefined) {
      updates.push({
        user_id: userId,
        setting_key: 'learning_goals',
        setting_value: JSON.stringify(preferences.learningGoals)
      })
    }

    // 設定を一括更新（upsert）
    if (updates.length > 0) {
      const { error } = await supabase
        .from('user_settings')
        .upsert(updates, {
          onConflict: 'user_id,setting_key'
        })

      if (error) {
        console.error('Error updating preferences:', error)
        return {
          success: false,
          message: '設定の保存に失敗しました。'
        }
      }
    }

    console.log('✅ Learning preferences updated successfully')
    return {
      success: true,
      message: '学習設定を更新しました。'
    }

  } catch (error) {
    console.error('Error in updateUserLearningPreferences:', error)
    return {
      success: false,
      message: '設定の更新中にエラーが発生しました。'
    }
  }
}

/**
 * 統合マトリックス配分を計算
 * @param userId ユーザーID
 * @param totalQuestions 総問題数
 * @param options 配分オプション
 * @returns マトリックス配分結果
 */
export async function calculateQuestionMatrix(
  userId: string,
  totalQuestions: number = 10,
  options: {
    includeReview?: boolean
    priorityWeight?: number // 重点カテゴリーの重み（デフォルト: 2.0）
    difficultyBalance?: 'user_adaptive' | 'balanced' | 'progressive'
  } = {}
): Promise<MatrixAllocation> {
  try {
    console.log(`🎯 Calculating question matrix for user: ${userId}`)
    console.log(`📊 Total questions: ${totalQuestions}`)

    const {
      includeReview = true,
      priorityWeight = 2.0,
      difficultyBalance = 'user_adaptive'
    } = options

    // 1. 必要なデータを並列取得
    const [
      userPreferences,
      reviewQuestions,
      weaknessCategories,
      allCategories
    ] = await Promise.all([
      getUserLearningPreferences(userId),
      includeReview ? getReviewQuestionsCount(userId) : Promise.resolve(0),
      getWeaknessCategoriesCount(userId),
      getAllCategories()
    ])

    // 2. 配分戦略を決定
    const strategy = determineAllocationStrategy(
      userPreferences,
      reviewQuestions,
      weaknessCategories.length
    )

    // 3. 基本配分を計算
    const baseAllocation = calculateBaseAllocation(
      totalQuestions,
      reviewQuestions,
      userPreferences.priorityCategories.length,
      weaknessCategories.length
    )

    // 4. カテゴリー配分を決定
    const categoryAllocation = calculateCategoryAllocation(
      baseAllocation,
      userPreferences.priorityCategories,
      weaknessCategories,
      allCategories,
      priorityWeight
    )

    // 5. 難易度配分を決定
    const difficultyDistribution = calculateDifficultyDistribution(
      totalQuestions,
      userPreferences.preferredDifficulties,
      difficultyBalance
    )

    // 6. マトリックスを構築
    const matrix = buildQuestionMatrix(
      categoryAllocation,
      difficultyDistribution,
      allCategories
    )

    // 7. 配分統計を計算
    const categoryDistribution = calculateCategoryDistribution(matrix, allCategories)
    const estimatedDuration = calculateEstimatedDuration(matrix)

    const result: MatrixAllocation = {
      userId,
      totalQuestions,
      matrix,
      allocationStrategy: strategy,
      difficultyDistribution,
      categoryDistribution,
      estimatedDuration,
      lastCalculated: new Date()
    }

    console.log(`✅ Question matrix calculated:`, {
      strategy,
      categories: Object.keys(matrix).length,
      reviewQuestions,
      priorityCategories: userPreferences.priorityCategories.length
    })

    return result

  } catch (error) {
    console.error('❌ Error in calculateQuestionMatrix:', error)
    return generateDefaultMatrix(userId, totalQuestions)
  }
}

/**
 * 復習問題数を取得
 */
async function getReviewQuestionsCount(userId: string): Promise<number> {
  try {
    const { identifyReviewQuestions } = await import('./review-questions')
    const reviewSession = await identifyReviewQuestions(userId, 2, 3)
    return reviewSession.reviewQuestions.length
  } catch (error) {
    console.error('Error getting review questions count:', error)
    return 0
  }
}

/**
 * 弱点カテゴリー数を取得
 */
async function getWeaknessCategoriesCount(userId: string): Promise<{
  length: number
  categories: string[]
}> {
  try {
    const { generateWeaknessFocusSession } = await import('./weakness-focus')
    const weaknessSession = await generateWeaknessFocusSession(userId, 10, 'medium')
    const weaknessCategories = weaknessSession.targetWeaknesses.map(w => w.categoryId)
    return {
      length: weaknessCategories.length,
      categories: weaknessCategories
    }
  } catch (error) {
    console.error('Error getting weakness categories:', error)
    return { length: 0, categories: [] }
  }
}

/**
 * 配分戦略を決定
 */
function determineAllocationStrategy(
  preferences: UserLearningPreferences,
  reviewQuestions: number,
  weaknessCount: number
): 'review_priority' | 'balanced_growth' | 'weakness_focus' {
  if (reviewQuestions >= 2) {
    return 'review_priority'
  } else if (preferences.priorityCategories.length >= 2) {
    return 'balanced_growth'
  } else if (weaknessCount >= 3) {
    return 'weakness_focus'
  } else {
    return 'balanced_growth'
  }
}

/**
 * 基本配分を計算
 */
function calculateBaseAllocation(
  totalQuestions: number,
  reviewQuestions: number,
  priorityCount: number,
  weaknessCount: number
): {
  review: number
  priority: number
  weakness: number
  balanced: number
} {
  const review = Math.min(reviewQuestions, 2) // 最大2問
  const remaining = totalQuestions - review

  // 重点カテゴリーに30-40%割り当て
  const priority = Math.min(
    Math.floor(remaining * 0.4),
    priorityCount * 2 // カテゴリーあたり最大2問
  )

  // 弱点カテゴリーに20-30%割り当て
  const weakness = Math.min(
    Math.floor(remaining * 0.3),
    weaknessCount * 2 // カテゴリーあたり最大2問
  )

  const balanced = remaining - priority - weakness

  return { review, priority, weakness, balanced }
}

/**
 * カテゴリー配分を計算
 */
function calculateCategoryAllocation(
  baseAllocation: { [key: string]: number },
  priorityCategories: string[],
  weaknessCategories: { categories: string[] },
  allCategories: { id: string; name: string }[],
  _priorityWeight: number
): Map<string, { questions: number; source: string }> {
  const allocation = new Map<string, { questions: number; source: string }>()

  // 重点カテゴリー配分
  if (priorityCategories.length > 0 && baseAllocation.priority > 0) {
    const questionsPerPriority = Math.ceil(baseAllocation.priority / priorityCategories.length)
    priorityCategories.forEach(categoryId => {
      allocation.set(categoryId, {
        questions: questionsPerPriority,
        source: 'priority'
      })
    })
  }

  // 弱点カテゴリー配分
  if (weaknessCategories.categories.length > 0 && baseAllocation.weakness > 0) {
    const questionsPerWeakness = Math.ceil(baseAllocation.weakness / weaknessCategories.categories.length)
    weaknessCategories.categories.forEach(categoryId => {
      const existing = allocation.get(categoryId)
      if (existing) {
        existing.questions += questionsPerWeakness
      } else {
        allocation.set(categoryId, {
          questions: questionsPerWeakness,
          source: 'weakness'
        })
      }
    })
  }

  // バランス配分（残りカテゴリー）
  if (baseAllocation.balanced > 0) {
    const usedCategories = new Set(allocation.keys())
    const remainingCategories = allCategories.filter(cat => !usedCategories.has(cat.id))
    
    if (remainingCategories.length > 0) {
      const questionsPerRemaining = Math.ceil(baseAllocation.balanced / remainingCategories.length)
      remainingCategories.forEach(category => {
        allocation.set(category.id, {
          questions: questionsPerRemaining,
          source: 'balanced'
        })
      })
    }
  }

  return allocation
}

/**
 * 難易度配分を計算
 */
function calculateDifficultyDistribution(
  totalQuestions: number,
  preferredDifficulties: string[],
  balanceType: string
): { basic: number; intermediate: number; advanced: number; expert: number } {
  const distribution = { basic: 0, intermediate: 0, advanced: 0, expert: 0 }

  switch (balanceType) {
    case 'user_adaptive':
      // ユーザーの好みに基づく配分
      if (preferredDifficulties.includes('basic')) {
        distribution.basic = Math.floor(totalQuestions * 0.4)
      }
      if (preferredDifficulties.includes('intermediate')) {
        distribution.intermediate = Math.floor(totalQuestions * 0.4)
      }
      if (preferredDifficulties.includes('advanced')) {
        distribution.advanced = Math.floor(totalQuestions * 0.15)
      }
      if (preferredDifficulties.includes('expert')) {
        distribution.expert = Math.floor(totalQuestions * 0.05)
      }
      break

    case 'balanced':
      // バランス型配分
      distribution.basic = Math.floor(totalQuestions * 0.3)
      distribution.intermediate = Math.floor(totalQuestions * 0.4)
      distribution.advanced = Math.floor(totalQuestions * 0.25)
      distribution.expert = Math.floor(totalQuestions * 0.05)
      break

    case 'progressive':
      // 段階的配分
      distribution.basic = Math.floor(totalQuestions * 0.5)
      distribution.intermediate = Math.floor(totalQuestions * 0.3)
      distribution.advanced = Math.floor(totalQuestions * 0.15)
      distribution.expert = Math.floor(totalQuestions * 0.05)
      break
  }

  // 合計を調整
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0)
  if (total < totalQuestions) {
    distribution.intermediate += totalQuestions - total
  }

  return distribution
}

/**
 * 問題マトリックスを構築
 */
function buildQuestionMatrix(
  categoryAllocation: Map<string, { questions: number; source: string }>,
  difficultyDistribution: { [key: string]: number },
  allCategories: { id: string; name: string }[]
): QuestionMatrix {
  const matrix: QuestionMatrix = {}

  categoryAllocation.forEach((allocation, categoryId) => {
    const category = allCategories.find(cat => cat.id === categoryId)
    if (!category) return

    // カテゴリー内での難易度配分
    const categoryQuestions = allocation.questions
    const categoryDifficulties = distributeDifficultiesForCategory(
      categoryQuestions,
      difficultyDistribution,
      allocation.source
    )

    matrix[categoryId] = {
      ...categoryDifficulties,
      total: categoryQuestions,
      source: allocation.source
    }
  })

  return matrix
}

/**
 * カテゴリー内難易度配分
 */
function distributeDifficultiesForCategory(
  totalQuestions: number,
  _globalDistribution: { [key: string]: number },
  source: string
): { basic: number; intermediate: number; advanced: number; expert: number } {
  if (totalQuestions === 0) {
    return { basic: 0, intermediate: 0, advanced: 0, expert: 0 }
  }

  // ソースタイプに基づく配分調整
  let ratio = { basic: 0.3, intermediate: 0.4, advanced: 0.25, expert: 0.05 }
  
  if (source === 'weakness') {
    // 弱点は基礎寄り
    ratio = { basic: 0.5, intermediate: 0.35, advanced: 0.15, expert: 0 }
  } else if (source === 'priority') {
    // 重点は中級寄り
    ratio = { basic: 0.2, intermediate: 0.5, advanced: 0.25, expert: 0.05 }
  }

  const distribution = {
    basic: Math.round(totalQuestions * ratio.basic),
    intermediate: Math.round(totalQuestions * ratio.intermediate),
    advanced: Math.round(totalQuestions * ratio.advanced),
    expert: Math.round(totalQuestions * ratio.expert)
  }

  // 合計調整
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0)
  if (total !== totalQuestions) {
    distribution.intermediate += totalQuestions - total
  }

  return distribution
}

/**
 * カテゴリー配分統計を計算
 */
function calculateCategoryDistribution(
  matrix: QuestionMatrix,
  allCategories: { id: string; name: string }[]
): Array<{
  categoryId: string
  categoryName: string
  questionCount: number
  percentage: number
}> {
  const totalQuestions = Object.values(matrix).reduce((sum, cat) => sum + cat.total, 0)
  
  return Object.entries(matrix).map(([categoryId, allocation]) => {
    const category = allCategories.find(cat => cat.id === categoryId)
    return {
      categoryId,
      categoryName: category?.name || categoryId,
      questionCount: allocation.total,
      percentage: Math.round((allocation.total / totalQuestions) * 100)
    }
  })
}

/**
 * 推定時間を計算
 */
function calculateEstimatedDuration(matrix: QuestionMatrix): number {
  let totalTime = 0

  Object.values(matrix).forEach(allocation => {
    // 難易度別の基準時間（分）
    totalTime += allocation.basic * 2
    totalTime += allocation.intermediate * 3
    totalTime += allocation.advanced * 4
    totalTime += allocation.expert * 5
  })

  return Math.max(10, totalTime)
}

/**
 * デフォルトマトリックスを生成
 */
function generateDefaultMatrix(userId: string, totalQuestions: number): MatrixAllocation {
  const defaultMatrix: QuestionMatrix = {
    'communication_presentation': {
      basic: 2,
      intermediate: 2,
      advanced: 0,
      expert: 0,
      total: 4,
      source: 'balanced'
    },
    'logical_thinking_problem_solving': {
      basic: 2,
      intermediate: 2,
      advanced: 0,
      expert: 0,
      total: 4,
      source: 'balanced'
    },
    'strategy_management': {
      basic: 1,
      intermediate: 1,
      advanced: 0,
      expert: 0,
      total: 2,
      source: 'balanced'
    }
  }

  return {
    userId,
    totalQuestions,
    matrix: defaultMatrix,
    allocationStrategy: 'balanced_growth',
    difficultyDistribution: { basic: 5, intermediate: 5, advanced: 0, expert: 0 },
    categoryDistribution: [
      { categoryId: 'communication_presentation', categoryName: 'コミュニケーション', questionCount: 4, percentage: 40 },
      { categoryId: 'logical_thinking_problem_solving', categoryName: '論理的思考', questionCount: 4, percentage: 40 },
      { categoryId: 'strategy_management', categoryName: '戦略・経営', questionCount: 2, percentage: 20 }
    ],
    estimatedDuration: 25,
    lastCalculated: new Date()
  }
}