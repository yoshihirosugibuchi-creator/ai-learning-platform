import { supabaseAdmin } from '@/lib/supabase-admin'
import { QuizQuestion } from '@/lib/database-types-official'

interface QuestionAnswer {
  questionId: string
  questionText: string
  selectedAnswer: string
  correctAnswer: string
  selectedOptionIndex: number
  isCorrect: boolean
  responseTime: number
  category: string
  subcategory?: string
  subcategory_id?: string
  difficulty: string
  confidenceLevel?: number
  maxHintLevel?: number
  hintUsed?: boolean
}

/**
 * 復習完了後の状態管理
 * 各問題の復習必要性を再評価し、review_neededフラグを更新
 */
export async function updateReviewStatus(
  userId: string,
  sessionId: string,
  completedAnswers: QuestionAnswer[]
): Promise<{
  success: boolean
  updatedCount: number
  errors: string[]
}> {
  console.log(`🔄 Updating review status for session ${sessionId}`, {
    userId: userId.substring(0, 8) + '...',
    answersCount: completedAnswers.length
  })

  const errors: string[] = []
  let updatedCount = 0

  try {
    for (const answer of completedAnswers) {
      try {

        // 復習完了時は過去のレコードを常にreview_needed=falseに更新
        // （新しいレコードの判定は別途quiz保存時に行われる）
        const stillNeedsReview = false

        console.log(`📝 Question ${answer.questionId} review completed - marking as finished:`, {
          isCorrect: answer.isCorrect,
          maxHintLevel: answer.maxHintLevel,
          confidenceLevel: answer.confidenceLevel,
          stillNeedsReview
        })




        // review_needed状態を更新 - 復習完了時は該当問題の全未復習レコードを更新
        const { error: updateError } = await supabaseAdmin
          .from('quiz_answers')
          .update({ 
            review_needed: stillNeedsReview,
            reviewed_at: stillNeedsReview ? null : new Date().toISOString()
            // Note: updated_at column does not exist in quiz_answers table
          })
          .eq('user_id', userId)
          .eq('question_id', answer.questionId)
          .eq('review_needed', true)  // 🔧 未復習のレコードのみ対象
          .is('reviewed_at', null)    // 🔧 reviewed_atがnullのレコードのみ対象


        if (updateError) {
          console.error(`❌ Failed to update review status for question ${answer.questionId}:`, updateError)
          errors.push(`Question ${answer.questionId}: ${updateError.message}`)
        } else {
          updatedCount++
          console.log(`✅ Updated review status for question ${answer.questionId}: ${stillNeedsReview ? 'needs review' : 'completed'}`)
        }

      } catch (questionError) {
        console.error(`❌ Error processing question ${answer.questionId}:`, questionError)
        errors.push(`Question ${answer.questionId}: ${questionError instanceof Error ? questionError.message : 'Unknown error'}`)
      }
    }

    console.log(`🎯 Review status update completed:`, {
      total: completedAnswers.length,
      updated: updatedCount,
      errors: errors.length
    })

    return {
      success: errors.length === 0,
      updatedCount,
      errors
    }

  } catch (error) {
    console.error('❌ Error in updateReviewStatus:', error)
    return {
      success: false,
      updatedCount,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * 復習対象問題の統計取得
 */
export async function getReviewStats(userId: string): Promise<{
  totalReviewNeeded: number
  reviewedToday: number
  reviewedThisWeek: number
  oldestReviewDate: string | null
  byCategory: Record<string, number>
}> {
  try {
    console.log(`📊 Getting review stats for user ${userId.substring(0, 8)}...`)

    // 復習必要な問題の総数
    const { data: reviewNeeded, error: reviewError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, category_id, created_at')
      .eq('user_id', userId)
      .eq('review_needed', true)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30日以内

    if (reviewError) {
      console.error('❌ Error fetching review needed questions:', reviewError)
      throw reviewError
    }

    // 今日復習した問題数
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: reviewedToday, error: todayError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id')
      .eq('user_id', userId)
      .not('reviewed_at', 'is', null)
      .gte('reviewed_at', today.toISOString())

    if (todayError) {
      console.error('❌ Error fetching today reviewed questions:', todayError)
    }

    // 今週復習した問題数
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay()) // 週の初め
    thisWeek.setHours(0, 0, 0, 0)

    const { data: reviewedThisWeek, error: weekError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id')
      .eq('user_id', userId)
      .not('reviewed_at', 'is', null)
      .gte('reviewed_at', thisWeek.toISOString())

    if (weekError) {
      console.error('❌ Error fetching week reviewed questions:', weekError)
    }

    // カテゴリー別集計
    const byCategory: Record<string, number> = {}
    if (reviewNeeded) {
      reviewNeeded.forEach(item => {
        const category = item.category_id || 'unknown'
        byCategory[category] = (byCategory[category] || 0) + 1
      })
    }

    // 最古の復習対象日
    const oldestReviewDate = reviewNeeded && reviewNeeded.length > 0
      ? reviewNeeded
          .filter(item => item.created_at)  // nullでない項目のみフィルター
          .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())[0]?.created_at || null
      : null

    const stats = {
      totalReviewNeeded: reviewNeeded?.length || 0,
      reviewedToday: reviewedToday?.length || 0,
      reviewedThisWeek: reviewedThisWeek?.length || 0,
      oldestReviewDate,
      byCategory
    }

    console.log(`✅ Review stats retrieved:`, stats)
    return stats

  } catch (error) {
    console.error('❌ Error in getReviewStats:', error)
    return {
      totalReviewNeeded: 0,
      reviewedToday: 0,
      reviewedThisWeek: 0,
      oldestReviewDate: null,
      byCategory: {}
    }
  }
}

/**
 * 復習問題の取得（ユーザー設定の問題数に対応）
 */
export async function getReviewQuestions(
  userId: string,
  maxQuestions: number = 10
): Promise<{
  questions: QuizQuestion[]
  totalAvailable: number
  selectedCount: number
}> {
  try {
    console.log(`🔍 Getting review questions for user ${userId.substring(0, 8)}...`, {
      maxQuestions
    })

    // 復習対象の問題IDを取得（3日以上経過したもの）
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: reviewAnswers, error: reviewError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, created_at')
      .eq('user_id', userId)
      .eq('review_needed', true)
      .lte('created_at', threeDaysAgo)
      .order('created_at', { ascending: true }) // 古いものから優先

    if (reviewError) {
      console.error('❌ Error fetching review question IDs:', reviewError)
      throw reviewError
    }

    const totalAvailable = reviewAnswers?.length || 0
    
    if (totalAvailable === 0) {
      console.log('ℹ️ No review questions available')
      return {
        questions: [],
        totalAvailable: 0,
        selectedCount: 0
      }
    }

    // 指定数まで選択
    const selectedAnswers = reviewAnswers.slice(0, maxQuestions)
    const selectedQuestionIds = selectedAnswers.map(item => parseInt(item.question_id))

    // 問題詳細を取得
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .in('id', selectedQuestionIds)
      .eq('is_deleted', false)

    if (questionsError) {
      console.error('❌ Error fetching question details:', questionsError)
      throw questionsError
    }

    // 問題を順序通りに並び替え
    const orderedQuestions = selectedQuestionIds
      .map(id => questions?.find(q => q.id === id))
      .filter(q => q !== undefined)

    console.log(`✅ Review questions retrieved:`, {
      totalAvailable,
      selectedCount: orderedQuestions.length,
      questionIds: selectedQuestionIds
    })

    return {
      questions: orderedQuestions,
      totalAvailable,
      selectedCount: orderedQuestions.length
    }

  } catch (error) {
    console.error('❌ Error in getReviewQuestions:', error)
    return {
      questions: [],
      totalAvailable: 0,
      selectedCount: 0
    }
  }
}