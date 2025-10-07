import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, sessionId, eventType, data } = body

    if (!userId || !sessionId || !eventType) {
      return NextResponse.json(
        { error: 'userId, sessionId, and eventType are required' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Update or create today's analytics summary
    const { data: existingSummary } = await supabaseAdmin
      .from('learning_analytics_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('calculation_date', today)
      .single()

    let summaryUpdate: Partial<{
      total_study_time_minutes: number
      session_count: number
      overall_accuracy: number
      quiz_accuracy: number
      course_completion_rate: number
      updated_at: string
    }> = {}

    if (eventType === 'quiz_completion') {
      const sessionDuration = data.duration || 15 // minutes
      const accuracy = data.accuracy || 0

      summaryUpdate = {
        total_study_time_minutes: (existingSummary?.total_study_time_minutes || 0) + sessionDuration,
        session_count: (existingSummary?.session_count || 0) + 1,
        quiz_accuracy: existingSummary 
          ? Math.round(((existingSummary.quiz_accuracy * existingSummary.session_count) + accuracy) / (existingSummary.session_count + 1))
          : accuracy,
        overall_accuracy: existingSummary
          ? Math.round(((existingSummary.overall_accuracy * existingSummary.session_count) + accuracy) / (existingSummary.session_count + 1))
          : accuracy,
        updated_at: new Date().toISOString()
      }
    } else if (eventType === 'course_session_end') {
      const sessionDuration = data.duration || 10 // minutes
      const completionRate = data.completionRate || 100

      summaryUpdate = {
        total_study_time_minutes: (existingSummary?.total_study_time_minutes || 0) + sessionDuration,
        session_count: (existingSummary?.session_count || 0) + 1,
        course_completion_rate: existingSummary
          ? Math.round(((existingSummary.course_completion_rate * existingSummary.session_count) + completionRate) / (existingSummary.session_count + 1))
          : completionRate,
        updated_at: new Date().toISOString()
      }
    }

    if (existingSummary) {
      // Update existing summary
      await supabaseAdmin
        .from('learning_analytics_summary')
        .update(summaryUpdate)
        .eq('id', existingSummary.id)
    } else {
      // Create new summary
      const newSummary = {
        user_id: userId,
        calculation_date: today,
        total_study_time_minutes: summaryUpdate.total_study_time_minutes || 0,
        session_count: 1,
        learning_streak_days: 1,
        overall_accuracy: summaryUpdate.overall_accuracy || 0,
        quiz_accuracy: summaryUpdate.quiz_accuracy || 0,
        course_completion_rate: summaryUpdate.course_completion_rate || 0,
        total_xp: 0,
        xp_growth_rate: 0,
        current_level: 1,
        ...summaryUpdate
      }

      await supabaseAdmin
        .from('learning_analytics_summary')
        .insert(newSummary)
    }

    // Generate new recommendations based on the session
    if (eventType === 'quiz_completion' && data.accuracy < 60) {
      // Low accuracy - recommend review
      const recommendation = {
        user_id: userId,
        recommendation_type: 'immediate',
        priority: 1,
        title: 'Review Recent Quiz',
        description: `Quiz completed with ${data.accuracy}% accuracy. Consider reviewing the topics.`,
        recommended_content_type: 'quiz',
        recommended_content_id: sessionId,
        reasoning: `Low accuracy (${data.accuracy}%) indicates need for review`,
        confidence_score: 0.8,
        status: 'active'
      }

      await supabaseAdmin
        .from('learning_recommendations')
        .insert(recommendation)
    }

    // Get updated metrics for response
    const { data: updatedSummary } = await supabaseAdmin
      .from('learning_analytics_summary')
      .select('*')
      .eq('user_id', userId)
      .eq('calculation_date', today)
      .single()

    const { data: userStats } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('total_xp, current_level')
      .eq('user_id', userId)
      .single()

    const response = {
      success: true,
      updatedMetrics: {
        totalStudyTime: updatedSummary?.total_study_time_minutes || 0,
        sessionCount: updatedSummary?.session_count || 0,
        overallAccuracy: updatedSummary?.overall_accuracy || 0,
        totalXP: userStats?.total_xp || 0,
        currentLevel: userStats?.current_level || 1
      },
      newRecommendations: eventType === 'quiz_completion' && data.accuracy < 60
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error updating real-time analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}