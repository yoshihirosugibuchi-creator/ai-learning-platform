import { supabaseAdmin } from './supabase-admin'
import { getUserLearningStreak } from './supabase-learning'

// セッションデータの型定義
interface SessionAnalysisData {
  session_start_time: string
  accuracy_rate: number | null
  total_questions: number | null
  correct_answers: number | null
}

// Real-time analytics pipeline for processing learning events
export class LearningAnalyticsPipeline {
  constructor(private userId: string) {}

  // Process quiz completion event
  async onQuizCompleted(sessionData: {
    sessionId: string
    totalQuestions: number
    correctAnswers: number
    accuracy: number
    duration: number // minutes
    categoryId: string
    subcategoryId: string
    difficulty: string
  }) {
    try {
      console.log('📊 Processing quiz completion for user:', this.userId.substring(0, 8) + '...')

      // 1. Update real-time metrics
      await this.updateRealTimeMetrics(sessionData)

      // 2. Analyze session patterns
      const patterns = await this.analyzeSessionPattern(sessionData)

      // 3. Update recommendations
      await this.updateRecommendations(patterns)

      // 4. Check for achievements/milestones
      await this.checkAchievements(sessionData)

      console.log('✅ Quiz completion processing completed')
      return { success: true, patterns }
    } catch (error) {
      console.error('❌ Error processing quiz completion:', error)
      return { success: false, error }
    }
  }

  // Process course session completion
  async onCourseSessionCompleted(sessionData: {
    sessionId: string
    courseId: string
    themeId?: string
    genreId?: string
    completionRate: number
    duration: number
    categoryId: string
    subcategoryId: string
  }) {
    try {
      console.log('📚 Processing course session completion for user:', this.userId.substring(0, 8) + '...')

      await this.updateRealTimeMetrics({
        accuracy: sessionData.completionRate,
        duration: sessionData.duration,
        categoryId: sessionData.categoryId,
        subcategoryId: sessionData.subcategoryId
      })

      console.log('✅ Course session completion processing completed')
      return { success: true }
    } catch (error) {
      console.error('❌ Error processing course session completion:', error)
      return { success: false, error }
    }
  }

  // Update real-time metrics in database
  private async updateRealTimeMetrics(sessionData: {
    accuracy: number
    duration: number
    categoryId: string
    subcategoryId: string
  }) {
    const today = new Date().toISOString().split('T')[0]

    // Get or create today's summary
    const { data: existingSummary } = await supabaseAdmin
      .from('learning_analytics_summary')
      .select('*')
      .eq('user_id', this.userId)
      .eq('calculation_date', today)
      .single()

    const sessionCount = (existingSummary?.session_count || 0) + 1
    const totalStudyTime = (existingSummary?.total_study_time_minutes || 0) + sessionData.duration

    const updatedData = {
      total_study_time_minutes: totalStudyTime,
      session_count: sessionCount,
      average_session_duration: Math.round(totalStudyTime / sessionCount),
      overall_accuracy: existingSummary
        ? Math.round(((existingSummary.overall_accuracy * (sessionCount - 1)) + sessionData.accuracy) / sessionCount)
        : sessionData.accuracy,
      updated_at: new Date().toISOString()
    }

    if (existingSummary) {
      await supabaseAdmin
        .from('learning_analytics_summary')
        .update(updatedData)
        .eq('id', existingSummary.id)
    } else {
      // Get user's current XP for initial summary
      const { data: userStats } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .select('total_xp, current_level')
        .eq('user_id', this.userId)
        .single()

      const newSummary = {
        user_id: this.userId,
        calculation_date: today,
        learning_streak_days: await getUserLearningStreak(this.userId),
        total_xp: userStats?.total_xp || 0,
        current_level: userStats?.current_level || 1,
        ...updatedData
      }

      await supabaseAdmin
        .from('learning_analytics_summary')
        .insert(newSummary)
    }
  }

  // Analyze patterns from the session
  private async analyzeSessionPattern(sessionData: {
    accuracy: number
    duration: number
    categoryId: string
    difficulty: string
  }) {
    // Get recent sessions for pattern analysis
    const { data: recentSessions } = await supabaseAdmin
      .from('quiz_sessions')
      .select('session_start_time, accuracy_rate, total_questions, correct_answers')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    const sessions = recentSessions || []
    const currentHour = new Date().getHours()

    // Analyze performance patterns
    const patterns = {
      recentAccuracyTrend: this.calculateAccuracyTrend(sessions),
      studyTimeConsistency: this.calculateStudyConsistency(sessions.map((s: SessionAnalysisData) => ({created_at: s.session_start_time}))),
      optimalStudyTime: `${currentHour}:00 - ${currentHour + 1}:00`,
      weeklyConsistency: this.calculateStudyConsistency(sessions.map((s: SessionAnalysisData) => ({created_at: s.session_start_time}))) * 100,
      studyStreakQuality: this.calculateAccuracyTrend(sessions) > 70 ? 'excellent' : this.calculateAccuracyTrend(sessions) > 60 ? 'good' : 'needs_improvement',
      optimalStudyHour: currentHour, // Will be refined with more data
      difficultyProgression: sessionData.difficulty,
      categoryFocus: sessionData.categoryId
    }

    return patterns
  }

  // Update recommendations based on patterns
  private async updateRecommendations(patterns: {optimalStudyTime: string, weeklyConsistency: number, studyStreakQuality: string, recentAccuracyTrend: number, studyTimeConsistency: number, categoryFocus: string}) {
    const recommendations = []

    // Low accuracy trend
    if (patterns.recentAccuracyTrend < 60) {
      recommendations.push({
        user_id: this.userId,
        recommendation_type: 'weakness_fix',
        priority: 1,
        title: 'Focus on Accuracy',
        description: 'Your recent accuracy is below 60%. Consider reviewing fundamentals.',
        recommended_content_type: 'quiz',
        recommended_content_id: `review_${patterns.categoryFocus}`,
        reasoning: `Recent accuracy trend: ${patterns.recentAccuracyTrend}%`,
        confidence_score: 0.8,
        status: 'active'
      })
    }

    // Inconsistent study pattern
    if (patterns.studyTimeConsistency < 0.5) {
      recommendations.push({
        user_id: this.userId,
        recommendation_type: 'study_habit',
        priority: 2,
        title: 'Establish Study Routine',
        description: 'Try to study at consistent times for better retention.',
        recommended_content_type: 'course',
        recommended_content_id: 'study_habits_course',
        reasoning: 'Inconsistent study pattern detected',
        confidence_score: 0.6,
        status: 'active'
      })
    }

    // Insert new recommendations
    if (recommendations.length > 0) {
      await supabaseAdmin
        .from('learning_recommendations')
        .insert(recommendations)
    }
  }

  // Check for achievements and milestones
  private async checkAchievements(sessionData: {
    accuracy: number
    totalQuestions: number
    correctAnswers: number
  }) {
    // Perfect score achievement
    if (sessionData.accuracy === 100) {
      console.log('🎉 Perfect score achieved!')
      // Could trigger achievement system here
    }

    // Streak achievements
    const streak = await getUserLearningStreak(this.userId)
    if (streak > 0 && streak % 7 === 0) { // Weekly milestones
      console.log(`🔥 ${streak}-day learning streak achieved!`)
    }
  }

  // Helper methods for pattern analysis
  private calculateAccuracyTrend(sessions: Array<{accuracy_rate: number}>): number {
    if (sessions.length === 0) return 0
    
    const accuracies = sessions.map(s => s.accuracy_rate || 0)
    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
  }

  private calculateStudyConsistency(sessions: Array<{created_at: string}>): number {
    if (sessions.length < 2) return 1

    // Calculate time intervals between sessions
    const intervals = []
    for (let i = 1; i < sessions.length; i++) {
      const interval = new Date(sessions[i-1].created_at).getTime() - 
                      new Date(sessions[i].created_at).getTime()
      intervals.push(interval / (1000 * 60 * 60 * 24)) // Convert to days
    }

    // Calculate consistency (lower variance = higher consistency)
    const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length
    const variance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length
    
    // Return consistency score (0-1, where 1 is most consistent)
    return Math.max(0, 1 - (variance / 7)) // Normalize by week
  }

  // Run daily analytics batch processing
  async runDailyAnalysis() {
    try {
      console.log('🔄 Running daily analysis for user:', this.userId.substring(0, 8) + '...')

      // Update learning streak
      const streak = await getUserLearningStreak(this.userId)
      
      // Update today's summary with latest XP data
      const { data: userStats } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .select('total_xp, current_level')
        .eq('user_id', this.userId)
        .single()

      const today = new Date().toISOString().split('T')[0]
      
      await supabaseAdmin
        .from('learning_analytics_summary')
        .update({
          learning_streak_days: streak,
          total_xp: userStats?.total_xp || 0,
          current_level: userStats?.current_level || 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)
        .eq('calculation_date', today)

      // Clean up expired recommendations
      await supabaseAdmin
        .from('learning_recommendations')
        .delete()
        .eq('user_id', this.userId)
        .lt('expires_at', new Date().toISOString())

      console.log('✅ Daily analysis completed')
    } catch (error) {
      console.error('❌ Error in daily analysis:', error)
    }
  }
}

// Factory function for creating pipeline instances
export function createLearningPipeline(userId: string): LearningAnalyticsPipeline {
  return new LearningAnalyticsPipeline(userId)
}