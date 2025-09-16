import { supabase } from './supabase'

export interface QuizResult {
  id?: string
  user_id: string
  category_id: string
  subcategory_id?: string
  questions: any[]
  answers: any[]
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

// クイズ結果を保存
export async function saveQuizResult(result: Omit<QuizResult, 'id' | 'created_at'>): Promise<QuizResult | null> {
  const { data, error } = await supabase
    .from('quiz_results')
    .insert([{
      ...result,
      completed_at: new Date(result.completed_at).toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Error saving quiz result:', error)
    return null
  }

  return data
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

  return data || []
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

  return data || []
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
  let { data: existing } = await supabase
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
      console.error('Error updating user progress:', error)
      return null
    }
    return data
  } else {
    // 新規作成
    const { data, error } = await supabase
      .from('user_progress')
      .insert([progressData])
      .select()
      .single()

    if (error) {
      console.error('Error creating user progress:', error)
      return null
    }
    return data
  }
}

// ユーザーの総合統計を取得
export async function getUserStats(userId: string) {
  const quizResults = await getUserQuizResults(userId)
  
  if (quizResults.length === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      totalQuizzes: 0,
      averageScore: 0,
      totalTimeSpent: 0
    }
  }

  const totalQuestions = quizResults.reduce((sum, result) => sum + result.total_questions, 0)
  const totalScore = quizResults.reduce((sum, result) => sum + result.score, 0)
  const totalTimeSpent = quizResults.reduce((sum, result) => sum + result.time_taken, 0)
  const correctAnswers = Math.round((totalScore / 100) * totalQuestions)

  return {
    totalQuestions,
    correctAnswers,
    accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    totalQuizzes: quizResults.length,
    averageScore: Math.round(totalScore / quizResults.length),
    totalTimeSpent
  }
}