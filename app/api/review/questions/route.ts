import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { selectReviewQuestions, getTotalReviewQuestionsCount } from '@/lib/review-logic'

/**
 * 復習対象問題を取得
 * GET /api/review/questions?count=10
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

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '10')

    // バリデーション
    if (count <= 0 || count > 100) {
      return NextResponse.json(
        { error: '問題数は1〜100の範囲で指定してください' },
        { status: 400 }
      )
    }

    console.log(`🎯 Selecting review questions for user ${userId}, count: ${count}`)

    // 復習問題選定
    const [reviewQuestions, totalAvailable] = await Promise.all([
      selectReviewQuestions(userId, count),
      getTotalReviewQuestionsCount(userId)
    ])

    console.log(`✅ Selected ${reviewQuestions.length} review questions from ${totalAvailable} available`)

    return NextResponse.json({
      success: true,
      questions: reviewQuestions,
      selectedCount: reviewQuestions.length,
      totalAvailable,
      hasMore: totalAvailable > reviewQuestions.length,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in review questions API:', error)
    return NextResponse.json(
      { error: '復習問題の取得に失敗しました' },
      { status: 500 }
    )
  }
}