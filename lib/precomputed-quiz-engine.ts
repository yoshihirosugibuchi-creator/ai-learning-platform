/**
 * Precomputed Quiz Engine Core Library
 * 
 * Purpose: Centralized logic for quiz pre-computation and question optimization
 * Used by: /api/precompute-quiz, /api/xp-save/quiz, settings updates
 * 
 * Key Features:
 * - Question set pre-generation for instant quiz starts
 * - AI-powered personalization moved to background
 * - Smart caching with 72-hour expiration
 * - Fallback strategies for edge cases
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Json, PrecomputedQuizSetInsert, Database } from '@/lib/database-types-official'
import { getUserReviewSettings } from '@/lib/user-review-settings'

// =================================================================
// Core Types and Interfaces
// =================================================================

export interface QuizSetGenerationContext {
  userId: string
  quizResult?: QuizSessionResult
  userProfile?: UserProfileData
  forceRegenerate?: boolean
}

export interface QuizSessionResult {
  category_id?: string
  subcategory_id?: string
  accuracy_rate: number
  total_questions: number
  correct_answers: number
  answers: QuizAnswer[]
}

export interface QuizAnswer {
  question_id: number
  is_correct: boolean
  time_spent: number
  max_hint_level?: number
  confidence_level?: number | null
  difficulty: string
}

export interface UserProfileData {
  selected_categories?: Json | null
  selected_industry_categories?: Json | null
  selected_subcategories?: Json | null
  learning_goals?: Json | null
  learning_level?: string | null
}

interface AnalysisData {
  generation_method: string
  set_index?: number
  generated_at?: string
  // Business-AI specific
  avg_accuracy?: number
  distribution?: Record<string, number>
  focus_categories?: string[]
  // Self-personalized specific
  settings_hash?: string
  selected_categories?: string[]
  learning_goals?: Json | null
  learning_level?: string
  categories_count?: number
  // Review specific
  total_review_targets?: number
  review_criteria?: string[]
  [key: string]: unknown
}

export interface PrecomputedSet {
  id: string
  quiz_type: 'business-ai' | 'self-personalized' | 'category' | 'review'
  question_ids: number[]
  analysis_data: AnalysisData
  created_at: string | null
  expires_at: string | null
}

export interface QuestionWithWeight {
  id: number
  category_id: string
  subcategory_id?: string | null
  difficulty: string | null
  weight: number
  // ... other question fields
}

// =================================================================
// Main Engine Functions
// =================================================================

/**
 * Generate all precomputed sets for a user
 * Called after quiz completion to prepare for next sessions
 */
export async function generateAllPrecomputedSets(
  context: QuizSetGenerationContext
): Promise<GenerationResult[]> {
  console.log('🧠 [Precompute Engine] Starting generation for all quiz types...')
  
  const { userId, forceRegenerate: _forceRegenerate = false } = context
  
  // Generate sets for all supported quiz types in parallel
  const generationTasks = [
    generateBusinessAISet(context),
    generateSelfPersonalizedSet(context), 
    generateReviewSet(context)
  ]
  
  const results = await Promise.allSettled(generationTasks)
  
  // Process results
  const generationResults: GenerationResult[] = results.map((result, index) => {
    const quizTypes = ['business-ai', 'self-personalized', 'review']
    const quizType = quizTypes[index]
    
    if (result.status === 'fulfilled') {
      console.log(`✅ [${quizType}] Generation successful:`, result.value)
      return {
        quiz_type: quizType,
        success: true,
        data: result.value
      }
    } else {
      console.error(`❌ [${quizType}] Generation failed:`, {
        error: result.reason?.message || 'Unknown error',
        stack: result.reason?.stack || 'No stack trace',
        fullError: result.reason
      })
      return {
        quiz_type: quizType,
        success: false,
        error: result.reason?.message || 'Unknown error'
      }
    }
  })
  
  // Cleanup expired sets after generation
  try {
    await cleanupExpiredSets(userId)
  } catch (cleanupError) {
    console.warn('⚠️ Cleanup warning (non-critical):', cleanupError)
  }
  
  const successCount = generationResults.filter(r => r.success).length
  console.log(`✅ [Precompute Engine] Generation complete: ${successCount}/3 successful`)
  
  return generationResults
}

/**
 * Generate Business-AI optimized question sets
 * Focus: Main business categories with difficulty optimization
 */
export async function generateBusinessAISet(
  context: QuizSetGenerationContext
): Promise<SetGenerationResult> {
  console.log('🎯 [Business-AI] Starting generation...')
  
  const { userId, forceRegenerate = false } = context
  
  // Check existing sets (don't delete until after successful generation)
  if (!forceRegenerate) {
    const existingCount = await countValidSets(userId, 'business-ai')
    if (existingCount >= 2) {
      console.log('ℹ️ [Business-AI] Sufficient valid sets exist, skipping')
      return { skipped: true, reason: 'Valid sets already exist' }
    }
  }
  
  try {
    // 1. Get user preferences and analytics
    const [userProfile, recentAccuracy, availableQuestions] = await Promise.all([
      getUserProfileForBusinessAI(userId),
      getRecentAccuracyAnalysis(userId),
      getBusinessQuestions()
    ])
    
    if (availableQuestions.length < 30) {
      throw new Error('Insufficient business questions available')
    }
    
    // 2. Apply focus category weights (Business-AI uses main categories only)
    const focusCategories = extractBusinessCategories(userProfile || {})
    const weightedQuestions = applyFocusCategoryWeights(availableQuestions, focusCategories)
    
    // 3. Calculate optimal difficulty distribution from database
    const avgAccuracy = calculateAverageAccuracy(recentAccuracy)
    const difficultyDistribution = await calculateOptimalDistribution(avgAccuracy)
    
    console.log('📊 [Business-AI] Analysis:', {
      avgAccuracy: avgAccuracy.toFixed(2),
      distribution: difficultyDistribution,
      focusCategories: focusCategories.length
    })
    
    // 4. Generate multiple question sets (3 sets of 10 questions each)
    const questionSets = await generateMultipleSets(
      weightedQuestions,
      difficultyDistribution,
      3, // number of sets
      10, // questions per set
      userId
    )
    
    // 5. Save to database and get creation timestamp for cleanup
    let newSetCreatedAt: string
    try {
      // Save new sets first
      await savePrecomputedSets(userId, 'business-ai', questionSets, {
        avg_accuracy: avgAccuracy,
        distribution: difficultyDistribution,
        focus_categories: focusCategories,
        generation_method: 'business-ai-optimized'
      })
      
      // Record successful save timestamp for cleanup reference
      newSetCreatedAt = new Date().toISOString()
      console.log(`✅ [Business-AI] Successfully saved ${questionSets.length} precomputed sets at ${newSetCreatedAt}`)
    } catch (saveError) {
      console.error(`❌ [Business-AI] Failed to save precomputed sets:`, saveError)
      throw saveError
    }
    
    // 6. Clean up old sets AFTER successful generation (if force regenerating)
    if (forceRegenerate) {
      try {
        console.log(`🧹 [Business-AI] Force regeneration: cleaning up old sets created before ${newSetCreatedAt}...`)
        
        // Force regeneration: Remove ALL existing sets created BEFORE the new sets
        // This follows requirement: "作成完了後にそれ以前に作成された事前セットを削除"
        const { error: deleteError, count: deletedCount } = await supabaseAdmin
          .from('precomputed_quiz_sets')
          .delete()
          .eq('user_id', userId)
          .eq('quiz_type', 'business-ai')
          .lt('created_at', newSetCreatedAt) // Delete sets created before new sets
        
        if (deleteError) {
          console.warn('⚠️ [Business-AI] Failed to force cleanup old sets:', deleteError)
        } else {
          console.log(`🧹 [Business-AI] Force regeneration cleanup: deleted ${deletedCount || 0} old sets`)
        }
      } catch (cleanupError) {
        console.warn('⚠️ [Business-AI] Cleanup failed (non-critical):', cleanupError)
      }
    }
    
    console.log(`✅ [Business-AI] Generated ${questionSets.length} sets successfully`)
    
    return {
      generated: true,
      sets_count: questionSets.length,
      questions_per_set: 10,
      analytics: {
        avg_accuracy: avgAccuracy,
        distribution: difficultyDistribution
      }
    }
    
  } catch (error) {
    console.error('❌ [Business-AI] Generation error:', error)
    throw error
  }
}

/**
 * Generate Self-Personalized question sets
 * Focus: User-selected categories with custom settings
 */
export async function generateSelfPersonalizedSet(
  context: QuizSetGenerationContext
): Promise<SetGenerationResult> {
  console.log('🎨 [Self-Personalized] Starting generation...')
  
  const { userId, forceRegenerate = false } = context
  
  // Note: For self-personalized, we'll delete old sets AFTER successful generation
  // This ensures no gap period where no sets exist
  
  try {
    // 1. Get user's quiz personalization settings from user_settings table
    const { data: userQuizSettings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', 'quiz_personalization')
      .single()

    if (settingsError || !userQuizSettings?.setting_value) {
      console.log('ℹ️ [Self-Personalized] Quiz personalization settings not configured, skipping')
      return { skipped: true, reason: 'Quiz personalization settings not configured' }
    }

    // Parse the quiz personalization settings
    const quizSettings = userQuizSettings.setting_value as {
      learningLevel: string
      basicCategories: string[]
      industryCategories: string[]
      industrySubcategories: string[]
    }

    const hasCategories = (quizSettings.basicCategories?.length || 0) > 0 || (quizSettings.industryCategories?.length || 0) > 0
    if (!hasCategories) {
      console.log('ℹ️ [Self-Personalized] No categories selected in settings, skipping')
      return { skipped: true, reason: 'No categories selected' }
    }

    console.log('🎯 [Self-Personalized Engine] Using settings:', {
      learningLevel: quizSettings.learningLevel,
      basicCategories: quizSettings.basicCategories,
      industryCategories: quizSettings.industryCategories
    })

    // Convert to compatible format for existing functions
    const userSettings = {
      selected_categories: quizSettings.basicCategories || [],
      selected_industry_categories: quizSettings.industryCategories || [],
      learning_goals: null,
      learning_level: quizSettings.learningLevel || 'basic'
    }
    
    // 2. Calculate settings hash for change detection
    const settingsHash = calculateSettingsHash(userSettings)
    
    // 3. Check if existing sets match current settings (only if not force regenerating)
    if (!forceRegenerate) {
      const existingSets = await getPrecomputedSets(userId, 'self-personalized', 1)
      if (existingSets.length > 0 && existingSets[0].analysis_data?.settings_hash === settingsHash) {
        console.log('ℹ️ [Self-Personalized] Settings unchanged, skipping')
        return { skipped: true, reason: 'Settings unchanged' }
      }
      
      // Settings changed - delete old sets
      await deletePrecomputedSets(userId, 'self-personalized')
    }
    
    // 4. Get questions matching user's selected categories
    const selectedCategories = extractSelectedCategories(userSettings)
    if (selectedCategories.length === 0) {
      throw new Error('No categories selected in user settings')
    }
    
    const categoryQuestions = await getQuestionsByCategories(selectedCategories)
    if (categoryQuestions.length < 20) {
      throw new Error('Insufficient questions for selected categories')
    }
    
    // 5. Apply personalization settings
    const personalizedQuestions = applyPersonalizationSettings(categoryQuestions, userSettings)
    
    // 6. Generate sets with unasked priority + category balance (2 sets of 10 questions each)
    const questionSets = await generateCategoryBalancedSets(personalizedQuestions, 2, 10, userId)
    
    // 7. Save to database and get creation timestamp for cleanup
    let newSetCreatedAt: string
    try {
      // Save new sets first
      await savePrecomputedSets(userId, 'self-personalized', questionSets, {
        settings_hash: settingsHash,
        selected_categories: selectedCategories,
        learning_goals: userSettings.learning_goals,
        learning_level: userSettings.learning_level || undefined,
        generation_method: 'self-personalized'
      })
      
      // Record successful save timestamp for cleanup reference
      newSetCreatedAt = new Date().toISOString()
      console.log(`✅ [Self-Personalized] Successfully saved ${questionSets.length} precomputed sets at ${newSetCreatedAt}`)
    } catch (saveError) {
      console.error(`❌ [Self-Personalized] Failed to save precomputed sets:`, saveError)
      throw saveError
    }
    
    // 8. Clean up old sets AFTER successful generation (if force regenerating)
    if (forceRegenerate) {
      try {
        console.log(`🧹 [Self-Personalized] Force regeneration: cleaning up old sets created before ${newSetCreatedAt}...`)
        
        // Force regeneration: Remove ALL existing sets created BEFORE the new sets
        // This follows requirement: "作成完了後にそれ以前に作成された事前セットを削除"
        const { error: deleteError, count: deletedCount } = await supabaseAdmin
          .from('precomputed_quiz_sets')
          .delete()
          .eq('user_id', userId)
          .eq('quiz_type', 'self-personalized')
          .lt('created_at', newSetCreatedAt) // Delete sets created before new sets
        
        if (deleteError) {
          console.warn('⚠️ [Self-Personalized] Failed to force cleanup old sets:', deleteError)
        } else {
          console.log(`🧹 [Self-Personalized] Force regeneration cleanup: deleted ${deletedCount || 0} old sets`)
        }
      } catch (cleanupError) {
        console.warn('⚠️ [Self-Personalized] Cleanup failed (non-critical):', cleanupError)
      }
    }
    
    console.log(`✅ [Self-Personalized] Generated ${questionSets.length} sets successfully`)
    
    return {
      generated: true,
      sets_count: questionSets.length,
      settings_hash: settingsHash,
      categories_count: selectedCategories.length
    }
    
  } catch (error) {
    console.error('❌ [Self-Personalized] Generation error:', error)
    throw error
  }
}

/**
 * Generate Review question sets
 * Focus: Questions that need review based on past performance
 */
export async function generateReviewSet(
  context: QuizSetGenerationContext
): Promise<SetGenerationResult> {
  console.log('🔄 [Review] Starting generation...')
  
  const { userId, forceRegenerate = false } = context
  
  // Note: Old sets will be deleted AFTER successful generation if forceRegenerate is true
  
  try {
    // 1. Get user's review settings
    console.log(`⚙️ [Review] Getting review settings for user: ${userId}`)
    const reviewSettings = await getUserReviewSettings(userId)
    const questionsPerSet = reviewSettings.reviewQuestionsCount
    console.log(`⚙️ [Review] User review setting: ${questionsPerSet} questions per set`)
    
    // 2. Get review target questions based on criteria
    console.log('🔍 [Review] Calling getReviewTargetQuestions...')
    const reviewQuestions = await getReviewTargetQuestions(userId)
    
    console.log(`🔍 [Review] Found ${reviewQuestions.length} review target questions`)
    console.log('📋 [Review] Question IDs:', reviewQuestions.map(q => q.id))
    
    if (reviewQuestions.length === 0) {
      console.log('ℹ️ [Review] No review targets found, skipping generation')
      return { skipped: true, reason: 'No review targets available' }
    }
    
    // 3. Apply forgetting curve optimization
    console.log('🧠 [Review] Applying forgetting curve optimization...')
    const optimizedQuestions = await applyForgettingCurveOptimization(reviewQuestions, userId)
    console.log(`🧠 [Review] Optimized questions: ${optimizedQuestions.length}`)
    
    // 4. Generate review sets based on available questions and user settings
    let setsCount: number
    let actualQuestionsPerSet: number
    
    if (optimizedQuestions.length <= questionsPerSet) {
      // Few questions: generate 1 set with all available questions (no duplicates)
      setsCount = 1
      actualQuestionsPerSet = optimizedQuestions.length
      console.log(`📊 [Review] Generating 1 set with ${actualQuestionsPerSet} questions (all available, no duplicates)`)
    } else {
      // Many questions: generate 2 sets using user's preference
      setsCount = 2
      actualQuestionsPerSet = questionsPerSet
      console.log(`📊 [Review] Generating ${setsCount} sets with ${actualQuestionsPerSet} questions each`)
    }
    
    const questionSets = await generateReviewSets(optimizedQuestions, setsCount, actualQuestionsPerSet)
    console.log(`📊 [Review] Generated question sets:`, questionSets.map(set => ({ length: set.length, questions: set })))
    
    // 5. Save to database
    console.log('💾 [Review] Saving sets to database...')
    try {
      await savePrecomputedSets(userId, 'review', questionSets, {
        total_review_targets: reviewQuestions.length,
        review_criteria: ['incorrect', 'hint_used', 'low_confidence', 'slow_response'],
        generation_method: 'review-optimized'
      })
      console.log(`✅ [Review] Successfully saved ${questionSets.length} precomputed sets`)
    } catch (saveError) {
      console.error(`❌ [Review] Failed to save precomputed sets:`, saveError)
      throw saveError
    }
    
    // 6. Clean up old sets AFTER successful generation (if force regenerating)
    if (forceRegenerate) {
      try {
        console.log(`🧹 [Review] Cleaning up old used and expired sets...`)
        
        // Safe deletion: only remove sets that are either:
        // 1. Already used (used_at IS NOT NULL) 
        // 2. Expired (expires_at < now())
        // This preserves unused valid sets for immediate retry scenarios
        const now = new Date().toISOString()
        const { error: deleteError } = await supabaseAdmin
          .from('precomputed_quiz_sets')
          .delete()
          .eq('user_id', userId)
          .eq('quiz_type', 'review')
          .or(`used_at.not.is.null,expires_at.lt.${now}`)
        
        if (deleteError) {
          console.warn('⚠️ [Review] Failed to clean up old sets:', deleteError)
        } else {
          console.log('🧹 [Review] Successfully cleaned up old sets after regeneration')
        }
      } catch (cleanupError) {
        console.warn('⚠️ [Review] Cleanup failed (non-critical):', cleanupError)
      }
    }
    
    console.log(`✅ [Review] Successfully generated and saved ${questionSets.length} sets`)
    
    return {
      generated: true,
      sets_count: questionSets.length,
      total_review_targets: reviewQuestions.length
    }
    
  } catch (error) {
    console.error('❌ [Review] Generation error:', error)
    console.error('❌ [Review] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

// =================================================================
// Data Access Functions
// =================================================================

// getUserProfile関数は削除 - 使用されていない


async function getUserProfileForBusinessAI(userId: string): Promise<UserProfileData | null> {
  // Business-AI用: usersテーブルから取得
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('selected_categories, selected_industry_categories, learning_goals, learning_level')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.warn('⚠️ Failed to get user profile for Business-AI:', error)
    return null
  }
  
  console.log('✅ User profile loaded from users table (Business-AI):', {
    userId: userId.substring(0, 8) + '...',
    hasSelectedCategories: !!data?.selected_categories,
    hasIndustryCategories: !!data?.selected_industry_categories,
    categoriesCount: Array.isArray(data?.selected_categories) ? data.selected_categories.length : 0
  })
  
  return data
}

async function getRecentAccuracyAnalysis(userId: string): Promise<CategoryAccuracy[]> {
  const { data, error } = await supabaseAdmin
    .from('user_category_xp_stats_v2')
    .select('category_id, quiz_average_accuracy, quiz_sessions_completed')
    .eq('user_id', userId)
    .gt('quiz_sessions_completed', 0)
  
  if (error) {
    console.warn('⚠️ Failed to get recent accuracy:', error)
    return []
  }
  
  return data || []
}

async function getBusinessQuestions(): Promise<QuestionWithWeight[]> {
  // Import main category IDs from server-side service
  const { getMainCategoryIds } = await import('@/lib/category-server-service')
  const mainCategoryIds = await getMainCategoryIds()
  
  console.log(`🔍 [Business Questions] Using main category IDs: ${mainCategoryIds.length} categories`, mainCategoryIds)
  
  // Get questions for main categories
  const { data, error } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, category_id, subcategory_id, difficulty')
    .in('category_id', mainCategoryIds)
    .eq('is_deleted', false)
    .limit(1000)
  
  if (error) {
    console.error(`❌ Failed to get questions for main categories: ${error.message}`)
    
    // Fallback: Try categories table approach
    const { data: mainCategories, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('category_id')
      .eq('type', 'main')
    
    if (categoryError) {
      console.error(`❌ Failed to get main categories: ${categoryError.message}`)
      throw new Error(`Both static and dynamic category approaches failed`)
    }
    
    const categoryIds = (mainCategories || []).map(cat => cat.category_id)
    console.log(`🔄 [Business Questions] Fallback using DB categories: ${categoryIds.length} categories`)
    
    if (categoryIds.length === 0) {
      throw new Error('No main categories found in database')
    }
    
    // Get questions for fallback main categories  
    const { data: fallbackQuestions, error: fallbackError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory_id, difficulty')
      .in('category_id', categoryIds)
      .eq('is_deleted', false)
      .limit(1000)
    
    if (fallbackError) {
      throw new Error(`Failed to get fallback business questions: ${fallbackError.message}`)
    }
    
    console.log(`✅ [Business Questions] Retrieved ${fallbackQuestions?.length || 0} questions from fallback categories`)
    return (fallbackQuestions || []).map(q => ({ ...q, weight: 1.0 }))
  }
  
  console.log(`✅ [Business Questions] Retrieved ${data?.length || 0} questions from main categories`)
  return (data || []).map(q => ({ ...q, weight: 1.0 }))
}

async function getQuestionsByCategories(categories: string[]): Promise<QuestionWithWeight[]> {
  // カテゴリーIDとサブカテゴリーIDの両方で検索
  const { data, error } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, category_id, subcategory_id, difficulty')
    .or(`category_id.in.(${categories.join(',')}),subcategory_id.in.(${categories.join(',')})`)
    .eq('is_deleted', false)
    .limit(500)
  
  if (error) {
    throw new Error(`Failed to get category/subcategory questions: ${error.message}`)
  }
  
  console.log(`🔍 [getQuestionsByCategories] Found ${data?.length || 0} questions for categories/subcategories:`, {
    inputCategories: categories,
    questionsFound: data?.length || 0,
    sampleQuestions: data?.slice(0, 3).map(q => ({ 
      id: q.id, 
      category_id: q.category_id, 
      subcategory_id: q.subcategory_id 
    })) || []
  })
  
  return (data || []).map(q => ({ ...q, weight: 1.0 }))
}

async function getReviewTargetQuestions(userId: string): Promise<QuestionWithWeight[]> {
  // Use the same logic as review stats to ensure consistency
  console.log(`🔍 [Review Debug] Getting review targets using REVIEW_NEEDED flag for consistency with stats`)
  

  // Get REVIEW_NEEDED=true questions that are unreviewed and 3+ days old
  const { data: reviewNeededAnswers, error } = await supabaseAdmin
    .from('quiz_answers')
    .select(`
      question_id,
      created_at,
      difficulty,
      subcategory_id,
      category_id,
      confidence_level,
      max_hint_level,
      time_spent
    `)
    .eq('user_id', userId)
    .eq('review_needed', true)        // REVIEW_NEEDED flag = true
    .is('reviewed_at', null)          // Not yet reviewed
    .order('created_at', { ascending: false })
    .limit(100) // Get more for filtering

  if (error || !reviewNeededAnswers) {
    console.warn('❌ [Review Debug] Error fetching REVIEW_NEEDED questions:', error)
    return []
  }

  // Filter by 3+ days old
  const now = Date.now()
  const eligibleAnswers = reviewNeededAnswers.filter(answer => {
    if (!answer.created_at) return false
    const daysSinceCreated = Math.floor(
      (now - new Date(answer.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceCreated >= 3 // 3+ days since creation
  })

  console.log(`🔍 [Review Debug] Found ${eligibleAnswers.length} REVIEW_NEEDED questions (3+ days old)`)

  if (eligibleAnswers.length === 0) {
    return []
  }

  // Get question details for the eligible questions
  const questionIds = eligibleAnswers
    .map(a => a.question_id)
    .filter(id => /^\d+$/.test(id)) // Only numeric question IDs (quiz questions)
    .map(id => parseInt(id, 10))

  if (questionIds.length === 0) {
    return []
  }

  const { data: questionDetails, error: questionError } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, category_id, subcategory_id, difficulty')
    .in('id', questionIds)
    .eq('is_deleted', false)

  if (questionError || !questionDetails) {
    console.warn('❌ [Review Debug] Error fetching question details:', questionError)
    return []
  }

  console.log(`🔍 [Review Debug] Retrieved ${questionDetails.length} valid review target questions`)

  return questionDetails.map(q => ({ 
    id: q.id,
    category_id: q.category_id,
    subcategory_id: q.subcategory_id,
    difficulty: q.difficulty,
    weight: 1.0 
  }))
}

// =================================================================
// Question Selection and Optimization
// =================================================================

function applyFocusCategoryWeights(
  questions: QuestionWithWeight[],
  focusCategories: string[]
): QuestionWithWeight[] {
  return questions.map(q => ({
    ...q,
    weight: focusCategories.includes(q.category_id) ? q.weight * 1.5 : q.weight
  }))
}

async function calculateOptimalDistribution(avgAccuracy: number): Promise<Record<string, number>> {
  try {
    // Get distribution settings from database based on accuracy range
    const { data: distributionSettings, error } = await supabaseAdmin
      .from('difficulty_distribution_settings')
      .select('*')
      .lte('accuracy_range_min', avgAccuracy)
      .gte('accuracy_range_max', avgAccuracy)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !distributionSettings) {
      console.warn('⚠️ Failed to get distribution settings from DB, using fallback:', error)
      // Fallback to hardcoded values
      return calculateFallbackDistribution(avgAccuracy)
    }
    
    console.log(`📊 [Distribution] Using DB settings for accuracy ${(avgAccuracy * 100).toFixed(1)}%:`, {
      settingId: distributionSettings.id,
      accuracyRange: `${distributionSettings.accuracy_range_min}-${distributionSettings.accuracy_range_max}`,
      distribution: {
        basic: distributionSettings.basic_percent,
        intermediate: distributionSettings.intermediate_percent,
        advanced: distributionSettings.advanced_percent,
        expert: distributionSettings.expert_percent
      }
    })
    
    return {
      basic: distributionSettings.basic_percent || 0,
      intermediate: distributionSettings.intermediate_percent || 0,
      advanced: distributionSettings.advanced_percent || 0,
      expert: distributionSettings.expert_percent || 0
    }
  } catch (error) {
    console.error('❌ Error accessing difficulty distribution settings:', error)
    return calculateFallbackDistribution(avgAccuracy)
  }
}

function calculateFallbackDistribution(avgAccuracy: number): Record<string, number> {
  console.log(`🔄 [Distribution] Using fallback hardcoded distribution for accuracy ${(avgAccuracy * 100).toFixed(1)}%`)
  
  if (avgAccuracy >= 0.8) {
    return { basic: 2, intermediate: 4, advanced: 3, expert: 1 }
  } else if (avgAccuracy >= 0.6) {
    return { basic: 3, intermediate: 4, advanced: 2, expert: 1 }
  } else {
    return { basic: 5, intermediate: 3, advanced: 2, expert: 0 }
  }
}

function calculateAverageAccuracy(accuracyData: CategoryAccuracy[]): number {
  if (!accuracyData || accuracyData.length === 0) return 0.7  // Default for new users
  
  const totalAccuracy = accuracyData.reduce(
    (sum, cat) => sum + (cat.quiz_average_accuracy || 0), 
    0
  )
  
  return totalAccuracy / accuracyData.length
}

async function generateMultipleSets(
  questions: QuestionWithWeight[],
  distribution: Record<string, number>,
  setsCount: number,
  questionsPerSet: number,
  userId: string
): Promise<number[][]> {
  const sets: number[][] = []
  
  for (let i = 0; i < setsCount; i++) {
    const selectedQuestions = await selectQuestionsByDistribution(questions, distribution, questionsPerSet, userId)
    sets.push(selectedQuestions.map(q => q.id))
    
    // Remove selected questions to avoid duplicates in next set
    selectedQuestions.forEach(selected => {
      const index = questions.findIndex(q => q.id === selected.id)
      if (index > -1) questions.splice(index, 1)
    })
  }
  
  return sets
}

async function selectQuestionsByDistribution(
  questions: QuestionWithWeight[],
  distribution: Record<string, number>,
  totalCount: number,
  userId: string
): Promise<QuestionWithWeight[]> {
  console.log(`🎯 [Question Selection] Starting selection for ${totalCount} questions`)
  
  const selected: QuestionWithWeight[] = []
  const availableByDifficulty = groupByDifficulty(questions)
  
  // 1. Select by difficulty distribution
  for (const [difficulty, count] of Object.entries(distribution)) {
    const available = availableByDifficulty[difficulty] || []
    
    if (available.length > 0) {
      // Apply unasked priority + category balance within each difficulty
      const categorySelected = await selectWithUnaskedPriority(available, count, userId)
      selected.push(...categorySelected)
      
      console.log(`✅ [${difficulty}] Selected ${categorySelected.length}/${count} questions with unasked priority + category balance`)
    } else {
      console.log(`⚠️ [${difficulty}] No questions available (requested: ${count})`)
    }
  }
  
  // 2. Fill remaining slots with unasked priority + category balance
  const remainingNeeded = totalCount - selected.length
  if (remainingNeeded > 0) {
    const remaining = questions.filter(q => !selected.some(s => s.id === q.id))
    if (remaining.length > 0) {
      const additionalQuestions = await selectWithUnaskedPriority(remaining, remainingNeeded, userId)
      selected.push(...additionalQuestions)
      console.log(`🔄 [Fill] Added ${additionalQuestions.length} questions with unasked priority + category balance`)
    }
  }
  
  const final = selected.slice(0, totalCount)
  console.log(`📊 [Final Selection] Selected ${final.length} questions with category distribution:`, 
    getCategoryDistribution(final))
  
  return final
}

/**
 * 未出題問題優先 + カテゴリーバランスを考慮した問題選択
 */
async function selectWithUnaskedPriority(
  questions: QuestionWithWeight[],
  count: number,
  userId: string,
  minUnaskedRatio: number = 0.5
): Promise<QuestionWithWeight[]> {
  console.log(`🎯 [Unasked Priority] Starting selection: ${count} questions, min unasked ratio: ${minUnaskedRatio}`)
  
  // 1. ユーザーの過去出題履歴を取得（時間別分析）
  const { recentQuestions, totalQuestions } = await getUserAskedQuestions(userId)
  
  // 2. 問題を出題履歴で分類（忘却曲線対応）
  const neverAskedQuestions = questions.filter(q => !totalQuestions.has(q.id))
  const oldAskedQuestions = questions.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id))
  const recentAskedQuestions = questions.filter(q => recentQuestions.has(q.id))
  
  console.log(`📊 [Unasked Priority] Question classification:`, {
    total: questions.length,
    never: neverAskedQuestions.length,
    old: oldAskedQuestions.length,
    recent: recentAskedQuestions.length
  })
  
  // Calculate minimum unasked count based on requirement (default 50% guarantee)
  const minUnaskedCount = Math.ceil(count * minUnaskedRatio)
  const actualUnaskedCount = Math.min(minUnaskedCount, neverAskedQuestions.length)
  const remainingCount = count - actualUnaskedCount
  
  console.log(`🎯 [Unasked Priority] Target distribution:`, {
    minUnaskedCount,
    actualUnaskedCount,
    remainingCount,
    minUnaskedRatio: (minUnaskedRatio * 100).toFixed(0) + '%'
  })
  
  const selected: QuestionWithWeight[] = []
  
  // Priority 1: Never asked questions (guarantee minimum ratio as per requirement)
  if (actualUnaskedCount > 0) {
    const neverSelected = selectWithCategoryBalance(neverAskedQuestions, actualUnaskedCount)
    selected.push(...neverSelected)
    console.log(`✅ [Never Asked] Selected ${neverSelected.length} never-asked questions (${(minUnaskedRatio*100).toFixed(0)}% guarantee)`)
  }
  
  // Priority 2: Fill remaining slots with forgetting curve logic
  if (remainingCount > 0) {
    // Prefer old questions (forgetting curve - ready for review)
    const oldSelected = oldAskedQuestions.length > 0
      ? selectWithCategoryBalance(oldAskedQuestions, Math.min(remainingCount, oldAskedQuestions.length))
      : []
    selected.push(...oldSelected)
    if (oldSelected.length > 0) {
      console.log(`✅ [Old Questions] Added ${oldSelected.length} old questions (forgetting curve)`)
    }
    
    // Fill any remaining slots with recent questions if necessary
    const stillNeeded = remainingCount - oldSelected.length
    if (stillNeeded > 0 && recentAskedQuestions.length > 0) {
      const recentSelected = selectWithCategoryBalance(recentAskedQuestions, stillNeeded)
      selected.push(...recentSelected)
      console.warn(`⚠️ [Recent Questions] Added ${recentSelected.length} recent questions (last resort)`)
    }
  }
  
  // 6. まだ不足している場合は全体から追加選択
  const stillNeeded = count - selected.length
  if (stillNeeded > 0) {
    const remaining = questions.filter(q => !selected.some(s => s.id === q.id))
    const additionalSelected = selectWithCategoryBalance(remaining, stillNeeded)
    selected.push(...additionalSelected)
    console.log(`🔄 [Unasked Priority] Added ${additionalSelected.length} additional questions`)
  }
  
  // 7. 結果分析（忘却曲線ベース）
  const final = selected.slice(0, count)
  const neverCount = final.filter(q => !totalQuestions.has(q.id)).length
  const oldCount = final.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id)).length
  const recentCount = final.filter(q => recentQuestions.has(q.id)).length
  
  console.log(`📊 [Unasked Priority] Final result with forgetting curve:`, {
    totalSelected: final.length,
    neverAsked: neverCount,
    oldQuestions: oldCount,
    recentQuestions: recentCount,
    neverRatio: (neverCount/final.length*100).toFixed(1) + '%',
    oldRatio: (oldCount/final.length*100).toFixed(1) + '%',
    recentRatio: (recentCount/final.length*100).toFixed(1) + '%'
  })
  
  // Quality warning if recent questions dominate
  if (recentCount / final.length > 0.3) {
    console.warn(`⚠️ [Quality Alert] ${(recentCount/final.length*100).toFixed(1)}% recent questions may feel repetitive`)
  }
  
  return final
}

/**
 * ユーザーの過去出題問題IDセットを取得
 */
async function getUserAskedQuestions(userId: string): Promise<{
  recentQuestions: Set<number>
  totalQuestions: Set<number>
}> {
  try {
    // 過去30日間の出題履歴を取得（時間別分析用）
    const { data: answerHistory, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, created_at, quiz_session_id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    if (error) {
      console.warn('⚠️ [getUserAskedQuestions] Error fetching answer history:', error)
      return { recentQuestions: new Set(), totalQuestions: new Set() }
    }
    
    // 数値IDのみ抽出（クイズ問題のみ、コース問題除外）
    const numericQuestionIds = (answerHistory || [])
      .map(a => ({ id: a.question_id, createdAt: a.created_at }))
      .filter(item => /^\d+$/.test(item.id))
      .map(item => ({ id: parseInt(item.id, 10), createdAt: item.createdAt || new Date().toISOString() }))
    
    // 時間で分類：直近7日 vs 全期間（忘却曲線対応）
    const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentQuestions = new Set(
      numericQuestionIds
        .filter(item => item.createdAt >= recentCutoff)
        .map(item => item.id)
    )
    const totalQuestions = new Set(numericQuestionIds.map(item => item.id))
    
    console.log(`📚 [getUserAskedQuestions] Found ${recentQuestions.size} recent (7 days) / ${totalQuestions.size} total (30 days) asked questions`)
    
    return { recentQuestions, totalQuestions }
    
  } catch (error) {
    console.error('❌ [getUserAskedQuestions] Error:', error)
    return { recentQuestions: new Set(), totalQuestions: new Set() }
  }
}

/**
 * カテゴリーバランスを考慮した問題選択
 */
function selectWithCategoryBalance(
  questions: QuestionWithWeight[],
  count: number
): QuestionWithWeight[] {
  if (questions.length === 0) return []
  if (count <= 0) return []
  
  // カテゴリーごとにグループ化
  const byCategory = questions.reduce((acc, q) => {
    if (!acc[q.category_id]) acc[q.category_id] = []
    acc[q.category_id].push(q)
    return acc
  }, {} as Record<string, QuestionWithWeight[]>)
  
  const categories = Object.keys(byCategory)
  const selected: QuestionWithWeight[] = []
  
  console.log(`📋 [Category Balance] Distributing ${count} questions across ${categories.length} categories`)
  
  // カテゴリー間で均等分散
  let currentCategoryIndex = 0
  let consecutiveEmptyAttempts = 0
  const maxEmptyAttempts = categories.length // 全カテゴリーチェック後にストップ
  
  for (let i = 0; i < count && selected.length < count; i++) {
    const category = categories[currentCategoryIndex]
    const availableInCategory = byCategory[category]?.filter(q => 
      !selected.some(s => s.id === q.id)
    ) || []
    
    if (availableInCategory.length > 0) {
      // 重み順でソートして最高重みを選択
      availableInCategory.sort((a, b) => b.weight - a.weight)
      selected.push(availableInCategory[0])
      
      console.log(`  📌 Selected from ${category}: question ${availableInCategory[0].id} (weight: ${availableInCategory[0].weight})`)
      consecutiveEmptyAttempts = 0 // リセット
    } else {
      console.log(`  ⚠️ No more questions available in ${category}`)
      consecutiveEmptyAttempts++
      
      // 全カテゴリーで問題が枯渇した場合はループを終了
      if (consecutiveEmptyAttempts >= maxEmptyAttempts) {
        console.log(`⚠️ [Category Balance] All categories exhausted, selected ${selected.length}/${count} questions`)
        break
      }
    }
    
    // 次のカテゴリーに移動（ラウンドロビン）
    currentCategoryIndex = (currentCategoryIndex + 1) % categories.length
  }
  
  return selected
}

/**
 * 選択された問題のカテゴリー分布を分析
 */
function getCategoryDistribution(questions: QuestionWithWeight[]): Record<string, number> {
  return questions.reduce((acc, q) => {
    acc[q.category_id] = (acc[q.category_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function groupByDifficulty(questions: QuestionWithWeight[]): Record<string, QuestionWithWeight[]> {
  return questions.reduce((acc, q) => {
    const difficulty = q.difficulty || 'basic'
    if (!acc[difficulty]) acc[difficulty] = []
    acc[difficulty].push(q)
    return acc
  }, {} as Record<string, QuestionWithWeight[]>)
}

// =================================================================
// Database Operations
// =================================================================

async function savePrecomputedSets(
  userId: string,
  quizType: 'business-ai' | 'self-personalized' | 'category' | 'review',
  questionSets: number[][],
  analysisData: Partial<AnalysisData>
): Promise<void> {
  console.log(`💾 [savePrecomputedSets] Starting save for ${quizType}:`, {
    userId,
    setsCount: questionSets.length,
    questionCounts: questionSets.map(set => set.length)
  })

  const insertData: PrecomputedQuizSetInsert[] = questionSets.map((questionIds, index) => ({
    user_id: userId,
    quiz_type: quizType as Database['public']['Enums']['quiz_type_enum'],
    question_ids: questionIds,
    analysis_data: {
      ...analysisData,
      set_index: index,
      generated_at: new Date().toISOString()
    } as Json,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
  }))
  
  console.log(`📝 [savePrecomputedSets] Insert data prepared:`, {
    recordsCount: insertData.length,
    sampleRecord: {
      user_id: insertData[0]?.user_id,
      quiz_type: insertData[0]?.quiz_type,
      question_ids_length: insertData[0]?.question_ids?.length,
      has_analysis_data: !!insertData[0]?.analysis_data,
      expires_at: insertData[0]?.expires_at
    }
  })
  
  const { error } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .insert(insertData)
  
  if (error) {
    console.error(`❌ [savePrecomputedSets] Database insert failed:`, {
      quizType,
      userId,
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw new Error(`Failed to save precomputed sets: ${error.message}`)
  }
  
  console.log(`✅ [savePrecomputedSets] Successfully saved ${insertData.length} ${quizType} sets for user ${userId}`)
}

async function countValidSets(userId: string, quizType: 'business-ai' | 'self-personalized' | 'category' | 'review'): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('quiz_type', quizType)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
  
  if (error) {
    console.warn('⚠️ Failed to count valid sets:', error)
    return 0
  }
  
  return count || 0
}

async function getPrecomputedSets(
  userId: string,
  quizType: 'business-ai' | 'self-personalized' | 'category' | 'review',
  limit: number = 10
): Promise<PrecomputedSet[]> {
  const { data, error } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_type', quizType)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.warn('⚠️ Failed to get precomputed sets:', error)
    return []
  }
  
  return (data || []).map(row => ({
    ...row,
    analysis_data: (row.analysis_data as AnalysisData) || { 
      generation_method: 'legacy',
      set_index: 0,
      generated_at: new Date().toISOString()
    }
  }))
}

async function deletePrecomputedSets(userId: string, quizType: 'business-ai' | 'self-personalized' | 'category' | 'review'): Promise<void> {
  const { error } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .delete()
    .eq('user_id', userId)
    .eq('quiz_type', quizType)
  
  if (error) {
    console.warn('⚠️ Failed to delete precomputed sets:', error)
  }
}

async function cleanupExpiredSets(userId?: string): Promise<number> {
  let query = supabaseAdmin
    .from('precomputed_quiz_sets')
    .delete()
    .lt('expires_at', new Date().toISOString())
  
  if (userId) {
    query = query.eq('user_id', userId)
  }
  
  const { count, error } = await query
  
  if (error) {
    console.warn('⚠️ Cleanup failed:', error)
    return 0
  }
  
  return count || 0
}

// =================================================================
// Helper Functions
// =================================================================

function calculateSettingsHash(settings: UserProfileData): string {
  const keySettings = {
    selected_categories: settings.selected_categories || [],
    selected_industry_categories: settings.selected_industry_categories || [],
    learning_goals: settings.learning_goals,
    learning_level: settings.learning_level
  }
  
  return Buffer.from(JSON.stringify(keySettings)).toString('base64').slice(0, 20)
}

function extractBusinessCategories(settings: UserProfileData): string[] {
  // Business-AI quiz uses only main categories (selected_categories)
  const categories: string[] = []
  
  if (Array.isArray(settings.selected_categories)) {
    categories.push(...settings.selected_categories.filter((cat): cat is string => typeof cat === 'string'))
  }
  
  console.log('🎯 [extractBusinessCategories] Business main categories extracted:', {
    basicCategories: settings.selected_categories || [],
    totalExtracted: categories.length,
    categories: categories
  })
  
  return categories
}

function extractSelectedCategories(settings: UserProfileData): string[] {
  const categories: string[] = []
  
  // Extract from selected_categories (basicCategories)
  if (Array.isArray(settings.selected_categories)) {
    categories.push(...settings.selected_categories.filter((cat): cat is string => typeof cat === 'string'))
  }
  
  // Extract from selected_industry_categories (industryCategories)
  if (Array.isArray(settings.selected_industry_categories)) {
    categories.push(...settings.selected_industry_categories.filter((cat): cat is string => typeof cat === 'string'))
  }
  
  // Extract from selected_subcategories (industrySubcategories) - 重要な追加！
  if (Array.isArray(settings.selected_subcategories)) {
    categories.push(...settings.selected_subcategories.filter((cat): cat is string => typeof cat === 'string'))
  }
  
  console.log('🔍 [extractSelectedCategories] All categories extracted:', {
    basicCategories: settings.selected_categories || [],
    industryCategories: settings.selected_industry_categories || [],
    industrySubcategories: settings.selected_subcategories || [],
    totalExtracted: categories.length,
    allCategories: categories
  })
  
  return categories
}

function applyPersonalizationSettings(
  questions: QuestionWithWeight[],
  settings: UserProfileData
): QuestionWithWeight[] {
  const learningLevel = settings.learning_level || 'basic'
  
  // Define difficulty hierarchy (user gets questions at their level and above)
  const difficultyLevels = ['basic', 'intermediate', 'advanced', 'expert']
  const userLevelIndex = difficultyLevels.indexOf(learningLevel)
  const allowedDifficulties = difficultyLevels.slice(userLevelIndex >= 0 ? userLevelIndex : 0)
  
  console.log('🎯 [Self-Personalized Engine] Applying difficulty filter:', {
    userLevel: learningLevel,
    allowedDifficulties,
    totalQuestions: questions.length
  })
  
  // Filter questions by user's learning level preference
  const filteredQuestions = questions.filter(q => {
    const questionDifficulty = q.difficulty || 'basic'
    const isAllowed = allowedDifficulties.includes(questionDifficulty)
    return isAllowed
  })
  
  console.log('✅ [Self-Personalized Engine] Filtered questions:', {
    original: questions.length,
    filtered: filteredQuestions.length,
    levelCounts: allowedDifficulties.reduce((acc, level) => {
      acc[level] = filteredQuestions.filter(q => (q.difficulty || 'basic') === level).length
      return acc
    }, {} as Record<string, number>)
  })
  
  if (filteredQuestions.length < 20) {
    console.warn(`⚠️ [Self-Personalized Engine] Insufficient questions at level ${learningLevel}+, falling back to include lower levels`)
    // Fallback: include all difficulties if not enough questions at selected level
    return questions.map(q => ({ ...q, weight: 1.0 }))
  }
  
  return filteredQuestions.map(q => ({
    ...q,
    weight: 1.0
  }))
}

/**
 * 忘却曲線による再出題タイミング最適化
 * エビングハウスの忘却曲線を基に、適切な復習タイミングで問題を優先選択
 */
function applyForgettingCurveOptimization(
  questions: QuestionWithWeight[],
  userId: string
): Promise<QuestionWithWeight[]> {
  return getForgettingCurveSortedQuestions(questions, userId)
}

/**
 * 忘却曲線アルゴリズムによる問題重み付け・ソート
 * @param questions 対象問題配列
 * @param userId ユーザーID（答履歴取得用）
 * @returns 忘却曲線重み付き問題配列（復習タイミング順）
 */
async function getForgettingCurveSortedQuestions(
  questions: QuestionWithWeight[],
  userId: string
): Promise<QuestionWithWeight[]> {
  console.log(`🧠 [Forgetting Curve] Applying optimization for ${questions.length} questions`)
  
  // 1. 各問題に忘却曲線重みを計算・付与
  const questionsWithForgettingWeight = await Promise.all(
    questions.map(async (q) => {
      const forgettingWeight = await calculateForgettingCurveWeight(q.id, userId)
      return {
        ...q,
        weight: q.weight * forgettingWeight, // 既存重みと乗算
        forgettingWeight
      }
    })
  )
  
  // 2. 忘却曲線重み順でソート（重み高 = 復習すべき問題が上位）
  const sorted = questionsWithForgettingWeight.sort((a, b) => {
    // 第1ソート: 忘却曲線重み（降順）
    if (Math.abs(b.forgettingWeight - a.forgettingWeight) > 0.01) {
      return b.forgettingWeight - a.forgettingWeight
    }
    // 第2ソート: 元重み（降順）
    return b.weight - a.weight
  })
  
  console.log(`🧠 [Forgetting Curve] Top 5 questions by forgetting weight:`)
  sorted.slice(0, 5).forEach((q, i) => {
    console.log(`  ${i + 1}. Question ${q.id}: forgetting=${q.forgettingWeight.toFixed(3)}, final=${q.weight.toFixed(3)}`)
  })
  
  return sorted
}

/**
 * 個別問題の忘却曲線重みを計算
 * @param questionId 問題ID
 * @param userId ユーザーID
 * @returns 重み値（0.1〜2.0）高いほど復習が必要
 */
async function calculateForgettingCurveWeight(questionId: number, userId: string): Promise<number> {
  try {
    // 最新の正答記録を取得（最大5件）
    const { data: recentAnswers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('is_correct, created_at')
      .eq('user_id', userId)
      .eq('question_id', questionId.toString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.warn(`⚠️ [Forgetting] Failed to get answer history for question ${questionId}:`, error)
      return 1.0 // デフォルト重み
    }
    
    if (!recentAnswers || recentAnswers.length === 0) {
      // 未出題問題は最高重み（新規学習）
      return 2.0
    }
    
    const latestAnswer = recentAnswers[0]
    const daysSinceLastAnswer = (Date.now() - new Date(latestAnswer.created_at || '').getTime()) / (1000 * 60 * 60 * 24)
    
    // エビングハウスの忘却曲線近似（保持率 = e^(-t/τ)）
    // τ（時定数）は正答率により調整
    const correctAnswers = recentAnswers.filter(a => a.is_correct).length
    const totalAnswers = recentAnswers.length
    const accuracyRate = correctAnswers / totalAnswers
    
    // 正答率が高いほどτが大きく（忘れにくい）、低いほどτが小さい（忘れやすい）
    const timeConstant = 7 + (accuracyRate * 14) // 7〜21日のτ
    const retentionRate = Math.exp(-daysSinceLastAnswer / timeConstant)
    
    // 忘却重み = 1 - 保持率（忘却が進むほど重み大）
    const forgettingWeight = 0.1 + (1.9 * (1 - retentionRate))
    
    // 最新正答が不正解の場合は重みを1.3倍
    const isLastIncorrect = !latestAnswer.is_correct
    const finalWeight = isLastIncorrect ? Math.min(forgettingWeight * 1.3, 2.0) : forgettingWeight
    
    return Math.max(0.1, Math.min(finalWeight, 2.0)) // 0.1〜2.0でクランプ
    
  } catch (error) {
    console.warn(`⚠️ [Forgetting] Error calculating weight for question ${questionId}:`, error)
    return 1.0 // エラー時はデフォルト重み
  }
}

async function generateCategoryBalancedSets(
  questions: QuestionWithWeight[],
  setsCount: number,
  questionsPerSet: number,
  userId: string
): Promise<number[][]> {
  const sets: number[][] = []
  const availableQuestions = [...questions] // Clone to avoid modifying original
  
  console.log(`🎯 [Category Balanced Sets] Generating ${setsCount} sets of ${questionsPerSet} questions each`)
  
  for (let i = 0; i < setsCount; i++) {
    console.log(`📋 [Set ${i + 1}] Starting generation with ${availableQuestions.length} available questions`)
    
    // カテゴリーバランス + 未出題優先選択を使用  
    const selectedQuestions = await selectCategoryBalancedSet(availableQuestions, questionsPerSet, userId)
    sets.push(selectedQuestions.map(q => q.id))
    
    console.log(`✅ [Set ${i + 1}] Generated with category distribution:`, 
      getCategoryDistribution(selectedQuestions))
    
    // Remove selected questions for next set
    selectedQuestions.forEach(selected => {
      const index = availableQuestions.findIndex(q => q.id === selected.id)
      if (index > -1) availableQuestions.splice(index, 1)
    })
  }
  
  return sets
}

/**
 * カテゴリー分散 + 未出題優先を組み合わせた問題選択
 * カテゴリーバランスを保ちながら、未出題問題を優先的に選択
 */
async function selectCategoryBalancedSet(
  questions: QuestionWithWeight[],
  count: number,
  userId: string
): Promise<QuestionWithWeight[]> {
  console.log(`🎯 [Category+Unasked] Starting balanced selection for ${count} questions`)
  
  // 1. ユーザーの過去出題履歴を取得（時間別分析）
  const { recentQuestions, totalQuestions } = await getUserAskedQuestions(userId)
  
  // 2. 問題を出題履歴で分類（忘却曲線対応）
  const neverAskedQuestions = questions.filter(q => !totalQuestions.has(q.id))
  const oldAskedQuestions = questions.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id))
  const recentAskedQuestions = questions.filter(q => recentQuestions.has(q.id))
  
  console.log(`📊 [Category+Unasked] Available: ${questions.length}, Never: ${neverAskedQuestions.length}, Old: ${oldAskedQuestions.length}, Recent: ${recentAskedQuestions.length}`)
  
  // Calculate minimum unasked count based on requirement (default 50% guarantee)
  const minUnaskedCount = Math.ceil(count * 0.5) // 50% minimum as per requirement
  const actualUnaskedCount = Math.min(minUnaskedCount, neverAskedQuestions.length)
  const remainingCount = count - actualUnaskedCount
  
  console.log(`🎯 [Category+Unasked] Target distribution:`, {
    minUnaskedCount,
    actualUnaskedCount,
    remainingCount
  })
  
  const selected: QuestionWithWeight[] = []
  
  // Priority 1: Never asked questions (guarantee minimum 50% as per requirement)
  if (actualUnaskedCount > 0) {
    const neverSelected = selectWithCategoryBalance(neverAskedQuestions, actualUnaskedCount)
    selected.push(...neverSelected)
    console.log(`✅ [Never Asked] Selected ${neverSelected.length} never-asked questions (50% guarantee)`)
  }
  
  // Priority 2: Fill remaining slots with forgetting curve logic
  if (remainingCount > 0) {
    // Prefer old questions (forgetting curve - ready for review)
    const oldSelected = oldAskedQuestions.length > 0
      ? selectWithCategoryBalance(oldAskedQuestions, Math.min(remainingCount, oldAskedQuestions.length))
      : []
    selected.push(...oldSelected)
    if (oldSelected.length > 0) {
      console.log(`✅ [Old Questions] Added ${oldSelected.length} old questions (forgetting curve)`)
    }
    
    // Fill any remaining slots with recent questions if necessary
    const stillNeeded = remainingCount - oldSelected.length
    if (stillNeeded > 0 && recentAskedQuestions.length > 0) {
      const recentSelected = selectWithCategoryBalance(recentAskedQuestions, stillNeeded)
      selected.push(...recentSelected)
      console.warn(`⚠️ [Recent Questions] Added ${recentSelected.length} recent questions (last resort)`)
    }
  }
  
  // Final result
  const final = selected.slice(0, count).sort(() => Math.random() - 0.5)
  
  console.log(`✅ [Category+Unasked] Final selection (${final.length} total):`)
  console.log(`   📊 Category distribution:`, getCategoryDistribution(final))
  
  return final
}

// Legacy function - kept for potential future use
async function _generateRandomizedSets(
  questions: QuestionWithWeight[],
  setsCount: number,
  questionsPerSet: number
): Promise<number[][]> {
  const sets: number[][] = []
  
  for (let i = 0; i < setsCount; i++) {
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    const selectedQuestions = shuffled.slice(0, questionsPerSet)
    sets.push(selectedQuestions.map(q => q.id))
    
    // Remove selected questions for next set
    selectedQuestions.forEach(selected => {
      const index = questions.findIndex(q => q.id === selected.id)
      if (index > -1) questions.splice(index, 1)
    })
  }
  
  return sets
}

async function generateReviewSets(
  questions: QuestionWithWeight[],
  setsCount: number,
  questionsPerSet: number
): Promise<number[][]> {
  const sets: number[][] = []
  const questionIds = questions.map(q => q.id)
  
  if (setsCount === 1) {
    // Single set: use all available questions (no duplicates)
    sets.push(questionIds.slice(0, questionsPerSet))
  } else if (questions.length >= questionsPerSet * setsCount) {
    // Enough questions for full sets without any duplicates
    for (let i = 0; i < setsCount; i++) {
      const startIndex = i * questionsPerSet
      const endIndex = startIndex + questionsPerSet
      sets.push(questionIds.slice(startIndex, endIndex))
    }
  } else {
    // Not enough questions for full sets - distribute evenly with minimal cross-set duplicates
    // Strategy: Fill first set completely, then fill second set with remaining + some overlaps
    
    // Set 1: First questionsPerSet questions
    sets.push(questionIds.slice(0, Math.min(questionsPerSet, questionIds.length)))
    
    // Set 2: Start with remaining questions, then add from beginning if needed
    const remainingQuestions = questionIds.slice(questionsPerSet)
    const set2: number[] = [...remainingQuestions]
    
    // Fill set2 to desired size by adding questions from the beginning (cross-set duplicates)
    let fillIndex = 0
    while (set2.length < questionsPerSet && fillIndex < questionIds.length) {
      set2.push(questionIds[fillIndex])
      fillIndex++
    }
    
    sets.push(set2)
  }
  
  return sets
}

// =================================================================
// Type Definitions
// =================================================================

interface CategoryAccuracy {
  category_id: string
  quiz_average_accuracy: number
  quiz_sessions_completed: number
}

interface GenerationResult {
  quiz_type: string
  success: boolean
  data?: SetGenerationResult
  error?: string
}

interface SetGenerationResult {
  generated?: boolean
  skipped?: boolean
  reason?: string
  sets_count?: number
  questions_per_set?: number
  analytics?: Partial<AnalysisData>
  settings_hash?: string
  categories_count?: number
  total_review_targets?: number
}

export type {
  CategoryAccuracy,
  GenerationResult,
  SetGenerationResult
}