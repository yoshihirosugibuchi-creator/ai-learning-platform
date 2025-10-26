import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { loadXPSettings } from '@/lib/xp-settings'
import { DATABASE_FALLBACK_SETTINGS } from '@/lib/xp-settings-fallback.generated'

// 型定義
interface QuizSessionData {
  accuracy_rate: number | null
  created_at: string | null
}

interface CategoryStatData {
  category_id: string
  total_xp: number
  quiz_average_accuracy: number | null
  current_level: number | null
  quiz_questions_answered: number | null
  quiz_questions_correct: number | null
  updated_at: string | null
}


interface SessionData {
  session_start_time: string
  session_end_time: string | null
  created_at: string | null
  accuracy_rate: number | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get detailed category breakdown
    const { data: categoryStats } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .order('total_xp', { ascending: false })

    // Enhanced category analysis with progression tracking
    const categoryBreakdown = await Promise.all(
      (categoryStats || []).map(async (stat: CategoryStatData) => {
        // Get recent trend for this category from quiz_answers (正しい設計)
        const { data: categoryAnswers } = await supabaseAdmin
          .from('quiz_answers')
          .select(`
            is_correct, 
            created_at,
            quiz_sessions!inner(user_id)
          `)
          .eq('category_id', stat.category_id)
          .eq('quiz_sessions.user_id', userId)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true })
          .limit(50)

        // Calculate accuracy per day for trend analysis
        const dailyAccuracy: Record<string, {correct: number, total: number}> = {}
        categoryAnswers?.forEach(answer => {
          const date = new Date(answer.created_at || new Date()).toDateString()
          if (!dailyAccuracy[date]) {
            dailyAccuracy[date] = {correct: 0, total: 0}
          }
          dailyAccuracy[date].total++
          if (answer.is_correct) {
            dailyAccuracy[date].correct++
          }
        })

        const categoryTrend = Object.entries(dailyAccuracy)
          .map(([date, stats]) => ({
            accuracy_rate: stats.correct / stats.total,
            created_at: date
          }))
          .slice(-10) // 最新10日分

        // Calculate improvement trend
        const trend = categoryTrend && categoryTrend.length >= 3 ? 
          (() => {
            const recent = categoryTrend.slice(-3).reduce((sum: number, s: QuizSessionData) => sum + (s.accuracy_rate || 0), 0) / 3
            const earlier = categoryTrend.slice(0, 3).reduce((sum: number, s: QuizSessionData) => sum + (s.accuracy_rate || 0), 0) / 3
            return recent - earlier
          })() : 0

        // Determine mastery level with more nuanced calculation (dynamic threshold)
        const baseXP = stat.total_xp || 0
        const accuracyBonus = (stat.quiz_average_accuracy || 0) > 80 ? 1.2 : (stat.quiz_average_accuracy || 0) > 60 ? 1.0 : 0.8
        let masteryThreshold
        try {
          const xpSettings = await loadXPSettings()
          masteryThreshold = xpSettings.level.main_category_threshold
        } catch {
          masteryThreshold = DATABASE_FALLBACK_SETTINGS.level.main_category_threshold
        }
        const masteryLevel = Math.min(100, Math.round((baseXP / masteryThreshold) * 100 * accuracyBonus))

        // Determine skill level
        let skillLevel = 'beginner'
        if (masteryLevel >= 80 && (stat.quiz_average_accuracy || 0) >= 85) skillLevel = 'expert'
        else if (masteryLevel >= 60 && (stat.quiz_average_accuracy || 0) >= 75) skillLevel = 'advanced'
        else if (masteryLevel >= 40 && (stat.quiz_average_accuracy || 0) >= 65) skillLevel = 'intermediate'

        return {
          categoryId: stat.category_id,
          categoryName: stat.category_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          totalXP: baseXP,
          currentLevel: stat.current_level || 1,
          accuracyRate: Math.round((stat.quiz_average_accuracy || 0) * 100) / 100,
          questionsAnswered: stat.quiz_questions_answered || 0,
          questionsCorrect: stat.quiz_questions_correct || 0,
          masteryLevel,
          skillLevel,
          improvementTrend: Math.round(trend * 100) / 100,
          trendDirection: trend > 5 ? 'improving' : trend < -5 ? 'declining' : 'stable',
          lastStudied: stat.updated_at,
          sessionsLast14Days: categoryTrend?.length || 0,
          needsAttention: (stat.quiz_average_accuracy || 0) < 60 || trend < -10
        }
      })
    )

    // Analyze learning patterns from quiz sessions
    const { data: recentSessions } = await supabaseAdmin
      .from('quiz_sessions')
      .select('session_start_time, session_end_time, accuracy_rate, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // Enhanced time pattern analysis
    let totalSessions = 0
    let totalAccuracy = 0
    let optimalHour = 14
    const hourlyPerformance: Record<number, { count: number; totalAccuracy: number; sessions: Array<{ accuracy_rate: number | null; session_start_time: string; session_end_time: string | null; created_at: string | null }> }> = {}
    const dailyConsistency: Record<number, { count: number; totalAccuracy: number }> = {}

    if (recentSessions && recentSessions.length > 0) {
      totalSessions = recentSessions.length
      totalAccuracy = recentSessions.reduce((sum: number, session: SessionData) => sum + (session.accuracy_rate || 0), 0) / totalSessions
      
      // Analyze hourly performance patterns
      recentSessions.forEach((session: SessionData) => {
        const hour = new Date(session.session_start_time).getHours()
        const dayOfWeek = new Date(session.session_start_time).getDay()
        
        if (!hourlyPerformance[hour]) {
          hourlyPerformance[hour] = { count: 0, totalAccuracy: 0, sessions: [] }
        }
        hourlyPerformance[hour].count++
        hourlyPerformance[hour].totalAccuracy += (session.accuracy_rate || 0)
        hourlyPerformance[hour].sessions.push(session)

        if (!dailyConsistency[dayOfWeek]) {
          dailyConsistency[dayOfWeek] = { count: 0, totalAccuracy: 0 }
        }
        dailyConsistency[dayOfWeek].count++
        dailyConsistency[dayOfWeek].totalAccuracy += (session.accuracy_rate || 0)
      })
      
      // Find optimal hour based on performance, not just frequency
      let bestPerformance = 0
      Object.entries(hourlyPerformance).forEach(([hour, data]) => {
        const avgAccuracy = data.totalAccuracy / data.count
        const weightedScore = avgAccuracy * Math.log(data.count + 1) // Weight by frequency
        if (weightedScore > bestPerformance) {
          bestPerformance = weightedScore
          optimalHour = parseInt(hour)
        }
      })
    }

    // Calculate detailed learning patterns
    const hourlyStats = Object.entries(hourlyPerformance).map(([hour, data]) => ({
      hour: parseInt(hour),
      averageAccuracy: data.totalAccuracy / data.count,
      sessionCount: data.count,
      performance: (data.totalAccuracy / data.count) * Math.log(data.count + 1)
    })).sort((a, b) => b.performance - a.performance)

    const dailyStats = Object.entries(dailyConsistency).map(([day, data]) => ({
      dayOfWeek: parseInt(day),
      sessionCount: data.count,
      averageAccuracy: data.totalAccuracy / data.count,
      dayName: ['日', '月', '火', '水', '木', '金', '土'][parseInt(day)]
    }))

    const avgSessionDuration = (recentSessions || []).reduce((sum: number, session: SessionData) => {
      if (session.session_start_time && session.session_end_time) {
        return sum + (new Date(session.session_end_time).getTime() - new Date(session.session_start_time).getTime()) / (1000 * 60)
      }
      return sum + 15
    }, 0) / Math.max(1, (recentSessions || []).length)

    const learningPatterns = {
      optimalStudyTime: `${optimalHour}:00-${Number(optimalHour) + 1}:00`,
      optimalAccuracy: hourlyPerformance[optimalHour] ? (hourlyPerformance[optimalHour].totalAccuracy / hourlyPerformance[optimalHour].count) : 0,
      weeklyConsistency: (totalSessions / 7) * 100, // Convert to percentage
      averageSessionDuration: Math.round(avgSessionDuration),
      hourlyPerformance: hourlyStats.slice(0, 5), // Top 5 performing hours
      dailyConsistency: dailyStats,
      studyStreakQuality: totalAccuracy > 75 ? 'excellent' : totalAccuracy > 60 ? 'good' : 'needs_improvement'
    }

    // Weakness analysis - categories with low performance
    const weaknessAnalysis = categoryBreakdown
      .filter(cat => cat.accuracyRate < 70 && cat.questionsAnswered >= 5)
      .map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        weaknessType: cat.accuracyRate < 50 ? 'critical' : 'moderate',
        currentAccuracy: cat.accuracyRate,
        targetAccuracy: 80,
        questionsToImprove: Math.ceil((80 - cat.accuracyRate) / 10),
        recommendedAction: cat.accuracyRate < 50 
          ? 'Review fundamentals and practice basic concepts'
          : 'Focus on intermediate-level problems'
      }))

    // Get recent wrong answers for targeted recommendations
    const { data: wrongAnswers } = await supabaseAdmin
      .from('quiz_answers')
      .select(`
        question_id,
        category_id,
        subcategory_id,
        difficulty,
        created_at,
        quiz_sessions!inner(user_id)
      `)
      .eq('quiz_sessions.user_id', userId)
      .eq('is_correct', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Enhanced recommendation engine
    const recommendations = []

    // 1. Immediate action recommendations
    if ((wrongAnswers || []).length > 0) {
      recommendations.push({
        type: 'immediate',
        title: 'Recent Mistakes Review',
        description: `Review ${(wrongAnswers || []).length} incorrect answers from this week`,
        priority: 1,
        estimatedTime: Math.max(5, (wrongAnswers || []).length * 2),
        reason: 'Addressing recent mistakes improves retention by 40%',
        confidence: 0.9
      })
    }

    // 2. Pattern-based recommendations
    if (learningPatterns.studyStreakQuality === 'needs_improvement') {
      recommendations.push({
        type: 'study_pattern',
        title: 'Optimize Study Schedule',
        description: `Your best performance is at ${learningPatterns.optimalStudyTime}`,
        priority: 2,
        estimatedTime: 0,
        reason: 'Study timing optimization can improve accuracy by 15%',
        confidence: 0.8
      })
    }

    // 3. Category improvement recommendations
    const priorityCategories = categoryBreakdown
      .filter(cat => cat.needsAttention)
      .sort((a, b) => (b.questionsAnswered - a.questionsAnswered)) // Prioritize by activity
      .slice(0, 3)

    priorityCategories.forEach((category, index) => {
      let actionType = 'review'
      let timeEstimate = 15

      if (category.accuracyRate < 50) {
        actionType = 'fundamental_review'
        timeEstimate = 25
      } else if (category.trendDirection === 'declining') {
        actionType = 'refresher_practice'
        timeEstimate = 20
      }

      recommendations.push({
        type: 'category_improvement',
        title: `${category.skillLevel === 'beginner' ? 'Build foundation in' : 'Strengthen'} ${category.categoryName}`,
        description: `Current: ${category.accuracyRate}% accuracy (${category.trendDirection}). Focus on ${actionType}.`,
        priority: index + 3,
        estimatedTime: timeEstimate,
        categoryId: category.categoryId,
        reason: category.trendDirection === 'declining' ? 
          'Declining performance needs immediate attention' : 
          `Low accuracy (${category.accuracyRate}%) indicates knowledge gaps`,
        confidence: category.questionsAnswered >= 10 ? 0.85 : 0.7
      })
    })

    // 4. Advanced skill development recommendations
    const expertCategories = categoryBreakdown
      .filter(cat => cat.skillLevel === 'expert' || (cat.masteryLevel >= 80 && cat.accuracyRate >= 85))
      .slice(0, 2)

    expertCategories.forEach((category) => {
      recommendations.push({
        type: 'skill_advancement',
        title: `Advanced ${category.categoryName} Practice`,
        description: `You've mastered the basics (${category.accuracyRate}%). Try advanced challenges.`,
        priority: recommendations.length + 1,
        estimatedTime: 20,
        categoryId: category.categoryId,
        reason: 'Mastery achieved - ready for advanced concepts',
        confidence: 0.75
      })
    })

    // 5. Consistency recommendations
    if (learningPatterns.weeklyConsistency < 50) {
      recommendations.push({
        type: 'consistency',
        title: 'Build Study Consistency',
        description: `Aim for daily 15-minute sessions. Current: ${Math.round(learningPatterns.weeklyConsistency)}% weekly consistency.`,
        priority: recommendations.length + 1,
        estimatedTime: 15,
        reason: 'Consistent daily practice improves long-term retention',
        confidence: 0.9
      })
    }

    const response = {
      categoryBreakdown,
      learningPatterns,
      weaknessAnalysis,
      recommendations
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching detailed learning analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}