import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { UnifiedLearningAnalysisEngine } from '@/lib/unified-learning-analytics'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      sessionType,
      categoryId,
      subcategoryId,
      skillLevel,
      questionsAttempted = 0,
      questionsCorrect = 0,
      totalTimeSpent = 0,
      averageResponseTime = 0,
      difficultyProgression: _difficultyProgression = [],
      cognitiveLoadSamples: _cognitiveLoadSamples = [],
      flowStateSamples: _flowStateSamples = [],
      completionRate = 0,
      engagementMetrics: _engagementMetrics = {},
      learningOutcomes: _learningOutcomes = []
    } = body

    if (!sessionType || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionType, categoryId' },
        { status: 400 }
      )
    }

    const analyticsEngine = new UnifiedLearningAnalysisEngine(user.id)
    
    // Create proper LearningSessionData from API request
    const currentTime = new Date()
    const sessionStartTime = new Date(currentTime.getTime() - (totalTimeSpent * 1000))
    const sessionData = {
      sessionId: crypto.randomUUID(),
      userId: user.id,
      sessionType: sessionType as 'quiz' | 'course' | 'mixed',
      startTime: sessionStartTime,
      endTime: currentTime,
      content: {
        categoryId: categoryId,
        subcategoryId: subcategoryId || '',
        difficulty: skillLevel as 'basic' | 'intermediate' | 'advanced' | 'expert' || 'intermediate'
      },
      performance: {
        questionsTotal: questionsAttempted || 0,
        questionsCorrect: questionsCorrect || 0,
        accuracyRate: questionsAttempted > 0 ? (questionsCorrect / questionsAttempted) * 100 : 0,
        completionRate: completionRate || 100,
        averageResponseTimeMs: averageResponseTime || 0
      },
      cognitive: {
        loadScore: 0, // Will be calculated
        attentionBreaks: 0,
        flowStateDuration: 0,
        flowStateIndex: 0
      },
      context: {
        timeOfDay: currentTime.toTimeString().slice(0, 5),
        dayOfWeek: currentTime.getDay(),
        deviceType: 'web',
        interruptionCount: 0,
        energyLevelReported: undefined,
        engagementScore: completionRate / 10 || 5
      }
    }
    
    await analyticsEngine.recordLearningSession(sessionData)

    return NextResponse.json(sessionData)
  } catch (error) {
    console.error('Error recording learning session:', error)
    return NextResponse.json(
      { error: 'Failed to record learning session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const days = parseInt(searchParams.get('days') || '30')

    if (sessionId) {
      const { data, error } = await supabase
        .from('unified_learning_session_analytics')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json(data)
    } else {
      const { data, error } = await supabase
        .from('unified_learning_session_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error fetching learning sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch learning sessions' },
      { status: 500 }
    )
  }
}