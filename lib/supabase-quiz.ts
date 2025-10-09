import { supabase } from './supabase'

export interface QuizResult {
  id?: string
  user_id: string
  category_id: string
  subcategory_id?: string
  questions: Record<string, unknown>[]
  answers: Record<string, unknown>[]
  score: number
  total_questions: number
  time_taken: number // 秒単位
  completed_at: string
  created_at?: string
}

export interface UserProgress {
  id?: string
  user_id: string
  category_id: string
  subcategory_id?: string
  correct_answers: number
  total_attempts: number
  last_accessed: string
  created_at?: string
}

// クイズ結果を保存（レガシー関数 - 使用禁止）
// Note: quiz_resultsテーブルは削除済み。代わりにquiz_sessionsを使用してください
export async function saveQuizResult(result: Omit<QuizResult, 'id' | 'created_at'>): Promise<QuizResult | null> {
  console.log('🔍 Attempting to save quiz result:', result)
  
  try {
    const _insertData = {
      category_id: result.category_id,
      subcategory_id: result.subcategory_id,
      user_id: result.user_id,
      questions: JSON.stringify(result.questions),
      answers: JSON.stringify(result.answers),
      score: result.score,
      total_questions: result.total_questions,
      time_taken: result.time_taken,
      completed_at: new Date(result.completed_at).toISOString()
    }
    
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: result.user_id,
        correct_answers: result.score,
        total_questions: result.total_questions,
        accuracy_rate: (result.score / result.total_questions) * 100,
        session_start_time: new Date(result.completed_at).toISOString(),
        session_end_time: new Date(result.completed_at).toISOString(),
        status: 'completed',
        total_xp: 0,
        bonus_xp: 0
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Quiz result save error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        insertData: result
      })
      return null
    }

    console.log('✅ Quiz result saved successfully:', data)
    // DBデータをQuizResult形式に変換
    // quiz_sessionsテーブル構造に合わせて変換
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: '', // quiz_sessionsには存在しないため空値
      subcategory_id: undefined,
      questions: [], // quiz_sessionsには保存されない
      answers: [], // quiz_sessionsには保存されない
      score: data.correct_answers,
      total_questions: data.total_questions,
      time_taken: 0, // quiz_sessionsには保存されない
      completed_at: data.session_end_time || new Date().toISOString()
    }
  } catch (saveError) {
    console.error('❌ Quiz save exception:', (saveError as Error)?.message || saveError)
    throw saveError
  }
}

// ユーザーのクイズ結果を取得（レガシー関数 - 使用禁止）
// 新実装: quiz_sessions + quiz_answersから詳細データを復元
export async function getUserQuizResults(userId: string): Promise<QuizResult[]> {
  // quiz_sessionsとquiz_answersを結合して詳細データを取得
  const { data: sessions, error: sessionsError } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      quiz_answers (
        id,
        question_id,
        user_answer,
        is_correct,
        time_spent,
        difficulty,
        category_id,
        subcategory_id,
        earned_xp
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching quiz sessions:', sessionsError)
    return []
  }

  // quiz_sessionsベースでQuizResult形式に変換
  return (sessions || []).map(session => ({
    id: session.id,
    user_id: session.user_id,
    // quiz_answersから最初の回答のカテゴリーを取得（セッション全体の代表として）
    category_id: session.quiz_answers?.[0]?.category_id || '',
    subcategory_id: session.quiz_answers?.[0]?.subcategory_id || undefined,
    // quiz_answersの質問IDと回答を復元
    questions: session.quiz_answers?.map(answer => ({
      id: answer.question_id,
      difficulty: answer.difficulty
    })) || [],
    answers: session.quiz_answers?.map(answer => ({
      question_id: answer.question_id,
      user_answer: answer.user_answer,
      is_correct: answer.is_correct,
      time_spent: answer.time_spent,
      earned_xp: answer.earned_xp
    })) || [],
    score: session.correct_answers,
    total_questions: session.total_questions,
    time_taken: session.quiz_answers?.reduce((sum, answer) => sum + (answer.time_spent || 0), 0) || 0,
    completed_at: session.session_end_time || session.created_at || new Date().toISOString()
  }))
}

// 新実装: 特定カテゴリのクイズ結果をquiz_sessions + quiz_answersから取得
export async function getCategoryQuizResults(userId: string, categoryId: string): Promise<QuizResult[]> {
  // quiz_sessionsでユーザーのセッションを取得し、quiz_answersでカテゴリーフィルタ
  const { data: sessions, error: sessionsError } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      quiz_answers!inner (
        id,
        question_id,
        user_answer,
        is_correct,
        time_spent,
        difficulty,
        category_id,
        subcategory_id,
        earned_xp
      )
    `)
    .eq('user_id', userId)
    .eq('quiz_answers.category_id', categoryId)
    .order('created_at', { ascending: false })

  if (sessionsError) {
    console.error('Error fetching category quiz sessions:', sessionsError)
    return []
  }

  // quiz_sessionsベースでQuizResult形式に変換（カテゴリーフィルタ済み）
  return (sessions || []).map(session => ({
    id: session.id,
    user_id: session.user_id,
    category_id: categoryId,
    subcategory_id: session.quiz_answers?.[0]?.subcategory_id || undefined,
    questions: session.quiz_answers?.map(answer => ({
      id: answer.question_id,
      difficulty: answer.difficulty
    })) || [],
    answers: session.quiz_answers?.map(answer => ({
      question_id: answer.question_id,
      user_answer: answer.user_answer,
      is_correct: answer.is_correct,
      time_spent: answer.time_spent,
      earned_xp: answer.earned_xp
    })) || [],
    score: session.correct_answers,
    total_questions: session.total_questions,
    time_taken: session.quiz_answers?.reduce((sum, answer) => sum + (answer.time_spent || 0), 0) || 0,
    completed_at: session.session_end_time || session.created_at || new Date().toISOString()
  }))
}

// ユーザー進捗を更新または作成（レガシー関数 - 使用禁止）
// Note: user_progressテーブルは削除済み。代わりにuser_category_xp_stats_v2を使用してください
export async function updateUserProgress(
  _userId: string, 
  _categoryId: string, 
  _subcategoryId: string | null, 
  _correctAnswers: number, 
  _totalQuestions: number
): Promise<UserProgress | null> {
  console.warn('⚠️ updateUserProgress is deprecated - user_progress table deleted. Use user_category_xp_stats_v2 instead.')
  return null
  
  // 以下の実装は削除されたテーブルへの参照のためコメント化
  /*
  // 既存の進捗を取得
  const { data: existing } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('subcategory_id', subcategoryId || '')
    .single()

  const progressData = {
    user_id: userId,
    category_id: categoryId,
    subcategory_id: subcategoryId || '',
    correct_answers: (existing?.correct_answers || 0) + correctAnswers,
    total_attempts: (existing?.total_attempts || 0) + totalQuestions,
    last_accessed: new Date().toISOString()
  }

  */
}

// ユーザーの総合統計を取得（v2統計システムベース）
export async function getUserStats(userId: string) {
  // user_xp_stats_v2から統合統計を取得
  const { data: userStats, error: userStatsError } = await supabase
    .from('user_xp_stats_v2')
    .select('quiz_questions_answered, quiz_questions_correct, quiz_sessions_completed, quiz_average_accuracy, quiz_learning_time_seconds')
    .eq('user_id', userId)
    .maybeSingle() // single()ではなくmaybeSingle()を使用

  if (userStatsError) {
    console.error('Error fetching user stats:', userStatsError)
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      totalQuizzes: 0,
      averageScore: 0,
      totalTimeSpent: 0
    }
  }

  // データが存在しない場合（新規ユーザーなど）
  if (!userStats) {
    console.log(`No user stats found for user ${userId}, returning defaults`)
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      totalQuizzes: 0,
      averageScore: 0,
      totalTimeSpent: 0
    }
  }

  // quiz_sessionsから追加統計を取得（v2システム）
  const { data: _quizSessions, error: sessionsError } = await supabase
    .from('quiz_sessions')
    .select('total_questions, correct_answers, accuracy_rate')
    .eq('user_id', userId)

  if (sessionsError) {
    console.warn('Warning: Could not fetch quiz sessions:', sessionsError)
  }

  const totalQuizzes = userStats?.quiz_sessions_completed || 0
  const averageScore = userStats?.quiz_average_accuracy ? Math.round(userStats.quiz_average_accuracy * 100) : 0
  const totalTimeSpent = Math.round((userStats?.quiz_learning_time_seconds || 0) / 60) // 秒から分に変換

  return {
    totalQuestions: userStats?.quiz_questions_answered || 0,
    correctAnswers: userStats?.quiz_questions_correct || 0,
    accuracy: averageScore,
    totalQuizzes,
    averageScore,
    totalTimeSpent
  }
}