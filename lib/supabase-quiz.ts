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

// クイズ結果を保存（シンプル版）
export async function saveQuizResult(result: Omit<QuizResult, 'id' | 'created_at'>): Promise<QuizResult | null> {
  console.log('🔍 Attempting to save quiz result:', result)
  
  try {
    const insertData = {
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
      .from('quiz_results')
      .insert(insertData)
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
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id || undefined,
      questions: data.questions as Record<string, unknown>[],
      answers: data.answers as Record<string, unknown>[],
      score: data.score,
      total_questions: data.total_questions,
      time_taken: data.time_taken,
      completed_at: data.completed_at || new Date().toISOString()
    }
  } catch (saveError) {
    console.error('❌ Quiz save exception:', (saveError as Error)?.message || saveError)
    throw saveError
  }
}

// ユーザーのクイズ結果を取得
export async function getUserQuizResults(userId: string): Promise<QuizResult[]> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching quiz results:', error)
    return []
  }

  // DBデータをQuizResult形式に変換
  return (data || []).map(result => ({
    id: result.id,
    user_id: result.user_id,
    category_id: result.category_id,
    subcategory_id: result.subcategory_id || undefined,
    questions: result.questions as Record<string, unknown>[],
    answers: result.answers as Record<string, unknown>[],
    score: result.score,
    total_questions: result.total_questions,
    time_taken: result.time_taken,
    completed_at: result.completed_at || new Date().toISOString()
  }))
}

// 特定カテゴリのクイズ結果を取得
export async function getCategoryQuizResults(userId: string, categoryId: string): Promise<QuizResult[]> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Error fetching category quiz results:', error)
    return []
  }

  // DBデータをQuizResult形式に変換
  return (data || []).map(result => ({
    id: result.id,
    user_id: result.user_id,
    category_id: result.category_id,
    subcategory_id: result.subcategory_id || undefined,
    questions: Array.isArray(result.questions) ? result.questions as Record<string, unknown>[] : [],
    answers: Array.isArray(result.answers) ? result.answers as Record<string, unknown>[] : [],
    score: result.score,
    total_questions: result.total_questions,
    time_taken: result.time_taken,
    completed_at: result.completed_at || new Date().toISOString()
  }))
}

// ユーザー進捗を更新または作成
export async function updateUserProgress(
  userId: string, 
  categoryId: string, 
  subcategoryId: string | null, 
  correctAnswers: number, 
  totalQuestions: number
): Promise<UserProgress | null> {
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

  if (existing) {
    // 更新
    const { data, error } = await supabase
      .from('user_progress')
      .update(progressData)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('❌ User progress update error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        updateData: progressData
      })
      return null
    }
    // DBデータをUserProgress形式に変換
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id || undefined,
      correct_answers: data.correct_answers || 0,
      total_attempts: data.total_attempts || 0,
      last_accessed: data.last_accessed || new Date().toISOString(),
      created_at: data.created_at || undefined
    }
  } else {
    // 新規作成
    const { data, error } = await supabase
      .from('user_progress')
      .insert([progressData])
      .select()
      .single()

    if (error) {
      console.error('❌ User progress creation error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        insertData: progressData
      })
      return null
    }
    // DBデータをUserProgress形式に変換
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      subcategory_id: data.subcategory_id || undefined,
      correct_answers: data.correct_answers || 0,
      total_attempts: data.total_attempts || 0,
      last_accessed: data.last_accessed || new Date().toISOString(),
      created_at: data.created_at || undefined
    }
  }
}

// ユーザーの総合統計を取得（クイズ＋コース学習の統合統計）
export async function getUserStats(userId: string) {
  // user_category_xp_stats_v2から全カテゴリーの統計を取得
  const { data: categoryProgress, error } = await supabase
    .from('user_category_xp_stats_v2')
    .select('quiz_questions_correct, quiz_questions_answered')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching category progress for stats:', error)
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      totalQuizzes: 0,
      averageScore: 0,
      totalTimeSpent: 0
    }
  }

  // user_category_xp_stats_v2から全体統計を集計
  const totalAnswers = categoryProgress?.reduce((sum, cat) => sum + cat.quiz_questions_answered, 0) || 0
  const totalCorrect = categoryProgress?.reduce((sum, cat) => sum + cat.quiz_questions_correct, 0) || 0

  // クイズ結果から追加統計を取得
  const quizResults = await getUserQuizResults(userId)
  const totalTimeSpent = quizResults.reduce((sum, result) => sum + result.time_taken, 0)
  const averageScore = quizResults.length > 0 ? Math.round(quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length) : 0

  return {
    totalQuestions: totalAnswers,
    correctAnswers: totalCorrect,
    accuracy: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0,
    totalQuizzes: quizResults.length,
    averageScore,
    totalTimeSpent
  }
}