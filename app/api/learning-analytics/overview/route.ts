import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserLearningStreak } from '@/lib/supabase-learning'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || '30d'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Calculate date range
    const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : period === 'all' ? 365 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Get user XP stats (RLS disabled for testing)
    const { data: userStats, error: userStatsError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('User stats query result:', { userStats, userStatsError })

    // Get learning streak
    let studyStreak = 0
    try {
      studyStreak = await getUserLearningStreak(userId)
    } catch (error) {
      console.warn('Could not get learning streak:', error)
      studyStreak = 0
    }

    // Get quiz sessions for the period
    const { data: quizSessions, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    console.log('Quiz sessions query result:', { quizSessions: quizSessions?.length, quizError })

    // Get course completions for the period
    const { data: courseCompletions } = await supabaseAdmin
      .from('course_session_completions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    // Calculate metrics
    const totalQuizSessions = quizSessions?.length || 0
    const totalCourseCompletions = courseCompletions?.length || 0
    
    const averageAccuracy = quizSessions && quizSessions.length > 0
      ? quizSessions.reduce((sum, session) => sum + (session.accuracy_rate || 0), 0) / quizSessions.length
      : 0

    // Calculate total study time from sessions
    const totalStudyTimeMinutes = (quizSessions || []).reduce((total, session) => {
      if (session.session_start_time && session.session_end_time) {
        const duration = (new Date(session.session_end_time).getTime() - new Date(session.session_start_time).getTime()) / (1000 * 60)
        return total + duration
      }
      return total + 15 // Default quiz session duration
    }, 0) + (courseCompletions || []).reduce((total, _completion) => {
      // Estimate 10 minutes per course session
      return total + 10
    }, 0)

    // Get daily XP progress for charts
    const { data: dailyXP } = await supabaseAdmin
      .from('daily_xp_records')
      .select('date, quiz_xp_earned, course_xp_earned')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    const dailyXPProgress = (dailyXP || []).map(record => ({
      date: record.date,
      xp: (record.quiz_xp_earned || 0) + (record.course_xp_earned || 0)
    }))

    // Get category progress
    const { data: categoryStats } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('category_id, total_xp, quiz_average_accuracy')
      .eq('user_id', userId)
      .order('total_xp', { ascending: false })

    const categoryProgress = (categoryStats || []).map(stat => ({
      category: stat.category_id,
      progress: Math.min(100, Math.round((stat.total_xp || 0) / 500 * 100)) // 500 XP = 100%
    }))

    // Get accuracy trend
    const accuracyTrend = (quizSessions || [])
      .slice(0, 10) // Last 10 sessions
      .reverse()
      .map((session, _index) => ({
        date: session.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        accuracy: session.accuracy_rate || 0
      }))

    const response = {
      userId,
      period,
      metrics: {
        totalXP: userStats?.total_xp || 0,
        studyStreak,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        totalStudyTime: Math.round(totalStudyTimeMinutes),
        courseCompletions: totalCourseCompletions,
        quizSessionsCompleted: totalQuizSessions
      },
      charts: {
        dailyXPProgress,
        categoryProgress,
        accuracyTrend
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching learning analytics overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}