import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { updateReviewStatus } from '@/lib/review-state-management'
import { generateReviewSet } from '@/lib/precomputed-quiz-engine'

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

interface ReviewCompleteRequest {
  sessionId: string
  completedAnswers: QuestionAnswer[]
}

/**
 * 復習クイズ完了処理
 * POST /api/review/complete
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body: ReviewCompleteRequest = await request.json()
    const { sessionId, completedAnswers } = body

    // バリデーション
    if (!sessionId || !completedAnswers || !Array.isArray(completedAnswers)) {
      return NextResponse.json(
        { error: 'セッションIDと回答データが必要です' },
        { status: 400 }
      )
    }

    if (completedAnswers.length === 0) {
      return NextResponse.json(
        { error: '回答データが空です' },
        { status: 400 }
      )
    }

    console.log(`🔄 Processing review completion for user ${userId}, session: ${sessionId}`)
    console.log(`📝 Answers to process: ${completedAnswers.length}`)
    

    // 復習状態更新処理
    const updateResult = await updateReviewStatus(userId, sessionId, completedAnswers)

    if (!updateResult.success) {
      console.error('❌ Review status update failed:', updateResult.errors)
      return NextResponse.json(
        { 
          error: '復習状態の更新に失敗しました',
          details: updateResult.errors
        },
        { status: 500 }
      )
    }

    console.log(`✅ Review completion processed successfully: ${updateResult.updatedCount} questions updated`)

    // 🆕 復習完了後に新しい事前セットを生成
    try {
      console.log(`🔄 Generating new review set after completion for user ${userId}`)
      const newSetResult = await generateReviewSet({ userId })
      
      if (newSetResult.generated) {
        console.log(`✅ New review set generated: ${newSetResult.sets_count} sets with ${newSetResult.questions_per_set} questions each`)
      } else if (newSetResult.skipped) {
        console.log(`⚠️ Review set generation skipped: ${newSetResult.reason}`)
      } else {
        console.log(`⚠️ No new review set generated`)
      }
    } catch (setGenerationError) {
      console.error('❌ Error generating new review set:', setGenerationError)
      // エラーが発生しても復習完了は成功とする
    }

    // 復習完了イベントを発火（クライアント側統計更新用）
    return NextResponse.json({
      success: true,
      message: `${updateResult.updatedCount}問の復習状態を更新しました`,
      updatedCount: updateResult.updatedCount,
      processedAt: new Date().toISOString(),
      triggerStatsUpdate: true // フロントエンドに統計更新指示
    })

  } catch (error) {
    console.error('❌ Error in review completion API:', error)
    return NextResponse.json(
      { error: '復習完了処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}