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
    const { data, error } = await supabase
      .from('quiz_results')
      .insert([{
        ...result,
        completed_at: new Date(result.completed_at).toISOString()
      }])
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
    return data
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
    return data
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
    return data
  }
}

// ユーザーの総合統計を取得（クイズ＋コース学習の統合統計）
export async function getUserStats(userId: string) {
  // CategoryProgressから全カテゴリーの統計を取得
  const { data: categoryProgress, error } = await supabase
    .from('category_progress')
    .select('correct_answers, total_answers')
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

  // CategoryProgressから全体統計を集計
  const totalAnswers = categoryProgress?.reduce((sum, cat) => sum + cat.total_answers, 0) || 0
  const totalCorrect = categoryProgress?.reduce((sum, cat) => sum + cat.correct_answers, 0) || 0

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