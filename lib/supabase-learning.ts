import { supabase } from './supabase'

// Learning Session Types
export interface LearningSession {
  id?: string
  user_id: string
  session_id: string
  course_id?: string
  genre_id?: string
  theme_id?: string
  start_time: string
  end_time?: string
  duration?: number // milliseconds
  completed: boolean
  quiz_score?: number
  content_interactions?: {
    scrollDepth: number
    timeOnSection: Record<string, number>
    clickEvents: Array<{ element: string; timestamp: string }>
  }
  created_at?: string
  updated_at?: string
}

export interface SKPTransaction {
  id?: string
  user_id: string
  type: 'earned' | 'spent'
  amount: number
  source: string
  description: string
  timestamp: string
  created_at?: string
}

export interface CategoryProgress {
  id?: string
  user_id: string
  category_id: string
  current_level: number
  total_xp: number
  correct_answers: number
  total_answers: number
  last_answered_at?: string
  created_at?: string
  updated_at?: string
}

export interface DetailedQuizData {
  id?: string
  user_id: string
  quiz_result_id: string
  question_id: string
  question_text: string
  selected_answer: string
  correct_answer: string
  is_correct: boolean
  response_time: number
  confidence_level?: number
  category: string
  difficulty?: string
  created_at?: string
}

// Learning Session Functions
export async function saveLearningSession(session: Omit<LearningSession, 'id' | 'created_at' | 'updated_at'>): Promise<LearningSession | null> {
  const { data, error } = await supabase
    .from('learning_sessions')
    .insert([session])
    .select()
    .single()

  if (error) {
    console.error('Error saving learning session:', error)
    return null
  }

  return data
}

export async function getUserLearningSessions(userId: string): Promise<LearningSession[]> {
  const { data, error } = await supabase
    .from('learning_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })

  if (error) {
    console.error('Error fetching learning sessions:', error)
    return []
  }

  return data || []
}

export async function updateLearningSession(sessionId: string, updates: Partial<LearningSession>): Promise<boolean> {
  const { error } = await supabase
    .from('learning_sessions')
    .update(updates)
    .eq('id', sessionId)

  if (error) {
    console.error('Error updating learning session:', error)
    return false
  }

  return true
}

// SKP Transaction Functions
export async function saveSKPTransaction(transaction: Omit<SKPTransaction, 'id' | 'created_at'>): Promise<SKPTransaction | null> {
  const { data, error } = await supabase
    .from('skp_transactions')
    .insert([transaction])
    .select()
    .single()

  if (error) {
    console.error('Error saving SKP transaction:', error)
    return null
  }

  return data
}

export async function getUserSKPTransactions(userId: string): Promise<SKPTransaction[]> {
  const { data, error } = await supabase
    .from('skp_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching SKP transactions:', error)
    return []
  }

  return data || []
}

export async function getUserSKPBalance(userId: string): Promise<number> {
  const transactions = await getUserSKPTransactions(userId)
  
  return transactions.reduce((balance, transaction) => {
    return transaction.type === 'earned' ? balance + transaction.amount : balance - transaction.amount
  }, 0)
}

// Category Progress Functions
export async function getCategoryProgress(userId: string): Promise<CategoryProgress[]> {
  const { data, error } = await supabase
    .from('category_progress')
    .select('*')
    .eq('user_id', userId)
    .order('last_answered_at', { ascending: false })

  if (error) {
    console.error('Error fetching category progress:', error)
    return []
  }

  return data || []
}

export async function updateCategoryProgress(
  userId: string, 
  categoryId: string, 
  correctAnswers: number, 
  totalAnswers: number
): Promise<CategoryProgress | null> {
  // Get existing progress
  const { data: existing } = await supabase
    .from('category_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .single()

  const now = new Date().toISOString()
  const xpGained = correctAnswers * 50 // 50 XP per correct answer

  if (existing) {
    // Update existing progress
    const updatedData = {
      correct_answers: existing.correct_answers + correctAnswers,
      total_answers: existing.total_answers + totalAnswers,
      total_xp: existing.total_xp + xpGained,
      current_level: Math.floor((existing.total_xp + xpGained) / 500) + 1,
      last_answered_at: now
    }

    const { data, error } = await supabase
      .from('category_progress')
      .update(updatedData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category progress:', error)
      return null
    }

    return data
  } else {
    // Create new progress record
    const newProgress = {
      user_id: userId,
      category_id: categoryId,
      correct_answers: correctAnswers,
      total_answers: totalAnswers,
      total_xp: xpGained,
      current_level: Math.floor(xpGained / 500) + 1,
      last_answered_at: now
    }

    const { data, error } = await supabase
      .from('category_progress')
      .insert([newProgress])
      .select()
      .single()

    if (error) {
      console.error('Error creating category progress:', error)
      return null
    }

    return data
  }
}

// Detailed Quiz Data Functions
export async function saveDetailedQuizData(detailData: Omit<DetailedQuizData, 'id' | 'created_at'>[]): Promise<boolean> {
  const { error } = await supabase
    .from('detailed_quiz_data')
    .insert(detailData)

  if (error) {
    console.error('Error saving detailed quiz data:', error)
    return false
  }

  return true
}

export async function getUserDetailedQuizData(userId: string): Promise<DetailedQuizData[]> {
  const { data, error } = await supabase
    .from('detailed_quiz_data')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1000) // Limit to recent records

  if (error) {
    console.error('Error fetching detailed quiz data:', error)
    return []
  }

  return data || []
}

// Analytics Functions
export async function getQuestionPerformanceStats(userId: string): Promise<{
  averageResponseTime: number
  averageConfidence: number
  categoryPerformance: Record<string, {
    averageResponseTime: number
    averageConfidence: number
    accuracy: number
    totalQuestions: number
  }>
}> {
  const detailedData = await getUserDetailedQuizData(userId)
  
  if (detailedData.length === 0) {
    return {
      averageResponseTime: 0,
      averageConfidence: 0,
      categoryPerformance: {}
    }
  }
  
  const totalResponseTime = detailedData.reduce((sum, q) => sum + q.response_time, 0)
  const confidenceLevels = detailedData.filter(q => q.confidence_level !== undefined).map(q => q.confidence_level!)
  
  const categoryStats = detailedData.reduce((acc, q) => {
    if (!acc[q.category]) {
      acc[q.category] = {
        responseTime: [],
        confidence: [],
        correct: 0,
        total: 0
      }
    }
    
    acc[q.category].responseTime.push(q.response_time)
    if (q.confidence_level !== undefined) {
      acc[q.category].confidence.push(q.confidence_level)
    }
    acc[q.category].total += 1
    if (q.is_correct) {
      acc[q.category].correct += 1
    }
    
    return acc
  }, {} as Record<string, {
    responseTime: number[]
    confidence: number[]
    correct: number
    total: number
  }>)
  
  const categoryPerformance = Object.entries(categoryStats).reduce((acc, [category, stats]) => {
    acc[category] = {
      averageResponseTime: stats.responseTime.reduce((sum, t) => sum + t, 0) / stats.responseTime.length,
      averageConfidence: stats.confidence.length > 0 
        ? stats.confidence.reduce((sum, c) => sum + c, 0) / stats.confidence.length 
        : 0,
      accuracy: stats.correct / stats.total,
      totalQuestions: stats.total
    }
    return acc
  }, {} as Record<string, {
    averageResponseTime: number
    averageConfidence: number
    accuracy: number
    totalQuestions: number
  }>)
  
  return {
    averageResponseTime: totalResponseTime / detailedData.length,
    averageConfidence: confidenceLevels.length > 0 
      ? confidenceLevels.reduce((sum, c) => sum + c, 0) / confidenceLevels.length 
      : 0,
    categoryPerformance
  }
}