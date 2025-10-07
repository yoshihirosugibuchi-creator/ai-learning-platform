import { supabase } from '@/lib/supabase'
import type { Database } from './database-types-official'

type UnifiedLearningSessionAnalyticsInsert = Database['public']['Tables']['unified_learning_session_analytics']['Insert']
type UserLearningProfile = Database['public']['Tables']['user_learning_profiles']['Row']
type SpacedRepetitionSchedule = Database['public']['Tables']['spaced_repetition_schedule']['Row']

// Flow State Guidance Interface
export interface FlowStateGuidance {
  currentFlow: number
  status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW' | 'POOR'
  recommendedAction: string
  adjustmentSuggestion: string
  continueRecommendation: boolean
}

// Core interfaces for unified learning analysis
export interface LearningSessionData {
  sessionId: string
  userId: string
  sessionType: 'quiz' | 'course' | 'mixed'
  startTime: Date
  endTime: Date
  content: {
    quizSessionId?: string
    courseSessionId?: string
    courseId?: string
    themeId?: string
    genreId?: string
    categoryId: string
    subcategoryId: string
    difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  }
  performance: {
    questionsTotal: number
    questionsCorrect: number
    accuracyRate: number
    completionRate: number
    averageResponseTimeMs: number
  }
  cognitive: {
    loadScore: number
    attentionBreaks: number
    flowStateDuration: number
    flowStateIndex: number
  }
  context: {
    timeOfDay: string
    dayOfWeek: number
    deviceType?: string
    interruptionCount: number
    energyLevelReported?: number
    engagementScore: number
  }
}

export interface PersonalLearningAnalysis {
  timePatterns: {
    optimalHours: number[]
    weeklyPerformance: DayPerformance[]
    fatigueThreshold: number
  }
  forgettingCurve: {
    personalForgettingRate: number
    optimalReviewSchedule: Date[]
    memoryRetentionStrength: number
  }
  cognitiveLoad: {
    currentLoadLevel: number
    loadTolerance: number
    optimalSessionDuration: number
  }
  flowState: {
    currentFlowIndex: number
    optimalDifficultyRange: [number, number]
    engagementLevel: number
  }
}

export interface DayPerformance {
  dayOfWeek: number
  averageAccuracy: number
  averageEngagement: number
  sessionCount: number
}

export interface ForgettingCurveParameters {
  retentionAt24h: number
  retentionAt7d: number
  decayRate: number
  consolidationFactor: number
  optimalReviewIntervals: number[]
}

export interface CognitiveLoadAnalysis {
  currentLoad: number
  trend: 'increasing' | 'decreasing' | 'stable'
  recommendedAction: 'continue' | 'take_break' | 'switch_content'
  timeUntilFatigue: number
}


// Main Unified Learning Analysis Engine
export class UnifiedLearningAnalysisEngine {
  private supabaseClient: typeof supabase | null
  
  constructor(private userId: string) {
    this.supabaseClient = null
  }
  
  private getSupabase() {
    if (!this.supabaseClient) {
      this.supabaseClient = supabase
    }
    return this.supabaseClient
  }

  // Record a learning session for analysis
  async recordLearningSession(sessionData: LearningSessionData): Promise<void> {
    const insertData: UnifiedLearningSessionAnalyticsInsert = {
      user_id: this.userId,
      session_type: sessionData.sessionType,
      session_start_time: sessionData.startTime.toISOString(),
      session_end_time: sessionData.endTime.toISOString(),
      duration_seconds: Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000),
      quiz_session_id: sessionData.content.quizSessionId,
      course_session_id: sessionData.content.courseSessionId,
      course_id: sessionData.content.courseId,
      theme_id: sessionData.content.themeId,
      genre_id: sessionData.content.genreId,
      category_id: sessionData.content.categoryId,
      subcategory_id: sessionData.content.subcategoryId,
      difficulty_level: sessionData.content.difficulty,
      questions_total: sessionData.performance.questionsTotal,
      questions_correct: sessionData.performance.questionsCorrect,
      accuracy_rate: sessionData.performance.accuracyRate,
      completion_rate: sessionData.performance.completionRate,
      average_response_time_ms: sessionData.performance.averageResponseTimeMs,
      cognitive_load_score: sessionData.cognitive.loadScore,
      attention_breaks: sessionData.cognitive.attentionBreaks,
      flow_state_duration: sessionData.cognitive.flowStateDuration,
      flow_state_index: sessionData.cognitive.flowStateIndex,
      time_of_day: sessionData.context.timeOfDay,
      day_of_week: sessionData.context.dayOfWeek,
      device_type: sessionData.context.deviceType,
      interruption_count: sessionData.context.interruptionCount,
      energy_level_reported: sessionData.context.energyLevelReported,
      engagement_score: sessionData.context.engagementScore
    }

    // Use learning_analytics_summary instead of unified_learning_session_analytics
    console.log('Recording learning session via real data aggregation:', insertData)
    
    // Record to existing quiz_sessions or course_session_completions tables
    // and update learning_analytics_summary
    await this.updateAnalyticsSummary(sessionData)

    // Update cognitive load score if not provided
    if (sessionData.cognitive.loadScore === 0) {
      await this.updateSessionCognitiveLoad(sessionData.sessionId)
    }
  }

  // Analyze personal learning patterns
  async analyzePersonalLearningPatterns(): Promise<PersonalLearningAnalysis> {
    // Get time patterns
    const timePatterns = await this.analyzeTimePatterns()
    
    // Get forgetting curve analysis
    const forgettingCurve = await this.analyzeForgettingCurve()
    
    // Get cognitive load analysis
    const cognitiveLoad = await this.analyzeCognitiveLoad()
    
    // Get flow state analysis
    const flowState = await this.analyzeFlowState()

    return {
      timePatterns,
      forgettingCurve,
      cognitiveLoad,
      flowState
    }
  }

  // Get forgetting curve recommendations - based on real data
  async getForgettingCurveRecommendations(): Promise<{
    personalRetentionRate: number
    averageForgettingRate: number
    strongCategories: string[]
    weakCategories: string[]
    totalItemsToReview: number
    optimalReviewFrequency: number
  }> {
    const supabase = await this.getSupabase()
    
    // Get category performance from real data
    const { data: categoryStats } = await supabase
      .from('user_category_xp_stats_v2')
      .select('category_id, quiz_questions_correct, quiz_questions_answered, quiz_average_accuracy')
      .eq('user_id', this.userId)
    
    const strongCategories: string[] = []
    const weakCategories: string[] = []
    
    if (categoryStats) {
      categoryStats.forEach(stat => {
        if (stat.quiz_average_accuracy >= 80) {
          strongCategories.push(stat.category_id)
        } else if (stat.quiz_average_accuracy < 60) {
          weakCategories.push(stat.category_id)
        }
      })
    }
    
    // Calculate retention based on quiz performance over time
    const { data: recentQuizzes } = await supabase
      .from('quiz_answers')
      .select(`
        is_correct, 
        created_at,
        quiz_sessions!inner(user_id)
      `)
      .eq('quiz_sessions.user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    let personalRetentionRate = 70 // default
    if (recentQuizzes && recentQuizzes.length > 0) {
      const correctCount = recentQuizzes.filter(q => q.is_correct).length
      personalRetentionRate = Math.round((correctCount / recentQuizzes.length) * 100)
    }
    
    return {
      personalRetentionRate,
      averageForgettingRate: 0.5,
      strongCategories,
      weakCategories,
      totalItemsToReview: weakCategories.length,
      optimalReviewFrequency: personalRetentionRate >= 80 ? 10 : 5
    }
  }

  // Get cognitive load guidance
  async getCognitiveLoadGuidance(): Promise<CognitiveLoadAnalysis> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .rpc('get_cognitive_load_recommendations', { p_user_id: this.userId })

    if (error) {
      console.error('Failed to get cognitive load guidance:', error)
      return {
        currentLoad: 5.0,
        trend: 'stable',
        recommendedAction: 'continue',
        timeUntilFatigue: 30
      }
    }

    const result = data?.[0]
    return {
      currentLoad: result?.expected_cognitive_load || 5.0,
      trend: 'stable', // Would need additional analysis
      recommendedAction: 'continue',
      timeUntilFatigue: result?.session_duration_minutes || 30
    }
  }


  // Get spaced repetition due items - based on weak performance areas
  async getDueReviews(limit: number = 20): Promise<SpacedRepetitionSchedule[]> {
    const supabase = await this.getSupabase()
    
    // Get questions from weak categories for review
    const { data: weakPerformance } = await supabase
      .from('quiz_answers')
      .select(`
        question_id,
        category_id,
        subcategory_id,
        is_correct,
        created_at,
        quiz_session_id,
        quiz_sessions!inner(user_id)
      `)
      .eq('quiz_sessions.user_id', this.userId)
      .eq('is_correct', false)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (!weakPerformance || weakPerformance.length === 0) {
      return []
    }
    
    // Convert to SpacedRepetitionSchedule format
    return weakPerformance.map((item, index) => ({
      id: `review_${item.question_id}_${Date.now()}`,
      user_id: this.userId,
      content_id: item.question_id,
      content_type: 'quiz_question' as const,
      category_id: item.category_id,
      subcategory_id: item.subcategory_id,
      initial_learning_date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      next_review_date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      mastery_level: 0.3, // Low since it was incorrect
      priority_score: 10 - index, // Higher priority for recent mistakes
      review_count: 1,
      created_at: null,
      difficulty_adjustment: null,
      forgetting_curve_slope: null,
      is_mastered: null,
      last_review_date: null,
      optimal_interval_days: null,
      retention_strength: null,
      scheduled_by: null,
      updated_at: null
    }))
  }

  // Update review schedule after completion
  async updateReviewSchedule(
    contentId: string,
    performanceScore: number,
    responseTimeMs?: number
  ): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .rpc('update_review_schedule', {
        p_user_id: this.userId,
        p_content_id: contentId,
        p_performance_score: performanceScore,
        p_response_time_ms: responseTimeMs
      })

    if (error) {
      console.error('Failed to update review schedule:', error)
      throw new Error(`Failed to update review schedule: ${error.message}`)
    }
  }

  // Add content to spaced repetition
  async addToSpacedRepetition(
    contentType: 'quiz_question' | 'course_material' | 'concept' | 'skill',
    contentId: string,
    categoryId: string,
    subcategoryId: string,
    initialDifficulty: number = 1.0
  ): Promise<string | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .rpc('add_to_spaced_repetition', {
        p_user_id: this.userId,
        p_content_type: contentType,
        p_content_id: contentId,
        p_category_id: categoryId,
        p_subcategory_id: subcategoryId,
        p_initial_difficulty: initialDifficulty
      })

    if (error) {
      console.error('Failed to add to spaced repetition:', error)
      return null
    }

    return data
  }

  // Get user learning profile
  async getUserLearningProfile(): Promise<UserLearningProfile | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', this.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile exists, create default one
        await this.initializeUserProfile()
        return this.getUserLearningProfile()
      }
      console.error('Failed to get user learning profile:', error)
      return null
    }

    return data
  }

  // Initialize user profile with defaults
  async initializeUserProfile(): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .rpc('initialize_user_learning_profile', { p_user_id: this.userId })

    if (error) {
      console.error('Failed to initialize user profile:', error)
    }
  }


  // Record review session for spaced repetition
  async recordReviewSession(
    contentId: string, 
    contentType: string, 
    performance: number, 
    reviewDate: Date = new Date()
  ): Promise<{ id: string; success: boolean; message: string }> {
    try {
      const supabase = await this.getSupabase()
      
      // Record the review in learning_recommendations table
      const { data, error } = await supabase
        .from('learning_recommendations')
        .insert({
          user_id: this.userId,
          recommendation_type: 'review_completed',
          priority: 1,
          title: `Reviewed ${contentType}`,
          description: `Performance: ${performance}%`,
          recommended_content_type: contentType,
          recommended_content_id: contentId,
          reasoning: `Review session completed with ${performance}% performance`,
          confidence_score: performance / 100,
          status: 'completed',
          completed_at: reviewDate.toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error recording review session:', error)
        return {
          id: '',
          success: false,
          message: `Failed to record review session: ${error.message}`
        }
      }
      
      return {
        id: data.id,
        success: true,
        message: 'Review session recorded successfully'
      }
    } catch (error) {
      console.error('Error recording review session:', error)
      return {
        id: '',
        success: false,
        message: 'Failed to record review session'
      }
    }
  }

  // Provide real-time flow state guidance
  async provideFlowStateGuidance(
    currentSessionId: string,
    currentAccuracy: number,
    timeElapsedMinutes: number = 0,
    recentResponseTimes: number[] = [],
    currentDifficulty: string = 'intermediate'
  ): Promise<FlowStateGuidance> {
    const _supabase = supabase
    console.log('Providing flow state guidance:', {
      currentSessionId, currentAccuracy, timeElapsedMinutes, currentDifficulty
    })
    
    // Try to use database function first, fallback to mock implementation
    try {
      const supabase = await this.getSupabase()
    const { data, error } = await supabase
        .rpc('provide_flow_guidance', {
          p_user_id: this.userId,
          p_current_session_id: currentSessionId,
          p_current_accuracy: currentAccuracy,
          p_time_elapsed_minutes: timeElapsedMinutes,
          p_recent_response_times: recentResponseTimes
        })

      if (!error && data?.[0]) {
        const result = data[0]
        return {
          currentFlow: result.current_flow_estimate || currentAccuracy / 100,
          status: (result.flow_status as 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW' | 'POOR') || 'MODERATE',
          recommendedAction: result.recommended_action || 'Continue with current pace',
          adjustmentSuggestion: result.adjustment_suggestion || 'Maintain current difficulty level',
          continueRecommendation: result.continue_recommendation !== false
        }
      }
    } catch (error) {
      console.error('Database flow guidance failed:', error)
    }
    
    // Fallback mock implementation
    let status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW' | 'POOR' = 'MODERATE'
    let recommendedAction = 'Continue with current pace'
    let adjustmentSuggestion = 'Maintain current difficulty level'
    
    if (currentAccuracy >= 90) {
      status = 'EXCELLENT'
      recommendedAction = 'Consider increasing difficulty'
      adjustmentSuggestion = 'Try harder questions for optimal challenge'
    } else if (currentAccuracy >= 75) {
      status = 'GOOD'
    } else if (currentAccuracy >= 60) {
      status = 'MODERATE'
    } else if (currentAccuracy >= 40) {
      status = 'LOW'
      recommendedAction = 'Consider easier content'
      adjustmentSuggestion = 'Focus on foundational concepts'
    } else {
      status = 'POOR'
      recommendedAction = 'Take a break or switch to easier content'
      adjustmentSuggestion = 'Review basic concepts before continuing'
    }

    return {
      currentFlow: currentAccuracy / 100,
      status,
      recommendedAction,
      adjustmentSuggestion,
      continueRecommendation: status !== 'POOR'
    }
  }

  // Update user learning profile from session data
  async updateUserProfileFromSessions(): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .rpc('update_learning_profile_from_sessions', { p_user_id: this.userId })

    if (error) {
      console.error('Failed to update user profile from sessions:', error)
    }
  }

  // Update forgetting curve profile
  async updateForgettingCurveProfile(): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .rpc('update_user_forgetting_profile', { p_user_id: this.userId })

    if (error) {
      console.error('Failed to update forgetting curve profile:', error)
    }
  }

  // Update flow state preferences
  async updateFlowStatePreferences(): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .rpc('update_flow_state_preferences', { p_user_id: this.userId })

    if (error) {
      console.error('Failed to update flow state preferences:', error)
    }
  }

  // Private helper methods
  private async analyzeTimePatternsWithPython() {
    // const _supabaseClient = supabase  // Commented out unused variable
    const { data } = await supabase
      .from('unified_learning_session_analytics')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (!data?.length) {
      return {
        optimalHours: [9, 10, 14, 15],
        weeklyPerformance: [],
        fatigueThreshold: 60
      }
    }

    // 朝と夜のパフォーマンスデータを抽出
    const morningAccuracies: number[] = []
    const eveningAccuracies: number[] = []
    const dailyPerformance = new Map<number, { total: number, correct: number, count: number }>()

    data.forEach(session => {
      const hour = new Date(session.session_start_time).getHours()
      const day = new Date(session.session_start_time).getDay()
      const accuracy = session.accuracy_rate || 0
      
      // 朝 (6-12時) vs 夜 (18-24時) の分類
      if (hour >= 6 && hour < 12) {
        morningAccuracies.push(accuracy * 100)
      } else if (hour >= 18 && hour < 24) {
        eveningAccuracies.push(accuracy * 100)
      }

      // 日別パフォーマンス
      if (!dailyPerformance.has(day)) {
        dailyPerformance.set(day, { total: 0, correct: 0, count: 0 })
      }
      const dayData = dailyPerformance.get(day)!
      dayData.total += session.questions_total || 0
      dayData.correct += session.questions_correct || 0
      dayData.count += 1
    })

    // 統計分析をスキップ（Node.js統計ライブラリ移行のため一時的に無効化）
    // const _timeAnalysisResult = null  // Commented out unused variable
    console.log('Time pattern analysis with advanced statistics engine will be implemented')

    // 最適時間帯の決定（基本的な平均値比較）
    let optimalHours = [9, 10, 14, 15] // デフォルト
    if (morningAccuracies.length >= 3 && eveningAccuracies.length >= 3) {
      const morningAvg = morningAccuracies.reduce((sum, acc) => sum + acc, 0) / morningAccuracies.length
      const eveningAvg = eveningAccuracies.reduce((sum, acc) => sum + acc, 0) / eveningAccuracies.length
      
      if (Math.abs(morningAvg - eveningAvg) > 5) { // 5%以上の差があれば考慮
        optimalHours = morningAvg > eveningAvg ? [8, 9, 10, 11] : [18, 19, 20, 21]
      }
    }

    // 週間パフォーマンス
    const weeklyPerformance: DayPerformance[] = Array.from(dailyPerformance.entries())
      .map(([day, data]) => ({
        dayOfWeek: day,
        averageAccuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        averageEngagement: 70, // Default value
        sessionCount: data.count
      }))

    return {
      optimalHours,
      weeklyPerformance,
      fatigueThreshold: 60
    }
  }

  private async analyzeTimePatterns() {
    // Use actual quiz_sessions data instead of non-existent unified_learning_session_analytics
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if (!data?.length) {
      return {
        optimalHours: [9, 10, 14, 15],
        weeklyPerformance: [],
        fatigueThreshold: 60
      }
    }

    // Analyze optimal hours based on accuracy
    const hourlyPerformance = new Map<number, { total: number, correct: number, count: number }>()
    const dailyPerformance = new Map<number, { total: number, correct: number, count: number }>()

    data.forEach(session => {
      const hour = new Date(session.session_start_time).getHours()
      const day = new Date(session.session_start_time).getDay()
      
      // Hour analysis
      if (!hourlyPerformance.has(hour)) {
        hourlyPerformance.set(hour, { total: 0, correct: 0, count: 0 })
      }
      const hourData = hourlyPerformance.get(hour)!
      hourData.total += session.total_questions || 0
      hourData.correct += session.correct_answers || 0
      hourData.count += 1

      // Day analysis
      if (!dailyPerformance.has(day)) {
        dailyPerformance.set(day, { total: 0, correct: 0, count: 0 })
      }
      const dayData = dailyPerformance.get(day)!
      dayData.total += session.total_questions || 0
      dayData.correct += session.correct_answers || 0
      dayData.count += 1
    })

    // Find optimal hours (top 4 with best accuracy)
    const optimalHours = Array.from(hourlyPerformance.entries())
      .filter(([_, data]) => data.count >= 2) // At least 2 sessions
      .map(([hour, data]) => ({ hour, accuracy: data.correct / data.total }))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 4)
      .map(item => item.hour)

    // Weekly performance
    const weeklyPerformance: DayPerformance[] = Array.from(dailyPerformance.entries())
      .map(([day, data]) => ({
        dayOfWeek: day,
        averageAccuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        averageEngagement: 70, // Default value, would need engagement data
        sessionCount: data.count
      }))

    return {
      optimalHours: optimalHours.length > 0 ? optimalHours : [9, 10, 14, 15],
      weeklyPerformance,
      fatigueThreshold: 60 // Default, would need fatigue analysis
    }
  }

  private async analyzeForgettingCurve() {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .rpc('calculate_forgetting_curve_parameters', { p_user_id: this.userId })

    if (error || !data?.length) {
      return {
        personalForgettingRate: 0.5,
        optimalReviewSchedule: [
          new Date(Date.now() + 24 * 60 * 60 * 1000),
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ],
        memoryRetentionStrength: 0.7
      }
    }

    const params = data[0]
    const now = Date.now()
    const optimalReviewSchedule = (params.optimal_review_intervals || [1, 3, 7, 14, 30])
      .map((days: number) => new Date(now + days * 24 * 60 * 60 * 1000))

    return {
      personalForgettingRate: params.decay_rate,
      optimalReviewSchedule,
      memoryRetentionStrength: params.consolidation_factor
    }
  }

  private async analyzeCognitiveLoad() {
    // Use quiz_sessions for cognitive load analysis
    const { data } = await supabase
      .from('quiz_sessions')
      .select('session_start_time, session_end_time, total_questions, correct_answers')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (!data?.length) {
      return {
        currentLoadLevel: 5.0,
        loadTolerance: 6.0,
        optimalSessionDuration: 25
      }
    }

    // Calculate cognitive load based on session accuracy and duration
    const avgLoad = data.reduce((sum, item) => {
      const accuracy = item.total_questions > 0 ? (item.correct_answers / item.total_questions) : 0
      return sum + (accuracy < 0.6 ? 7 : accuracy > 0.8 ? 3 : 5) // Load inversely related to accuracy
    }, 0) / data.length
    
    const avgDuration = data.reduce((sum, item) => {
      if (item.session_start_time && item.session_end_time) {
        const duration = (new Date(item.session_end_time).getTime() - new Date(item.session_start_time).getTime()) / (1000 * 60)
        return sum + duration
      }
      return sum + 15 // default session duration
    }, 0) / data.length

    return {
      currentLoadLevel: avgLoad,
      loadTolerance: Math.min(10, avgLoad + 1.5),
      optimalSessionDuration: Math.round(avgDuration)
    }
  }

  private async analyzeFlowState() {
    // Use quiz_answers with difficulty and accuracy data
    const { data } = await supabase
      .from('quiz_answers')
      .select(`
        difficulty,
        is_correct,
        quiz_sessions!inner(user_id, accuracy_rate)
      `)
      .eq('quiz_sessions.user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())

    if (!data?.length) {
      return {
        currentFlowIndex: 0.6,
        optimalDifficultyRange: [4, 6] as [number, number],
        engagementLevel: 7
      }
    }

    // Calculate flow based on accuracy and difficulty correlation
    const avgFlow = data.reduce((sum, item) => {
      const flowScore = item.is_correct ? 0.7 : 0.3 // Simple flow estimation
      return sum + flowScore
    }, 0) / data.length
    
    // Find difficulty range with best flow
    const difficultyMap = new Map<string, number[]>()
    data.forEach(answer => {
      if (!difficultyMap.has(answer.difficulty)) {
        difficultyMap.set(answer.difficulty, [])
      }
      const flowScore = answer.is_correct ? 0.7 : 0.3
      difficultyMap.get(answer.difficulty)!.push(flowScore)
    })

    const difficultyScores = Array.from(difficultyMap.entries())
      .map(([level, flows]) => ({
        level,
        avgFlow: flows.reduce((sum, flow) => sum + flow, 0) / flows.length,
        numericLevel: this.difficultyToNumeric(level)
      }))
      .sort((a, b) => b.avgFlow - a.avgFlow)

    const bestDifficulty = difficultyScores[0]?.numericLevel || 5
    const optimalRange: [number, number] = [
      Math.max(1, bestDifficulty - 1),
      Math.min(10, bestDifficulty + 1)
    ]

    return {
      currentFlowIndex: avgFlow,
      optimalDifficultyRange: optimalRange,
      engagementLevel: Math.round(avgFlow * 10)
    }
  }

  private difficultyToNumeric(difficulty: string): number {
    switch (difficulty) {
      case 'basic': return 3
      case 'intermediate': return 5
      case 'advanced': return 7
      case 'expert': return 9
      default: return 5
    }
  }

  // Update analytics summary based on real session data
  private async updateAnalyticsSummary(sessionData: LearningSessionData): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      const today = new Date().toISOString().split('T')[0]
      
      // Get existing summary for today
      const { data: existingSummary } = await supabase
        .from('learning_analytics_summary')
        .select('*')
        .eq('user_id', this.userId)
        .eq('calculation_date', today)
        .single()
      
      const sessionDurationMinutes = Math.round(
        (sessionData.endTime.getTime() - sessionData.startTime.getTime()) / (1000 * 60)
      )
      
      if (existingSummary) {
        // Update existing summary
        const updatedData = {
          total_study_time_minutes: existingSummary.total_study_time_minutes + sessionDurationMinutes,
          session_count: existingSummary.session_count + 1,
          average_session_duration: Math.round(
            (existingSummary.total_study_time_minutes + sessionDurationMinutes) / 
            (existingSummary.session_count + 1)
          ),
          overall_accuracy: sessionData.sessionType === 'quiz' 
            ? Math.round((existingSummary.overall_accuracy + sessionData.performance.accuracyRate) / 2)
            : existingSummary.overall_accuracy,
          updated_at: new Date().toISOString()
        }
        
        await supabase
          .from('learning_analytics_summary')
          .update(updatedData)
          .eq('id', existingSummary.id)
      } else {
        // Create new summary
        const newSummary = {
          user_id: this.userId,
          calculation_date: today,
          total_study_time_minutes: sessionDurationMinutes,
          session_count: 1,
          average_session_duration: sessionDurationMinutes,
          learning_streak_days: 1, // Will be updated by daily batch
          overall_accuracy: sessionData.sessionType === 'quiz' ? sessionData.performance.accuracyRate : 0,
          quiz_accuracy: sessionData.sessionType === 'quiz' ? sessionData.performance.accuracyRate : 0,
          course_completion_rate: sessionData.sessionType === 'course' ? sessionData.performance.completionRate : 0,
          total_xp: 0, // Will be populated from user_xp_stats_v2
          xp_growth_rate: 0,
          current_level: 1,
          category_breakdown: {},
          time_pattern_analysis: {},
          weakness_analysis: {}
        }
        
        await supabase
          .from('learning_analytics_summary')
          .insert(newSummary)
      }
    } catch (error) {
      console.error('Failed to update analytics summary:', error)
    }
  }

  private async updateSessionCognitiveLoad(sessionId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .rpc('update_session_cognitive_load', { p_session_id: sessionId })

    if (error) {
      console.error('Failed to update session cognitive load:', error)
    }
  }
}

// Utility functions for creating session data
export function createQuizSessionData(
  sessionId: string,
  userId: string,
  quizData: {
    quizSessionId: string
    categoryId: string
    subcategoryId: string
    difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
    startTime: Date
    endTime: Date
    questionsTotal: number
    questionsCorrect: number
    averageResponseTimeMs: number
    interruptionCount?: number
    energyLevel?: number
  }
): LearningSessionData {
  const accuracy = quizData.questionsTotal > 0 ? (quizData.questionsCorrect / quizData.questionsTotal) * 100 : 0
  
  return {
    sessionId,
    userId,
    sessionType: 'quiz',
    startTime: quizData.startTime,
    endTime: quizData.endTime,
    content: {
      quizSessionId: quizData.quizSessionId,
      categoryId: quizData.categoryId,
      subcategoryId: quizData.subcategoryId,
      difficulty: quizData.difficulty
    },
    performance: {
      questionsTotal: quizData.questionsTotal,
      questionsCorrect: quizData.questionsCorrect,
      accuracyRate: accuracy,
      completionRate: 100, // Assume quiz completion
      averageResponseTimeMs: quizData.averageResponseTimeMs
    },
    cognitive: {
      loadScore: 0, // Will be calculated
      attentionBreaks: quizData.interruptionCount || 0,
      flowStateDuration: 0, // Will be calculated
      flowStateIndex: 0 // Will be calculated
    },
    context: {
      timeOfDay: quizData.startTime.toTimeString().slice(0, 5),
      dayOfWeek: quizData.startTime.getDay(),
      deviceType: 'web',
      interruptionCount: quizData.interruptionCount || 0,
      energyLevelReported: quizData.energyLevel,
      engagementScore: Math.min(10, accuracy / 10)
    }
  }
}

export function createCourseSessionData(
  sessionId: string,
  userId: string,
  courseData: {
    courseSessionId: string
    courseId: string
    themeId?: string
    genreId?: string
    categoryId: string
    subcategoryId: string
    difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
    startTime: Date
    endTime: Date
    completionRate: number
    interruptionCount?: number
    energyLevel?: number
  }
): LearningSessionData {
  return {
    sessionId,
    userId,
    sessionType: 'course',
    startTime: courseData.startTime,
    endTime: courseData.endTime,
    content: {
      courseSessionId: courseData.courseSessionId,
      courseId: courseData.courseId,
      themeId: courseData.themeId,
      genreId: courseData.genreId,
      categoryId: courseData.categoryId,
      subcategoryId: courseData.subcategoryId,
      difficulty: courseData.difficulty
    },
    performance: {
      questionsTotal: 0,
      questionsCorrect: 0,
      accuracyRate: 0,
      completionRate: courseData.completionRate,
      averageResponseTimeMs: 0
    },
    cognitive: {
      loadScore: 0, // Will be calculated
      attentionBreaks: courseData.interruptionCount || 0,
      flowStateDuration: 0, // Will be calculated
      flowStateIndex: 0 // Will be calculated
    },
    context: {
      timeOfDay: courseData.startTime.toTimeString().slice(0, 5),
      dayOfWeek: courseData.startTime.getDay(),
      deviceType: 'web',
      interruptionCount: courseData.interruptionCount || 0,
      energyLevelReported: courseData.energyLevel,
      engagementScore: Math.min(10, courseData.completionRate / 10)
    }
  }
}