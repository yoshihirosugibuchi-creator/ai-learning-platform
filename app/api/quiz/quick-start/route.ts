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

    return NextResponse.json({
      success: true,
      questions: result.questions,
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
      correct_answer, explanation, time_limit,
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
    .select('id, question_ids, analysis_data')
    .eq('user_id', userId)
    .eq('quiz_type', quizType)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (!precomputedSets || precomputedSets.length === 0) {
    console.log(`📦 [Precomputed] No valid sets found for ${quizType}, falling back to new user generation`)
    
    // 📝 Note: 事前セット生成はクイズ完了時（XP保存時）に実行されます
    // Quick Start時の生成は重複を避けるため削除
    
    return await handleNewUser(userId, quizType, count)
  }

  const selectedSet = precomputedSets[0]
  
  // Mark set as used
  await supabaseAdmin
    .from('precomputed_quiz_sets')
    .update({ used_at: new Date().toISOString() })
    .eq('id', selectedSet.id)

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
      source: null
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
  // Get basic business questions (main categories) - fallback to all categories if needed
  let { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('is_deleted', false)
    .in('difficulty', ['basic', 'intermediate']) // Easier for new users
    .limit(count * 2)

  // Fallback: If not enough main category questions, get from all categories
  if (!questions || questions.length < count) {
    console.log(`🔄 [Business AI] Insufficient main category questions (${questions?.length || 0}), trying all categories`)
    const { data: allQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('is_deleted', false)
      .in('difficulty', ['basic', 'intermediate'])
      .limit(count * 3)
    
    questions = allQuestions || []
  }

  if (!questions || questions.length < count) {
    console.error(`❌ [Business AI] Still insufficient questions: ${questions?.length || 0} < ${count}`)
    throw new Error(`Insufficient business questions: found ${questions?.length || 0}, need ${count}`)
  }

  // Simple random selection for new users
  const shuffled = questions.sort(() => Math.random() - 0.5)
  const selectedQuestions = shuffled.slice(0, count)
  
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
    source: null
  }))
}

async function generateNewUserSelfPersonalized(userId: string, count: number): Promise<Question[]> {
  // Check if user has configured categories
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('selected_categories, selected_industry_categories')
    .eq('id', userId)
    .single()

  const hasCategories = user?.selected_categories || user?.selected_industry_categories
  if (!hasCategories) {
    // Use default categories for unconfigured users
    return await generateNewUserBusinessAI(userId, count)
  }

  // Use configured categories with proper type casting
  const selectedCategories: string[] = [
    ...(Array.isArray(user.selected_categories) ? user.selected_categories.filter((cat): cat is string => typeof cat === 'string') : []),
    ...(Array.isArray(user.selected_industry_categories) ? user.selected_industry_categories.filter((cat): cat is string => typeof cat === 'string') : [])
  ]

  if (selectedCategories.length === 0) {
    return await generateNewUserBusinessAI(userId, count)
  }

  const { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .in('category_id', selectedCategories)
    .eq('is_deleted', false)
    .limit(count * 2)

  if (!questions || questions.length < count) {
    throw new Error('Insufficient questions for user categories')
  }

  const shuffled = questions.sort(() => Math.random() - 0.5)
  const selectedQuestions = shuffled.slice(0, count)
  
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
    source: null
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
    source: null
  }
}

// =================================================================
// Background Precomputation: Removed to prevent duplicate generation
// =================================================================
// 📝 Note: 事前セット生成はクイズ完了時（XP保存API）に統一されました
// Quick Start APIでの生成は重複を防ぐため削除済み