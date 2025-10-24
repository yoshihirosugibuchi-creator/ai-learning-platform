import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { getTotalReviewQuestionsCount } from '@/lib/review-logic'
import { getUserReviewSettings, shouldShowReviewNotification } from '@/lib/user-review-settings'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * ユーザーの復習統計情報を取得
 * GET /api/review/stats
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    console.log(`📊 Fetching review stats for user: ${userId}`)

    // 並列で各統計を取得
    const [
      totalReviewNeeded,
      reviewSettings,
      todayReviewCount,
      reviewEffectiveness
    ] = await Promise.all([
      getTotalReviewQuestionsCount(userId),
      getUserReviewSettings(userId),
      getTodayReviewCompletedCount(userId),
      calculateReviewEffectiveness(userId)
    ])

    // 最後の復習日を取得
    const lastReviewDate = await getLastReviewDate(userId)

    // 復習通知判定
    const shouldNotify = await shouldShowReviewNotification(userId, lastReviewDate || undefined)

    const stats = {
      totalReviewNeeded,
      todayCompleted: todayReviewCount,
      reviewSettings,
      reviewEffectiveness,
      lastReviewDate: lastReviewDate?.toISOString() || null,
      shouldShowNotification: shouldNotify,
      lastCalculated: new Date().toISOString()
    }

    console.log(`✅ Review stats calculated for user ${userId}:`, {
      totalReviewNeeded,
      todayCompleted: todayReviewCount,
      shouldNotify,
      effectivenessImprovement: reviewEffectiveness.improvement
    })

    return NextResponse.json(stats)

  } catch (error) {
    console.error('❌ Error in review stats API:', error)
    return NextResponse.json(
      { error: '復習統計の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 今日の復習完了数を取得
 */
async function getTodayReviewCompletedCount(userId: string): Promise<number> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data, error } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (error) {
      console.error('❌ Error fetching today review count:', error)
      return 0
    }

    return data?.length || 0

  } catch (error) {
    console.error('❌ Error in getTodayReviewCompletedCount:', error)
    return 0
  }
}

/**
 * 最後の復習日を取得
 */
async function getLastReviewDate(userId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('quiz_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data.created_at ? new Date(data.created_at) : null

  } catch (error) {
    console.error('❌ Error in getLastReviewDate:', error)
    return null
  }
}

/**
 * 復習効果分析
 */
async function calculateReviewEffectiveness(userId: string): Promise<{
  beforeAccuracy: number
  afterAccuracy: number
  improvement: number
  sampleSize: number
}> {
  try {
    // 復習セッションの履歴を取得
    const { data: reviewSessions, error } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, total_questions, correct_answers')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10) // 直近10セッション

    if (error || !reviewSessions || reviewSessions.length === 0) {
      return {
        beforeAccuracy: 0,
        afterAccuracy: 0,
        improvement: 0,
        sampleSize: 0
      }
    }

    // 復習前後の正解率を比較するため、復習対象だった問題の元の正解率を取得
    let totalBeforeCorrect = 0
    let totalBeforeQuestions = 0
    let totalAfterCorrect = 0
    let totalAfterQuestions = 0

    for (const session of reviewSessions) {
      // このセッションの回答を取得
      const { data: answers } = await supabaseAdmin
        .from('quiz_answers')
        .select('question_id, is_correct')
        .eq('session_id', session.id)

      if (!answers) continue

      totalAfterQuestions += session.total_questions
      totalAfterCorrect += session.correct_answers

      // 同じ問題の過去の正解率を取得（復習前の状態）
      for (const answer of answers) {
        const { data: historicalAnswers } = await supabaseAdmin
          .from('quiz_answers')
          .select('is_correct')
          .eq('user_id', userId)
          .eq('question_id', answer.question_id)
          .lt('created_at', session.id) // このセッションより前
          .limit(3) // 直近3回

        if (historicalAnswers && historicalAnswers.length > 0) {
          totalBeforeQuestions++
          const correctCount = historicalAnswers.filter(a => a.is_correct).length
          if (correctCount > 0) {
            totalBeforeCorrect++
          }
        }
      }
    }

    const beforeAccuracy = totalBeforeQuestions > 0 ? 
      Math.round((totalBeforeCorrect / totalBeforeQuestions) * 100) : 0
    const afterAccuracy = totalAfterQuestions > 0 ? 
      Math.round((totalAfterCorrect / totalAfterQuestions) * 100) : 0
    const improvement = afterAccuracy - beforeAccuracy

    return {
      beforeAccuracy,
      afterAccuracy,
      improvement,
      sampleSize: reviewSessions.length
    }

  } catch (error) {
    console.error('❌ Error in calculateReviewEffectiveness:', error)
    return {
      beforeAccuracy: 0,
      afterAccuracy: 0,
      improvement: 0,
      sampleSize: 0
    }
  }
}