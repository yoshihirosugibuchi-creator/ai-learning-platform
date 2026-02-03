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
      .select('id, created_at, used_at, expires_at')
      .eq('user_id', userId)
      .eq('quiz_type', 'business-ai')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(5)

    console.log(`🔍 [Business-AI] Checking existing sets (force_regenerate: ${forceRegenerate}):`, {
      found: existingSets?.length || 0,
      sets: existingSets?.map(s => ({
        id: s.id,
        created: s.created_at,
        used: s.used_at,
        expires: s.expires_at
      })) || []
    })

    if (existingSets && existingSets.length > 0) {
      console.log(`ℹ️ [Business-AI] ${existingSets.length} valid sets exist, skipping generation`)
      return { skipped: true, reason: `${existingSets.length} valid sets already exist` }
    }
  }
  
  console.log('🎯 [Business-AI] Proceeding with generation (no valid sets found or force regenerate)')

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

  console.log(`📊 [Business-AI] Available questions by category:`)
  const categoryStats = questions?.reduce((acc, q) => {
    acc[q.category_id] = (acc[q.category_id] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}
  
  Object.entries(categoryStats).forEach(([catId, count]) => {
    console.log(`  ${catId}: ${count} questions`)
  })

  if (!questions || questions.length < 10) {
    throw new Error('Insufficient business questions available')
  }

  // Apply focus category weights (Business-AI uses main categories only)
  const selectedCategories = userProfile?.selected_categories 
    ? (Array.isArray(userProfile.selected_categories) ? userProfile.selected_categories : [])
    : []
  
  console.log(`🎯 [Business-AI] User selected categories:`, selectedCategories)
  
  const weightedQuestions = questions.map(q => ({
    ...q,
    weight: selectedCategories.includes(q.category_id) ? 1.5 : 1.0
  }))
  
  console.log(`⚖️ [Business-AI] Weighted questions by category:`)
  const weightedStats = weightedQuestions.reduce((acc, q) => {
    const key = `${q.category_id} (weight: ${q.weight})`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  Object.entries(weightedStats).forEach(([catInfo, count]) => {
    console.log(`  ${catInfo}: ${count} questions`)
  })

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

  // Select optimized questions (3 sets of 10 questions each with no overlaps)
  const questionSets = []
  const usedQuestionIds = new Set<number>() // 重複防止
  
  for (let setIndex = 0; setIndex < 3; setIndex++) {
    // 未使用問題のみを対象に選択
    const availableQuestions = weightedQuestions.filter(q => !usedQuestionIds.has(q.id))
    
    console.log(`🎯 [Business-AI Set ${setIndex}] Available questions: ${availableQuestions.length}, Used: ${usedQuestionIds.size}`)
    
    if (availableQuestions.length < 10) {
      console.warn(`⚠️ [Business-AI Set ${setIndex}] Insufficient unused questions (${availableQuestions.length}), allowing some reuse`)
      // 十分な問題がない場合は、最近使った問題を除外してリセット
      const recentlyUsed = Array.from(usedQuestionIds).slice(-10) // 直近10問のみ除外
      const questionPool = weightedQuestions.filter(q => !recentlyUsed.includes(q.id))
      const selectedQuestions = selectQuestionsByDistribution(questionPool, distribution)
      
      questionSets.push({
        question_ids: selectedQuestions.map(q => q.id),
        analysis_data: {
          avg_accuracy: avgAccuracy,
          distribution,
          focus_categories: selectedCategories,
          generation_method: 'business-ai-optimized-with-limited-reuse',
          set_index: setIndex,
          available_pool: questionPool.length,
          reuse_strategy: 'recent_exclusion'
        }
      })
      
      // 新しく選択された問題をマーク
      selectedQuestions.forEach(q => usedQuestionIds.add(q.id))
    } else {
      const selectedQuestions = selectQuestionsByDistribution(availableQuestions, distribution)
      
      // 選択された問題のカテゴリー統計
      const selectedCategoryCounts = selectedQuestions.reduce((acc, q) => {
        acc[q.category_id] = (acc[q.category_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log(`📋 [Business-AI Set ${setIndex}] Selected questions by category:`, selectedCategoryCounts)
      
      questionSets.push({
        question_ids: selectedQuestions.map(q => q.id),
        analysis_data: {
          avg_accuracy: avgAccuracy,
          distribution,
          focus_categories: selectedCategories,
          generation_method: 'business-ai-optimized',
          set_index: setIndex,
          available_pool: availableQuestions.length,
          selected_category_counts: selectedCategoryCounts
        }
      })
      
      // 選択された問題を使用済みとしてマーク
      selectedQuestions.forEach(q => usedQuestionIds.add(q.id))
    }
    
    console.log(`✅ [Business-AI Set ${setIndex}] Generated 10 questions, total used: ${usedQuestionIds.size}`)
  }

  // Save to database
  const insertData = questionSets.map(set => ({
    user_id: userId,
    quiz_type: 'business-ai' as const,
    question_ids: set.question_ids,
    analysis_data: set.analysis_data,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
  }))
  
  console.log(`💾 [Business-AI] Saving ${insertData.length} sets to database`)
  insertData.forEach((set, index) => {
    const questionIds = Array.isArray(set.question_ids) ? set.question_ids.slice(0, 3) : []
    console.log(`  Set ${index}: questions=[${questionIds.join(', ')}...], expires=${set.expires_at}`)
  })
  
  const { error: saveError } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .insert(insertData)

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

  // Get user's quiz personalization settings from user_settings table
  const { data: userQuizSettings } = await supabaseAdmin
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('setting_key', 'quiz_personalization')
    .single()

  if (!userQuizSettings?.setting_value) {
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
    console.log('ℹ️ [Self-Personalized] No categories selected, skipping')
    return { skipped: true, reason: 'No categories selected' }
  }

  // Create settings object for hash calculation
  const settings = {
    configured: true,
    learningLevel: quizSettings.learningLevel,
    basicCategories: quizSettings.basicCategories || [],
    industryCategories: quizSettings.industryCategories || [],
    industrySubcategories: quizSettings.industrySubcategories || []
  }

  // Check if valid existing sets are available
  if (!forceRegenerate) {
    const { data: existingSetsData } = await supabaseAdmin
      .from('precomputed_quiz_sets')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_type', 'self-personalized')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1)

    if (existingSetsData && existingSetsData.length > 0) {
      console.log('ℹ️ [Self-Personalized] Valid sets exist, skipping generation')
      return { skipped: true, reason: 'Valid sets exist' }
    }
  }

  // Get questions matching user's selected categories
  const selectedCategories: string[] = []
  
  // Extract categories with proper type checking
  if (Array.isArray(settings.basicCategories)) {
    selectedCategories.push(...settings.basicCategories.filter((cat): cat is string => typeof cat === 'string' && Boolean(cat)))
  }
  
  if (Array.isArray(settings.industryCategories)) {
    selectedCategories.push(...settings.industryCategories.filter((cat): cat is string => typeof cat === 'string' && Boolean(cat)))
  }
  
  if (Array.isArray(settings.industrySubcategories)) {
    const subcats = settings.industrySubcategories.filter(item => typeof item === 'string' && Boolean(item)) as string[]
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

  // Generate 2 sets of 10 questions each with no overlaps
  const questionSets = []
  const usedQuestionIds = new Set<number>() // 重複防止
  
  for (let setIndex = 0; setIndex < 2; setIndex++) {
    // 未使用問題のみを対象に選択
    const availableQuestions = optimizedQuestions.filter(q => !usedQuestionIds.has(q.id))
    
    console.log(`🎯 [Self-Personalized Set ${setIndex}] Available questions: ${availableQuestions.length}, Used: ${usedQuestionIds.size}`)
    
    if (availableQuestions.length < 10) {
      console.warn(`⚠️ [Self-Personalized Set ${setIndex}] Insufficient unused questions (${availableQuestions.length}), using all available`)
      // 十分な問題がない場合は、利用可能な全問題から選択
      const selectedQuestions = selectCategoryBalancedSet(optimizedQuestions, 10)
      
      questionSets.push({
        question_ids: selectedQuestions.map(q => q.id),
        analysis_data: {
          selected_categories: selectedCategories,
          learning_level: settings.learningLevel,
          basic_categories_count: settings.basicCategories.length,
          industry_categories_count: settings.industryCategories.length,
          generation_method: 'self-personalized-with-reuse',
          set_index: setIndex,
          available_pool: optimizedQuestions.length,
          reuse_strategy: 'insufficient_questions'
        }
      })
      
      // 選択された問題をマーク
      selectedQuestions.forEach(q => usedQuestionIds.add(q.id))
    } else {
      const selectedQuestions = selectCategoryBalancedSet(availableQuestions, 10)
      questionSets.push({
        question_ids: selectedQuestions.map(q => q.id),
        analysis_data: {
          selected_categories: selectedCategories,
          learning_level: settings.learningLevel,
          basic_categories_count: settings.basicCategories.length,
          industry_categories_count: settings.industryCategories.length,
          generation_method: 'self-personalized',
          set_index: setIndex,
          available_pool: availableQuestions.length
        }
      })
      
      // 選択された問題を使用済みとしてマーク
      selectedQuestions.forEach(q => usedQuestionIds.add(q.id))
    }
    
    console.log(`✅ [Self-Personalized Set ${setIndex}] Generated 10 questions, total used: ${usedQuestionIds.size}`)
  }

  // Save to database
  const { error: saveError } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .insert(questionSets.map(set => ({
      user_id: userId,
      quiz_type: 'self-personalized' as const,
      question_ids: set.question_ids,
      analysis_data: set.analysis_data,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    })))

  if (saveError) {
    throw new Error(`Failed to save self-personalized sets: ${saveError.message}`)
  }

  console.log(`✅ [Self-Personalized] Generated ${questionSets.length} sets successfully`)
  return {
    generated: true,
    sets_count: questionSets.length,
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

interface QuestionForSelection {
  id: number
  difficulty: string | null
  category_id: string
  subcategory_id: string | null
}

function selectQuestionsByDistribution(
  questions: (QuestionForSelection & { weight: number })[], 
  distribution: Record<string, number>
): (QuestionForSelection & { weight: number })[] {
  const selected: (QuestionForSelection & { weight: number })[] = []
  const availableByDifficulty = questions.reduce((acc, q) => {
    const difficulty = q.difficulty || 'basic'
    if (!acc[difficulty]) acc[difficulty] = []
    acc[difficulty].push(q)
    return acc
  }, {} as Record<string, (QuestionForSelection & { weight: number })[]>)

  console.log(`🎯 [Question Selection] Difficulty distribution:`, distribution)
  console.log(`📊 [Question Selection] Available by difficulty:`, 
    Object.fromEntries(Object.entries(availableByDifficulty).map(([diff, qs]) => [diff, qs.length]))
  )

  Object.entries(distribution).forEach(([difficulty, count]) => {
    const available = availableByDifficulty[difficulty] || []
    
    if (available.length > 0) {
      // カテゴリーバランスを考慮した重み付き選択
      const categoryBalancedSelected = selectQuestionsWithCategoryBalance(available, count)
      selected.push(...categoryBalancedSelected)
      
      console.log(`✅ [${difficulty}] Selected ${categoryBalancedSelected.length} questions (requested: ${count}) with category balance`)
      categoryBalancedSelected.forEach(q => {
        console.log(`  - Question ${q.id} (${q.category_id}) weight: ${q.weight}`)
      })
    } else {
      console.log(`⚠️ [${difficulty}] No questions available (requested: ${count})`)
    }
  })

  // If we don't have enough questions, fill with category-balanced selection
  const remainingNeeded = 10 - selected.length
  if (remainingNeeded > 0) {
    const remaining = questions.filter(q => !selected.some(s => s.id === q.id))
    if (remaining.length > 0) {
      const additionalSelected = selectQuestionsWithCategoryBalance(remaining, remainingNeeded)
      selected.push(...additionalSelected)
      console.log(`🔄 [Fill] Added ${additionalSelected.length} questions with category balance`)
    }
  }

  // ログカテゴリー分布
  const categoryDistribution = selected.reduce((acc, q) => {
    acc[q.category_id] = (acc[q.category_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  console.log(`📊 [Final Selection] Category distribution:`, categoryDistribution)

  return selected.slice(0, 10)
}

// 重み付きランダム選択ヘルパー関数
function selectWeightedQuestions(
  questions: (QuestionForSelection & { weight: number })[],
  count: number
): (QuestionForSelection & { weight: number })[] {
  const selected: (QuestionForSelection & { weight: number })[] = []
  const available = [...questions]
  
  for (let i = 0; i < count && available.length > 0; i++) {
    const totalWeight = available.reduce((sum, q) => sum + q.weight, 0)
    
    if (totalWeight <= 0) {
      // フォールバック: 単純ランダム
      const randomIndex = Math.floor(Math.random() * available.length)
      selected.push(available[randomIndex])
      available.splice(randomIndex, 1)
      continue
    }
    
    let random = Math.random() * totalWeight
    let selectedIndex = 0
    
    for (let j = 0; j < available.length; j++) {
      random -= available[j].weight
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }
    
    selected.push(available[selectedIndex])
    available.splice(selectedIndex, 1)
  }
  
  return selected
}

// カテゴリーバランスを考慮した重み付き選択
function selectQuestionsWithCategoryBalance(
  questions: (QuestionForSelection & { weight: number })[],
  count: number
): (QuestionForSelection & { weight: number })[] {
  if (questions.length === 0) return []
  if (count <= 0) return []
  
  // カテゴリーごとにグループ化
  const byCategory = questions.reduce((acc, q) => {
    if (!acc[q.category_id]) acc[q.category_id] = []
    acc[q.category_id].push(q)
    return acc
  }, {} as Record<string, (QuestionForSelection & { weight: number })[]>)
  
  const categories = Object.keys(byCategory)
  const selected: (QuestionForSelection & { weight: number })[] = []
  
  console.log(`📋 [Category Balance] Distributing ${count} questions across ${categories.length} categories`)
  
  // カテゴリー間で均等分散（ラウンドロビン方式）
  let currentCategoryIndex = 0
  let consecutiveEmptyAttempts = 0
  const maxEmptyAttempts = categories.length // 全カテゴリーチェック後にストップ
  
  for (let i = 0; i < count && selected.length < count; i++) {
    const category = categories[currentCategoryIndex]
    const availableInCategory = byCategory[category]?.filter(q => 
      !selected.some(s => s.id === q.id)
    ) || []
    
    if (availableInCategory.length > 0) {
      // 重み付きランダム選択
      const selectedQuestion = selectWeightedQuestions(availableInCategory, 1)[0]
      if (selectedQuestion) {
        selected.push(selectedQuestion)
        console.log(`  📌 Selected from ${category}: question ${selectedQuestion.id} (weight: ${selectedQuestion.weight})`)
        consecutiveEmptyAttempts = 0 // リセット
      }
    } else {
      console.log(`  ⚠️ No more questions available in ${category}`)
      consecutiveEmptyAttempts++
      
      // 全カテゴリーで問題が枯渇した場合はループを終了
      if (consecutiveEmptyAttempts >= maxEmptyAttempts) {
        console.log(`⚠️ [Business-AI Category Balance] All categories exhausted, selected ${selected.length}/${count} questions`)
        break
      }
    }
    
    // 次のカテゴリーに移動（ラウンドロビン）
    currentCategoryIndex = (currentCategoryIndex + 1) % categories.length
  }
  
  return selected
}

function applyPersonalizationSettings(questions: QuestionForSelection[], settings: Record<string, unknown>): QuestionForSelection[] {
  const learningLevel = settings.learningLevel as string || 'basic'
  
  // Define difficulty hierarchy (user gets questions at their level and above)
  const difficultyLevels = ['basic', 'intermediate', 'advanced', 'expert']
  const userLevelIndex = difficultyLevels.indexOf(learningLevel)
  const allowedDifficulties = difficultyLevels.slice(userLevelIndex >= 0 ? userLevelIndex : 0)
  
  console.log('🎯 [Self-Personalized] Applying difficulty filter:', {
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
  
  console.log('✅ [Self-Personalized] Filtered questions:', {
    original: questions.length,
    filtered: filteredQuestions.length,
    levelCounts: allowedDifficulties.reduce((acc, level) => {
      acc[level] = filteredQuestions.filter(q => (q.difficulty || 'basic') === level).length
      return acc
    }, {} as Record<string, number>)
  })
  
  if (filteredQuestions.length < 10) {
    console.warn(`⚠️ [Self-Personalized] Insufficient questions at level ${learningLevel}+, falling back to include lower levels`)
    // Fallback: include all difficulties if not enough questions at selected level
    return questions.map(q => ({ ...q, weight: 1.0 })) as QuestionForSelection[]
  }
  
  return filteredQuestions.map(q => ({
    ...q,
    weight: 1.0
  })) as QuestionForSelection[]
}

function selectCategoryBalancedSet(questions: QuestionForSelection[], count: number): QuestionForSelection[] {
  if (questions.length === 0) return []
  if (count <= 0) return []
  
  // カテゴリーごとにグループ化
  const byCategory = questions.reduce((acc, q) => {
    if (!acc[q.category_id]) acc[q.category_id] = []
    acc[q.category_id].push(q)
    return acc
  }, {} as Record<string, QuestionForSelection[]>)
  
  const categories = Object.keys(byCategory)
  const selected: QuestionForSelection[] = []
  
  console.log(`📋 [Self-Personalized Category Balance] Distributing ${count} questions across ${categories.length} categories`)
  
  // カテゴリー間で均等分散（ラウンドロビン方式）
  let currentCategoryIndex = 0
  let consecutiveEmptyAttempts = 0
  const maxEmptyAttempts = categories.length // 全カテゴリーチェック後にストップ
  
  for (let i = 0; i < count && selected.length < count; i++) {
    const category = categories[currentCategoryIndex]
    const availableInCategory = byCategory[category]?.filter(q => 
      !selected.some(s => s.id === q.id)
    ) || []
    
    if (availableInCategory.length > 0) {
      // ランダム選択（セルフパーソナライズは重みがない）
      const randomIndex = Math.floor(Math.random() * availableInCategory.length)
      const selectedQuestion = availableInCategory[randomIndex]
      selected.push(selectedQuestion)
      
      console.log(`  📌 Selected from ${category}: question ${selectedQuestion.id}`)
      consecutiveEmptyAttempts = 0 // リセット
    } else {
      console.log(`  ⚠️ No more questions available in ${category}`)
      consecutiveEmptyAttempts++
      
      // 全カテゴリーで問題が枯渇した場合はループを終了
      if (consecutiveEmptyAttempts >= maxEmptyAttempts) {
        console.log(`⚠️ [Self-Personalized Category Balance] All categories exhausted, selected ${selected.length}/${count} questions`)
        break
      }
    }
    
    // 次のカテゴリーに移動（ラウンドロビン）
    currentCategoryIndex = (currentCategoryIndex + 1) % categories.length
  }
  
  // カテゴリー分布ログ
  const categoryDistribution = selected.reduce((acc, q) => {
    acc[q.category_id] = (acc[q.category_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  console.log(`📊 [Self-Personalized Final] Category distribution:`, categoryDistribution)
  
  return selected
}

// Legacy function - kept for potential future use
function _selectRandomizedSet(questions: QuestionForSelection[], count: number): QuestionForSelection[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}