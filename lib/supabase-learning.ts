import { supabase } from './supabase-admin'
import { loadXPSettings } from './xp-settings'
import { DATABASE_FALLBACK_SETTINGS } from './xp-settings-fallback.generated'

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
    // Additional fields for course learning
    sessionType?: 'course_learning' | 'quiz' | 'mixed'
    hasQuiz?: boolean
    quizAnswers?: Array<{
      questionIndex: number
      selectedAnswer: string | number
      isCorrect: boolean
      question?: string
      correctAnswer?: string
      timeSpent?: number
    }>
    // Additional course-specific fields
    quizScore?: number
    totalQuestions?: number
    correctAnswers?: number
    themeId?: string
    genreId?: string
    categoryId?: string
    subcategoryId?: string
    sessionId?: string
    completedAt?: string
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
  // learning_progressテーブルにデータを保存
  const progressData = {
    user_id: session.user_id,
    course_id: session.course_id || '',
    session_id: session.session_id,
    progress_data: session.content_interactions || {},
    completion_percentage: session.completed ? 100 : 0,
    completed_at: session.completed ? (session.end_time || new Date().toISOString()) : null,
    session_start_time: session.start_time,
    session_end_time: session.end_time,
    duration_seconds: session.duration ? Math.floor(session.duration / 1000) : null
  }

  const { data, error } = await supabase
    .from('learning_progress')
    .insert([progressData])
    .select()
    .single()

  if (error) {
    console.error('Error saving learning session:', error)
    return null
  }

  // learning_progressデータをLearningSession形式に変換して返す
  const learningSession: LearningSession = {
    id: data.id,
    user_id: session.user_id,
    session_id: session.session_id,
    course_id: session.course_id,
    genre_id: session.genre_id,
    theme_id: session.theme_id,
    start_time: session.start_time,
    end_time: session.end_time,
    duration: session.duration,
    completed: session.completed,
    quiz_score: session.quiz_score,
    content_interactions: session.content_interactions,
    created_at: data.created_at || undefined,
    updated_at: data.updated_at || undefined
  }

  return learningSession
}

export async function getUserLearningSessions(userId: string): Promise<LearningSession[]> {
  // learning_progressテーブルから進捗データを取得
  const { data, error } = await supabase
    .from('learning_progress')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching learning sessions:', error)
    return []
  }

  // learning_progressデータをLearningSession形式に変換
  const sessions = (data || []).map(progress => ({
    id: progress.id,
    user_id: userId,
    session_id: progress.session_id || '',
    course_id: progress.course_id,
    genre_id: '',
    theme_id: '',
    start_time: progress.created_at || new Date().toISOString(),
    end_time: progress.completed_at || undefined,
    duration: 0,
    completed: progress.completion_percentage === 100,
    quiz_score: 0,
    content_interactions: progress.progress_data as {
      scrollDepth: number
      timeOnSection: Record<string, number>
      clickEvents: Array<{ element: string; timestamp: string }>
    } | undefined,
    created_at: progress.created_at || undefined,
    updated_at: progress.updated_at || undefined
  }))

  return sessions
}

export async function updateLearningSession(sessionId: string, updates: Partial<LearningSession>): Promise<boolean> {
  // LearningSessionの更新内容をlearning_progress形式に変換
  const progressUpdates: Record<string, unknown> = {}
  
  if (updates.completed !== undefined) {
    progressUpdates.completion_percentage = updates.completed ? 100 : 0
  }
  if (updates.end_time !== undefined) {
    progressUpdates.completed_at = updates.end_time
  }
  if (updates.content_interactions !== undefined) {
    progressUpdates.progress_data = updates.content_interactions
  }
  
  progressUpdates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('learning_progress')
    .update(progressUpdates)
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

  // DBデータをSKPTransaction形式に変換
  return {
    id: data.id,
    user_id: data.user_id || '',
    type: data.type as 'earned' | 'spent',
    amount: data.amount,
    source: data.source,
    description: data.description,
    timestamp: data.timestamp || new Date().toISOString(),
    created_at: data.created_at || undefined
  }
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

  // DBデータをSKPTransaction形式に変換
  return (data || []).map(transaction => ({
    id: transaction.id,
    user_id: transaction.user_id || '',
    type: transaction.type as 'earned' | 'spent',
    amount: transaction.amount,
    source: transaction.source,
    description: transaction.description,
    timestamp: transaction.timestamp || new Date().toISOString(),
    created_at: transaction.created_at || undefined
  }))
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
    .from('user_category_xp_stats_v2')
    .select(`
      id,
      user_id,
      category_id,
      current_level,
      total_xp,
      quiz_questions_correct,
      quiz_questions_answered,
      updated_at,
      created_at
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching category progress:', error)
    return []
  }

  // v2テーブルのデータをCategoryProgress形式にマッピング
  const mappedData = data?.map(item => ({
    id: item.id,
    user_id: item.user_id,
    category_id: item.category_id,
    current_level: item.current_level,
    total_xp: item.total_xp,
    correct_answers: item.quiz_questions_correct,
    total_answers: item.quiz_questions_answered,
    last_answered_at: item.updated_at || undefined,
    created_at: item.created_at || undefined,
    updated_at: item.updated_at || undefined
  })) || []

  return mappedData
}

export async function updateCategoryProgress(
  userId: string, 
  categoryId: string, 
  correctAnswers: number, 
  totalAnswers: number,
  xpGained: number = 0 // XPは外部で計算されて渡される
): Promise<CategoryProgress | null> {
  console.log(`📊 updateCategoryProgress: userId=${userId}, categoryId=${categoryId}, correctAnswers=${correctAnswers}, totalAnswers=${totalAnswers}, xpGained=${xpGained}`)
  
  // Get existing progress from v2 table
  const { data: existing } = await supabase
    .from('user_category_xp_stats_v2')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .single()

  console.log(`Found existing progress:`, existing ? 'Yes' : 'No')

  const now = new Date().toISOString()

  if (existing) {
    // Update existing progress
    const newTotalXP = existing.total_xp + xpGained
    const newQuizXP = existing.quiz_xp + xpGained
    const newCorrectAnswers = existing.quiz_questions_correct + correctAnswers
    const newTotalAnswers = existing.quiz_questions_answered + totalAnswers
    
    // テーブルベース設定でレベル計算（フォールバック付き）
    let newLevel = 1
    try {
      const xpSettings = await loadXPSettings()
      newLevel = Math.floor(newTotalXP / xpSettings.level.main_category_threshold) + 1
    } catch {
      newLevel = Math.floor(newTotalXP / DATABASE_FALLBACK_SETTINGS.level.main_category_threshold) + 1
    }
    
    // Calculate accuracy
    const newAccuracy = newTotalAnswers > 0 ? Math.round((newCorrectAnswers / newTotalAnswers) * 100) : 0
    
    const updatedData = {
      total_xp: newTotalXP,
      quiz_xp: newQuizXP,
      quiz_questions_correct: newCorrectAnswers,
      quiz_questions_answered: newTotalAnswers,
      quiz_average_accuracy: newAccuracy,
      current_level: newLevel,
      updated_at: now
    }
    
    console.log(`📈 Updating v2 progress: old_xp=${existing.total_xp} + ${xpGained} = ${newTotalXP}, level=${newLevel}`)

    const { data, error } = await supabase
      .from('user_category_xp_stats_v2')
      .update(updatedData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category progress:', error)
      return null
    }

    // Map v2 data back to CategoryProgress format
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      current_level: data.current_level,
      total_xp: data.total_xp,
      correct_answers: data.quiz_questions_correct,
      total_answers: data.quiz_questions_answered,
      last_answered_at: data.updated_at || undefined,
      created_at: data.created_at || undefined,
      updated_at: data.updated_at || undefined
    }
  } else {
    // テーブルベース設定でレベル計算（フォールバック付き）
    let newLevel = 1
    try {
      const xpSettings = await loadXPSettings()
      newLevel = Math.floor(xpGained / xpSettings.level.main_category_threshold) + 1
    } catch {
      newLevel = Math.floor(xpGained / DATABASE_FALLBACK_SETTINGS.level.main_category_threshold) + 1
    }
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
    
    const newProgress = {
      user_id: userId,
      category_id: categoryId,
      total_xp: xpGained,
      quiz_xp: xpGained,
      course_xp: 0,
      current_level: newLevel,
      quiz_sessions_completed: 0, // Will be updated by other systems
      quiz_questions_answered: totalAnswers,
      quiz_questions_correct: correctAnswers,
      quiz_average_accuracy: accuracy,
      course_sessions_completed: 0,
      course_themes_completed: 0,
      course_completions: 0,
      created_at: now,
      updated_at: now
    }
    
    console.log(`📝 Creating new v2 progress: xp=${xpGained}, level=${newLevel}`)

    const { data, error } = await supabase
      .from('user_category_xp_stats_v2')
      .insert([newProgress])
      .select()
      .single()

    if (error) {
      console.error('Error creating category progress:', error)
      return null
    }
    
    console.log(`✅ Created new v2 progress record:`, data)
    
    // Map v2 data back to CategoryProgress format
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      current_level: data.current_level,
      total_xp: data.total_xp,
      correct_answers: data.quiz_questions_correct,
      total_answers: data.quiz_questions_answered,
      last_answered_at: data.updated_at || undefined,
      created_at: data.created_at || undefined,
      updated_at: data.updated_at || undefined
    }
  }
}

// Detailed Quiz Data Functions（レガシー関数 - 使用禁止）
// Note: detailed_quiz_dataテーブルは削除済み。代わりにquiz_answersを使用してください
export async function saveDetailedQuizData(_detailData: Omit<DetailedQuizData, 'id' | 'created_at'>[]): Promise<boolean> {
  console.warn('⚠️ saveDetailedQuizData: レガシー関数です。quiz_answersテーブルを使用してください')
  return false
}

export async function getUserDetailedQuizData(_userId: string): Promise<DetailedQuizData[]> {
  console.warn('⚠️ getUserDetailedQuizData: レガシー関数です。quiz_answersテーブルを使用してください')
  return []
}

// Learning Progress Functions
/**
 * @deprecated この関数は廃止されました。
 * 現在はcourse_session_completions / course_theme_completionsテーブルで
 * コース完了を管理しています。
 * 
 * XP保存は /api/xp-save/course で自動的に行われます。
 * user_settingsテーブルは使用禁止です。
 */
export async function saveLearningProgressSupabase(
  _userId: string, 
  _courseId: string, 
  _genreId: string, 
  _themeId: string, 
  _sessionId: string, 
  _completed: boolean
): Promise<boolean> {
  console.warn('⚠️ saveLearningProgressSupabase: DEPRECATED - この関数は廃止されました')
  console.warn('📋 コース完了は course_session_completions / course_theme_completions で管理されます')
  console.warn('💾 XP保存は /api/xp-save/course で自動実行されます')
  console.warn('🚫 user_settingsテーブルは使用禁止です')
  
  // 何もせずに成功を返す（既存呼び出し元でエラーにならないように）
  return true
}

/**
 * @deprecated この関数は廃止されました。
 * 現在はcourse_session_completions / course_theme_completionsテーブルで
 * コース完了を管理しています。
 * user_settingsテーブルは使用禁止です。
 */
export async function getLearningProgressSupabase(_userId: string): Promise<Record<string, unknown>> {
  console.warn('⚠️ getLearningProgressSupabase: DEPRECATED - この関数は廃止されました')
  console.warn('📋 コース完了は course_session_completions / course_theme_completions で管理されます')
  console.warn('🚫 user_settingsテーブルは使用禁止です')
  
  // 空のオブジェクトを返す（既存呼び出し元でエラーにならないように）
  return {}
}

// Analytics Functions
// Personalization Settings Functions
export async function savePersonalizationSettings(userId: string, settingKey: string, settingValue: unknown): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      setting_key: settingKey,
      setting_value: JSON.stringify(settingValue)
    })

  if (error) {
    console.error('Error saving personalization settings:', error)
    return false
  }

  return true
}

export async function getPersonalizationSettings(userId: string, settingKey?: string): Promise<Record<string, unknown> | unknown> {
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
  const settings: Record<string, unknown> = {}
  data?.forEach(item => {
    settings[item.setting_key] = item.setting_value
  })

  return settings
}

// ユーザーの学習ストリーク（連続学習日数）を計算 - XPシステム統合版
export async function getUserLearningStreak(userId: string): Promise<number> {
  try {
    // XPシステムのdaily_xp_recordsテーブルから連続日数を計算
    
    // XP統計とdaily_xp_recordsを取得
    const { data: userStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!userStats) {
      console.log('No XP stats found for user, returning 0 streak')
      return 0
    }
    
    // recent_activityを取得
    const { data: activities } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)
    
    if (!activities || activities.length === 0) {
      console.log('No daily XP records found for user, returning 0 streak')
      return 0
    }
    
    // 今日の日付を文字列形式で取得（タイムゾーン問題を回避）
    const today = new Date()
    const currentDateStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0')
    
    let streak = 0
    let lastActivityDay = -1 // まだ活動を見つけていない
    
    console.log('🔍 Debug: Starting streak calculation for user:', userId.substring(0, 8) + '...')
    console.log('🔍 Debug: Current date string:', currentDateStr)
    console.log('🔍 Debug: Available activities count:', activities.length)
    
    // まず全ての活動をデバッグ出力
    activities.forEach(act => {
      console.log('🔍 Debug: Activity record:', {
        date: act.date,
        quiz_sessions: act.quiz_sessions,
        course_sessions: act.course_sessions,
        total_activity: (act.quiz_sessions || 0) + (act.course_sessions || 0)
      })
    })

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) { // 最大30日前まで確認
      // 該当日の活動を探す
      const checkDate = new Date(currentDateStr)
      checkDate.setDate(checkDate.getDate() - dayOffset)
      const checkDateStr = checkDate.getFullYear() + '-' + 
        String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(checkDate.getDate()).padStart(2, '0')
      
      const dayActivity = activities.find(act => act.date === checkDateStr)
      const hasActivity = dayActivity && ((dayActivity.quiz_sessions || 0) > 0 || (dayActivity.course_sessions || 0) > 0)
      
      console.log(`🔍 Debug: Checking day -${dayOffset} (${checkDateStr}):`, {
        found: !!dayActivity,
        hasActivity,
        quizSessions: dayActivity?.quiz_sessions || 0,
        courseSessions: dayActivity?.course_sessions || 0,
        currentStreak: streak
      })
      
      if (hasActivity) {
        if (lastActivityDay === -1) {
          // 最初の活動を発見
          lastActivityDay = dayOffset
          streak = 1
          console.log(`✅ Debug: First activity found on day -${dayOffset}, streak = 1`)
        } else if (dayOffset === lastActivityDay + 1) {
          // 連続した活動
          lastActivityDay = dayOffset
          streak++
          console.log(`✅ Debug: Consecutive activity on day -${dayOffset}, streak = ${streak}`)
        } else {
          // 活動はあるが連続していない
          console.log(`❌ Debug: Gap found! Expected day -${lastActivityDay + 1}, found -${dayOffset}`)
          break
        }
      } else {
        if (lastActivityDay !== -1) {
          // 活動が見つかっていたが、この日は活動なし
          console.log(`❌ Debug: No activity on day -${dayOffset}, stopping streak at ${streak}`)
          break
        }
        // まだ活動が見つかっていないので続行
        console.log(`⏭️ Debug: No activity on day -${dayOffset}, continuing search...`)
      }
    }
    
    console.log('📊 XP-based learning streak calculated:', streak)
    return streak
    
  } catch (error) {
    console.error('Error calculating XP-based learning streak:', error)
    
    // フォールバック: quiz_sessionsから直接計算
    try {
      console.log('📅 Fallback: Using quiz_sessions for streak calculation')
      
      // quiz_sessionsテーブルから直接取得
      const { data: quizSessions, error: quizError } = await supabase
        .from('quiz_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (quizError || !quizSessions || quizSessions.length === 0) {
        console.log('No quiz sessions found for fallback streak calculation')
        return 0
      }

      // 学習した日付のリストを作成（重複除去してソート）
      const learningDates = quizSessions
        .map(session => session.created_at?.split('T')[0])
        .filter(date => date)
        .filter((date, index, arr) => arr.indexOf(date) === index)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())

      console.log('📅 Learning dates from quiz sessions:', learningDates.slice(0, 10))

      if (learningDates.length === 0) return 0

      // 今日から連続で学習している日数を計算
      const today = new Date()
      const todayStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0')
      
      let streak = 0
      const checkDate = new Date(today)
      
      console.log('📅 Starting streak calculation from:', todayStr)

      for (let i = 0; i < 30; i++) { // Check last 30 days
        const checkDateStr = checkDate.getFullYear() + '-' + 
          String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(checkDate.getDate()).padStart(2, '0')
        
        if (learningDates.includes(checkDateStr)) {
          streak++
          console.log(`📅 Found activity on ${checkDateStr}, streak = ${streak}`)
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          console.log(`📅 No activity on ${checkDateStr}, stopping at streak = ${streak}`)
          break
        }
      }

      console.log('📅 Final streak from quiz sessions:', streak)
      return streak
    } catch (fallbackError) {
      console.error('Error in fallback learning streak calculation:', fallbackError)
      return 0
    }
  }
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