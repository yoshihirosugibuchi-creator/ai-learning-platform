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
    // XP統計から実際のデータを取得
    const { data: xpStats, error: xpStatsError } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    // クイズセッション履歴を取得
    const { data: quizSessions, error: _quizSessionsError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // 学習進捗データを取得
    const { data: progressData, error: progressError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .like('setting_key', 'lp_%')

    if (progressError) {
      console.warn('Progress data error, using partial analytics')
    }

    // XPシステムから連続日数を取得
    const streakFromXP = await calculateStreakFromXP(userId)

    // XP統計データが存在する場合はそれを使用、そうでなければセッションデータから計算
    if (!xpStatsError && xpStats) {
      return await calculateAnalyticsFromXP(xpStats, quizSessions || [], progressData || [], streakFromXP, userId)
    } else {
      console.warn('No XP stats found, using session-based analytics')
      return await calculateAnalytics(quizSessions || [], progressData || [], streakFromXP, userId)
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return getAnalyticsFromLocalStorage(userId)
  }
}

// XP統計から分析データを計算
async function calculateAnalyticsFromXP(
  xpStats: {
    quiz_sessions_completed?: number;
    course_sessions_completed?: number;
    quiz_questions_answered?: number;
    quiz_questions_correct?: number;
    quiz_average_accuracy?: number;
  }, 
  quizSessions: Array<Record<string, unknown>>, 
  progressData: Array<Record<string, unknown>>, 
  xpStreak?: number, 
  userId?: string
): Promise<LearningAnalytics> {
  // XP統計から基本データを取得
  const totalSessions = (xpStats.quiz_sessions_completed || 0) + (xpStats.course_sessions_completed || 0)
  const completedSessions = totalSessions // XP統計に記録されているものは完了済み
  const totalQuizQuestions = xpStats.quiz_questions_answered || 0
  const correctAnswers = xpStats.quiz_questions_correct || 0
  const accuracy = xpStats.quiz_average_accuracy || 0

  // クイズセッションから追加データを計算
  const uniqueDates = new Set(
    quizSessions.map(s => new Date((s as Record<string, unknown>).created_at as string).toDateString())
  )
  const learningDays = uniqueDates.size

  // 平均セッション時間（クイズセッションから推定）
  const averageSessionTime = quizSessions.length > 0 ? 5 : 0 // 仮定: 5分

  // カテゴリー別進捗
  const categoriesProgress = calculateCategoryProgress(quizSessions, progressData)

  // 最近のアクティビティ
  const recentActivity = calculateRecentActivity(quizSessions)

  // 週間進捗
  const weeklyProgress = userId ? await calculateWeeklyProgress(userId) : []

  return {
    totalSessions,
    completedSessions,
    totalQuizQuestions,
    correctAnswers,
    accuracy: Math.round(accuracy * 100) / 100, // 小数点第2位まで
    learningDays,
    streak: xpStreak !== undefined ? xpStreak : 0,
    averageSessionTime,
    categoriesProgress,
    recentActivity,
    weeklyProgress
  }
}

// データベースから分析データを計算（フォールバック用）
async function calculateAnalytics(sessions: Array<Record<string, unknown>>, progressData: Array<Record<string, unknown>>, xpStreak?: number, userId?: string): Promise<LearningAnalytics> {
  const now = new Date()
  const _oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // 基本統計
  const totalSessions = sessions.length
  const completedSessions = sessions.filter(s => (s as Record<string, unknown>).completed).length
  const totalQuizQuestions = sessions.reduce((sum, s) => sum + ((s as Record<string, unknown>).quiz_score ? 1 : 0), 0)
  const averageQuizScore = sessions
    .filter(s => (s as Record<string, unknown>).quiz_score !== null)
    .reduce((sum, s) => sum + ((s as Record<string, unknown>).quiz_score as number), 0) / Math.max(totalQuizQuestions, 1)
  
  // 学習日数計算
  const uniqueDates = new Set(
    sessions.map(s => new Date((s as Record<string, unknown>).created_at as string).toDateString())
  )
  const learningDays = uniqueDates.size

  // 連続学習日数（XPシステム統合版またはフォールバック）
  const streak = xpStreak !== undefined ? xpStreak : calculateStreak(sessions)

  // 平均セッション時間
  const averageSessionTime = sessions
    .filter(s => (s as Record<string, unknown>).duration)
    .reduce((sum, s) => sum + ((s as Record<string, unknown>).duration as number), 0) / Math.max(completedSessions, 1)

  // カテゴリー別進捗
  const categoriesProgress = calculateCategoryProgress(sessions, progressData)

  // 最近のアクティビティ
  const recentActivity = calculateRecentActivity(sessions)

  // 週間進捗
  const weeklyProgress = userId ? await calculateWeeklyProgress(userId) : []

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

// XPシステムから連続学習日数を計算
async function calculateStreakFromXP(userId: string): Promise<number> {
  try {
    // XPシステムのdaily_xp_recordsテーブルから連続日数を計算
    const { data: activities } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)
    
    if (!activities || activities.length === 0) {
      return 0
    }
    
    // 今日の日付を文字列形式で取得（タイムゾーン問題を回避）
    const today = new Date()
    const currentDateStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0')
    
    let streak = 0
    let lastActivityDay = -1 // まだ活動を見つけていない
    
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) { // 最大30日前まで確認
      // 該当日の活動を探す
      const checkDate = new Date(currentDateStr)
      checkDate.setDate(checkDate.getDate() - dayOffset)
      const checkDateStr = checkDate.getFullYear() + '-' + 
        String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(checkDate.getDate()).padStart(2, '0')
      
      const dayActivity = activities.find(act => act.date === checkDateStr)
      const hasActivity = dayActivity && ((dayActivity.quiz_sessions || 0) > 0 || (dayActivity.course_sessions || 0) > 0)
      
      if (hasActivity) {
        if (lastActivityDay === -1) {
          // 最初の活動を発見
          lastActivityDay = dayOffset
          streak = 1
        } else if (dayOffset === lastActivityDay + 1) {
          // 連続した活動
          lastActivityDay = dayOffset
          streak++
        } else {
          // 活動はあるが連続していない
          break
        }
      } else {
        if (lastActivityDay !== -1) {
          // 活動が見つかっていたが、この日は活動なし
          break
        }
        // まだ活動が見つかっていないので続行
      }
    }
    
    console.log('📊 Analytics XP-based streak calculated:', streak)
    return streak
    
  } catch (error) {
    console.error('Error calculating XP-based streak for analytics:', error)
    // フォールバック: 0を返す
    return 0
  }
}

// 連続学習日数を計算（フォールバック用）
function calculateStreak(sessions: Array<Record<string, unknown>>): number {
  if (sessions.length === 0) return 0

  const today = new Date()
  const dates = sessions
    .map(s => new Date((s as Record<string, unknown>).created_at as string).toDateString())
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
function calculateCategoryProgress(sessions: Array<Record<string, unknown>>, _progressData: Array<Record<string, unknown>>): CategoryProgress[] {
  const categoryMap = new Map<string, Record<string, unknown>>()

  sessions.forEach(session => {
    const s = session as Record<string, unknown>
    const category = (s.course_id as string) || 'unknown'
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        totalSessions: 0,
        completedSessions: 0,
        totalQuizScore: 0,
        quizCount: 0,
        lastAccessed: s.created_at as string
      })
    }

    const categoryData = categoryMap.get(category)!
    categoryData.totalSessions = (categoryData.totalSessions as number) + 1
    if (s.completed) {
      categoryData.completedSessions = (categoryData.completedSessions as number) + 1
    }
    if (s.quiz_score !== null) {
      categoryData.totalQuizScore = (categoryData.totalQuizScore as number) + (s.quiz_score as number)
      categoryData.quizCount = (categoryData.quizCount as number) + 1
    }
    if (new Date(s.created_at as string) > new Date(categoryData.lastAccessed as string)) {
      categoryData.lastAccessed = s.created_at as string
    }
  })

  return Array.from(categoryMap.values()).map(cat => ({
    category: cat.category as string,
    totalSessions: cat.totalSessions as number,
    completedSessions: cat.completedSessions as number,
    accuracy: (cat.quizCount as number) > 0 ? Math.round((cat.totalQuizScore as number) / (cat.quizCount as number)) : 0,
    lastAccessed: cat.lastAccessed as string
  }))
}

// 最近のアクティビティを計算
function calculateRecentActivity(sessions: Array<Record<string, unknown>>): ActivityRecord[] {
  const dailyMap = new Map<string, Record<string, unknown>>()
  
  sessions.forEach(session => {
    const s = session as Record<string, unknown>
    const date = new Date(s.created_at as string).toDateString()
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        sessionsCompleted: 0,
        totalQuizScore: 0,
        quizCount: 0,
        timeSpent: 0
      })
    }

    const dayData = dailyMap.get(date)!
    if (s.completed) {
      dayData.sessionsCompleted = (dayData.sessionsCompleted as number) + 1
    }
    if (s.quiz_score !== null) {
      dayData.totalQuizScore = (dayData.totalQuizScore as number) + (s.quiz_score as number)
      dayData.quizCount = (dayData.quizCount as number) + 1
    }
    if (s.duration) {
      dayData.timeSpent = (dayData.timeSpent as number) + (s.duration as number)
    }
  })

  return Array.from(dailyMap.values())
    .map(day => ({
      date: day.date as string,
      sessionsCompleted: day.sessionsCompleted as number,
      quizScore: (day.quizCount as number) > 0 ? Math.round((day.totalQuizScore as number) / (day.quizCount as number)) : 0,
      timeSpent: Math.round((day.timeSpent as number) / 1000 / 60) // 分に変換
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7) // 最近7日間
}

// 週間進捗を計算（月曜始まり・日曜終わり、新XPシステム対応）
async function calculateWeeklyProgress(userId: string): Promise<WeeklyProgress[]> {
  const now = new Date()
  const weeks: WeeklyProgress[] = []

  for (let i = 0; i < 4; i++) { // 過去4週間
    const { monday, sunday } = getWeekBounds(now, i)
    
    // 指定週の日付範囲を文字列に変換
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]
    
    try {
      // daily_xp_recordsから週のデータを取得
      const { data: dailyRecords } = await supabase
        .from('daily_xp_records')
        .select('*')
        .eq('user_id', userId)
        .gte('date', mondayStr)
        .lte('date', sundayStr)
        .order('date', { ascending: true })

      // quiz_sessionsから詳細データを取得（正答率計算用）
      const { data: quizSessions } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', monday.toISOString())
        .lte('created_at', sunday.toISOString())

      // セッション数の計算
      const totalQuizSessions = dailyRecords?.reduce((sum, record) => sum + (record.quiz_sessions || 0), 0) || 0
      const totalCourseSessions = dailyRecords?.reduce((sum, record) => sum + (record.course_sessions || 0), 0) || 0
      const completedSessions = totalQuizSessions + totalCourseSessions

      // 平均スコア（正答率）の計算
      let averageScore = 0
      if (quizSessions && quizSessions.length > 0) {
        const totalQuestions = quizSessions.reduce((sum, session) => sum + (session.total_questions || 0), 0)
        const totalCorrect = quizSessions.reduce((sum, session) => sum + (session.correct_answers || 0), 0)
        averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
      }

      // 学習時間の計算（推定）
      // クイズ: 平均5分/セッション、コース: 平均10分/セッション
      const estimatedTimeSpent = (totalQuizSessions * 5) + (totalCourseSessions * 10)

      // 週表示ラベル
      const weekLabel = formatWeekLabel(monday, sunday, i)

      weeks.push({
        week: weekLabel,
        sessionsCompleted: completedSessions,
        averageScore,
        timeSpent: estimatedTimeSpent
      })
    } catch (error) {
      console.warn(`⚠️ Error calculating weekly progress for week ${i}:`, error)
      
      // エラー時のフォールバック
      const weekLabel = formatWeekLabel(monday, sunday, i)
      weeks.push({
        week: weekLabel,
        sessionsCompleted: 0,
        averageScore: 0,
        timeSpent: 0
      })
    }
  }

  return weeks.reverse() // 古い週から順に
}

// 指定した週の月曜日と日曜日を取得
function getWeekBounds(date: Date, weeksAgo: number): { monday: Date, sunday: Date } {
  const target = new Date(date)
  target.setDate(date.getDate() - (weeksAgo * 7))
  
  // その週の月曜日を取得
  const dayOfWeek = target.getDay() // 0=日曜, 1=月曜, ...
  const monday = new Date(target)
  monday.setDate(target.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0) // 開始時刻を00:00:00に設定
  
  // その週の日曜日を取得
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999) // 終了時刻を23:59:59に設定
  
  return { monday, sunday }
}

// 週ラベルのフォーマット（月をまたぐ場合を考慮）
function formatWeekLabel(monday: Date, sunday: Date, weekIndex: number): string {
  const mondayMonth = monday.getMonth() + 1
  const mondayDate = monday.getDate()
  const sundayMonth = sunday.getMonth() + 1
  const sundayDate = sunday.getDate()
  
  // 今週の場合
  if (weekIndex === 0) {
    if (mondayMonth === sundayMonth) {
      return `今週 (${mondayMonth}/${mondayDate}-${sundayDate})`
    } else {
      return `今週 (${mondayMonth}/${mondayDate}-${sundayMonth}/${sundayDate})`
    }
  }
  
  // 月をまたがない場合
  if (mondayMonth === sundayMonth) {
    return `${mondayMonth}/${mondayDate}-${sundayDate}`
  } else {
    // 月をまたぐ場合
    return `${mondayMonth}/${mondayDate}-${sundayMonth}/${sundayDate}`
  }
}

// localStorage フォールバック
function getAnalyticsFromLocalStorage(_userId: string): LearningAnalytics {
  if (typeof window === 'undefined') {
    return getDefaultAnalytics()
  }

  try {
    // localStorage から学習データを集計
    const progressKeys = Object.keys(localStorage).filter(key => key.startsWith('lp_'))
    const _cardKeys = Object.keys(localStorage).filter(key => key.startsWith('knowledge_card_'))
    
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
      correctAnswers: 0, // フォールバック時はデータなし
      accuracy: -1, // -1で「計算中」を示す
      learningDays,
      streak: learningDays > 0 ? 1 : 0,
      averageSessionTime: 5, // 仮定: 5分
      categoriesProgress: [{
        category: 'ai_literacy_fundamentals',
        totalSessions,
        completedSessions,
        accuracy: -1, // 計算中
        lastAccessed: new Date().toISOString()
      }],
      recentActivity: [{
        date: new Date().toDateString(),
        sessionsCompleted: completedSessions,
        quizScore: -1, // 計算中
        timeSpent: completedSessions * 5
      }],
      weeklyProgress: [{
        week: new Date().toLocaleDateString(),
        sessionsCompleted: completedSessions,
        averageScore: -1, // 計算中
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