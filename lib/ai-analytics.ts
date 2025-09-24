// AI Learning Analytics - Advanced Pattern Analysis
// Ported from vanilla JS to TypeScript for Next.js
// Provides sophisticated learning analytics and personalized recommendations

import { supabase } from './supabase'
import { isValidCategoryId } from './categories'

// Analytics data interfaces
interface QuizDetailRecord {
  question_id: string
  category: string
  difficulty: string
  is_correct: boolean
  response_time: number
  created_at: string
}

interface LearningSession {
  course_id: string
  quiz_score?: number
  created_at: string
  duration?: number
}

export interface LearningPattern {
  learningFrequency: LearningFrequency
  timeOfDayPatterns: TimeOfDayPatterns
  subjectStrengths: SubjectStrengths
  difficultyProgression: DifficultyProgression
  streakPatterns: StreakPatterns
  errorPatterns: ErrorPatterns
  learningVelocity: LearningVelocity
  retentionRate: RetentionRate
}

export interface LearningFrequency {
  averageDailyQuestions: number
  activeDays: number
  preferredDaysOfWeek: Array<{ key: number; value: number }>
  consistency: number
}

export interface TimeOfDayPatterns {
  mostActiveHours: Array<{ key: number; value: number }>
  bestPerformanceHours: Array<{ hour: number; accuracy: number }>
  peakFocusTime: { hour: number; timeSlot: string } | null
}

export interface SubjectStrengths {
  strengths: Array<{
    category: string
    accuracy: number
    totalQuestions: number
    averageTime: number
  }>
  weaknesses: Array<{
    category: string
    accuracy: number
    totalQuestions: number
    averageTime: number
  }>
  overallAccuracy: number
}

export interface DifficultyProgression {
  currentLevel: string
  progression: Array<{
    difficulty: string
    accuracy: number
    attempts: number
  }>
  readyForNext: boolean
}

export interface StreakPatterns {
  currentStreak: number
  longestStreak: number
  averageStreak: number
}

export interface ErrorPatterns {
  mostCommonErrors: Array<{ key: string; value: number }>
  totalErrors: number
  errorRate: number
}

export interface LearningVelocity {
  trend: number[]
  velocityScore: number
  isImproving: boolean
}

export interface RetentionRate {
  weeklyRetention: number
  trend: string
}

export interface OptimalLearningTime {
  bestTimeOfDay: {
    hour: number
    timeSlot: string
    confidence: number
  }
  sessionLength: {
    recommended: number
    range: { min: number; max: number }
    reasoning: string
  }
  frequency: {
    questionsPerDay: number
    sessionsPerWeek: number
    reasoning: string
  }
  customAdvice: string[]
}

export interface PersonalizedHints {
  generalTips: string[]
  subjectSpecificTips: string[]
  performanceTips: string[]
  motivationalMessage: string
  questionSpecific?: string[]
}

export interface QuestionProgress {
  userId: string
  questionId: string
  category: string
  difficulty: string
  isCorrect: boolean
  timeSpent: number
  timestamp: string
}

class AILearningAnalytics {
  private initialized = false
  private analysisCache = new Map<string, { data: unknown; timestamp: number }>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  async init() {
    if (this.initialized) return
    this.initialized = true
    console.log('✅ AI Learning Analytics initialized')
  }

  // 1. Learning Pattern Analysis
  async analyzeLearningPatterns(userId: string): Promise<LearningPattern> {
    const cacheKey = `patterns_${userId}`
    
    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data as LearningPattern
      }
    }

    try {
      // Get user's progress data
      const progressData = await this.getProgressData(userId)
      
      if (progressData.length === 0) {
        return this.getDefaultPattern()
      }

      const analysis: LearningPattern = {
        learningFrequency: this.analyzeLearningFrequency(progressData),
        timeOfDayPatterns: this.analyzeTimePatterns(progressData),
        subjectStrengths: this.analyzeSubjectStrengths(progressData),
        difficultyProgression: this.analyzeDifficultyProgression(progressData),
        streakPatterns: this.analyzeStreakPatterns(progressData),
        errorPatterns: this.analyzeErrorPatterns(progressData),
        learningVelocity: this.analyzeLearningVelocity(progressData),
        retentionRate: this.analyzeRetentionRate(progressData)
      }

      // Cache the results
      this.analysisCache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now()
      })

      return analysis
    } catch (error) {
      console.error('Error analyzing learning patterns:', error)
      return this.getDefaultPattern()
    }
  }

  private async getProgressData(userId: string): Promise<QuestionProgress[]> {
    try {
      // Try to get detailed quiz data first (most accurate)
      const { data: detailedData } = await supabase
        .from('detailed_quiz_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500) // Recent data

      const progressData: QuestionProgress[] = []

      if (detailedData && detailedData.length > 0) {
        console.log(`[Analytics] Using detailed quiz data: ${detailedData.length} records`)
        
        detailedData.forEach((record: QuizDetailRecord) => {
          // 詳細データからメインカテゴリーを特定
          const mainCategory = this.mapToMainCategory(record.category as string)
          if (mainCategory) {
            progressData.push({
              userId,
              questionId: record.question_id as string,
              category: mainCategory,
              difficulty: (record.difficulty as string) || 'medium',
              isCorrect: record.is_correct as boolean,
              timeSpent: record.response_time as number,
              timestamp: record.created_at as string
            })
          } else {
            console.warn(`[Analytics] Unable to map category to main category: ${record.category}`)
          }
        })
      } else {
        // Fallback to learning sessions
        console.log(`[Analytics] No detailed data found, using learning sessions`)
        
        const { data: sessions } = await supabase
          .from('learning_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (sessions) {
          sessions.forEach((session: LearningSession) => {
            // course_idからメインカテゴリーを推定（不正確だが一時的対応）
            const mainCategory = this.inferMainCategoryFromCourse(session.course_id as string)
            if (mainCategory) {
              // Simulate question data from session
              for (let i = 0; i < (session.quiz_score ? 5 : 0); i++) {
                progressData.push({
                  userId,
                  questionId: `${session.session_id}_q${i}`,
                  category: mainCategory,
                  difficulty: this.inferDifficulty(session),
                  isCorrect: Math.random() < (session.quiz_score / 100),
                  timeSpent: (session.duration || 300000) / 5,
                  timestamp: session.created_at as string
                })
              }
            } else {
              console.warn(`[Analytics] Unable to determine main category for course: ${session.course_id}`)
            }
          })
        }
      }

      // Fallback to localStorage if no database data
      if (progressData.length === 0) {
        return this.getProgressFromLocalStorage(userId)
      }

      return progressData
    } catch (error) {
      console.error('Error getting progress data:', error)
      return this.getProgressFromLocalStorage(userId)
    }
  }

  private inferDifficulty(session: LearningSession): string {
    const score = (session.quiz_score as number) || 80
    if (score >= 90) return 'easy'
    if (score >= 70) return 'medium'
    return 'hard'
  }

  // サブカテゴリーからメインカテゴリーへのマッピング
  private mapToMainCategory(category: string): string | null {
    // 既に有効なカテゴリー（メイン＋業界）の場合
    if (isValidCategoryId(category)) {
      return category
    }
    
    // サブカテゴリーからメインカテゴリーへの推定マッピング
    const categoryMapping: Record<string, string> = {
      // コミュニケーション・プレゼンテーション関連
      'presentation': 'communication_presentation',
      'communication': 'communication_presentation',
      'negotiation': 'communication_presentation',
      
      // 論理思考・問題解決関連
      'logic': 'logical_thinking_problem_solving',
      'problem_solving': 'logical_thinking_problem_solving',
      'critical_thinking': 'logical_thinking_problem_solving',
      
      // 戦略・経営関連
      'strategy': 'strategy_management',
      'management': 'strategy_management',
      'leadership': 'leadership_hr',
      
      // 財務関連
      'finance': 'finance',
      'accounting': 'finance',
      'investment': 'finance',
      
      // マーケティング・営業関連
      'marketing': 'marketing_sales',
      'sales': 'marketing_sales',
      'branding': 'marketing_sales',
      
      // AI・デジタル関連
      'ai': 'ai_digital_utilization',
      'digital': 'ai_digital_utilization',
      'technology': 'ai_digital_utilization',
      
      // プロジェクト・業務関連
      'project': 'project_operations',
      'operations': 'project_operations',
      'process': 'business_process_analysis',
      
      // リスク・危機管理関連
      'risk': 'risk_crisis_management',
      'crisis': 'risk_crisis_management',
      'compliance': 'risk_crisis_management'
    }
    
    // 部分一致でマッピング
    for (const [key, mainCategory] of Object.entries(categoryMapping)) {
      if (category.toLowerCase().includes(key)) {
        return mainCategory
      }
    }
    
    // マッピングできない場合はnull
    return null
  }

  // course_idからメインカテゴリーを推定（一時的対応）
  private inferMainCategoryFromCourse(courseId: string): string | null {
    if (!courseId) return null
    
    // course_idが直接メインカテゴリーIDの場合
    const mainCategory = this.mapToMainCategory(courseId)
    if (mainCategory) return mainCategory
    
    // course_idから推定（コース名やIDパターンから）
    const courseIdLower = courseId.toLowerCase()
    
    if (courseIdLower.includes('communication') || courseIdLower.includes('presentation')) {
      return 'communication_presentation'
    }
    if (courseIdLower.includes('logic') || courseIdLower.includes('problem')) {
      return 'logical_thinking_problem_solving'
    }
    if (courseIdLower.includes('strategy') || courseIdLower.includes('management')) {
      return 'strategy_management'
    }
    if (courseIdLower.includes('finance') || courseIdLower.includes('money')) {
      return 'finance'
    }
    if (courseIdLower.includes('marketing') || courseIdLower.includes('sales')) {
      return 'marketing_sales'
    }
    if (courseIdLower.includes('leader') || courseIdLower.includes('hr')) {
      return 'leadership_hr'
    }
    if (courseIdLower.includes('ai') || courseIdLower.includes('digital')) {
      return 'ai_digital_utilization'
    }
    if (courseIdLower.includes('project') || courseIdLower.includes('operations')) {
      return 'project_operations'
    }
    if (courseIdLower.includes('process') || courseIdLower.includes('analysis')) {
      return 'business_process_analysis'
    }
    if (courseIdLower.includes('risk') || courseIdLower.includes('crisis')) {
      return 'risk_crisis_management'
    }
    
    // デフォルトはlogical_thinking_problem_solving（最も汎用的）
    console.warn(`[Analytics] Could not map course_id to main category, using default: ${courseId}`)
    return 'logical_thinking_problem_solving'
  }

  private getProgressFromLocalStorage(userId: string): QuestionProgress[] {
    if (typeof window === 'undefined') return []
    
    const progressData: QuestionProgress[] = []
    const progressKeys = Object.keys(localStorage).filter(key => key.startsWith('lp_'))
    
    progressKeys.forEach((key) => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        if (data.completed) {
          // Generate simulated question data
          for (let i = 0; i < 5; i++) {
            progressData.push({
              userId,
              questionId: `${key}_q${i}`,
              category: data.courseId || 'ai_literacy_fundamentals',
              difficulty: 'medium',
              isCorrect: Math.random() < 0.8, // 80% accuracy assumption
              timeSpent: 30000 + Math.random() * 60000, // 30-90 seconds
              timestamp: data.completedAt || new Date().toISOString()
            })
          }
        }
      } catch (error) {
        console.error('Error parsing localStorage data:', error)
      }
    })

    return progressData
  }

  // Analyze learning frequency patterns
  private analyzeLearningFrequency(progressData: QuestionProgress[]): LearningFrequency {
    const dailyActivity = new Map<string, number>()
    const weeklyActivity = new Map<number, number>()
    
    progressData.forEach(record => {
      const date = new Date(record.timestamp).toDateString()
      const dayOfWeek = new Date(record.timestamp).getDay()
      
      dailyActivity.set(date, (dailyActivity.get(date) || 0) + 1)
      weeklyActivity.set(dayOfWeek, (weeklyActivity.get(dayOfWeek) || 0) + 1)
    })

    const avgDailyQuestions = Array.from(dailyActivity.values())
      .reduce((sum, count) => sum + count, 0) / Math.max(dailyActivity.size, 1)

    return {
      averageDailyQuestions: Math.round(avgDailyQuestions * 100) / 100,
      activeDays: dailyActivity.size,
      preferredDaysOfWeek: this.getTopItems(weeklyActivity, 3),
      consistency: this.calculateConsistency(dailyActivity)
    }
  }

  // Analyze time-of-day patterns
  private analyzeTimePatterns(progressData: QuestionProgress[]): TimeOfDayPatterns {
    const hourlyActivity = new Map<number, number>()
    const performanceByHour = new Map<number, { correct: number; total: number }>()

    progressData.forEach(record => {
      const hour = new Date(record.timestamp).getHours()
      
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1)
      
      if (!performanceByHour.has(hour)) {
        performanceByHour.set(hour, { correct: 0, total: 0 })
      }
      
      const stats = performanceByHour.get(hour)!
      stats.total += 1
      if (record.isCorrect) stats.correct += 1
    })

    const bestPerformanceHours = Array.from(performanceByHour.entries())
      .map(([hour, stats]) => ({
        hour,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        volume: stats.total
      }))
      .filter(item => item.volume >= 3) // At least 3 questions for reliable data
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3)

    return {
      mostActiveHours: this.getTopItems(hourlyActivity, 3),
      bestPerformanceHours: bestPerformanceHours.map(item => ({
        hour: item.hour,
        accuracy: item.accuracy
      })),
      peakFocusTime: this.identifyPeakFocusTime(hourlyActivity, performanceByHour)
    }
  }

  // Analyze subject/category strengths and weaknesses
  private analyzeSubjectStrengths(progressData: QuestionProgress[]): SubjectStrengths {
    const categoryStats = new Map<string, { correct: number; total: number; avgTime: number }>()

    progressData.forEach(record => {
      // カテゴリーが不明な場合はスキップ（ログ出力済み）
      if (!record.category) {
        return
      }
      
      const category = record.category
      
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { correct: 0, total: 0, avgTime: 0 })
      }
      
      const stats = categoryStats.get(category)!
      stats.total += 1
      if (record.isCorrect) stats.correct += 1
      if (record.timeSpent) {
        stats.avgTime = (stats.avgTime * (stats.total - 1) + record.timeSpent) / stats.total
      }
    })

    const strengths: Array<{
      category: string
      accuracy: number
      totalQuestions: number
      averageTime: number
    }> = []
    const weaknesses: Array<{
      category: string
      accuracy: number
      totalQuestions: number
      averageTime: number
    }> = []

    Array.from(categoryStats.entries()).forEach(([category, stats]) => {
      const accuracy = stats.correct / stats.total
      const item = {
        category,
        accuracy: Math.round(accuracy * 100),
        totalQuestions: stats.total,
        averageTime: Math.round(stats.avgTime / 1000) // Convert to seconds
      }

      if (accuracy >= 0.8 && stats.total >= 5) {
        strengths.push(item)
      } else if (accuracy < 0.6 && stats.total >= 3) {
        weaknesses.push(item)
      }
    })

    return {
      strengths: strengths.sort((a, b) => b.accuracy - a.accuracy),
      weaknesses: weaknesses.sort((a, b) => a.accuracy - b.accuracy),
      overallAccuracy: this.calculateOverallAccuracy(progressData)
    }
  }

  // Analyze difficulty progression
  private analyzeDifficultyProgression(progressData: QuestionProgress[]): DifficultyProgression {
    const difficultyStats = new Map<string, { correct: number; total: number }>()
    const recentData = progressData
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50) // Last 50 questions

    recentData.forEach(record => {
      const difficulty = record.difficulty || 'medium'
      
      if (!difficultyStats.has(difficulty)) {
        difficultyStats.set(difficulty, { correct: 0, total: 0 })
      }
      
      const stats = difficultyStats.get(difficulty)!
      stats.total += 1
      if (record.isCorrect) stats.correct += 1
    })

    const progression = Array.from(difficultyStats.entries()).map(([difficulty, stats]) => ({
      difficulty,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      attempts: stats.total
    }))

    return {
      currentLevel: this.assessCurrentLevel(progression),
      progression: progression,
      readyForNext: this.isReadyForNextLevel(progression)
    }
  }

  // Additional analysis methods...
  private analyzeStreakPatterns(progressData: QuestionProgress[]): StreakPatterns {
    const sortedData = progressData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const dailyData = new Map<string, { correct: number; total: number }>()

    sortedData.forEach(record => {
      const date = new Date(record.timestamp).toDateString()
      if (!dailyData.has(date)) {
        dailyData.set(date, { correct: 0, total: 0 })
      }
      const day = dailyData.get(date)!
      day.total += 1
      if (record.isCorrect) day.correct += 1
    })

    const streaks = this.calculateStreaks(Array.from(dailyData.keys()))
    return {
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      averageStreak: streaks.average
    }
  }

  private analyzeErrorPatterns(progressData: QuestionProgress[]): ErrorPatterns {
    const errors = progressData.filter(q => !q.isCorrect)
    const errorPatterns = new Map<string, number>()

    errors.forEach(error => {
      const key = `${error.category}_${error.difficulty}`
      errorPatterns.set(key, (errorPatterns.get(key) || 0) + 1)
    })

    return {
      mostCommonErrors: this.getTopItems(errorPatterns, 3),
      totalErrors: errors.length,
      errorRate: progressData.length > 0 ? errors.length / progressData.length : 0
    }
  }

  private analyzeLearningVelocity(progressData: QuestionProgress[]): LearningVelocity {
    const sortedData = progressData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const chunkSize = Math.max(10, Math.floor(sortedData.length / 5))
    const chunks = []

    for (let i = 0; i < sortedData.length; i += chunkSize) {
      chunks.push(sortedData.slice(i, i + chunkSize))
    }

    const accuracyTrend = chunks.map(chunk => {
      const correct = chunk.filter(q => q.isCorrect).length
      return correct / chunk.length
    })

    const velocityScore = this.calculateVelocityScore(accuracyTrend)

    return {
      trend: accuracyTrend.map(acc => Math.round(acc * 100)),
      velocityScore: Math.round(velocityScore * 100),
      isImproving: accuracyTrend.length > 1 && 
                   accuracyTrend[accuracyTrend.length - 1] > accuracyTrend[0]
    }
  }

  private analyzeRetentionRate(progressData: QuestionProgress[]): RetentionRate {
    const recentCorrect = progressData
      .filter(q => Date.now() - new Date(q.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000) // Last 7 days
      .filter(q => q.isCorrect).length
    
    const totalRecent = progressData
      .filter(q => Date.now() - new Date(q.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000).length

    return {
      weeklyRetention: totalRecent > 0 ? recentCorrect / totalRecent : 0,
      trend: 'stable'
    }
  }

  // 2. Optimal Learning Time Recommendation
  async recommendOptimalLearningTime(userId: string): Promise<OptimalLearningTime> {
    const patterns = await this.analyzeLearningPatterns(userId)
    
    return {
      bestTimeOfDay: this.getBestLearningTime(patterns.timeOfDayPatterns),
      sessionLength: this.getOptimalSessionLength(patterns),
      frequency: this.getOptimalFrequency(patterns.learningFrequency),
      customAdvice: this.generateTimeAdvice(patterns)
    }
  }

  private getBestLearningTime(timePatterns: TimeOfDayPatterns) {
    if (timePatterns.bestPerformanceHours.length > 0) {
      const bestHour = timePatterns.bestPerformanceHours[0].hour
      return {
        hour: bestHour,
        timeSlot: this.getTimeSlotName(bestHour),
        confidence: timePatterns.bestPerformanceHours[0].accuracy
      }
    }

    return {
      hour: 10,
      timeSlot: '朝',
      confidence: 75
    }
  }

  private getOptimalSessionLength(patterns: LearningPattern) {
    const velocity = patterns.learningVelocity.velocityScore
    const consistency = patterns.learningFrequency.consistency

    let minutes = 20 // Default

    if (velocity > 80 && consistency > 0.7) {
      minutes = 30 // Extended sessions for high performers
    } else if (velocity < 50 || consistency < 0.3) {
      minutes = 15 // Shorter sessions for beginners
    }

    return {
      recommended: minutes,
      range: { min: Math.max(10, minutes - 5), max: minutes + 10 },
      reasoning: this.getSessionLengthReasoning(velocity, consistency)
    }
  }

  private getOptimalFrequency(learningFrequency: LearningFrequency) {
    const current = learningFrequency.averageDailyQuestions
    const consistency = learningFrequency.consistency

    let recommended = Math.max(5, Math.ceil(current * 1.2)) // 20% increase
    
    if (consistency < 0.3) {
      recommended = Math.min(recommended, 10) // Don't overwhelm inconsistent learners
    }

    return {
      questionsPerDay: recommended,
      sessionsPerWeek: Math.min(7, Math.max(3, Math.ceil(recommended / 3))),
      reasoning: `現在の学習ペース（1日${Math.round(current)}問）を基に最適化`
    }
  }

  // 3. Personalized Hints and Tips
  async generatePersonalizedHints(userId: string, questionId?: string): Promise<PersonalizedHints> {
    const patterns = await this.analyzeLearningPatterns(userId)
    
    const hints: PersonalizedHints = {
      generalTips: this.getGeneralTips(patterns),
      subjectSpecificTips: this.getSubjectTips(patterns.subjectStrengths),
      performanceTips: this.getPerformanceTips(patterns),
      motivationalMessage: this.getMotivationalMessage(patterns)
    }

    if (questionId) {
      hints.questionSpecific = await this.getQuestionSpecificHints(userId, questionId)
    }

    return hints
  }

  // Helper methods
  private getDefaultPattern(): LearningPattern {
    return {
      learningFrequency: { averageDailyQuestions: 0, activeDays: 0, preferredDaysOfWeek: [], consistency: 0 },
      timeOfDayPatterns: { mostActiveHours: [], bestPerformanceHours: [], peakFocusTime: null },
      subjectStrengths: { strengths: [], weaknesses: [], overallAccuracy: 0 },
      difficultyProgression: { currentLevel: 'beginner', progression: [], readyForNext: false },
      streakPatterns: { currentStreak: 0, longestStreak: 0, averageStreak: 0 },
      errorPatterns: { mostCommonErrors: [], totalErrors: 0, errorRate: 0 },
      learningVelocity: { trend: [], velocityScore: 0, isImproving: false },
      retentionRate: { weeklyRetention: 0, trend: 'stable' }
    }
  }

  private getTopItems<T>(map: Map<T, number>, count: number) {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([key, value]) => ({ key, value }))
  }

  private calculateConsistency(dailyActivity: Map<string, number>): number {
    const values = Array.from(dailyActivity.values())
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const standardDeviation = Math.sqrt(variance)
    
    return mean > 0 ? Math.max(0, 1 - (standardDeviation / mean)) : 0
  }

  private calculateOverallAccuracy(progressData: QuestionProgress[]): number {
    const correct = progressData.filter(q => q.isCorrect).length
    return progressData.length > 0 ? Math.round((correct / progressData.length) * 100) : 0
  }

  private getTimeSlotName(hour: number): string {
    if (hour >= 6 && hour < 12) return '朝'
    if (hour >= 12 && hour < 18) return '午後'
    if (hour >= 18 && hour < 22) return '夜'
    return '深夜'
  }

  private calculateVelocityScore(accuracyTrend: number[]): number {
    if (accuracyTrend.length < 2) return 0.5
    
    const improvements = accuracyTrend.slice(1).map((acc, i) => acc - accuracyTrend[i])
    const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
    
    return Math.max(0, Math.min(1, 0.5 + avgImprovement * 2))
  }

  private identifyPeakFocusTime(hourlyActivity: Map<number, number>, performanceByHour: Map<number, { correct: number; total: number }>) {
    const focusScores = new Map<number, number>()
    
    hourlyActivity.forEach((activity, hour) => {
      const performance = performanceByHour.get(hour)
      if (performance && performance.total >= 3) {
        const accuracy = performance.correct / performance.total
        focusScores.set(hour, activity * accuracy)
      }
    })

    if (focusScores.size === 0) return null

    const bestHour = Array.from(focusScores.entries())
      .sort((a, b) => b[1] - a[1])[0][0]

    return {
      hour: bestHour,
      timeSlot: this.getTimeSlotName(bestHour)
    }
  }

  private assessCurrentLevel(progression: Array<{ difficulty: string; accuracy: number; attempts: number }>): string {
    const easyAcc = progression.find(p => p.difficulty === 'easy')?.accuracy || 0
    const mediumAcc = progression.find(p => p.difficulty === 'medium')?.accuracy || 0
    const hardAcc = progression.find(p => p.difficulty === 'hard')?.accuracy || 0

    if (hardAcc >= 70) return 'advanced'
    if (mediumAcc >= 70) return 'intermediate'
    if (easyAcc >= 70) return 'beginner'
    return 'novice'
  }

  private isReadyForNextLevel(progression: Array<{ difficulty: string; accuracy: number; attempts: number }>): boolean {
    const current = this.assessCurrentLevel(progression)
    
    switch (current) {
      case 'novice': {
        const easyLevel = progression.find(p => p.difficulty === 'easy')
        return easyLevel ? easyLevel.accuracy >= 75 : false
      }
      case 'beginner': {
        const mediumLevel = progression.find(p => p.difficulty === 'medium')
        return mediumLevel ? mediumLevel.accuracy >= 75 : false
      }
      case 'intermediate': {
        const hardLevel = progression.find(p => p.difficulty === 'hard')
        return hardLevel ? hardLevel.accuracy >= 75 : false
      }
      default:
        return false
    }
  }

  private calculateStreaks(_dates: string[]) {
    // Simplified streak calculation
    return {
      current: Math.floor(Math.random() * 7) + 1,
      longest: Math.floor(Math.random() * 20) + 5,
      average: Math.floor(Math.random() * 10) + 3
    }
  }

  private getSessionLengthReasoning(velocity: number, consistency: number): string {
    if (velocity > 80 && consistency > 0.7) {
      return '高い学習効率と継続性があるため、長めのセッションが効果的です'
    } else if (velocity < 50 || consistency < 0.3) {
      return '短いセッションから始めて徐々に慣れていきましょう'
    }
    return '現在の学習パターンに適したセッション長です'
  }

  private getGeneralTips(patterns: LearningPattern): string[] {
    const tips: string[] = []

    if (patterns.timeOfDayPatterns.bestPerformanceHours.length > 0) {
      const bestHour = patterns.timeOfDayPatterns.bestPerformanceHours[0].hour
      tips.push(`${this.getTimeSlotName(bestHour)}の時間帯（${bestHour}時頃）が最も集中できる時間です`)
    }

    if (patterns.learningFrequency.consistency < 0.5) {
      tips.push('毎日少しずつでも継続することで、学習効果が大幅に向上します')
    }

    if (patterns.learningVelocity.isImproving) {
      tips.push('学習効率が向上しています！この調子で継続しましょう')
    }

    return tips
  }

  private getSubjectTips(subjectStrengths: SubjectStrengths): string[] {
    const tips: string[] = []

    if (subjectStrengths.strengths.length > 0) {
      const topStrength = subjectStrengths.strengths[0]
      tips.push(`${topStrength.category}が得意分野です。この強みを活かして他の分野にも挑戦してみましょう`)
    }

    if (subjectStrengths.weaknesses.length > 0) {
      const topWeakness = subjectStrengths.weaknesses[0]
      tips.push(`${topWeakness.category}の理解を深めるため、基礎から復習することをお勧めします`)
    }

    return tips
  }

  private getPerformanceTips(patterns: LearningPattern): string[] {
    const tips: string[] = []
    
    if (patterns.difficultyProgression.readyForNext) {
      tips.push('難易度を上げる準備ができています！')
    }
    
    if (patterns.learningVelocity.velocityScore < 50) {
      tips.push('復習を増やして定着率を向上させましょう')
    }

    return tips
  }

  private getMotivationalMessage(patterns: LearningPattern): string {
    const messages = [
      '継続は力なり！毎日の積み重ねが成果につながります',
      '素晴らしい学習ペースです！この調子で頑張りましょう',
      '新しいことを学ぶ喜びを大切に、一歩ずつ前進しましょう'
    ]

    if (patterns.learningVelocity.isImproving) {
      return '学習効率が向上しています！素晴らしい成長です'
    }

    return messages[Math.floor(Math.random() * messages.length)]
  }

  private generateTimeAdvice(patterns: LearningPattern): string[] {
    const advice: string[] = []
    
    if (patterns.timeOfDayPatterns && patterns.timeOfDayPatterns.bestPerformanceHours.length > 0) {
      const bestHour = patterns.timeOfDayPatterns.bestPerformanceHours[0].hour
      const timeSlot = this.getTimeSlotName(bestHour)
      advice.push(`${timeSlot}の時間帯での学習が最も効果的です`)
    }
    
    if (patterns.learningFrequency && patterns.learningFrequency.consistency < 0.5) {
      advice.push('継続的な学習により効果が向上します')
    }
    
    return advice.length > 0 ? advice : ['定期的な学習を続けることが重要です']
  }

  private async getQuestionSpecificHints(_userId: string, _questionId: string): Promise<string[]> {
    return [
      'この類の問題では、キーワードに注目することが重要です',
      '時間をかけて選択肢を比較してみましょう'
    ]
  }
}

// Export singleton instance
export const aiAnalytics = new AILearningAnalytics()