/**
 * Smart Random Selection Library
 * 
 * Purpose: Intelligent question selection for category quizzes
 * Features: Usage history tracking, overlap prevention, weighted randomization
 * Used by: Category quizzes, quick-start API, fallback scenarios
 * 
 * Key Benefits:
 * - Prevents question repetition within 7 days
 * - Reduces weight of frequently used questions
 * - Maintains randomness while optimizing variety
 * - Real-time selection (0.5-1 second)
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { UserQuestionUsageInsert } from '@/lib/database-types-official'

// =================================================================
// Core Types and Interfaces
// =================================================================

export interface SmartSelectionOptions {
  userId: string
  categoryId: string
  difficulties: string[]
  count?: number
  subcategoryId?: string
  avoidRecentDays?: number
  maxUsageCount?: number
}

export interface QuestionWithUsage {
  id: number
  category_id: string
  subcategory_id?: string | null
  difficulty: string | null
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correct_answer: number
  explanation?: string | null
  time_limit?: number | null
  // Usage tracking fields
  last_used_at?: string | null
  usage_count?: number
  recent_usage_count?: number
  smart_weight: number
}

export interface UsageStats {
  question_id: number
  last_used_at?: string | null
  usage_count: number | null
  recent_usage_count: number | null
  days_since_used: number
}

export interface SelectionResult {
  questions: QuestionWithUsage[]
  selection_method: string
  usage_stats: {
    total_available: number
    never_used: number
    recently_used: number
    frequently_used: number
  }
  performance_stats: {
    selection_time_ms: number
    weight_calculation_time_ms: number
    database_time_ms: number
  }
}

// =================================================================
// Main Selection Function
// =================================================================

/**
 * Perform smart random selection with usage history optimization
 * 
 * @param options Selection parameters
 * @returns Selected questions with metadata
 */
export async function performSmartRandomSelection(
  options: SmartSelectionOptions
): Promise<SelectionResult> {
  const startTime = performance.now()
  console.log(`🎲 [Smart Selection] Starting for ${options.categoryId}`)
  
  const {
    userId,
    categoryId,
    difficulties,
    count = 10,
    subcategoryId,
    avoidRecentDays = 7,
    maxUsageCount = 5
  } = options
  
  try {
    // Step 1: Get questions with usage history
    const dbStartTime = performance.now()
    const questionsWithUsage = await getQuestionsWithUsageHistory(
      categoryId,
      difficulties,
      userId,
      subcategoryId,
      count * 3 // Get more options for better selection
    )
    const dbTime = performance.now() - dbStartTime
    
    if (questionsWithUsage.length < count) {
      throw new Error(`Insufficient questions for category ${categoryId}: found ${questionsWithUsage.length}, need ${count}`)
    }
    
    // Step 2: Calculate smart weights
    const weightStartTime = performance.now()
    const weightedQuestions = calculateSmartWeights(
      questionsWithUsage,
      avoidRecentDays,
      maxUsageCount
    )
    const weightTime = performance.now() - weightStartTime
    
    // Step 3: Perform weighted random selection
    const selectedQuestions = performWeightedRandomSelection(weightedQuestions, count)
    
    // Step 4: Update usage history
    await updateQuestionUsageHistory(userId, selectedQuestions)
    
    // Step 5: Calculate statistics
    const usageStats = calculateUsageStatistics(weightedQuestions)
    const selectionTime = performance.now() - startTime
    
    console.log(`✅ [Smart Selection] Completed in ${selectionTime.toFixed(1)}ms`)
    
    return {
      questions: selectedQuestions,
      selection_method: 'smart_random_weighted',
      usage_stats: usageStats,
      performance_stats: {
        selection_time_ms: Math.round(selectionTime),
        weight_calculation_time_ms: Math.round(weightTime),
        database_time_ms: Math.round(dbTime)
      }
    }
    
  } catch (error) {
    console.error('❌ [Smart Selection] Error:', error)
    throw error
  }
}

/**
 * Fallback selection for when smart selection fails
 * Uses simple random without usage history
 */
export async function performFallbackSelection(
  categoryId: string,
  difficulties: string[],
  count: number = 10,
  subcategoryId?: string
): Promise<QuestionWithUsage[]> {
  console.log(`🔄 [Fallback Selection] Simple random for ${categoryId}`)
  
  let query = supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('category_id', categoryId)
    .in('difficulty', difficulties)
    .eq('is_deleted', false)
    .limit(count * 2)
  
  if (subcategoryId) {
    query = query.eq('subcategory_id', subcategoryId)
  }
  
  const { data: questions, error } = await query
  
  if (error || !questions || questions.length < count) {
    throw new Error(`Fallback selection failed for ${categoryId}`)
  }
  
  // Simple random shuffle
  const shuffled = questions.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(q => ({
    ...q,
    smart_weight: 1.0
  }))
}

// =================================================================
// Database Access Functions
// =================================================================

/**
 * Get questions with their usage history for a specific category
 */
async function getQuestionsWithUsageHistory(
  categoryId: string,
  difficulties: string[],
  userId: string,
  subcategoryId?: string,
  limit: number = 30
): Promise<QuestionWithUsage[]> {
  
  let baseQuery = supabaseAdmin
    .from('quiz_questions')
    .select(`
      id, category_id, subcategory_id, difficulty, question,
      option1, option2, option3, option4, correct_answer,
      explanation, time_limit,
      user_question_usage!left(
        last_used_at, usage_count, recent_usage_count
      )
    `)
    .eq('category_id', categoryId)
    .in('difficulty', difficulties)
    .eq('is_deleted', false)
    .limit(limit)
  
  if (subcategoryId) {
    baseQuery = baseQuery.eq('subcategory_id', subcategoryId)
  }
  
  const { data: questions, error } = await baseQuery
  
  if (error) {
    throw new Error(`Failed to get questions with usage: ${error.message}`)
  }
  
  if (!questions || questions.length === 0) {
    throw new Error(`No questions found for category ${categoryId}`)
  }
  
  // Process and filter the joined usage data
  return questions.map(q => {
    const usage = q.user_question_usage?.[0] || null
    
    return {
      ...q,
      last_used_at: usage?.last_used_at || undefined,
      usage_count: usage?.usage_count || 0,
      recent_usage_count: usage?.recent_usage_count || 0,
      smart_weight: 1.0 // Will be calculated later
    }
  })
}

/**
 * Update question usage history after selection
 */
async function updateQuestionUsageHistory(
  userId: string,
  questions: QuestionWithUsage[]
): Promise<void> {
  const now = new Date().toISOString()
  
  const usageUpdates: UserQuestionUsageInsert[] = questions.map(q => ({
    user_id: userId,
    question_id: q.id,
    category_id: q.category_id,
    subcategory_id: q.subcategory_id || null,
    difficulty: q.difficulty || 'basic',
    last_used_at: now,
    usage_count: (q.usage_count || 0) + 1,
    recent_usage_count: (q.recent_usage_count || 0) + 1,
    updated_at: now
  }))
  
  // Use upsert to handle existing records
  const { error } = await supabaseAdmin
    .from('user_question_usage')
    .upsert(usageUpdates, {
      onConflict: 'user_id, question_id',
      ignoreDuplicates: false
    })
  
  if (error) {
    console.warn('⚠️ [Smart Selection] Failed to update usage history:', error)
    // Non-critical error - don't throw
  } else {
    console.log(`📊 [Smart Selection] Updated usage for ${questions.length} questions`)
  }
}

// =================================================================
// Weight Calculation and Selection Logic
// =================================================================

/**
 * Calculate smart weights based on usage history and recency
 */
function calculateSmartWeights(
  questions: QuestionWithUsage[],
  avoidRecentDays: number = 7,
  maxUsageCount: number = 5
): QuestionWithUsage[] {
  
  return questions.map(q => {
    let weight = 1.0
    
    // Factor 1: Recency penalty
    if (q.last_used_at) {
      const daysSinceUsed = (Date.now() - new Date(q.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSinceUsed < avoidRecentDays) {
        // Strong penalty for recently used questions
        weight *= Math.max(0.1, daysSinceUsed / avoidRecentDays)
      } else if (daysSinceUsed < avoidRecentDays * 2) {
        // Lighter penalty for somewhat recent questions
        weight *= Math.max(0.7, daysSinceUsed / (avoidRecentDays * 2))
      }
    }
    
    // Factor 2: Frequency penalty
    const usageCount = q.recent_usage_count || 0
    if (usageCount >= maxUsageCount) {
      // Heavy penalty for overused questions
      weight *= Math.max(0.1, 1 - (usageCount - maxUsageCount + 1) * 0.2)
    } else if (usageCount >= 3) {
      // Moderate penalty for frequently used questions
      weight *= Math.max(0.3, 1 - (usageCount - 2) * 0.15)
    }
    
    // Factor 3: Difficulty balance (slight preference for variety)
    // This can be enhanced based on user's performance in different difficulties
    
    // Factor 4: Never-used bonus
    if (!q.last_used_at) {
      weight *= 1.2 // Small boost for never-used questions
    }
    
    return {
      ...q,
      smart_weight: Math.max(0.05, weight) // Minimum weight to ensure all questions can be selected
    }
  })
}

/**
 * Perform weighted random selection using cumulative weight distribution
 */
function performWeightedRandomSelection(
  weightedQuestions: QuestionWithUsage[],
  count: number
): QuestionWithUsage[] {
  
  if (weightedQuestions.length <= count) {
    return weightedQuestions
  }
  
  const selected: QuestionWithUsage[] = []
  const available = [...weightedQuestions]
  
  for (let i = 0; i < count && available.length > 0; i++) {
    // Calculate total weight of available questions
    const totalWeight = available.reduce((sum, q) => sum + q.smart_weight, 0)
    
    if (totalWeight === 0) {
      // All remaining questions have zero weight - just pick randomly
      const randomIndex = Math.floor(Math.random() * available.length)
      selected.push(available[randomIndex])
      available.splice(randomIndex, 1)
      continue
    }
    
    // Generate random value within total weight
    let randomValue = Math.random() * totalWeight
    
    // Find the question corresponding to this weight
    let selectedIndex = 0
    for (let j = 0; j < available.length; j++) {
      randomValue -= available[j].smart_weight
      if (randomValue <= 0) {
        selectedIndex = j
        break
      }
    }
    
    // Add selected question and remove from available
    selected.push(available[selectedIndex])
    available.splice(selectedIndex, 1)
  }
  
  return selected
}

// =================================================================
// Statistics and Analytics
// =================================================================

/**
 * Calculate usage statistics for monitoring and optimization
 */
function calculateUsageStatistics(questions: QuestionWithUsage[]): {
  total_available: number
  never_used: number
  recently_used: number
  frequently_used: number
} {
  
  const stats = {
    total_available: questions.length,
    never_used: 0,
    recently_used: 0,
    frequently_used: 0
  }
  
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  
  questions.forEach(q => {
    // Never used
    if (!q.last_used_at) {
      stats.never_used++
      return
    }
    
    // Recently used (within 7 days)
    const lastUsed = new Date(q.last_used_at).getTime()
    if (lastUsed > sevenDaysAgo) {
      stats.recently_used++
    }
    
    // Frequently used (3+ times in recent period)
    if ((q.recent_usage_count || 0) >= 3) {
      stats.frequently_used++
    }
  })
  
  return stats
}

/**
 * Get usage statistics for a specific user and category
 */
export async function getUserCategoryUsageStats(
  userId: string,
  categoryId: string
): Promise<UsageStats[]> {
  
  const { data, error } = await supabaseAdmin
    .from('user_question_usage')
    .select('question_id, last_used_at, usage_count, recent_usage_count')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .order('last_used_at', { ascending: false })
  
  if (error) {
    console.warn('⚠️ Failed to get usage stats:', error)
    return []
  }
  
  return (data || []).map(usage => ({
    ...usage,
    days_since_used: usage.last_used_at 
      ? (Date.now() - new Date(usage.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999
  }))
}

/**
 * Reset usage history for a user (useful for testing or user request)
 */
export async function resetUserQuestionUsage(
  userId: string,
  categoryId?: string
): Promise<number> {
  
  let query = supabaseAdmin
    .from('user_question_usage')
    .delete()
    .eq('user_id', userId)
  
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  
  const { count, error } = await query
  
  if (error) {
    throw new Error(`Failed to reset usage history: ${error.message}`)
  }
  
  console.log(`🗑️ Reset usage history: ${count || 0} records deleted`)
  return count || 0
}

// =================================================================
// Utility Functions
// =================================================================

/**
 * Get optimal selection parameters based on category size
 */
export async function getOptimalSelectionParams(
  categoryId: string,
  difficulties: string[]
): Promise<{
  recommendedCount: number
  avoidRecentDays: number
  maxUsageCount: number
}> {
  
  // Count total questions in category
  const { count: totalQuestions } = await supabaseAdmin
    .from('quiz_questions')
    .select('id', { count: 'exact' })
    .eq('category_id', categoryId)
    .in('difficulty', difficulties)
    .eq('is_deleted', false)
  
  const questionCount = totalQuestions || 0
  
  // Adjust parameters based on question pool size
  if (questionCount < 30) {
    return {
      recommendedCount: Math.min(10, Math.floor(questionCount * 0.8)),
      avoidRecentDays: 3, // Shorter avoidance for small pools
      maxUsageCount: 8   // Allow more usage for small pools
    }
  } else if (questionCount < 100) {
    return {
      recommendedCount: 10,
      avoidRecentDays: 5,
      maxUsageCount: 5
    }
  } else {
    return {
      recommendedCount: 10,
      avoidRecentDays: 7,
      maxUsageCount: 3
    }
  }
}

/**
 * Check if a category has sufficient question variety
 */
export async function validateCategoryQuestionPool(
  categoryId: string,
  difficulties: string[],
  minCount: number = 10
): Promise<{
  valid: boolean
  available_count: number
  by_difficulty: Record<string, number>
  recommendations: string[]
}> {
  
  const { data: questions, error } = await supabaseAdmin
    .from('quiz_questions')
    .select('difficulty')
    .eq('category_id', categoryId)
    .in('difficulty', difficulties)
    .eq('is_deleted', false)
  
  if (error) {
    throw new Error(`Failed to validate question pool: ${error.message}`)
  }
  
  const byDifficulty = (questions || []).reduce((acc, q) => {
    const difficulty = q.difficulty || 'unknown'
    acc[difficulty] = (acc[difficulty] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const totalCount = questions?.length || 0
  const recommendations: string[] = []
  
  if (totalCount < minCount) {
    recommendations.push(`Category has only ${totalCount} questions, minimum ${minCount} recommended`)
  }
  
  difficulties.forEach(diff => {
    const count = byDifficulty[diff] || 0
    if (count < 3) {
      recommendations.push(`Difficulty '${diff}' has only ${count} questions, minimum 3 recommended`)
    }
  })
  
  return {
    valid: totalCount >= minCount && recommendations.length === 0,
    available_count: totalCount,
    by_difficulty: byDifficulty,
    recommendations
  }
}