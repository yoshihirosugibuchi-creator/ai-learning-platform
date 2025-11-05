/**
 * Category Quiz Initialization API
 * 
 * Purpose: Server-side category quiz initialization with smart selection
 * Method: POST /api/quiz/category-init
 * Authentication: Required (Bearer token)
 * 
 * Replaces client-side smart-random-selection to prevent SUPABASE_SERVICE_ROLE_KEY errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Question } from '@/lib/types'

interface CategoryQuizInitRequest {
  categoryId: string
  difficulties?: string[] // Optional - if not provided or empty, uses all difficulties
  subcategoryId?: string
  questionCount?: number
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body: CategoryQuizInitRequest = await request.json()
    const { categoryId, difficulties, subcategoryId, questionCount = 10 } = body

    // 3. Validate required parameters
    if (!categoryId) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter: categoryId'
        },
        { status: 400 }
      )
    }

    // Handle "ALL" difficulty case - if no difficulties specified or empty array, use all difficulties
    let targetDifficulties = difficulties
    if (!difficulties || !Array.isArray(difficulties) || difficulties.length === 0 || difficulties.includes('ALL')) {
      targetDifficulties = ['basic', 'intermediate', 'advanced', 'expert']
      console.log('🔄 [Category Quiz API] Using ALL difficulties mode')
    }

    console.log('🎯 [Category Quiz API] Initializing quiz:', {
      userId: user.id,
      categoryId,
      originalDifficulties: difficulties,
      targetDifficulties,
      subcategoryId,
      questionCount
    })

    console.log('🔍 [Category Quiz API] Debug - Raw request body:', body)
    console.log('🔍 [Category Quiz API] Debug - Parsed values:', {
      categoryId: `"${categoryId}"`,
      originalDifficulties: difficulties,
      targetDifficulties: targetDifficulties,
      isAllMode: !difficulties || difficulties.length === 0 || difficulties.includes('ALL'),
      subcategoryId: subcategoryId || 'undefined'
    })

    // 4. Get questions from database using server-side logic
    const startTime = performance.now()
    
    console.log('🔍 [Category Quiz API] Fetching questions from database...')
    
    // Build the query for questions
    let query = supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('category_id', categoryId)
      .in('difficulty', targetDifficulties as string[])
      .limit(50) // Get more than needed for selection variety

    // Add subcategory filter if specified
    if (subcategoryId) {
      query = query.eq('subcategory_id', subcategoryId)
      console.log('🔍 [Category Quiz API] Added subcategory filter:', subcategoryId)
    }

    console.log('🔍 [Category Quiz API] Final query parameters:', {
      category_id: categoryId,
      original_difficulties: difficulties,
      target_difficulties: targetDifficulties,
      subcategory_id: subcategoryId || 'none'
    })

    const { data: questionsData, error: questionsError } = await query

    console.log('🔍 [Category Quiz API] Database response:', {
      questionsFound: questionsData?.length || 0,
      error: questionsError?.message || 'none',
      firstQuestionSample: questionsData?.[0] ? {
        id: questionsData[0].id,
        category_id: questionsData[0].category_id,
        difficulty: questionsData[0].difficulty
      } : 'none'
    })

    if (questionsError) {
      console.error('❌ [Category Quiz API] Database error:', questionsError)
      throw new Error(`Database query failed: ${questionsError.message}`)
    }

    if (!questionsData || questionsData.length === 0) {
      console.log('⚠️ [Category Quiz API] No questions found for criteria')
      return NextResponse.json(
        { 
          error: 'No questions available',
          details: `No questions found for category ${categoryId} with difficulties: ${(difficulties || []).join(', ')}`
        },
        { status: 404 }
      )
    }

    console.log(`📋 [Category Quiz API] Found ${questionsData.length} questions, selecting ${questionCount}...`)

    // 5. Simple random selection (fallback approach)
    const shuffledQuestions = [...questionsData].sort(() => Math.random() - 0.5)
    const selectedQuestions = shuffledQuestions.slice(0, questionCount)

    // 6. Convert to Question format
    const questions: Question[] = selectedQuestions.map(q => ({
      id: q.id,
      category: q.category_id,
      subcategory: q.subcategory_id || '',
      difficulty: q.difficulty || 'basic',
      question: q.question,
      options: [q.option1, q.option2, q.option3, q.option4],
      correct: q.correct_answer, // Already 0-based in database
      explanation: q.explanation || '',
      timeLimit: q.time_limit || 60,
      relatedTopics: [],
      source: null
    }))

    const duration = performance.now() - startTime

    console.log(`✅ [Category Quiz API] Completed: ${questions.length} questions selected in ${duration.toFixed(1)}ms`)

    // 7. Return success response
    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        method: 'simple_random',
        performance_ms: Math.round(duration),
        selection_metadata: {
          total_available: questionsData.length,
          selected_count: questions.length,
          selection_method: 'server_side_random'
        }
      }
    })

  } catch (error) {
    console.error('❌ [Category Quiz API] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize category quiz',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Validation endpoint (GET method) - Simple server-side validation
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const difficultiesParam = searchParams.get('difficulties')

    if (!categoryId || !difficultiesParam) {
      return NextResponse.json(
        { 
          error: 'Missing parameters',
          required: ['categoryId', 'difficulties']
        },
        { status: 400 }
      )
    }

    let difficulties = difficultiesParam.split(',')
    
    // Handle "ALL" difficulty case
    if (!difficulties || difficulties.length === 0 || difficulties.includes('ALL')) {
      difficulties = ['basic', 'intermediate', 'advanced', 'expert']
    }

    // Simple validation using direct database query
    const { data: questionCount, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('id', { count: 'exact' })
      .eq('category_id', categoryId)
      .in('difficulty', difficulties)

    if (error) {
      throw new Error(`Validation query failed: ${error.message}`)
    }

    const availableCount = questionCount?.length || 0
    const isValid = availableCount >= 10

    return NextResponse.json({
      success: true,
      validation: {
        valid: isValid,
        available_count: availableCount,
        message: isValid ? 'Sufficient questions available' : 'Insufficient questions for quiz',
        recommendations: !isValid ? ['Try different difficulty levels', 'Select different category'] : []
      }
    })

  } catch (error) {
    console.error('❌ [Category Quiz API] Validation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}