import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface XPStats {
  user: {
    total_xp: number
    current_level: number
    quiz_xp: number
    course_xp: number
    bonus_xp: number
    // SKP fields
    total_skp: number
    quiz_skp: number
    course_skp: number
    bonus_skp: number
    streak_skp: number
    // existing fields
    quiz_sessions_completed: number
    course_sessions_completed: number
    quiz_average_accuracy: number
    wisdom_cards_total: number
    knowledge_cards_total: number
    badges_total: number
    last_activity_at?: string
    // streak calculation
    learning_streak: number
  }
  categories: {
    [categoryId: string]: {
      total_xp: number
      current_level: number
      quiz_xp: number
      course_xp: number
      quiz_sessions_completed: number
      course_sessions_completed: number
      quiz_average_accuracy: number
    }
  }
  subcategories: {
    [subcategoryId: string]: {
      category_id: string
      total_xp: number
      current_level: number
      quiz_xp: number
      course_xp: number
      quiz_sessions_completed: number
      course_sessions_completed: number
      quiz_average_accuracy: number
    }
  }
  recent_activity: {
    date: string
    total_xp_earned: number
    quiz_xp_earned: number
    course_xp_earned: number
    bonus_xp_earned: number
    quiz_sessions: number
    course_sessions: number
  }[]
}

interface UseXPStatsReturn {
  stats: XPStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  saveQuizSession: (quizData: QuizSessionData) => Promise<QuizSaveResponse>
  saveCourseSession: (courseData: CourseSessionData) => Promise<CourseSaveResponse>
}

interface QuizSessionData {
  session_start_time: string
  session_end_time?: string
  total_questions: number
  correct_answers: number
  accuracy_rate: number
  answers: {
    question_id: string
    user_answer: number | null
    is_correct: boolean
    time_spent: number
    is_timeout: boolean
    category_id: string
    subcategory_id: string
    difficulty: string
  }[]
}

interface QuizSaveResponse {
  success: boolean
  session_id?: string
  total_xp?: number
  bonus_xp?: number
  wisdom_cards_awarded?: number
  message?: string
  error?: string
}

interface CourseSessionData {
  session_id: string
  course_id: string
  theme_id: string
  genre_id: string
  category_id: string
  subcategory_id: string
  session_quiz_correct: boolean
  is_first_completion?: boolean
}

interface CourseSaveResponse {
  success: boolean
  session_id?: string
  earned_xp?: number
  is_first_completion?: boolean
  quiz_correct?: boolean
  message?: string
  error?: string
}

/**
 * XP統計データの取得・更新を管理するReact Hook
 * 
 * 使用例:
 * const { stats, loading, error, refetch, saveQuizSession } = useXPStats()
 */
export function useXPStats(): UseXPStatsReturn {
  const [stats, setStats] = useState<XPStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Fetching XP stats...')
      
      // 認証トークン取得
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証トークンがありません。ログインしてください。')
      }
      
      const response = await fetch('/api/xp-stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('認証が必要です。ログインしてください。')
        }
        if (response.status === 404) {
          console.error(`❓ XP Stats API 404 Error:`, {
            url: response.url,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          })
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setStats(data)
      console.log('✅ XP stats loaded:', {
        totalXP: data.user.total_xp,
        totalSKP: data.user.total_skp,
        categories: Object.keys(data.categories).length,
        subcategories: Object.keys(data.subcategories).length
      })
      
    } catch (err) {
      console.error('❌ XP stats fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveQuizSession = useCallback(async (quizData: QuizSessionData): Promise<QuizSaveResponse> => {
    try {
      console.log('💾 Saving quiz session...', {
        questions: quizData.total_questions,
        correct: quizData.correct_answers,
        accuracy: quizData.accuracy_rate
      })
      
      // 認証トークン取得
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }
      
      const response = await fetch('/api/xp-save/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(quizData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Quiz save failed')
      }
      
      console.log('✅ Quiz session saved:', result)
      
      // 統計を自動更新
      await fetchStats()
      
      return result
      
    } catch (err) {
      console.error('❌ Quiz save error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }, [fetchStats])

  const saveCourseSession = useCallback(async (courseData: CourseSessionData): Promise<CourseSaveResponse> => {
    try {
      console.log('💾 Saving course session...', {
        session_id: courseData.session_id,
        course_id: courseData.course_id,
        quiz_correct: courseData.session_quiz_correct
      })
      
      // 認証トークン取得
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }
      
      const response = await fetch('/api/xp-save/course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(courseData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Course save failed')
      }
      
      console.log('✅ Course session saved:', result)
      
      // 統計を自動更新
      await fetchStats()
      
      return result
      
    } catch (err) {
      console.error('❌ Course save error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }, [fetchStats])

  // 初回読み込み
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    saveQuizSession,
    saveCourseSession
  }
}