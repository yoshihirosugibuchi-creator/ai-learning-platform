import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { getForgettingQuestions, getWeakCategoryQuestions, getRepeatMistakeQuestions } from '@/lib/review-logic'

/**
 * AI最適化のための要素分析API
 * GET /api/ai-optimization/analyze
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

    console.log(`🔍 Performing AI optimization analysis for user: ${userId}`)

    // AI最適化のための要素分析（並列実行）
    const [weakCategories, repeatMistakes, forgettingQuestions] = await Promise.all([
      getWeakCategoryQuestions(userId, 30).catch(error => {
        console.warn('⚠️ Failed to get weak categories:', error)
        return []
      }),
      getRepeatMistakeQuestions(userId, 20).catch(error => {
        console.warn('⚠️ Failed to get repeat mistakes:', error)
        return []
      }),
      getForgettingQuestions(userId, 50).catch(error => {
        console.warn('⚠️ Failed to get forgetting questions:', error)
        return []
      })
    ])

    console.log(`✅ AI optimization analysis completed:`, {
      weakCategories: weakCategories.length,
      repeatMistakes: repeatMistakes.length,
      forgettingQuestions: forgettingQuestions.length
    })

    return NextResponse.json({
      success: true,
      analysis: {
        weakCategories,
        repeatMistakes,
        forgettingQuestions
      },
      stats: {
        weakCategoriesCount: weakCategories.length,
        repeatMistakesCount: repeatMistakes.length,
        forgettingQuestionsCount: forgettingQuestions.length
      },
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in AI optimization analysis API:', error)
    return NextResponse.json(
      { error: 'AI最適化分析に失敗しました' },
      { status: 500 }
    )
  }
}