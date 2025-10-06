/**
 * 直近7学習日数計算システム（実学習7日間方式）
 * 学習データの信頼度判定に使用
 */

import { supabase } from '@/lib/supabase'

// 学習日データ
export interface LearningDayData {
  date: string
  sessionCount: number
  questionsTotal: number
  questionsCorrect: number
  accuracyRate: number
  studyDurationMinutes: number
  isQualitySession: boolean
}

// 直近学習日数統計
export interface RecentLearningDaysStats {
  actualLearningDays: number
  periodDays: number
  qualityDays: number
  averageAccuracy: number
  totalQuestions: number
  totalStudyMinutes: number
  consistency: number
  dataReliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
  learningDates: string[]
}

/**
 * 直近実学習7日間を計算
 * 30日以内で実際に学習した最新7日分を対象とする
 * @param userId ユーザーID
 * @param targetLearningDays 対象学習日数（デフォルト: 7）
 * @param maxLookbackDays 最大遡り日数（デフォルト: 30）
 * @returns 直近学習日数統計
 */
export async function calculateRecentLearningDays(
  userId: string,
  targetLearningDays: number = 7,
  maxLookbackDays: number = 30
): Promise<RecentLearningDaysStats> {
  try {
    console.log(`📊 Calculating recent ${targetLearningDays} learning days for user: ${userId}`)
    console.log(`🔍 Looking back ${maxLookbackDays} days for actual learning sessions`)

    // 指定期間内の学習セッションを取得
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - maxLookbackDays * 24 * 60 * 60 * 1000)

    // quiz_sessionsから学習データを取得
    const { data: sessions, error } = await supabase
      .from('quiz_sessions')
      .select(`
        id,
        user_id,
        created_at,
        session_end_time,
        quiz_answers (
          id,
          question_id,
          is_correct
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('session_end_time', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching quiz sessions:', error)
      return getDefaultStats(targetLearningDays, maxLookbackDays)
    }

    if (!sessions || sessions.length === 0) {
      console.log('📭 No learning sessions found in the specified period')
      return getDefaultStats(targetLearningDays, maxLookbackDays)
    }

    console.log(`📚 Found ${sessions.length} completed quiz sessions`)

    // 日別学習データを集計
    const dailyData = aggregateDailyLearningData(sessions)
    
    // 実際の学習日を日付順でソート（最新順）
    const learningDays = Array.from(dailyData.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // 最新の targetLearningDays 日分を取得
    const recentLearningDays = learningDays.slice(0, targetLearningDays)
    
    console.log(`🎯 Found ${learningDays.length} actual learning days, using latest ${recentLearningDays.length} days`)
    
    // 統計を計算
    const stats = calculateLearningStats(recentLearningDays, targetLearningDays, maxLookbackDays)
    
    console.log(`✅ Recent learning days calculated:`, {
      actualDays: stats.actualLearningDays,
      qualityDays: stats.qualityDays,
      reliability: stats.dataReliability,
      accuracy: `${stats.averageAccuracy.toFixed(1)}%`
    })

    return stats

  } catch (error) {
    console.error('❌ Error in calculateRecentLearningDays:', error)
    return getDefaultStats(targetLearningDays, maxLookbackDays)
  }
}

/**
 * セッションデータを日別に集計
 */
function aggregateDailyLearningData(sessions: { created_at: string | null; session_end_time?: string | null; quiz_answers?: { is_correct: boolean }[] }[]): Map<string, LearningDayData> {
  const dailyMap = new Map<string, LearningDayData>()

  sessions.forEach(session => {
    if (!session.created_at) return
    const dateKey = new Date(session.created_at).toISOString().split('T')[0]
    const answers = session.quiz_answers || []
    
    const questionsTotal = answers.length
    const questionsCorrect = answers.filter((a: { is_correct: boolean }) => a.is_correct).length
    const _accuracyRate = questionsTotal > 0 ? (questionsCorrect / questionsTotal) * 100 : 0
    
    // セッション時間を計算（分単位）
    const startTime = new Date(session.created_at)
    const endTime = session.session_end_time ? new Date(session.session_end_time) : new Date(session.created_at!)
    const durationMs = endTime.getTime() - startTime.getTime()
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)))

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        sessionCount: 0,
        questionsTotal: 0,
        questionsCorrect: 0,
        accuracyRate: 0,
        studyDurationMinutes: 0,
        isQualitySession: false
      })
    }

    const dayData = dailyMap.get(dateKey)!
    dayData.sessionCount += 1
    dayData.questionsTotal += questionsTotal
    dayData.questionsCorrect += questionsCorrect
    dayData.studyDurationMinutes += durationMinutes

    // 日単位の正答率を再計算
    dayData.accuracyRate = dayData.questionsTotal > 0 
      ? (dayData.questionsCorrect / dayData.questionsTotal) * 100 
      : 0

    // 質の高いセッション判定（問題数5問以上 かつ 学習時間3分以上）
    dayData.isQualitySession = dayData.questionsTotal >= 5 && dayData.studyDurationMinutes >= 3
  })

  return dailyMap
}

/**
 * 学習統計を計算
 */
function calculateLearningStats(
  recentLearningDays: LearningDayData[],
  targetLearningDays: number,
  maxLookbackDays: number
): RecentLearningDaysStats {
  // 基本統計
  const actualLearningDays = recentLearningDays.length
  const qualityDays = recentLearningDays.filter(day => day.isQualitySession).length
  const totalQuestions = recentLearningDays.reduce((sum, day) => sum + day.questionsTotal, 0)
  const totalCorrect = recentLearningDays.reduce((sum, day) => sum + day.questionsCorrect, 0)
  const totalStudyMinutes = recentLearningDays.reduce((sum, day) => sum + day.studyDurationMinutes, 0)
  
  const averageAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0

  // 一貫性スコア計算（質の高いセッション率）
  const consistency = actualLearningDays > 0 ? (qualityDays / actualLearningDays) * 100 : 0

  // データ信頼度判定
  const dataReliability = determineDataReliability(
    actualLearningDays, 
    qualityDays, 
    totalQuestions, 
    targetLearningDays
  )

  // 学習日付リスト
  const learningDates = recentLearningDays.map(day => day.date)

  return {
    actualLearningDays,
    periodDays: maxLookbackDays,
    qualityDays,
    averageAccuracy,
    totalQuestions,
    totalStudyMinutes,
    consistency,
    dataReliability,
    learningDates
  }
}

/**
 * データ信頼度を判定（実学習日数ベース）
 */
function determineDataReliability(
  actualLearningDays: number,
  qualityDays: number,
  totalQuestions: number,
  targetLearningDays: number
): 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT' {
  // 学習日数の充足率
  const dayCompletionRatio = actualLearningDays / targetLearningDays
  
  // 質の高いセッション割合
  const qualityRatio = actualLearningDays > 0 ? qualityDays / actualLearningDays : 0

  console.log(`📊 Data reliability factors:`, {
    actualLearningDays,
    targetLearningDays,
    qualityDays,
    totalQuestions,
    dayCompletionRatio: Math.round(dayCompletionRatio * 100) + '%',
    qualityRatio: Math.round(qualityRatio * 100) + '%'
  })

  // 信頼度判定ロジック（実学習日数ベース）
  if (actualLearningDays === 0 || totalQuestions < 5) {
    return 'INSUFFICIENT'
  } else if (actualLearningDays >= 7 && qualityRatio >= 0.7 && totalQuestions >= 50) {
    return 'HIGH'
  } else if (actualLearningDays >= 4 && qualityRatio >= 0.5 && totalQuestions >= 25) {
    return 'MEDIUM'
  } else if (actualLearningDays >= 1 && totalQuestions >= 10) {
    return 'LOW'
  } else {
    return 'INSUFFICIENT'
  }
}

/**
 * デフォルト統計値を返す
 */
function getDefaultStats(targetLearningDays: number, maxLookbackDays: number): RecentLearningDaysStats {
  return {
    actualLearningDays: 0,
    periodDays: maxLookbackDays,
    qualityDays: 0,
    averageAccuracy: 0,
    totalQuestions: 0,
    totalStudyMinutes: 0,
    consistency: 0,
    dataReliability: 'INSUFFICIENT',
    learningDates: []
  }
}

/**
 * 学習継続性を分析
 * @param userId ユーザーID
 * @param days 分析する日数
 * @returns 継続性分析結果
 */
export async function analyzeLearningConsistency(
  userId: string,
  days: number = 30
): Promise<{
  streakDays: number
  longestStreak: number
  averageSessionsPerDay: number
  weeklyConsistency: number[]
  learningDaysInPeriod: number
}> {
  try {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

    const { data: sessions, error } = await supabase
      .from('quiz_sessions')
      .select('created_at, session_end_time')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .not('session_end_time', 'is', null)
      .order('created_at', { ascending: true })

    if (error || !sessions) {
      console.error('Error fetching consistency data:', error)
      return {
        streakDays: 0,
        longestStreak: 0,
        averageSessionsPerDay: 0,
        weeklyConsistency: [],
        learningDaysInPeriod: 0
      }
    }

    // 日別セッション数を計算
    const dailySessions = new Map<string, number>()
    sessions.forEach(session => {
      if (session.created_at) {
        const dateKey = new Date(session.created_at).toISOString().split('T')[0]
        dailySessions.set(dateKey, (dailySessions.get(dateKey) || 0) + 1)
      }
    })

    // 連続学習日数を計算（実際の学習日のみ）
    const sortedDates = Array.from(dailySessions.keys()).sort()
    let longestStreak = 0
    let tempStreak = 0

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prevDate = new Date(sortedDates[i - 1])
        const currDate = new Date(sortedDates[i])
        const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (dayDiff === 1) {
          tempStreak += 1
        } else {
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 1
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    // 現在の連続学習日数（今日から遡って）
    let currentStreak = 0
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    if (dailySessions.has(today) || dailySessions.has(yesterday)) {
      currentStreak = 1
      for (let i = 1; i < days; i++) {
        const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        if (dailySessions.has(checkDate)) {
          currentStreak = i + 1
        } else {
          break
        }
      }
    }

    // 週別一貫性（4週間分）
    const weeklyConsistency: number[] = []
    for (let week = 0; week < 4; week++) {
      let weekSessions = 0
      for (let day = 0; day < 7; day++) {
        const checkDate = new Date(Date.now() - (week * 7 + day) * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0]
        weekSessions += dailySessions.get(checkDate) || 0
      }
      weeklyConsistency.unshift(weekSessions)
    }

    const learningDaysInPeriod = dailySessions.size
    const averageSessionsPerDay = sessions.length / days

    return {
      streakDays: currentStreak,
      longestStreak,
      averageSessionsPerDay,
      weeklyConsistency,
      learningDaysInPeriod
    }

  } catch (error) {
    console.error('Error analyzing consistency:', error)
    return {
      streakDays: 0,
      longestStreak: 0,
      averageSessionsPerDay: 0,
      weeklyConsistency: [],
      learningDaysInPeriod: 0
    }
  }
}

/**
 * 学習パターン分析
 * @param userId ユーザーID
 * @returns 学習パターン情報
 */
export async function analyzeLearningPatterns(userId: string): Promise<{
  preferredTimeSlots: string[]
  optimalSessionLength: number
  weeklyActivityPattern: number[]
  performanceByTimeOfDay: { timeSlot: string, accuracy: number }[]
}> {
  try {
    const { data: sessions, error } = await supabase
      .from('quiz_sessions')
      .select(`
        created_at,
        session_end_time,
        quiz_answers (
          is_correct
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .not('session_end_time', 'is', null)
      .order('created_at', { ascending: false })

    if (error || !sessions) {
      console.error('Error fetching pattern data:', error)
      return {
        preferredTimeSlots: [],
        optimalSessionLength: 15,
        weeklyActivityPattern: [],
        performanceByTimeOfDay: []
      }
    }

    // 時間帯別分析
    const timeSlotData = new Map<string, { count: number, totalCorrect: number, totalQuestions: number }>()
    const dailyActivity = new Array(7).fill(0)
    const sessionLengths: number[] = []

    sessions.forEach(session => {
      if (!session.created_at) return
      
      const startTime = new Date(session.created_at)
      const endTime = session.session_end_time ? new Date(session.session_end_time) : new Date(session.created_at)
      const hour = startTime.getHours()
      const dayOfWeek = startTime.getDay()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      // 時間帯分類
      let timeSlot = ''
      if (hour >= 6 && hour < 12) timeSlot = 'morning'
      else if (hour >= 12 && hour < 18) timeSlot = 'afternoon'  
      else if (hour >= 18 && hour < 22) timeSlot = 'evening'
      else timeSlot = 'night'

      if (!timeSlotData.has(timeSlot)) {
        timeSlotData.set(timeSlot, { count: 0, totalCorrect: 0, totalQuestions: 0 })
      }

      const slotData = timeSlotData.get(timeSlot)!
      slotData.count += 1
      
      const answers = session.quiz_answers || []
      slotData.totalQuestions += answers.length
      slotData.totalCorrect += answers.filter((a: { is_correct: boolean }) => a.is_correct).length

      dailyActivity[dayOfWeek] += 1
      if (duration > 0 && duration < 120) {
        sessionLengths.push(duration)
      }
    })

    // 優先時間帯（セッション数が多い順）
    const preferredTimeSlots = Array.from(timeSlotData.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 2)
      .map(([slot]) => slot)

    // 最適セッション長（中央値）
    sessionLengths.sort((a, b) => a - b)
    const optimalSessionLength = sessionLengths.length > 0 
      ? sessionLengths[Math.floor(sessionLengths.length / 2)]
      : 15

    // 時間帯別パフォーマンス
    const performanceByTimeOfDay = Array.from(timeSlotData.entries())
      .map(([timeSlot, data]) => ({
        timeSlot,
        accuracy: data.totalQuestions > 0 ? (data.totalCorrect / data.totalQuestions) * 100 : 0
      }))
      .sort((a, b) => b.accuracy - a.accuracy)

    return {
      preferredTimeSlots,
      optimalSessionLength,
      weeklyActivityPattern: dailyActivity,
      performanceByTimeOfDay
    }

  } catch (error) {
    console.error('Error analyzing learning patterns:', error)
    return {
      preferredTimeSlots: [],
      optimalSessionLength: 15,
      weeklyActivityPattern: [],
      performanceByTimeOfDay: []
    }
  }
}