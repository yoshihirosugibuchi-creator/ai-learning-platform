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

    // Temporary: Comment out until table is created
    console.log('Would insert into unified_learning_session_analytics:', insertData)
    // const { error } = await supabase
    //   .from('unified_learning_session_analytics')
    //   .insert(insertData)
    
    // if (error) {
    //   console.error('Failed to record learning session:', error)
    //   throw new Error(`Failed to record learning session: ${error.message}`)
    // }

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

  // Get forgetting curve recommendations
  async getForgettingCurveRecommendations(): Promise<{
    personalRetentionRate: number
    averageForgettingRate: number
    strongCategories: string[]
    weakCategories: string[]
    totalItemsToReview: number
    optimalReviewFrequency: number
  }> {
    // Temporary implementation with mock data
    console.log('Getting forgetting curve recommendations for user:', this.userId)
    return {
      personalRetentionRate: 72,
      averageForgettingRate: 0.5,
      strongCategories: ['ビジネス戦略', 'マーケティング'],
      weakCategories: ['データ分析', 'プログラミング'],
      totalItemsToReview: 5,
      optimalReviewFrequency: 7
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


  // Get spaced repetition due items
  async getDueReviews(limit: number = 20): Promise<SpacedRepetitionSchedule[]> {
    // Temporary implementation with mock data
    console.log('Getting due reviews for user:', this.userId, 'limit:', limit)
    return [
      {
        id: 'rep1',
        user_id: this.userId,
        content_id: 'q1',
        content_type: 'quiz_question',
        category_id: 'business_strategy',
        subcategory_id: 'strategic_planning',
        initial_learning_date: '2025-09-20',
        next_review_date: '2025-10-01',
        mastery_level: 0.7,
        priority_score: 8,
        review_count: 2,
        created_at: null,
        difficulty_adjustment: null,
        forgetting_curve_slope: null,
        is_mastered: null,
        last_review_date: null,
        optimal_interval_days: null,
        retention_strength: null,
        scheduled_by: null,
        updated_at: null
      }
    ]
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
      console.log('Recording review session:', { contentId, contentType, performance, reviewDate })
      // Temporary mock implementation
      return {
        id: crypto.randomUUID(),
        success: true,
        message: 'Review session recorded successfully (mock)'
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
  private async analyzeTimePatterns() {
    const supabaseClient = supabase
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
      hourData.total += session.questions_total || 0
      hourData.correct += session.questions_correct || 0
      hourData.count += 1

      // Day analysis
      if (!dailyPerformance.has(day)) {
        dailyPerformance.set(day, { total: 0, correct: 0, count: 0 })
      }
      const dayData = dailyPerformance.get(day)!
      dayData.total += session.questions_total || 0
      dayData.correct += session.questions_correct || 0
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
    const supabaseClient = supabase
    const { data } = await supabase
      .from('unified_learning_session_analytics')
      .select('cognitive_load_score, duration_seconds')
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

    const avgLoad = data.reduce((sum, item) => sum + (item.cognitive_load_score || 0), 0) / data.length
    const avgDuration = data.reduce((sum, item) => sum + ((item.duration_seconds || 0) / 60), 0) / data.length

    return {
      currentLoadLevel: avgLoad,
      loadTolerance: Math.min(10, avgLoad + 1.5),
      optimalSessionDuration: Math.round(avgDuration)
    }
  }

  private async analyzeFlowState() {
    const supabaseClient = supabase
    const { data } = await supabase
      .from('unified_learning_session_analytics')
      .select('flow_state_index, difficulty_level, accuracy_rate')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .not('flow_state_index', 'is', null)

    if (!data?.length) {
      return {
        currentFlowIndex: 0.6,
        optimalDifficultyRange: [4, 6] as [number, number],
        engagementLevel: 7
      }
    }

    const avgFlow = data.reduce((sum, item) => sum + (item.flow_state_index || 0), 0) / data.length
    
    // Find difficulty range with best flow
    const difficultyMap = new Map<string, number[]>()
    data.forEach(session => {
      if (!difficultyMap.has(session.difficulty_level)) {
        difficultyMap.set(session.difficulty_level, [])
      }
      difficultyMap.get(session.difficulty_level)!.push(session.flow_state_index || 0)
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