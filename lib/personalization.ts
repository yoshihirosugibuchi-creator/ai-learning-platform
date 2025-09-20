// Advanced Quiz Personalization System (Level 4)
// Implements spaced repetition, forgetting curves, and learning efficiency optimization

// Memory strength and spaced repetition interfaces
export interface QuestionMemoryStrength {
  questionId: string
  category: string
  memoryStrength: number // 0-1 scale (0 = completely forgotten, 1 = perfect recall)
  repetitions: number
  easiness: number // 1.3-3.0 scale (SuperMemo algorithm)
  interval: number // days until next review
  nextReviewDate: string
  lastReviewDate: string
  correctStreak: number
  incorrectCount: number
  totalAttempts: number
  averageResponseTime: number
  difficultyRating: number // 1-5 scale from user feedback
}

export interface PersonalizedQuizConfig {
  userId: string
  preferredDifficulty: 'adaptive' | 'easy' | 'medium' | 'hard'
  focusMode: 'review' | 'new' | 'mixed' // focus on review, new questions, or mixed
  sessionLength: number // preferred number of questions per session
  categories: string[] // preferred categories
  enableSpacedRepetition: boolean
  adaptiveDifficulty: boolean
  reviewPriority: 'memory_strength' | 'time_since_review' | 'error_rate'
}

export interface LearningEfficiencyMetrics {
  userId: string
  optimalSessionLength: number
  bestTimeOfDay: string // 'morning', 'afternoon', 'evening'
  averageFocusSpan: number // minutes
  categoryMastery: Record<string, number> // 0-1 mastery level per category
  learningVelocity: number // questions mastered per hour
  retentionRate: number // percentage of previously correct questions still remembered
}

// Storage keys
const QUIZ_CONFIG_KEY = 'ale_quiz_config'
const MEMORY_STRENGTH_KEY = 'ale_memory_strength'
const LEARNING_METRICS_KEY = 'ale_learning_metrics'

// Initialize default personalized config
export function createDefaultQuizConfig(userId: string): PersonalizedQuizConfig {
  return {
    userId,
    preferredDifficulty: 'adaptive',
    focusMode: 'mixed',
    sessionLength: 10,
    categories: [],
    enableSpacedRepetition: true,
    adaptiveDifficulty: true,
    reviewPriority: 'memory_strength'
  }
}

// Save/load personalized quiz config
export function saveUserQuizConfig(config: PersonalizedQuizConfig): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${QUIZ_CONFIG_KEY}_${config.userId}`, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save quiz config:', error)
  }
}

export function getUserQuizConfig(userId: string): PersonalizedQuizConfig {
  try {
    if (typeof window === 'undefined') return createDefaultQuizConfig(userId)
    const data = localStorage.getItem(`${QUIZ_CONFIG_KEY}_${userId}`)
    return data ? JSON.parse(data) : createDefaultQuizConfig(userId)
  } catch (error) {
    console.error('Failed to load quiz config:', error)
    return createDefaultQuizConfig(userId)
  }
}

// Memory strength tracking
export function getQuestionMemoryStrength(userId: string): QuestionMemoryStrength[] {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(`${MEMORY_STRENGTH_KEY}_${userId}`)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load memory strength data:', error)
    return []
  }
}

export function saveQuestionMemoryStrength(userId: string, memoryData: QuestionMemoryStrength[]): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${MEMORY_STRENGTH_KEY}_${userId}`, JSON.stringify(memoryData))
  } catch (error) {
    console.error('Failed to save memory strength data:', error)
  }
}

// Update memory strength after quiz attempt (SuperMemo algorithm)
export function updateQuestionMemoryStrength(
  userId: string,
  questionId: string,
  category: string,
  isCorrect: boolean,
  responseTime: number,
  difficultyRating: number = 3
): QuestionMemoryStrength {
  const memoryData = getQuestionMemoryStrength(userId)
  const existingMemory = memoryData.find(m => m.questionId === questionId)
  const now = new Date()
  
  if (existingMemory) {
    // Update existing memory strength using SuperMemo algorithm
    const quality = isCorrect ? Math.max(3, 5 - difficultyRating) : 0 // 0-5 quality scale
    
    if (quality >= 3) {
      // Correct answer
      existingMemory.correctStreak += 1
      existingMemory.repetitions += 1
      
      if (existingMemory.repetitions === 1) {
        existingMemory.interval = 1
      } else if (existingMemory.repetitions === 2) {
        existingMemory.interval = 6
      } else {
        existingMemory.interval = Math.round(existingMemory.interval * existingMemory.easiness)
      }
      
      // Update easiness factor
      existingMemory.easiness = Math.max(1.3, 
        existingMemory.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      )
      
      // Update memory strength (improves with correct answers)
      existingMemory.memoryStrength = Math.min(1.0, 
        existingMemory.memoryStrength + (0.2 * (quality / 5))
      )
    } else {
      // Incorrect answer
      existingMemory.correctStreak = 0
      existingMemory.incorrectCount += 1
      existingMemory.interval = 1 // Reset interval
      existingMemory.memoryStrength = Math.max(0.0, existingMemory.memoryStrength - 0.3)
    }
    
    // Update common fields
    existingMemory.totalAttempts += 1
    existingMemory.averageResponseTime = 
      (existingMemory.averageResponseTime * (existingMemory.totalAttempts - 1) + responseTime) / existingMemory.totalAttempts
    existingMemory.difficultyRating = 
      (existingMemory.difficultyRating * (existingMemory.totalAttempts - 1) + difficultyRating) / existingMemory.totalAttempts
    existingMemory.lastReviewDate = now.toISOString()
    existingMemory.nextReviewDate = new Date(now.getTime() + existingMemory.interval * 24 * 60 * 60 * 1000).toISOString()
    
    saveQuestionMemoryStrength(userId, memoryData)
    return existingMemory
  } else {
    // Create new memory strength entry
    const newMemory: QuestionMemoryStrength = {
      questionId,
      category,
      memoryStrength: isCorrect ? 0.7 : 0.3,
      repetitions: 1,
      easiness: 2.5,
      interval: isCorrect ? 1 : 1,
      nextReviewDate: new Date(now.getTime() + (isCorrect ? 1 : 1) * 24 * 60 * 60 * 1000).toISOString(),
      lastReviewDate: now.toISOString(),
      correctStreak: isCorrect ? 1 : 0,
      incorrectCount: isCorrect ? 0 : 1,
      totalAttempts: 1,
      averageResponseTime: responseTime,
      difficultyRating
    }
    
    memoryData.push(newMemory)
    saveQuestionMemoryStrength(userId, memoryData)
    return newMemory
  }
}

// Get questions that need review based on forgetting curve
export function getQuestionsForReview(userId: string, limit: number = 10): QuestionMemoryStrength[] {
  const memoryData = getQuestionMemoryStrength(userId)
  const now = new Date()
  
  const questionsForReview = memoryData
    .filter(m => new Date(m.nextReviewDate) <= now || m.memoryStrength < 0.5)
    .sort((a, b) => {
      // Priority: low memory strength first, then overdue questions
      const memoryScore = a.memoryStrength - b.memoryStrength
      if (Math.abs(memoryScore) > 0.1) return memoryScore
      
      const aDaysOverdue = Math.max(0, (now.getTime() - new Date(a.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24))
      const bDaysOverdue = Math.max(0, (now.getTime() - new Date(b.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24))
      return bDaysOverdue - aDaysOverdue
    })
    .slice(0, limit)
  
  return questionsForReview
}

// Get personalized question recommendations
export function getPersonalizedQuestions(
  userId: string,
  availableQuestions: Array<Record<string, unknown>>,
  sessionLength: number = 10
): {
  questions: Array<Record<string, unknown>>
  reviewQuestions: QuestionMemoryStrength[]
  newQuestions: Array<Record<string, unknown>>
  recommendedDifficulty: string
  learningEfficiency: number
} {
  const config = getUserQuizConfig(userId)
  const memoryData = getQuestionMemoryStrength(userId)
  const questionsForReview = getQuestionsForReview(userId, Math.floor(sessionLength * 0.6)) // 60% review
  
  // Get questions that haven't been attempted yet or have low memory strength
  const attemptedQuestionIds = new Set(memoryData.map(m => m.questionId))
  const newQuestions = availableQuestions
    .filter(q => !attemptedQuestionIds.has((q as Record<string, unknown>).id as string))
    .slice(0, Math.ceil(sessionLength * 0.4)) // 40% new questions
  
  // Calculate recommended difficulty based on performance
  const userStats = getUserPerformanceStats(userId)
  let recommendedDifficulty = 'medium'
  
  if (userStats.averageAccuracy > 0.8) {
    recommendedDifficulty = 'hard'
  } else if (userStats.averageAccuracy < 0.6) {
    recommendedDifficulty = 'easy'
  }
  
  // Filter questions by preferred categories if set
  let filteredQuestions = availableQuestions
  if (config.categories.length > 0) {
    filteredQuestions = availableQuestions.filter(q => config.categories.includes((q as Record<string, unknown>).category as string))
  }
  
  // Combine review and new questions
  const reviewQuestionIds = new Set(questionsForReview.map(r => r.questionId))
  const selectedQuestions = [
    ...filteredQuestions.filter(q => reviewQuestionIds.has((q as Record<string, unknown>).id as string)),
    ...newQuestions
  ].slice(0, sessionLength)
  
  // Calculate learning efficiency score
  const learningEfficiency = calculateLearningEfficiency(userId, userStats)
  
  return {
    questions: selectedQuestions,
    reviewQuestions: questionsForReview,
    newQuestions,
    recommendedDifficulty,
    learningEfficiency
  }
}

// Get user performance statistics for adaptive difficulty
export function getUserPerformanceStats(userId: string): {
  averageAccuracy: number
  averageResponseTime: number
  totalQuestions: number
  categoryStats: Record<string, { accuracy: number; attempts: number }>
} {
  const memoryData = getQuestionMemoryStrength(userId)
  
  if (memoryData.length === 0) {
    return {
      averageAccuracy: 0.5,
      averageResponseTime: 0,
      totalQuestions: 0,
      categoryStats: {}
    }
  }
  
  const totalCorrect = memoryData.reduce((sum, m) => sum + (m.totalAttempts - m.incorrectCount), 0)
  const totalAttempts = memoryData.reduce((sum, m) => sum + m.totalAttempts, 0)
  const totalResponseTime = memoryData.reduce((sum, m) => sum + m.averageResponseTime, 0)
  
  // Category-wise statistics
  const categoryStats = memoryData.reduce((acc, m) => {
    if (!acc[m.category]) {
      acc[m.category] = { correct: 0, attempts: 0 }
    }
    acc[m.category].correct += (m.totalAttempts - m.incorrectCount)
    acc[m.category].attempts += m.totalAttempts
    return acc
  }, {} as Record<string, { correct: number; attempts: number }>)
  
  const categoryStatsFormatted = Object.entries(categoryStats).reduce((acc, [category, stats]) => {
    acc[category] = {
      accuracy: stats.correct / stats.attempts,
      attempts: stats.attempts
    }
    return acc
  }, {} as Record<string, { accuracy: number; attempts: number }>)
  
  return {
    averageAccuracy: totalCorrect / totalAttempts,
    averageResponseTime: totalResponseTime / memoryData.length,
    totalQuestions: memoryData.length,
    categoryStats: categoryStatsFormatted
  }
}

// Calculate learning efficiency based on forgetting curve and retention
function calculateLearningEfficiency(userId: string, userStats: { averageAccuracy: number }): number {
  const memoryData = getQuestionMemoryStrength(userId)
  
  if (memoryData.length === 0) return 0.5
  
  // Calculate retention rate (questions with high memory strength)
  const strongMemoryQuestions = memoryData.filter(m => m.memoryStrength > 0.7)
  const retentionRate = strongMemoryQuestions.length / memoryData.length
  
  // Calculate spaced repetition effectiveness
  const spacedRepetitionQuestions = memoryData.filter(m => m.repetitions > 2)
  const spacedRepetitionEffectiveness = spacedRepetitionQuestions.length > 0 
    ? spacedRepetitionQuestions.reduce((sum, m) => sum + m.memoryStrength, 0) / spacedRepetitionQuestions.length
    : 0.5
  
  // Combine metrics for overall efficiency score
  const efficiency = (retentionRate * 0.4) + (spacedRepetitionEffectiveness * 0.3) + (userStats.averageAccuracy * 0.3)
  
  return Math.max(0, Math.min(1, efficiency))
}

// Learning efficiency metrics tracking
export function getLearningEfficiencyMetrics(userId: string): LearningEfficiencyMetrics {
  try {
    if (typeof window === 'undefined') return createDefaultMetrics(userId)
    const data = localStorage.getItem(`${LEARNING_METRICS_KEY}_${userId}`)
    return data ? JSON.parse(data) : createDefaultMetrics(userId)
  } catch (error) {
    console.error('Failed to load learning efficiency metrics:', error)
    return createDefaultMetrics(userId)
  }
}

export function saveLearningEfficiencyMetrics(metrics: LearningEfficiencyMetrics): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${LEARNING_METRICS_KEY}_${metrics.userId}`, JSON.stringify(metrics))
  } catch (error) {
    console.error('Failed to save learning efficiency metrics:', error)
  }
}

function createDefaultMetrics(userId: string): LearningEfficiencyMetrics {
  return {
    userId,
    optimalSessionLength: 10,
    bestTimeOfDay: 'afternoon',
    averageFocusSpan: 15,
    categoryMastery: {},
    learningVelocity: 0,
    retentionRate: 0
  }
}

// Update learning efficiency metrics after quiz session
export function updateLearningEfficiencyMetrics(
  userId: string,
  sessionDuration: number,
  questionsAnswered: number,
  accuracy: number,
  timeOfDay: string
): void {
  const metrics = getLearningEfficiencyMetrics(userId)
  
  // Update learning velocity (questions per minute)
  const velocityThisSession = questionsAnswered / (sessionDuration / 60000) // convert ms to minutes
  metrics.learningVelocity = (metrics.learningVelocity + velocityThisSession) / 2
  
  // Update optimal session length based on accuracy decline
  if (accuracy > 0.8) {
    metrics.optimalSessionLength = Math.min(20, metrics.optimalSessionLength + 1)
  } else if (accuracy < 0.6) {
    metrics.optimalSessionLength = Math.max(5, metrics.optimalSessionLength - 1)
  }
  
  // Track best time of day (simplified)
  // In a real implementation, this would track performance by time of day
  
  saveLearningEfficiencyMetrics(metrics)
}

// Get optimal review schedule for a user
export function getOptimalReviewSchedule(userId: string): {
  today: QuestionMemoryStrength[]
  thisWeek: QuestionMemoryStrength[]
  nextWeek: QuestionMemoryStrength[]
} {
  const memoryData = getQuestionMemoryStrength(userId)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const weekAfter = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  
  const today = memoryData.filter(m => new Date(m.nextReviewDate) <= tomorrow)
  const thisWeek = memoryData.filter(m => {
    const reviewDate = new Date(m.nextReviewDate)
    return reviewDate > tomorrow && reviewDate <= nextWeek
  })
  const nextWeekReviews = memoryData.filter(m => {
    const reviewDate = new Date(m.nextReviewDate)
    return reviewDate > nextWeek && reviewDate <= weekAfter
  })
  
  return {
    today,
    thisWeek,
    nextWeek: nextWeekReviews
  }
}