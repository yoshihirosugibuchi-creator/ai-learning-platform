import { supabase } from './supabase'

// 学習分析データ型定義
export interface LearningAnalytics {
  totalSessions: number
  completedSessions: number
  totalQuizQuestions: number
  correctAnswers: number
  accuracy: number
  learningDays: number
  streak: number
  averageSessionTime: number
  categoriesProgress: CategoryProgress[]
  recentActivity: ActivityRecord[]
  weeklyProgress: WeeklyProgress[]
}

export interface CategoryProgress {
  category: string
  totalSessions: number
  completedSessions: number
  accuracy: number
  lastAccessed: string
}

export interface ActivityRecord {
  date: string
  sessionsCompleted: number
  quizScore: number
  timeSpent: number
}

export interface WeeklyProgress {
  week: string
  sessionsCompleted: number
  averageScore: number
  timeSpent: number
}

// 学習分析データを取得
export async function getLearningAnalytics(userId: string): Promise<LearningAnalytics> {
  try {
    // 学習セッションデータを取得
    const { data: sessions, error: sessionsError } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.warn('Database error, using localStorage fallback for analytics')
      return getAnalyticsFromLocalStorage(userId)
    }

    // 学習進捗データを取得
    const { data: progressData, error: progressError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .like('setting_key', 'lp_%')

    if (progressError) {
      console.warn('Progress data error, using partial analytics')
    }

    return calculateAnalytics(sessions || [], progressData || [])
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return getAnalyticsFromLocalStorage(userId)
  }
}

// データベースから分析データを計算
function calculateAnalytics(sessions: any[], progressData: any[]): LearningAnalytics {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // 基本統計
  const totalSessions = sessions.length
  const completedSessions = sessions.filter(s => s.completed).length
  const totalQuizQuestions = sessions.reduce((sum, s) => sum + (s.quiz_score ? 1 : 0), 0)
  const averageQuizScore = sessions
    .filter(s => s.quiz_score !== null)
    .reduce((sum, s) => sum + s.quiz_score, 0) / Math.max(totalQuizQuestions, 1)
  
  // 学習日数計算
  const uniqueDates = new Set(
    sessions.map(s => new Date(s.created_at).toDateString())
  )
  const learningDays = uniqueDates.size

  // 連続学習日数（簡易計算）
  const streak = calculateStreak(sessions)

  // 平均セッション時間
  const averageSessionTime = sessions
    .filter(s => s.duration)
    .reduce((sum, s) => sum + s.duration, 0) / Math.max(completedSessions, 1)

  // カテゴリー別進捗
  const categoriesProgress = calculateCategoryProgress(sessions, progressData)

  // 最近のアクティビティ
  const recentActivity = calculateRecentActivity(sessions)

  // 週間進捗
  const weeklyProgress = calculateWeeklyProgress(sessions)

  return {
    totalSessions,
    completedSessions,
    totalQuizQuestions,
    correctAnswers: Math.round(averageQuizScore * totalQuizQuestions / 100),
    accuracy: Math.round(averageQuizScore),
    learningDays,
    streak,
    averageSessionTime: Math.round(averageSessionTime / 1000 / 60), // 分に変換
    categoriesProgress,
    recentActivity,
    weeklyProgress
  }
}

// 連続学習日数を計算
function calculateStreak(sessions: any[]): number {
  if (sessions.length === 0) return 0

  const today = new Date()
  const dates = sessions
    .map(s => new Date(s.created_at).toDateString())
    .filter((date, index, arr) => arr.indexOf(date) === index) // 重複除去
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // 降順ソート

  let streak = 0
  let currentDate = new Date(today)
  
  for (const dateStr of dates) {
    const sessionDate = new Date(dateStr)
    const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === streak) {
      streak++
      currentDate = sessionDate
    } else {
      break
    }
  }

  return streak
}

// カテゴリー別進捗を計算
function calculateCategoryProgress(sessions: any[], progressData: any[]): CategoryProgress[] {
  const categoryMap = new Map<string, any>()

  sessions.forEach(session => {
    const category = session.course_id || 'unknown'
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        totalSessions: 0,
        completedSessions: 0,
        totalQuizScore: 0,
        quizCount: 0,
        lastAccessed: session.created_at
      })
    }

    const categoryData = categoryMap.get(category)
    categoryData.totalSessions++
    if (session.completed) {
      categoryData.completedSessions++
    }
    if (session.quiz_score !== null) {
      categoryData.totalQuizScore += session.quiz_score
      categoryData.quizCount++
    }
    if (new Date(session.created_at) > new Date(categoryData.lastAccessed)) {
      categoryData.lastAccessed = session.created_at
    }
  })

  return Array.from(categoryMap.values()).map(cat => ({
    category: cat.category,
    totalSessions: cat.totalSessions,
    completedSessions: cat.completedSessions,
    accuracy: cat.quizCount > 0 ? Math.round(cat.totalQuizScore / cat.quizCount) : 0,
    lastAccessed: cat.lastAccessed
  }))
}

// 最近のアクティビティを計算
function calculateRecentActivity(sessions: any[]): ActivityRecord[] {
  const dailyMap = new Map<string, any>()
  
  sessions.forEach(session => {
    const date = new Date(session.created_at).toDateString()
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        sessionsCompleted: 0,
        totalQuizScore: 0,
        quizCount: 0,
        timeSpent: 0
      })
    }

    const dayData = dailyMap.get(date)
    if (session.completed) {
      dayData.sessionsCompleted++
    }
    if (session.quiz_score !== null) {
      dayData.totalQuizScore += session.quiz_score
      dayData.quizCount++
    }
    if (session.duration) {
      dayData.timeSpent += session.duration
    }
  })

  return Array.from(dailyMap.values())
    .map(day => ({
      date: day.date,
      sessionsCompleted: day.sessionsCompleted,
      quizScore: day.quizCount > 0 ? Math.round(day.totalQuizScore / day.quizCount) : 0,
      timeSpent: Math.round(day.timeSpent / 1000 / 60) // 分に変換
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7) // 最近7日間
}

// 週間進捗を計算
function calculateWeeklyProgress(sessions: any[]): WeeklyProgress[] {
  const now = new Date()
  const weeks: WeeklyProgress[] = []

  for (let i = 0; i < 4; i++) { // 過去4週間
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    
    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.created_at)
      return sessionDate >= weekStart && sessionDate < weekEnd
    })

    const completedSessions = weekSessions.filter(s => s.completed).length
    const quizScores = weekSessions.filter(s => s.quiz_score !== null).map(s => s.quiz_score)
    const averageScore = quizScores.length > 0 ? 
      Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length) : 0
    const timeSpent = weekSessions
      .filter(s => s.duration)
      .reduce((sum, s) => sum + s.duration, 0)

    weeks.push({
      week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      sessionsCompleted: completedSessions,
      averageScore,
      timeSpent: Math.round(timeSpent / 1000 / 60) // 分に変換
    })
  }

  return weeks.reverse() // 古い週から順に
}

// localStorage フォールバック
function getAnalyticsFromLocalStorage(userId: string): LearningAnalytics {
  if (typeof window === 'undefined') {
    return getDefaultAnalytics()
  }

  try {
    // localStorage から学習データを集計
    const progressKeys = Object.keys(localStorage).filter(key => key.startsWith('lp_'))
    const cardKeys = Object.keys(localStorage).filter(key => key.startsWith('knowledge_card_'))
    
    const totalSessions = progressKeys.length
    const completedSessions = progressKeys.filter(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        return data.completed
      } catch {
        return false
      }
    }).length

    // 基本的な統計を計算
    const learningDays = new Set(
      progressKeys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          return new Date(data.completedAt || data.lastAccessedAt || Date.now()).toDateString()
        } catch {
          return new Date().toDateString()
        }
      })
    ).size

    return {
      totalSessions,
      completedSessions,
      totalQuizQuestions: completedSessions, // 簡易計算
      correctAnswers: Math.round(completedSessions * 0.8), // 仮定: 80%正答率
      accuracy: 80,
      learningDays,
      streak: learningDays > 0 ? 1 : 0,
      averageSessionTime: 5, // 仮定: 5分
      categoriesProgress: [{
        category: 'ai_literacy_fundamentals',
        totalSessions,
        completedSessions,
        accuracy: 80,
        lastAccessed: new Date().toISOString()
      }],
      recentActivity: [{
        date: new Date().toDateString(),
        sessionsCompleted: completedSessions,
        quizScore: 80,
        timeSpent: completedSessions * 5
      }],
      weeklyProgress: [{
        week: new Date().toLocaleDateString(),
        sessionsCompleted: completedSessions,
        averageScore: 80,
        timeSpent: completedSessions * 5
      }]
    }
  } catch (error) {
    console.error('Error calculating localStorage analytics:', error)
    return getDefaultAnalytics()
  }
}

// デフォルト分析データ
function getDefaultAnalytics(): LearningAnalytics {
  return {
    totalSessions: 0,
    completedSessions: 0,
    totalQuizQuestions: 0,
    correctAnswers: 0,
    accuracy: 0,
    learningDays: 0,
    streak: 0,
    averageSessionTime: 0,
    categoriesProgress: [],
    recentActivity: [],
    weeklyProgress: []
  }
}