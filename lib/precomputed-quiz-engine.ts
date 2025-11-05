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
      return {
        quiz_type: quizType,
        success: true,
        data: result.value
      }
    } else {
      console.error(`❌ [${quizType}] Generation failed:`, result.reason)
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
  
  // Handle existing sets
  if (forceRegenerate) {
    // Delete all existing sets for this user/quiz type to reflect latest learning results
    await supabaseAdmin
      .from('precomputed_quiz_sets')
      .delete()
      .eq('user_id', userId)
      .eq('quiz_type', 'business-ai')
    console.log('🔄 [Business-AI] Deleted existing sets for regeneration')
  } else {
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
    
    // 2. Apply focus category weights (use selected_categories as focus)
    const focusCategories = extractSelectedCategories(userProfile || {})
    const weightedQuestions = applyFocusCategoryWeights(availableQuestions, focusCategories)
    
    // 3. Calculate optimal difficulty distribution
    const avgAccuracy = calculateAverageAccuracy(recentAccuracy)
    const difficultyDistribution = calculateOptimalDistribution(avgAccuracy)
    
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
      10 // questions per set
    )
    
    // 5. Save to database
    await savePrecomputedSets(userId, 'business-ai', questionSets, {
      avg_accuracy: avgAccuracy,
      distribution: difficultyDistribution,
      focus_categories: focusCategories,
      generation_method: 'business-ai-optimized'
    })
    
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
  
  // Handle existing sets
  if (forceRegenerate) {
    // Delete all existing sets for this user/quiz type to reflect latest learning results
    await supabaseAdmin
      .from('precomputed_quiz_sets')
      .delete()
      .eq('user_id', userId)
      .eq('quiz_type', 'self-personalized')
    console.log('🔄 [Self-Personalized] Deleted existing sets for regeneration')
  }
  
  try {
    // 1. Get user profile settings
    const userSettings = await getUserQuizSettings(userId)
    
    const hasCategories = userSettings?.selected_categories || userSettings?.selected_industry_categories
    if (!hasCategories) {
      console.log('ℹ️ [Self-Personalized] Categories not configured, skipping')
      return { skipped: true, reason: 'Categories not configured' }
    }
    
    // 2. Calculate settings hash for change detection
    const settingsHash = calculateSettingsHash(userSettings)
    
    // 3. Check if existing sets match current settings
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
    
    // 6. Generate sets (2 sets of 10 questions each)
    const questionSets = await generateRandomizedSets(personalizedQuestions, 2, 10)
    
    // 7. Save to database
    await savePrecomputedSets(userId, 'self-personalized', questionSets, {
      settings_hash: settingsHash,
      selected_categories: selectedCategories,
      learning_goals: userSettings.learning_goals,
      learning_level: userSettings.learning_level || undefined,
      generation_method: 'self-personalized'
    })
    
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
  
  // Handle existing sets
  if (forceRegenerate) {
    // Delete all existing sets for this user/quiz type to reflect latest learning results
    await supabaseAdmin
      .from('precomputed_quiz_sets')
      .delete()
      .eq('user_id', userId)
      .eq('quiz_type', 'review')
    console.log('🔄 [Review] Deleted existing sets for regeneration')
  }
  
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
    const optimizedQuestions = applyForgettingCurveOptimization(reviewQuestions)
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
    await savePrecomputedSets(userId, 'review', questionSets, {
      total_review_targets: reviewQuestions.length,
      review_criteria: ['incorrect', 'hint_used', 'low_confidence', 'slow_response'],
      generation_method: 'review-optimized'
    })
    
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

async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  try {
    // user_settingsテーブルからセルフパーソナライズ設定を取得
    // 実際のデータ構造: setting_key = 'quiz_personalization'
    const { data: userSettings, error } = await supabaseAdmin
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', userId)
      .eq('setting_key', 'quiz_personalization')
      .single()

    if (error) {
      console.warn('⚠️ Failed to get user quiz_personalization settings:', error)
      return null
    }

    if (!userSettings || !userSettings.setting_value) {
      console.log('📝 No quiz_personalization settings found')
      return null
    }

    try {
      // setting_valueからパーソナライズ設定を取得
      const personalizedSettings = typeof userSettings.setting_value === 'string' 
        ? JSON.parse(userSettings.setting_value) 
        : userSettings.setting_value

      // 設定をUserProfileData形式に変換
      const profileData: UserProfileData = {
        selected_categories: personalizedSettings.basicCategories || [],
        selected_industry_categories: personalizedSettings.industryCategories || [],
        learning_level: personalizedSettings.learningLevel || undefined,
        // industrySubcategoriesも利用可能
        selected_subcategories: personalizedSettings.industrySubcategories || []
      }

      console.log('✅ User profile loaded from user_settings (quiz_personalization):', {
        userId: userId.substring(0, 8) + '...',
        hasBasicCategories: !!profileData.selected_categories,
        hasIndustryCategories: !!profileData.selected_industry_categories,
        basicCategoriesCount: Array.isArray(profileData.selected_categories) ? profileData.selected_categories.length : 0,
        industryCategoriesCount: Array.isArray(profileData.selected_industry_categories) ? profileData.selected_industry_categories.length : 0,
        learningLevel: profileData.learning_level,
        dataSource: 'user_settings.quiz_personalization'
      })

      return profileData

    } catch (parseError) {
      console.warn('⚠️ Failed to parse quiz_personalization settings:', parseError)
      return null
    }

  } catch (error) {
    console.error('❌ Error in getUserProfile:', error)
    return null
  }
}

async function getUserQuizSettings(userId: string): Promise<UserProfileData | null> {
  // セルフパーソナライズ用: user_settingsから取得
  return await getUserProfile(userId)
}

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
  // First get main business categories (2-step approach for reliability)
  const { data: mainCategories, error: categoryError } = await supabaseAdmin
    .from('categories')
    .select('category_id')
    .eq('type', 'main')
  
  if (categoryError) {
    console.error(`❌ Failed to get main categories: ${categoryError.message}`)
    // Fallback to all categories
    const { data: allQuestions, error: fallbackError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory_id, difficulty')
      .eq('is_deleted', false)
      .in('difficulty', ['basic', 'intermediate', 'advanced'])
      .limit(1000)
    
    if (fallbackError) {
      throw new Error(`Failed to get fallback questions: ${fallbackError.message}`)
    }
    
    console.log(`🔄 [Business Questions] Using fallback: ${allQuestions?.length || 0} questions`)
    return (allQuestions || []).map(q => ({ ...q, weight: 1.0 }))
  }
  
  const categoryIds = (mainCategories || []).map(cat => cat.category_id)
  console.log(`🔍 [Business Questions] Found ${categoryIds.length} main categories`)
  
  if (categoryIds.length === 0) {
    throw new Error('No main categories found')
  }
  
  // Get questions for main categories
  const { data, error } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, category_id, subcategory_id, difficulty')
    .in('category_id', categoryIds)
    .eq('is_deleted', false)
    .limit(1000)
  
  if (error) {
    throw new Error(`Failed to get business questions: ${error.message}`)
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

function calculateOptimalDistribution(avgAccuracy: number): Record<string, number> {
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
  questionsPerSet: number
): Promise<number[][]> {
  const sets: number[][] = []
  
  for (let i = 0; i < setsCount; i++) {
    const selectedQuestions = selectQuestionsByDistribution(questions, distribution, questionsPerSet)
    sets.push(selectedQuestions.map(q => q.id))
    
    // Remove selected questions to avoid duplicates in next set
    selectedQuestions.forEach(selected => {
      const index = questions.findIndex(q => q.id === selected.id)
      if (index > -1) questions.splice(index, 1)
    })
  }
  
  return sets
}

function selectQuestionsByDistribution(
  questions: QuestionWithWeight[],
  distribution: Record<string, number>,
  totalCount: number
): QuestionWithWeight[] {
  const selected: QuestionWithWeight[] = []
  const availableByDifficulty = groupByDifficulty(questions)
  
  // Select by distribution
  Object.entries(distribution).forEach(([difficulty, count]) => {
    const available = availableByDifficulty[difficulty] || []
    const weighted = available.sort((a, b) => b.weight - a.weight)
    selected.push(...weighted.slice(0, count))
  })
  
  // Fill remaining slots with random questions
  while (selected.length < totalCount && selected.length < questions.length) {
    const remaining = questions.filter(q => !selected.some(s => s.id === q.id))
    if (remaining.length === 0) break
    
    const randomQuestion = remaining[Math.floor(Math.random() * remaining.length)]
    selected.push(randomQuestion)
  }
  
  return selected.slice(0, totalCount)
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
  
  const { error } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .insert(insertData)
  
  if (error) {
    throw new Error(`Failed to save precomputed sets: ${error.message}`)
  }
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
  // Apply learning goals and learning level preferences
  return questions.map(q => {
    let weight = q.weight
    
    // Adjust weight based on learning level (basic, intermediate, advanced, expert)
    if (settings.learning_level === 'advanced' && ['advanced', 'expert'].includes(q.difficulty || '')) {
      weight *= 1.3
    } else if (settings.learning_level === 'intermediate' && ['intermediate', 'advanced'].includes(q.difficulty || '')) {
      weight *= 1.2
    } else if (settings.learning_level === 'basic' && ['basic', 'intermediate'].includes(q.difficulty || '')) {
      weight *= 1.2
    }
    
    return { ...q, weight }
  })
}

function applyForgettingCurveOptimization(questions: QuestionWithWeight[]): QuestionWithWeight[] {
  // Simple implementation - can be enhanced with actual forgetting curve calculation
  return questions.sort(() => Math.random() - 0.5)
}

async function generateRandomizedSets(
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