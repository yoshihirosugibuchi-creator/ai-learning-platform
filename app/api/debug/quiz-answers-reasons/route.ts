import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * デバッグ用: quiz_answersテーブルのreview_reason列の状況確認
 * GET /api/debug/quiz-answers-reasons
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

    // 現在のユーザーのクイズ回答でreview_reasonがあるものを確認
    const { data: answersWithReasons, error: reasonsError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, review_reason, is_correct, created_at')
      .eq('user_id', userId)
      .not('review_reason', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    // 全体の統計
    const { data: reasonStats, error: statsError } = await supabaseAdmin
      .from('quiz_answers')
      .select('review_reason')
      .eq('user_id', userId)

    // 統計を計算
    const stats = {
      total: reasonStats?.length || 0,
      withReasons: reasonStats?.filter(r => r.review_reason).length || 0,
      withoutReasons: reasonStats?.filter(r => !r.review_reason).length || 0
    }

    const reasonTypes = reasonStats?.reduce((acc, answer) => {
      if (answer.review_reason) {
        acc[answer.review_reason] = (acc[answer.review_reason] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>) || {}

    console.log(`🔍 Debug quiz answers reasons for user ${userId}:`)
    console.log('Stats:', stats)
    console.log('Reason types:', reasonTypes)
    console.log('Sample answers with reasons:', answersWithReasons?.slice(0, 5))

    return NextResponse.json({
      success: true,
      userId,
      stats,
      reasonTypes,
      sampleAnswersWithReasons: answersWithReasons,
      errors: { reasonsError, statsError }
    })

  } catch (error) {
    console.error('❌ Error in debug quiz answers reasons API:', error)
    return NextResponse.json(
      { error: 'デバッグ実行に失敗しました' },
      { status: 500 }
    )
  }
}