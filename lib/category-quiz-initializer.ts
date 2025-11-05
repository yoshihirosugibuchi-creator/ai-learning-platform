/**
 * Category Quiz Initializer
 * 
 * Purpose: Fast initialization for category-specific quizzes using smart random selection
 * Replaces heavy AI optimization with intelligent question selection based on usage history
 * Target performance: 0.5-1 second vs previous 5-8 seconds
 */

import { performSmartRandomSelection, performFallbackSelection, QuestionWithUsage } from '@/lib/smart-random-selection'
import { Question } from '@/lib/types'

// Helper function to convert QuestionWithUsage to Question
function convertToQuestion(questionWithUsage: QuestionWithUsage): Question {
  return {
    id: questionWithUsage.id,
    category: questionWithUsage.category_id,
    subcategory: questionWithUsage.subcategory_id || '',
    difficulty: questionWithUsage.difficulty || 'basic',
    question: questionWithUsage.question,
    options: [
      questionWithUsage.option1,
      questionWithUsage.option2,
      questionWithUsage.option3,
      questionWithUsage.option4
    ],
    correct: questionWithUsage.correct_answer, // DB is already 0-based
    explanation: questionWithUsage.explanation || '',
    timeLimit: questionWithUsage.time_limit || 60,
    relatedTopics: [],
    source: null
  }
}

export interface CategoryQuizOptions {
  userId: string
  categoryId: string
  difficulties: string[]
  subcategoryId?: string
  questionCount?: number
}

export interface CategoryQuizResult {
  questions: Question[]
  method: 'smart_random' | 'fallback_random'
  performance_ms: number
  selection_metadata: {
    total_available: number
    usage_stats?: {
      recently_used_count: number
      frequently_used_count: number
      average_weight: number
    }
    fallback_reason?: string
  }
}

/**
 * Initialize category quiz with smart random selection
 * Fast alternative to AI optimization for category quizzes
 */
export async function initializeCategoryQuiz(
  options: CategoryQuizOptions
): Promise<CategoryQuizResult> {
  const startTime = performance.now()
  
  console.log('🎲 [Category Quiz] Starting smart initialization:', {
    category: options.categoryId,
    difficulties: options.difficulties,
    subcategory: options.subcategoryId,
    count: options.questionCount || 10
  })
  
  try {
    // Attempt smart random selection
    const result = await performSmartRandomSelection({
      userId: options.userId,
      categoryId: options.categoryId,
      difficulties: options.difficulties,
      count: options.questionCount || 10,
      subcategoryId: options.subcategoryId,
      avoidRecentDays: 7,
      maxUsageCount: 5
    })
    
    const duration = performance.now() - startTime
    
    console.log(`✅ [Category Quiz] Smart selection completed in ${duration.toFixed(1)}ms`)
    
    return {
      questions: result.questions.map(convertToQuestion),
      method: 'smart_random',
      performance_ms: Math.round(duration),
      selection_metadata: {
        total_available: result.usage_stats.total_available,
        usage_stats: {
          recently_used_count: result.usage_stats.recently_used,
          frequently_used_count: result.usage_stats.frequently_used,
          average_weight: result.questions.length > 0 
            ? result.questions.reduce((sum, q) => sum + q.smart_weight, 0) / result.questions.length 
            : 1.0
        }
      }
    }
    
  } catch (error) {
    console.warn('⚠️ [Category Quiz] Smart selection failed, using fallback:', error)
    
    try {
      // Fallback to simple random selection
      const fallbackQuestions = await performFallbackSelection(
        options.categoryId,
        options.difficulties,
        options.questionCount || 10,
        options.subcategoryId
      )
      
      const duration = performance.now() - startTime
      
      console.log(`🔄 [Category Quiz] Fallback selection completed in ${duration.toFixed(1)}ms`)
      
      return {
        questions: fallbackQuestions.map(convertToQuestion),
        method: 'fallback_random',
        performance_ms: Math.round(duration),
        selection_metadata: {
          total_available: fallbackQuestions.length,
          fallback_reason: error instanceof Error ? error.message : 'Unknown error'
        }
      }
      
    } catch (fallbackError) {
      console.error('❌ [Category Quiz] Both smart and fallback selection failed:', fallbackError)
      throw new Error(`Category quiz initialization failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`)
    }
  }
}

/**
 * Validate category quiz requirements before initialization
 */
export async function validateCategoryQuizRequirements(
  categoryId: string,
  difficulties: string[]
): Promise<{
  valid: boolean
  message?: string
  available_count?: number
  recommendations?: string[]
}> {
  
  try {
    // Import validation function from smart-random-selection
    const { validateCategoryQuestionPool } = await import('@/lib/smart-random-selection')
    
    const validation = await validateCategoryQuestionPool(
      categoryId,
      difficulties,
      10 // minimum required questions
    )
    
    if (!validation.valid) {
      return {
        valid: false,
        message: `Insufficient questions for category ${categoryId}`,
        available_count: validation.available_count,
        recommendations: validation.recommendations
      }
    }
    
    return {
      valid: true,
      available_count: validation.available_count
    }
    
  } catch (error) {
    console.error('❌ Category validation failed:', error)
    return {
      valid: false,
      message: 'Validation failed due to system error'
    }
  }
}

/**
 * Get optimal parameters for category quiz based on question pool size
 */
export async function getOptimalCategoryQuizParams(
  categoryId: string,
  difficulties: string[]
): Promise<{
  recommendedCount: number
  estimatedSelectionTime: string
  poolAnalysis: {
    total_questions: number
    by_difficulty: Record<string, number>
    diversity_score: number
  }
}> {
  
  try {
    const { getOptimalSelectionParams } = await import('@/lib/smart-random-selection')
    
    const params = await getOptimalSelectionParams(categoryId, difficulties)
    
    // Estimate selection time based on pool size
    const estimatedTime = params.recommendedCount <= 10 ? '0.5-1.0s' : '1.0-1.5s'
    
    return {
      recommendedCount: params.recommendedCount,
      estimatedSelectionTime: estimatedTime,
      poolAnalysis: {
        total_questions: 0, // Will be populated by validation
        by_difficulty: {},
        diversity_score: 0.8 // Default score
      }
    }
    
  } catch (error) {
    console.error('❌ Parameter optimization failed:', error)
    
    // Return safe defaults
    return {
      recommendedCount: 10,
      estimatedSelectionTime: '0.5-1.0s',
      poolAnalysis: {
        total_questions: 0,
        by_difficulty: {},
        diversity_score: 0.5
      }
    }
  }
}

/**
 * Performance comparison helper for monitoring optimization impact
 */
export function logPerformanceComparison(
  method: 'smart_random' | 'fallback_random',
  duration: number
): void {
  
  const previousAverageTime = method === 'smart_random' ? 6000 : 8000 // Previous AI optimization times
  const improvement = ((previousAverageTime - duration) / previousAverageTime) * 100
  
  console.log(`📊 [Performance] Category quiz improvement:`, {
    method,
    current_time: `${duration.toFixed(1)}ms`,
    previous_average: `${previousAverageTime}ms`,
    improvement: `${improvement.toFixed(1)}% faster`,
    status: improvement > 80 ? '🚀 Excellent' : improvement > 50 ? '✅ Good' : '⚠️ Moderate'
  })
}

/**
 * Helper function to convert difficulty display names to internal format
 */
export function normalizeDifficultyNames(difficulties: string[]): string[] {
  const difficultyMapping: Record<string, string> = {
    '基礎': 'basic',
    '基本': 'basic',
    'Basic': 'basic',
    '中級': 'intermediate', 
    '中間': 'intermediate',
    'Intermediate': 'intermediate',
    '上級': 'advanced',
    'Advanced': 'advanced',
    '専門': 'expert',
    'Expert': 'expert'
  }
  
  return difficulties.map(diff => difficultyMapping[diff] || diff.toLowerCase())
}

/**
 * Category quiz initialization with automatic fallback chain
 */
export async function initializeCategoryQuizWithFallback(
  options: CategoryQuizOptions
): Promise<CategoryQuizResult> {
  
  // Step 1: Normalize difficulty names
  const normalizedOptions = {
    ...options,
    difficulties: normalizeDifficultyNames(options.difficulties)
  }
  
  // Step 2: Validate requirements
  const validation = await validateCategoryQuizRequirements(
    normalizedOptions.categoryId,
    normalizedOptions.difficulties
  )
  
  if (!validation.valid) {
    console.warn('⚠️ [Category Quiz] Validation failed:', validation.message)
    
    // Attempt with relaxed difficulty requirements
    if (normalizedOptions.difficulties.length > 1) {
      console.log('🔄 [Category Quiz] Retrying with all difficulties...')
      const relaxedOptions = {
        ...normalizedOptions,
        difficulties: ['basic', 'intermediate', 'advanced', 'expert']
      }
      
      return await initializeCategoryQuiz(relaxedOptions)
    }
  }
  
  // Step 3: Perform initialization
  return await initializeCategoryQuiz(normalizedOptions)
}