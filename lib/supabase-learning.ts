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

// Learning Progress Functions
export async function saveLearningProgressSupabase(
  userId: string, 
  courseId: string, 
  genreId: string, 
  themeId: string, 
  sessionId: string, 
  completed: boolean
): Promise<boolean> {
  try {
    console.log('🚀 Starting saveLearningProgressSupabase with params:', {
      userId, courseId, genreId, themeId, sessionId, completed
    })

    const settingKey = `lp_${courseId}_${genreId}_${themeId}_${sessionId}`
    console.log('📏 Setting key length:', settingKey.length, 'characters')
    console.log('📏 Setting key:', settingKey)
    
    const progressData = {
      user_id: userId,
      setting_key: settingKey,
      setting_value: {
        courseId,
        genreId,
        themeId,
        sessionId,
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        lastAccessedAt: new Date().toISOString()
      }
    }

    console.log('📋 Attempting to save progress data:', progressData)

    // Check authentication and table access before attempting upsert
    const { data: authUser, error: authError } = await supabase.auth.getUser()
    console.log('🔐 Auth check:', { user: authUser?.user?.id, error: authError })
    
    // Test table access with a simple query first
    const { data: testData, error: testError } = await supabase
      .from('user_settings')
      .select('id')
      .limit(1)
    console.log('🔍 Table access test:', { data: testData, error: testError })

    const { error } = await supabase
      .from('user_settings')
      .upsert(progressData)

    if (error) {
      console.error('📋 Raw error object:', error)
      console.error('📋 Error as JSON:', JSON.stringify(error, null, 2))
      console.error('📋 Error properties:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
        name: error.name
      })
      
      // Always fallback to localStorage for now since database might not be configured
      console.warn('⚠️ Database error detected, using localStorage fallback')
      
      // ローカルストレージにフォールバック（ブラウザ環境でのみ）
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const localKey = `lp_${userId}_${courseId}_${genreId}_${themeId}_${sessionId}`
          localStorage.setItem(localKey, JSON.stringify(progressData.setting_value))
          console.log('💾 Saved learning progress to localStorage as fallback')
          return true
        } catch (localError) {
          console.error('Failed to save to localStorage:', localError)
          return false
        }
      } else {
        console.warn('⚠️ localStorage not available (server-side), progress not saved')
        return false
      }
    }

    console.log(`💾 Saved learning progress for user ${userId}:`, progressData.setting_value)
    return true
  } catch (error) {
    console.error('Exception in saveLearningProgressSupabase:', {
      error,
      errorType: typeof error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : null
    })
    
    // Exceptionの場合もlocalStorageフォールバックを試行
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localKey = `lp_${userId}_${courseId}_${genreId}_${themeId}_${sessionId}`
        const progressValue = {
          courseId,
          genreId,
          themeId,
          sessionId,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
          lastAccessedAt: new Date().toISOString()
        }
        localStorage.setItem(localKey, JSON.stringify(progressValue))
        console.log('💾 Saved learning progress to localStorage as exception fallback')
        return true
      } catch (localError) {
        console.error('Failed to save to localStorage in exception handler:', localError)
      }
    }
    
    return false
  }
}

export async function getLearningProgressSupabase(userId: string): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', userId)
      .like('setting_key', 'lp_%')

    if (error) {
      // 406エラー、テーブル不存在、RLSエラーなどの場合はlocalStorageから読み込む
      if (error.code === '406' || error.code === '42P01' || error.message?.includes('policy')) {
        console.warn('⚠️ User settings table not accessible, trying localStorage fallback')
        
        // ブラウザ環境でのみlocalStorageを使用
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const progress: Record<string, any> = {}
            const localStorageKeys = Object.keys(localStorage).filter(key => 
              key.startsWith(`lp_${userId}_`)
            )
          
            localStorageKeys.forEach(key => {
              try {
                const storedData = localStorage.getItem(key)
                if (storedData) {
                  const progressData = JSON.parse(storedData)
                  // Extract progress key from localStorage key format: lp_{userId}_{courseId}_{genreId}_{themeId}_{sessionId}
                  const progressKey = key.replace(`lp_${userId}_`, '')
                  progress[progressKey] = progressData
                }
              } catch (parseError) {
                console.error('Error parsing localStorage progress data:', parseError)
              }
            })
            
            console.log(`📱 Loaded ${Object.keys(progress).length} progress entries from localStorage for user ${userId}`)
            return progress
          } catch (localError) {
            console.error('Error loading from localStorage:', localError)
            return {}
          }
        } else {
          console.warn('⚠️ localStorage not available (server-side), returning empty progress')
          return {}
        }
      }
      console.error('Error loading learning progress:', error)
      return {}
    }

    const progress: Record<string, any> = {}
    data?.forEach(item => {
      const key = item.setting_key.replace('lp_', '')
      progress[key] = item.setting_value
    })

    console.log(`📊 Loaded ${Object.keys(progress).length} progress entries for user ${userId}`)
    return progress
  } catch (error) {
    console.warn('Exception in getLearningProgressSupabase, trying localStorage fallback:', error)
    
    // ブラウザ環境でのみlocalStorageを使用
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const progress: Record<string, any> = {}
        const localStorageKeys = Object.keys(localStorage).filter(key => 
          key.startsWith(`lp_${userId}_`)
        )
        
        localStorageKeys.forEach(key => {
          try {
            const storedData = localStorage.getItem(key)
            if (storedData) {
              const progressData = JSON.parse(storedData)
              // Extract progress key from localStorage key format: lp_{userId}_{courseId}_{genreId}_{themeId}_{sessionId}
              const progressKey = key.replace(`lp_${userId}_`, '')
              progress[progressKey] = progressData
            }
          } catch (parseError) {
            console.error('Error parsing localStorage progress data:', parseError)
          }
        })
        
        console.log(`📱 Loaded ${Object.keys(progress).length} progress entries from localStorage for user ${userId}`)
        return progress
      } catch (localError) {
        console.error('Error loading from localStorage:', localError)
        return {}
      }
    } else {
      console.warn('⚠️ localStorage not available (server-side), returning empty progress')
      return {}
    }
  }
}

// Analytics Functions
// Personalization Settings Functions
export async function savePersonalizationSettings(userId: string, settingKey: string, settingValue: any): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      setting_key: settingKey,
      setting_value: settingValue
    })

  if (error) {
    console.error('Error saving personalization settings:', error)
    return false
  }

  return true
}

export async function getPersonalizationSettings(userId: string, settingKey?: string): Promise<any> {
  let query = supabase
    .from('user_settings')
    .select('setting_key, setting_value')
    .eq('user_id', userId)

  if (settingKey) {
    query = query.eq('setting_key', settingKey)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error loading personalization settings:', error)
    return settingKey ? null : {}
  }

  if (settingKey) {
    return data?.[0]?.setting_value || null
  }

  // Return all settings as a key-value object
  const settings: Record<string, any> = {}
  data?.forEach(item => {
    settings[item.setting_key] = item.setting_value
  })

  return settings
}

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