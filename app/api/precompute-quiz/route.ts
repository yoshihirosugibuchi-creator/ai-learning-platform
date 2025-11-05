import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Precomputed Quiz Generation Engine API
// Purpose: Generate pre-calculated question sets for instant quiz starts
// Called from: Quiz completion flow, Settings changes, Background jobs

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Precompute Quiz Engine] Starting generation...')
    
    // === Step 1: Authentication & Authorization ===
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
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    // === Step 2: Parse Request Body ===
    const body = await request.json()
    const { 
      quiz_types,           // ['business-ai', 'self-personalized', 'review'] or 'all'
      context,              // Optional: quiz completion context
      force_regenerate      // Optional: force regeneration even if sets exist
    } = body

    console.log('📋 [Precompute] Request details:', {
      userId: user.id,
      quizTypes: quiz_types,
      forceRegenerate: force_regenerate
    })

    // === Step 3: Determine Quiz Types to Generate ===
    let targetQuizTypes: string[] = []
    
    if (quiz_types === 'all') {
      targetQuizTypes = ['business-ai', 'self-personalized', 'review']
    } else if (Array.isArray(quiz_types)) {
      targetQuizTypes = quiz_types.filter(type => 
        ['business-ai', 'self-personalized', 'review'].includes(type)
      )
    } else {
      return NextResponse.json(
        { error: 'Invalid quiz_types parameter' },
        { status: 400 }
      )
    }

    console.log(`🎯 [Precompute] Generating sets for: ${targetQuizTypes.join(', ')}`)

    // === Step 4: Execute Generation for Each Quiz Type ===
    const generationResults = await Promise.allSettled(
      targetQuizTypes.map(async (quizType) => {
        try {
          switch (quizType) {
            case 'business-ai':
              return await generateBusinessAISet(user.id, context, force_regenerate)
            
            case 'self-personalized':
              return await generateSelfPersonalizedSet(user.id, context, force_regenerate)
            
            case 'review':
              return await generateReviewSet(user.id, context, force_regenerate)
            
            default:
              throw new Error(`Unsupported quiz type: ${quizType}`)
          }
        } catch (error) {
          console.error(`❌ [Precompute] ${quizType} generation failed:`, error)
          throw error
        }
      })
    )

    // === Step 5: Process Results ===
    const results = generationResults.map((result, index) => ({
      quiz_type: targetQuizTypes[index],
      status: result.status,
      ...(result.status === 'fulfilled' 
        ? { data: result.value } 
        : { error: result.reason?.message || 'Unknown error' }
      )
    }))

    const successCount = results.filter(r => r.status === 'fulfilled').length
    const failureCount = results.filter(r => r.status === 'rejected').length

    console.log(`✅ [Precompute] Generation completed: ${successCount} success, ${failureCount} failures`)

    // === Step 6: Cleanup Expired Sets ===
    try {
      const { data: cleanupResult } = await supabaseAdmin
        .rpc('cleanup_expired_precomputed_sets')
      
      console.log(`🧹 [Precompute] Cleaned up ${cleanupResult || 0} expired sets`)
    } catch (cleanupError) {
      console.warn('⚠️ [Precompute] Cleanup warning (non-critical):', cleanupError)
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: targetQuizTypes.length,
        successful: successCount,
        failed: failureCount,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ [Precompute] Fatal error:', error)
    return NextResponse.json(
      { 
        error: 'Precomputation engine failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// =================================================================
// Business-AI Quiz Set Generation
// =================================================================
async function generateBusinessAISet(
  userId: string, 
  _context: Record<string, unknown> = {}, 
  forceRegenerate: boolean = false
) {
  console.log('🎯 [Business-AI] Starting generation...')

  // Check existing sets
  if (!forceRegenerate) {
    const { data: existingSets } = await supabaseAdmin
      .from('precomputed_quiz_sets')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('quiz_type', 'business-ai')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existingSets && existingSets.length > 0) {
      console.log('ℹ️ [Business-AI] Valid sets exist, skipping generation')
      return { skipped: true, reason: 'Valid sets already exist' }
    }
  }

  // Get user preferences and selected categories
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('learning_goals, selected_categories, selected_industry_categories')
    .eq('id', userId)
    .single()

  // Get user's recent accuracy for all main categories
  const { data: recentAccuracy } = await supabaseAdmin
    .from('user_category_xp_stats_v2')
    .select('category_id, quiz_average_accuracy, quiz_sessions_completed')
    .eq('user_id', userId)
    .gt('quiz_sessions_completed', 0)

  // Get available business questions (main categories only)
  const { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select(`
      id, category_id, subcategory_id, difficulty,
      categories!inner(type)
    `)
    .eq('categories.type', 'main')  // Business main categories only
    .eq('is_deleted', false)
    .limit(500)

  if (!questions || questions.length < 10) {
    throw new Error('Insufficient business questions available')
  }

  // Apply focus category weights
  const selectedCategories = [
    ...(userProfile?.selected_categories ? (Array.isArray(userProfile.selected_categories) ? userProfile.selected_categories : []) : []),
    ...(userProfile?.selected_industry_categories ? (Array.isArray(userProfile.selected_industry_categories) ? userProfile.selected_industry_categories : []) : [])
  ]
  const weightedQuestions = questions.map(q => ({
    ...q,
    weight: selectedCategories.includes(q.category_id) ? 1.5 : 1.0
  }))

  // Generate difficulty distribution based on recent accuracy
  const avgAccuracy = recentAccuracy && recentAccuracy.length > 0 
    ? recentAccuracy.reduce((sum, cat) => sum + (cat.quiz_average_accuracy || 0), 0) / recentAccuracy.length
    : 0.7

  let distribution: Record<string, number>
  if (avgAccuracy >= 0.8) {
    distribution = { basic: 2, intermediate: 4, advanced: 3, expert: 1 }
  } else if (avgAccuracy >= 0.6) {
    distribution = { basic: 3, intermediate: 4, advanced: 2, expert: 1 }
  } else {
    distribution = { basic: 5, intermediate: 3, advanced: 2, expert: 0 }
  }

  // Select optimized questions (3 sets of 10 questions each)
  const questionSets = []
  for (let setIndex = 0; setIndex < 3; setIndex++) {
    const selectedQuestions = selectQuestionsByDistribution(weightedQuestions, distribution)
    questionSets.push({
      question_ids: selectedQuestions.map(q => q.id),
      analysis_data: {
        avg_accuracy: avgAccuracy,
        distribution,
        focus_categories: selectedCategories,
        generation_method: 'business-ai-optimized',
        set_index: setIndex
      }
    })
  }

  // Save to database
  const { error: saveError } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .insert(questionSets.map(set => ({
      user_id: userId,
      quiz_type: 'business-ai' as const,
      question_ids: set.question_ids,
      analysis_data: set.analysis_data,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
    })))

  if (saveError) {
    throw new Error(`Failed to save business-AI sets: ${saveError.message}`)
  }

  console.log(`✅ [Business-AI] Generated ${questionSets.length} sets successfully`)
  return { 
    generated: true,
    sets_count: questionSets.length,
    questions_per_set: 10,
    distribution
  }
}

// =================================================================
// Self-Personalized Quiz Set Generation  
// =================================================================
async function generateSelfPersonalizedSet(
  userId: string,
  _context: Record<string, unknown> = {},
  forceRegenerate: boolean = false
) {
  console.log('🎨 [Self-Personalized] Starting generation...')

  // Get user's quiz settings from learning_goals and selected categories
  const { data: userSettings } = await supabaseAdmin
    .from('users')
    .select('learning_goals, selected_categories, selected_industry_categories')
    .eq('id', userId)
    .single()

  const hasCategories = userSettings?.selected_categories || userSettings?.selected_industry_categories
  if (!hasCategories) {
    console.log('ℹ️ [Self-Personalized] Categories not configured, skipping')
    return { skipped: true, reason: 'Categories not configured' }
  }

  // Create a simulated settings object for compatibility
  const settings = {
    configured: true,
    basic_categories: Array.isArray(userSettings?.selected_categories) ? userSettings.selected_categories : [],
    industry_categories: Array.isArray(userSettings?.selected_industry_categories) ? userSettings.selected_industry_categories : [],
    industry_subcategories: [],
    learning_goals: userSettings?.learning_goals,
    difficulty_preference: 'mixed',
    learning_pace: 'normal'
  }

  // Calculate settings hash for change detection
  const settingsHash = calculateSettingsHash(settings)

  // Check if existing sets match current settings
  if (!forceRegenerate) {
    const { data: existingSets } = await supabaseAdmin
      .from('precomputed_quiz_sets')
      .select('id, user_settings_hash')
      .eq('user_id', userId)
      .eq('quiz_type', 'self-personalized')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existingSets?.[0]?.user_settings_hash === settingsHash) {
      console.log('ℹ️ [Self-Personalized] Settings unchanged, skipping generation')
      return { skipped: true, reason: 'Settings unchanged' }
    }

    // Settings changed - delete old sets
    if (existingSets && existingSets.length > 0) {
      await supabaseAdmin
        .from('precomputed_quiz_sets')
        .delete()
        .eq('user_id', userId)
        .eq('quiz_type', 'self-personalized')
    }
  }

  // Get questions matching user's selected categories
  const selectedCategories: string[] = []
  
  // Extract categories with proper type checking
  if (Array.isArray(settings.basic_categories)) {
    selectedCategories.push(...settings.basic_categories.filter((cat): cat is string => typeof cat === 'string' && Boolean(cat)))
  }
  
  if (Array.isArray(settings.industry_categories)) {
    selectedCategories.push(...settings.industry_categories.filter((cat): cat is string => typeof cat === 'string' && Boolean(cat)))
  }
  
  if (Array.isArray(settings.industry_subcategories)) {
    const subcats = settings.industry_subcategories.filter(item => typeof item === 'string' && Boolean(item)) as string[]
    selectedCategories.push(...subcats)
  }

  if (selectedCategories.length === 0) {
    throw new Error('No categories selected in user settings')
  }

  const { data: questions } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, category_id, subcategory_id, difficulty')
    .in('category_id', selectedCategories)
    .eq('is_deleted', false)
    .limit(300)

  if (!questions || questions.length < 10) {
    throw new Error('Insufficient questions for selected categories')
  }

  // Apply learning goals and difficulty preferences
  const optimizedQuestions = applyPersonalizationSettings(questions, settings)

  // Generate 2 sets of 10 questions each
  const questionSets = []
  for (let setIndex = 0; setIndex < 2; setIndex++) {
    const selectedQuestions = selectRandomizedSet(optimizedQuestions, 10)
    questionSets.push({
      question_ids: selectedQuestions.map(q => q.id),
      analysis_data: {
        settings_hash: settingsHash,
        selected_categories: selectedCategories,
        learning_goals: settings.learning_goals,
        difficulty_preference: settings.difficulty_preference,
        generation_method: 'self-personalized',
        set_index: setIndex
      }
    })
  }

  // Save to database
  const { error: saveError } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .insert(questionSets.map(set => ({
      user_id: userId,
      quiz_type: 'self-personalized' as const,
      question_ids: set.question_ids,
      analysis_data: set.analysis_data,
      user_settings_hash: settingsHash,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    })))

  if (saveError) {
    throw new Error(`Failed to save self-personalized sets: ${saveError.message}`)
  }

  console.log(`✅ [Self-Personalized] Generated ${questionSets.length} sets successfully`)
  return {
    generated: true,
    sets_count: questionSets.length,
    settings_hash: settingsHash,
    categories_count: selectedCategories.length
  }
}

// =================================================================
// Review Quiz Set Generation
// =================================================================
async function generateReviewSet(
  userId: string,
  _context: Record<string, unknown> = {},
  _forceRegenerate: boolean = false
) {
  console.log('🔄 [Review] Starting generation...')

  // Get review target questions (questions that need review)
  const { data: reviewAnswers } = await supabaseAdmin
    .from('quiz_answers')
    .select(`
      question_id,
      is_correct,
      max_hint_level,
      confidence_level,
      time_spent
    `)
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    .order('created_at', { ascending: false })
    .limit(200)

  if (!reviewAnswers || reviewAnswers.length === 0) {
    console.log('ℹ️ [Review] No recent answers found, skipping generation')
    return { skipped: true, reason: 'No recent quiz activity' }
  }

  // Filter only quiz questions (numeric question_ids) and convert to numbers
  const numericQuestionIds = reviewAnswers
    .map(a => a.question_id)
    .filter(id => /^\d+$/.test(id)) // Only numeric strings
    .map(id => parseInt(id, 10))

  if (numericQuestionIds.length === 0) {
    console.log('ℹ️ [Review] No quiz questions found in recent answers (only course questions), skipping generation')
    return { skipped: true, reason: 'No quiz questions in recent activity' }
  }

  // Get question time limits for quiz questions only
  const { data: questionTimeData } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, time_limit')
    .in('id', numericQuestionIds)

  // Create a map for quick time limit lookup
  const timeLimitMap = new Map<number, number | null>()
  questionTimeData?.forEach(q => {
    timeLimitMap.set(q.id, q.time_limit)
  })

  // Group answers by question_id to find latest answer for each question
  const latestAnswerMap = new Map<number, typeof reviewAnswers[0]>()
  
  reviewAnswers.forEach(answer => {
    // Only process quiz questions (numeric question_ids)
    if (!/^\d+$/.test(answer.question_id)) {
      return // Skip course questions
    }
    
    const questionId = parseInt(answer.question_id, 10)
    
    // Since answers are ordered by created_at DESC, the first occurrence is the latest
    if (!latestAnswerMap.has(questionId)) {
      latestAnswerMap.set(questionId, answer)
    }
  })
  
  console.log(`🔍 [Review] Found latest answers for ${latestAnswerMap.size} unique questions`)
  
  // Identify questions needing review based on LATEST answer only
  const reviewQuestionIds = new Set<number>()
  
  latestAnswerMap.forEach((latestAnswer, questionId) => {
    const timeLimit = timeLimitMap.get(questionId)
    
    const needsReview = 
      !latestAnswer.is_correct ||                                    // Incorrect answers
      (latestAnswer.max_hint_level && latestAnswer.max_hint_level >= 2) || // Used hints level 2+
      (latestAnswer.confidence_level && latestAnswer.confidence_level <= 2) || // Low confidence
      (latestAnswer.time_spent && timeLimit && 
       latestAnswer.time_spent > timeLimit * 0.8) // Slow response (80% of time limit)
    
    if (needsReview) {
      console.log(`🔍 [Review] Question ${questionId} needs review (latest answer):`, {
        is_correct: latestAnswer.is_correct,
        max_hint_level: latestAnswer.max_hint_level,
        confidence_level: latestAnswer.confidence_level,
        time_spent: latestAnswer.time_spent,
        time_limit: timeLimit
      })
      reviewQuestionIds.add(questionId)
    } else {
      console.log(`✅ [Review] Question ${questionId} mastered (latest answer correct)`)
    }
  })

  if (reviewQuestionIds.size < 5) {
    console.log('ℹ️ [Review] Insufficient review targets, skipping generation')
    return { skipped: true, reason: 'Insufficient review targets' }
  }

  // Get full question details
  const { data: reviewQuestions } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, category_id, subcategory_id, difficulty')
    .in('id', Array.from(reviewQuestionIds))
    .eq('is_deleted', false)

  if (!reviewQuestions || reviewQuestions.length < 5) {
    throw new Error('Review questions not found in database')
  }

  // Apply forgetting curve optimization (prioritize by time since last seen)
  const optimizedQuestions = reviewQuestions.sort(() => Math.random() - 0.5) // Simple randomization

  // Generate 2 sets of up to 10 questions each
  const setsToGenerate = Math.min(2, Math.ceil(reviewQuestions.length / 10))
  const questionSets = []
  
  for (let setIndex = 0; setIndex < setsToGenerate; setIndex++) {
    const startIndex = setIndex * 10
    const endIndex = Math.min(startIndex + 10, optimizedQuestions.length)
    const setQuestions = optimizedQuestions.slice(startIndex, endIndex)
    
    questionSets.push({
      question_ids: setQuestions.map(q => q.id),
      analysis_data: {
        review_criteria: ['incorrect', 'hint_used', 'low_confidence', 'slow_response'],
        total_review_targets: reviewQuestionIds.size,
        generation_method: 'review-optimized',
        set_index: setIndex
      }
    })
  }

  // Save to database
  const { error: saveError } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .insert(questionSets.map(set => ({
      user_id: userId,
      quiz_type: 'review' as const,
      question_ids: set.question_ids,
      analysis_data: set.analysis_data,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    })))

  if (saveError) {
    throw new Error(`Failed to save review sets: ${saveError.message}`)
  }

  console.log(`✅ [Review] Generated ${questionSets.length} sets successfully`)
  return {
    generated: true,
    sets_count: questionSets.length,
    total_review_targets: reviewQuestionIds.size
  }
}

// =================================================================
// Helper Functions
// =================================================================

function calculateSettingsHash(settings: Record<string, unknown>): string {
  const keySettings = {
    basic_categories: settings.basic_categories || [],
    industry_categories: settings.industry_categories || [],
    industry_subcategories: settings.industry_subcategories || [],
    learning_goals: settings.learning_goals,
    difficulty_preference: settings.difficulty_preference,
    learning_pace: settings.learning_pace
  }
  
  return Buffer.from(JSON.stringify(keySettings)).toString('base64').slice(0, 20)
}

interface QuestionForSelection {
  id: number
  difficulty: string | null
  category_id: string
  subcategory_id: string | null
}

function selectQuestionsByDistribution(
  questions: QuestionForSelection[], 
  distribution: Record<string, number>
): QuestionForSelection[] {
  const selected: QuestionForSelection[] = []
  const availableByDifficulty = questions.reduce((acc, q) => {
    const difficulty = q.difficulty || 'basic'
    if (!acc[difficulty]) acc[difficulty] = []
    acc[difficulty].push(q)
    return acc
  }, {} as Record<string, QuestionForSelection[]>)

  Object.entries(distribution).forEach(([difficulty, count]) => {
    const available = availableByDifficulty[difficulty] || []
    const shuffled = available.sort(() => Math.random() - 0.5)
    selected.push(...shuffled.slice(0, count))
  })

  // If we don't have enough questions, fill with random
  while (selected.length < 10 && selected.length < questions.length) {
    const remaining = questions.filter(q => !selected.some(s => s.id === q.id))
    if (remaining.length === 0) break
    
    const randomQuestion = remaining[Math.floor(Math.random() * remaining.length)]
    selected.push(randomQuestion)
  }

  return selected.slice(0, 10)
}

function applyPersonalizationSettings(questions: QuestionForSelection[], _settings: Record<string, unknown>): QuestionForSelection[] {
  // Apply learning goals and difficulty preferences
  return questions.map(q => ({
    ...q,
    weight: 1.0 // Simple implementation - can be enhanced
  })) as QuestionForSelection[]
}

function selectRandomizedSet(questions: QuestionForSelection[], count: number): QuestionForSelection[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}