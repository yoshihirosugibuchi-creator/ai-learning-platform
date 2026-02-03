import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Question } from '@/lib/types'
import type { Json } from '@/lib/database-types-official'

// Quick Quiz Start API
// Purpose: Instantly select questions from precomputed sets or smart random selection
// Called from: QuizSession.tsx initialization

export async function POST(request: NextRequest) {
  try {
    console.log('⚡ [Quick Start] Initializing instant quiz...')
    
    // === Step 1: Authentication ===
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication token required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // === Step 2: Parse Request ===
    const body = await request.json()
    const { 
      quiz_type,           // 'business-ai' | 'self-personalized' | 'category' | 'review'
      category_id,         // For category quizzes
      difficulties,        // For category quizzes: ['basic', 'intermediate']
      count = 10           // Number of questions (default 10)
    } = body

    console.log('📋 [Quick Start] Request:', {
      userId: user.id,
      quizType: quiz_type,
      categoryId: category_id,
      difficulties,
      count
    })

    // === Step 3: Validate Request ===
    const validQuizTypes = ['business-ai', 'self-personalized', 'category', 'review']
    if (!validQuizTypes.includes(quiz_type)) {
      return NextResponse.json(
        { error: 'Invalid quiz_type' },
        { status: 400 }
      )
    }

    if (quiz_type === 'category' && (!category_id || !difficulties || difficulties.length === 0)) {
      return NextResponse.json(
        { error: 'category_id and difficulties required for category quiz' },
        { status: 400 }
      )
    }

    // === Step 4: Get User Activity Status ===
    const { data: lastActivity } = await supabaseAdmin
      .from('quiz_sessions')
      .select('session_end_time')
      .eq('user_id', user.id)
      .not('session_end_time', 'is', null)
      .order('session_end_time', { ascending: false })
      .limit(1)
      .single()

    const daysSinceLastActivity = lastActivity?.session_end_time
      ? (Date.now() - new Date(lastActivity.session_end_time).getTime()) / (1000 * 60 * 60 * 24)
      : 999

    console.log(`📊 [Quick Start] User activity: ${daysSinceLastActivity.toFixed(1)} days ago`)

    // === Step 5: Route to Appropriate Strategy ===
    interface QuizResult {
      questions: Question[]
      method: string
      metadata?: {
        selection_method?: string
        performance_ms?: number
        total_available?: number
        [key: string]: Json | string | number | undefined
      }
    }
    let result: QuizResult

    if (quiz_type === 'category') {
      // Category quizzes always use smart random selection
      result = await handleCategoryQuiz(user.id, category_id, difficulties, count)
    } else if (!lastActivity) {
      // New user - lightweight generation
      result = await handleNewUser(user.id, quiz_type, count)
    } else if (daysSinceLastActivity <= 3) {
      // Active user - use precomputed sets
      result = await getPrecomputedSet(user.id, quiz_type, count)
    } else {
      // Long absence - reset personalization
      result = await handleLongAbsence(user.id, quiz_type, count)
    }

    console.log(`✅ [Quick Start] Questions selected: ${result.questions.length}`)

    // 日本語名を付与（全クイズタイプ共通）
    const questionsWithNames = await addCategorySubcategoryNames(result.questions)

    return NextResponse.json({
      success: true,
      questions: questionsWithNames,
      metadata: {
        selection_method: result.method,
        user_status: !lastActivity ? 'new' : (daysSinceLastActivity <= 3 ? 'active' : 'returning'),
        days_since_activity: daysSinceLastActivity,
        quiz_type,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ [Quick Start] Error:', error)
    return NextResponse.json(
      { 
        error: 'Quick start failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// =================================================================
// Category Quiz - Smart Random Selection
// =================================================================
async function handleCategoryQuiz(
  userId: string,
  categoryId: string,
  difficulties: string[],
  count: number
) {
  console.log(`🎲 [Category] Smart random for ${categoryId}`)

  // Get questions with usage history
  const { data: questionsWithUsage } = await supabaseAdmin
    .from('quiz_questions')
    .select(`
      id, category_id, subcategory_id, difficulty, question, option1, option2, option3, option4,
      correct_answer, explanation, time_limit, source,
      user_question_usage!left(
        last_used_at, usage_count, recent_usage_count
      )
    `)
    .eq('category_id', categoryId)
    .in('difficulty', difficulties)
    .eq('is_deleted', false)
    .limit(count * 3) // Get more options for better selection

  if (!questionsWithUsage || questionsWithUsage.length < count) {
    throw new Error(`Insufficient questions for category ${categoryId}`)
  }

  // Calculate smart weights
  const weightedQuestions = questionsWithUsage.map(q => {
    const usage = q.user_question_usage?.[0]
    let weight = 1.0

    if (usage) {
      // Reduce weight for recently used questions
      const daysSinceUsed = usage.last_used_at 
        ? (Date.now() - new Date(usage.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
        : 999

      if (daysSinceUsed < 7) {
        weight *= Math.max(0.1, daysSinceUsed / 7)
      }

      // Reduce weight for frequently used questions
      if ((usage.recent_usage_count || 0) >= 3) {
        weight *= Math.max(0.2, 1 - ((usage.recent_usage_count || 0) - 2) * 0.2)
      }
    }

    return { ...q, weight }
  })

  // Perform weighted random selection
  const selectedQuestions = performWeightedSelection(weightedQuestions, count)

  // Update usage history
  await updateQuestionUsage(userId, selectedQuestions)

  return {
    questions: selectedQuestions.map(q => convertToQuestion(cleanQuestionData(q))),
    method: 'smart_random_category'
  }
}

// =================================================================
// New User Handling
// =================================================================
async function handleNewUser(userId: string, quizType: 'business-ai' | 'self-personalized' | 'category' | 'review', count: number) {
  console.log(`🆕 [New User] ${quizType} generation`)

  let questions: Question[] = []

  switch (quizType) {
    case 'business-ai':
      questions = await generateNewUserBusinessAI(userId, count)
      break
    
    case 'self-personalized':
      questions = await generateNewUserSelfPersonalized(userId, count)
      break
    
    case 'review':
      // New users have no review targets
      return { questions: [], method: 'new_user_no_review' }
    
    default:
      throw new Error(`Unsupported quiz type for new user: ${quizType}`)
  }

  // 📝 Note: 事前セット生成はクイズ完了時（XP保存時）に実行されます
  // Quick Start時の生成は重複を避けるため削除

  return {
    questions: questions,
    method: 'new_user_generation'
  }
}

// =================================================================
// Precomputed Set Usage
// =================================================================
async function getPrecomputedSet(userId: string, quizType: 'business-ai' | 'self-personalized' | 'category' | 'review', count: number) {
  console.log(`📦 [Precomputed] Fetching ${quizType} set`)

  // Find valid precomputed set
  const { data: precomputedSets } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .select('id, question_ids, analysis_data, created_at, expires_at, used_at')
    .eq('user_id', userId)
    .eq('quiz_type', quizType)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(3)

  console.log(`📦 [Precomputed] Found ${precomputedSets?.length || 0} valid ${quizType} sets:`)
  precomputedSets?.forEach((set, index) => {
    const questionIds = Array.isArray(set.question_ids) ? set.question_ids.slice(0, 3) : []
    console.log(`  Set ${index + 1}: ID=${set.id}, created=${set.created_at}, questions=[${questionIds.join(', ')}...]`)
  })

  if (!precomputedSets || precomputedSets.length === 0) {
    console.log(`📦 [Precomputed] No valid sets found for ${quizType}, falling back to new user generation`)
    
    // 📝 Note: 事前セット生成はクイズ完了時（XP保存時）に実行されます
    // Quick Start時の生成は重複を避けるため削除
    
    return await handleNewUser(userId, quizType, count)
  }

  const selectedSet = precomputedSets[0]
  console.log(`📦 [Precomputed] Selected set ID=${selectedSet.id} from ${selectedSet.created_at}`)
  
  // Mark set as used
  const usedAt = new Date().toISOString()
  const { error: updateError } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .update({ used_at: usedAt })
    .eq('id', selectedSet.id)

  if (updateError) {
    console.error(`❌ [Precomputed] Failed to mark set ${selectedSet.id} as used:`, updateError)
  } else {
    console.log(`✅ [Precomputed] Successfully marked set ${selectedSet.id} as used at ${usedAt}`)
  }

  // Get full question data
  const { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .in('id', selectedSet.question_ids)
    .eq('is_deleted', false)

  if (!questions || questions.length === 0) {
    throw new Error('Precomputed questions not found')
  }

  // Ensure we have the right count
  const finalQuestions = questions.slice(0, count)

  return {
    questions: finalQuestions.map(q => ({
      id: q.id,
      category: q.category_id,
      subcategory: q.subcategory_id || '',
      difficulty: q.difficulty || 'basic',
      question: q.question,
      options: [q.option1, q.option2, q.option3, q.option4],
      correct: q.correct_answer,
      explanation: q.explanation || '',
      timeLimit: q.time_limit || 60,
      relatedTopics: [],
      source: q.source
    })),
    method: 'precomputed_set',
    analysis_data: selectedSet.analysis_data
  }
}

// =================================================================
// Long Absence Handling
// =================================================================
async function handleLongAbsence(userId: string, quizType: string, count: number) {
  console.log(`⏰ [Long Absence] Reset personalization for ${quizType}`)

  // For review quiz, still try to use precomputed sets (they don't expire based on activity)
  if (quizType === 'review') {
    try {
      return await getPrecomputedSet(userId, quizType, count)
    } catch {
      // If no review sets, return empty
      return { questions: [], method: 'long_absence_no_review' }
    }
  }

  // For other types, generate fresh questions without heavy personalization
  return await handleNewUser(userId, quizType as 'business-ai' | 'self-personalized' | 'category' | 'review', count)
}

// =================================================================
// Helper Functions
// =================================================================

async function generateNewUserBusinessAI(userId: string, count: number): Promise<Question[]> {
  console.log(`🆕 [Business AI] Generating for new user with duplicate prevention`)
  
  // 1. Get user's question history with time-based weighting
  const { recentQuestions, totalQuestions } = await getUserAskedQuestions(userId)
  console.log(`📚 [Business AI] Question history loaded:`)
  console.log(`  - Recent (7 days): ${recentQuestions.size} questions`)
  console.log(`  - Total (30 days): ${totalQuestions.size} questions`)
  
  // Get basic business questions (main categories only) - get more candidates for better selection
  // Use proper server-side data access instead of client-side patterns
  const { getMainCategoryIds } = await import('@/lib/category-server-service')
  const mainCategoryIds = await getMainCategoryIds()
  
  console.log(`🔍 [Business AI] Using ${mainCategoryIds.length} main category IDs:`, mainCategoryIds)
  
  let { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('is_deleted', false)
    .in('category_id', mainCategoryIds) // Use static main category IDs
    .in('difficulty', ['basic', 'intermediate']) // Easier for new users
    .limit(count * 3) // Get 3x more candidates for better duplicate avoidance

  // Fallback: If not enough main category questions, expand to all difficulties but keep main categories only
  if (!questions || questions.length < count) {
    console.log(`🔄 [Business AI] Insufficient main category questions (${questions?.length || 0}), expanding to all difficulties`)
    const { data: allQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('is_deleted', false)
      .in('category_id', mainCategoryIds) // Keep main categories only
      .limit(count * 4) // Get even more candidates
    
    questions = allQuestions || []
  }

  // Final fallback: If still insufficient, get any available questions
  if (!questions || questions.length < count) {
    console.log(`⚠️ [Business AI] Still insufficient main category questions (${questions?.length || 0}), trying all questions as emergency fallback`)
    
    const { data: emergencyQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('is_deleted', false)
      .in('difficulty', ['basic', 'intermediate', 'advanced'])
      .limit(count * 2)
    
    console.log(`🚨 [Business AI] Emergency fallback found ${emergencyQuestions?.length || 0} questions`)
    
    if (!emergencyQuestions || emergencyQuestions.length < count) {
      console.error(`❌ [Business AI] Complete failure: ${emergencyQuestions?.length || 0} < ${count}`)
      throw new Error(`Insufficient questions found: ${emergencyQuestions?.length || 0}, need ${count}`)
    }
    
    questions = emergencyQuestions
  }

  // 2. Separate questions by recency with forgetting curve logic
  const neverAskedQuestions = questions.filter(q => !totalQuestions.has(q.id))
  const recentlyAskedQuestions = questions.filter(q => recentQuestions.has(q.id))
  const oldAskedQuestions = questions.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id))
  
  console.log(`📊 [Business AI] Question categorization:`)
  console.log(`  - Total available: ${questions.length}`)
  console.log(`  - Never asked: ${neverAskedQuestions.length}`)
  console.log(`  - Recently asked (7 days): ${recentlyAskedQuestions.length}`)
  console.log(`  - Previously asked (8-30 days): ${oldAskedQuestions.length}`)
  
  // 3. Smart selection with forgetting curve priority
  const selectedQuestions: typeof questions = []
  
  // Priority 1: Never asked questions (highest priority)
  const targetNeverAsked = Math.min(Math.ceil(count * 0.7), neverAskedQuestions.length) // 70% if available
  if (targetNeverAsked > 0) {
    const selected = neverAskedQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, targetNeverAsked)
    selectedQuestions.push(...selected)
    console.log(`✅ [Business AI] Selected ${selected.length} never-asked questions`)
  }
  
  // Priority 2: Old questions (forgetting curve - ready for review)
  const remainingSlots = count - selectedQuestions.length
  if (remainingSlots > 0 && oldAskedQuestions.length > 0) {
    const targetOld = Math.min(remainingSlots, oldAskedQuestions.length)
    const selected = oldAskedQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, targetOld)
    selectedQuestions.push(...selected)
    console.log(`✅ [Business AI] Selected ${selected.length} old questions (forgetting curve)`)
  }
  
  // Priority 3: Recent questions only as last resort (avoid repetition)
  const stillRemaining = count - selectedQuestions.length
  if (stillRemaining > 0 && recentlyAskedQuestions.length > 0) {
    console.log(`⚠️ [Business AI] Insufficient questions, adding ${stillRemaining} recent questions as last resort`)
    const selected = recentlyAskedQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, stillRemaining)
    selectedQuestions.push(...selected)
  }
  
  // Final shuffle to randomize order
  const finalSelection = selectedQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, count) // Ensure exact count
  
  console.log(`🎯 [Business AI] Final selection summary:`)
  console.log(`  - Total selected: ${finalSelection.length}/${count}`)
  console.log(`  - Never asked: ${finalSelection.filter(q => !totalQuestions.has(q.id)).length}`)
  console.log(`  - Old questions: ${finalSelection.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id)).length}`)
  console.log(`  - Recent questions: ${finalSelection.filter(q => recentQuestions.has(q.id)).length}`)
  
  // Convert database rows to Question type
  return finalSelection.map(q => ({
    id: q.id,
    category: q.category_id,
    subcategory: q.subcategory_id || '',
    difficulty: q.difficulty || 'basic',
    question: q.question,
    options: [q.option1, q.option2, q.option3, q.option4],
    correct: q.correct_answer, // DB is already 0-based
    explanation: q.explanation || '',
    timeLimit: q.time_limit || 60,
    relatedTopics: [],
    source: q.source
  }))
}

async function generateNewUserSelfPersonalized(userId: string, count: number): Promise<Question[]> {
  console.log(`🎯 [Self-Personalized] Generating for new user with duplicate prevention`)
  
  // 1. Get user's question history to prevent duplicates
  const { totalQuestions } = await getUserAskedQuestions(userId)
  console.log(`📚 [Self-Personalized] Found ${totalQuestions.size} previously asked questions`)
  
  // Get user's quiz personalization settings from user_settings table
  const { data: userQuizSettings } = await supabaseAdmin
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('setting_key', 'quiz_personalization')
    .single()

  if (!userQuizSettings?.setting_value) {
    console.log('ℹ️ [Self-Personalized Fallback] No quiz settings found, using business AI default')
    return await generateNewUserBusinessAI(userId, count)
  }

  // Parse the quiz personalization settings
  const quizSettings = userQuizSettings.setting_value as {
    learningLevel: string
    basicCategories: string[]
    industryCategories: string[]
    industrySubcategories: string[]
  }

  // Collect all selected categories
  const selectedCategories: string[] = []
  
  if (Array.isArray(quizSettings.basicCategories)) {
    selectedCategories.push(...quizSettings.basicCategories.filter((cat): cat is string => typeof cat === 'string' && Boolean(cat)))
  }
  
  if (Array.isArray(quizSettings.industryCategories)) {
    selectedCategories.push(...quizSettings.industryCategories.filter((cat): cat is string => typeof cat === 'string' && Boolean(cat)))
  }

  console.log('🎯 [Self-Personalized] Using settings:', {
    selectedCategories,
    learningLevel: quizSettings.learningLevel,
    basicCount: quizSettings.basicCategories?.length || 0,
    industryCount: quizSettings.industryCategories?.length || 0
  })

  if (selectedCategories.length === 0) {
    console.log('ℹ️ [Self-Personalized Fallback] No categories selected, using business AI default')
    return await generateNewUserBusinessAI(userId, count)
  }

  // Define difficulty hierarchy based on user's learning level
  const learningLevel = quizSettings.learningLevel || 'basic'
  const difficultyLevels = ['basic', 'intermediate', 'advanced', 'expert']
  const userLevelIndex = difficultyLevels.indexOf(learningLevel)
  const allowedDifficulties = difficultyLevels.slice(userLevelIndex >= 0 ? userLevelIndex : 0)

  let { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .in('category_id', selectedCategories)
    .in('difficulty', allowedDifficulties) // Apply difficulty filter
    .eq('is_deleted', false)
    .limit(count * 4) // Get 4x more candidates for better duplicate avoidance

  console.log('🎯 [Self-Personalized] Questions filtered by difficulty:', {
    learningLevel,
    allowedDifficulties,
    questionsFound: questions?.length || 0
  })

  if (!questions || questions.length < count) {
    console.warn(`⚠️ [Self-Personalized] Insufficient questions for selected categories + difficulty (${questions?.length || 0}/${count}), trying without difficulty filter`)
    
    // Fallback: try without difficulty filter
    const { data: allQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .in('category_id', selectedCategories)
      .eq('is_deleted', false)
      .limit(count * 3) // Get more candidates for fallback
    
    if (!allQuestions || allQuestions.length < count) {
      console.warn('⚠️ [Self-Personalized] Still insufficient questions, using business AI fallback')
      return await generateNewUserBusinessAI(userId, count)
    }
    
    questions = allQuestions
  }

  // 2. Separate unasked and asked questions
  const unaskedQuestions = questions.filter(q => !totalQuestions.has(q.id))
  const askedQuestions = questions.filter(q => totalQuestions.has(q.id))
  
  console.log(`📊 [Self-Personalized] Question analysis: Total=${questions.length}, Unasked=${unaskedQuestions.length}, Asked=${askedQuestions.length}`)
  
  // 3. Prioritize unasked questions
  const targetUnaskedCount = Math.min(count, unaskedQuestions.length)
  const remainingCount = count - targetUnaskedCount
  
  console.log(`🎯 [Self-Personalized] Selection target: ${targetUnaskedCount} unasked + ${remainingCount} asked`)
  
  // 4. Select unasked questions first
  const selectedUnasked = unaskedQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, targetUnaskedCount)
  
  // 5. Fill remaining slots with asked questions if needed
  const selectedAsked = remainingCount > 0 
    ? askedQuestions.sort(() => Math.random() - 0.5).slice(0, remainingCount)
    : []
  
  // 6. Combine and shuffle final selection
  const selectedQuestions = [...selectedUnasked, ...selectedAsked]
    .sort(() => Math.random() - 0.5) // Final shuffle
  
  console.log(`✅ [Self-Personalized] Final selection: ${selectedQuestions.length} questions (${selectedUnasked.length} unasked + ${selectedAsked.length} asked)`)
  
  // Convert database rows to Question type
  return selectedQuestions.map(q => ({
    id: q.id,
    category: q.category_id,
    subcategory: q.subcategory_id || '',
    difficulty: q.difficulty || 'basic',
    question: q.question,
    options: [q.option1, q.option2, q.option3, q.option4],
    correct: q.correct_answer, // DB is already 0-based
    explanation: q.explanation || '',
    timeLimit: q.time_limit || 60,
    relatedTopics: [],
    source: q.source
  }))
}

interface WeightedQuestion extends DatabaseQuestionWithUsage {
  weight: number
}

function performWeightedSelection(weightedQuestions: WeightedQuestion[], count: number): WeightedQuestion[] {
  const selected: WeightedQuestion[] = []
  const available = [...weightedQuestions]

  for (let i = 0; i < count && available.length > 0; i++) {
    const totalWeight = available.reduce((sum, q) => sum + q.weight, 0)
    let randomValue = Math.random() * totalWeight

    let selectedIndex = 0
    for (let j = 0; j < available.length; j++) {
      randomValue -= available[j].weight
      if (randomValue <= 0) {
        selectedIndex = j
        break
      }
    }

    selected.push(available[selectedIndex])
    available.splice(selectedIndex, 1)
  }

  return selected
}

async function updateQuestionUsage(userId: string, questions: DatabaseQuestionWithUsage[]): Promise<void> {
  const usageUpdates = questions.map(q => ({
    user_id: userId,
    question_id: q.id,
    category_id: q.category_id,
    subcategory_id: q.subcategory_id,
    difficulty: q.difficulty || 'basic',
    last_used_at: new Date().toISOString(),
    usage_count: 1,
    recent_usage_count: 1
  }))

  // Use upsert to handle existing records
  const { error } = await supabaseAdmin
    .from('user_question_usage')
    .upsert(usageUpdates, {
      onConflict: 'user_id, question_id',
      ignoreDuplicates: false
    })

  if (error) {
    console.warn('⚠️ Failed to update question usage:', error)
  }
}

interface DatabaseQuestionWithUsage {
  id: number
  category_id: string
  subcategory_id: string | null
  difficulty: string | null
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correct_answer: number
  explanation: string | null
  time_limit: number | null
  source: string | null
  weight?: number
  user_question_usage?: Array<{
    last_used_at: string | null
    usage_count: number | null
    recent_usage_count: number | null
  }> | null
  categories?: {
    type: string
  } | null
}

interface CleanQuestion {
  id: number
  category_id: string
  subcategory_id: string | null
  difficulty: string | null
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correct_answer: number
  explanation: string | null
  time_limit: number | null
  source: string | null
  weight?: number
}

function cleanQuestionData(question: DatabaseQuestionWithUsage): CleanQuestion {
  // Remove internal fields and user_question_usage data
  const {
    user_question_usage: _user_question_usage,
    categories: _categories,
    ...cleanQuestion
  } = question

  return cleanQuestion
}

function convertToQuestion(cleanQuestion: CleanQuestion): Question {
  return {
    id: cleanQuestion.id,
    category: cleanQuestion.category_id,
    subcategory: cleanQuestion.subcategory_id || '',
    difficulty: cleanQuestion.difficulty || 'basic',
    question: cleanQuestion.question,
    options: [cleanQuestion.option1, cleanQuestion.option2, cleanQuestion.option3, cleanQuestion.option4],
    correct: cleanQuestion.correct_answer, // DB is already 0-based
    explanation: cleanQuestion.explanation || '',
    timeLimit: cleanQuestion.time_limit || 60,
    relatedTopics: [],
    source: cleanQuestion.source
  }
}

// =================================================================
// User Question History Helper (imported from precomputed-quiz-engine)
// =================================================================

/**
 * Get user's previously asked questions from quiz_answers table with weighted recency
 * @param userId User ID
 * @returns Object with recent (7 days) and total (30 days) question sets
 */
async function getUserAskedQuestions(userId: string): Promise<{
  recentQuestions: Set<number>
  totalQuestions: Set<number>
}> {
  try {
    // Get answer history from last 30 days with session info
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
    
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000
    
    const recentQuestions = new Set<number>()
    const totalQuestions = new Set<number>()
    const veryRecentQuestions = new Set<number>() // Last 3 days for extra weighting
    
    // Extract numeric question IDs with time-based categorization
    for (const answer of answerHistory || []) {
      if (!/^\d+$/.test(answer.question_id)) continue // Skip non-numeric IDs
      
      const questionId = parseInt(answer.question_id, 10)
      const answerTime = new Date(answer.created_at || '').getTime()
      
      totalQuestions.add(questionId)
      
      // Recent questions (last 7 days) get stronger weight
      if (answerTime >= sevenDaysAgo) {
        recentQuestions.add(questionId)
      }
      
      // Very recent questions (last 3 days) get extra logging
      if (answerTime >= threeDaysAgo) {
        veryRecentQuestions.add(questionId)
      }
    }
    
    console.log(`📚 [getUserAskedQuestions] Question history analysis:`)
    console.log(`  - Last 3 days: ${veryRecentQuestions.size} questions`)
    console.log(`  - Last 7 days: ${recentQuestions.size} questions`)
    console.log(`  - Last 30 days: ${totalQuestions.size} questions`)
    
    return { recentQuestions, totalQuestions }
    
  } catch (error) {
    console.error('❌ [getUserAskedQuestions] Error:', error)
    return { recentQuestions: new Set(), totalQuestions: new Set() }
  }
}

// =================================================================
// Background Precomputation: Removed to prevent duplicate generation
// =================================================================
// 📝 Note: 事前セット生成はクイズ完了時（XP保存API）に統一されました
// Quick Start APIでの生成は重複を防ぐため削除済み

// =================================================================
// Helper: Add Category/Subcategory Display Names
// =================================================================
async function addCategorySubcategoryNames(questions: Question[]): Promise<Question[]> {
  if (questions.length === 0) return questions

  // ユニークなカテゴリー・サブカテゴリーIDを取得
  const uniqueSubcategoryIds = [...new Set(questions.map(q => q.subcategory).filter(Boolean))]
  const uniqueCategoryIds = [...new Set(questions.map(q => q.category).filter(Boolean))]

  // サブカテゴリー名を取得
  const subcategoryNameMap = new Map<string, string>()
  if (uniqueSubcategoryIds.length > 0) {
    const { data: subcategories } = await supabaseAdmin
      .from('subcategories')
      .select('subcategory_id, name')
      .in('subcategory_id', uniqueSubcategoryIds)

    subcategories?.forEach(sc => {
      subcategoryNameMap.set(sc.subcategory_id, sc.name)
    })
  }

  // カテゴリー名を取得
  const categoryNameMap = new Map<string, string>()
  if (uniqueCategoryIds.length > 0) {
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('category_id, name')
      .in('category_id', uniqueCategoryIds)

    categories?.forEach(cat => {
      categoryNameMap.set(cat.category_id, cat.name)
    })
  }

  // 日本語名を付与
  return questions.map(q => ({
    ...q,
    category_name: categoryNameMap.get(q.category) || q.category,
    subcategory_name: subcategoryNameMap.get(q.subcategory) || q.subcategory
  }))
}