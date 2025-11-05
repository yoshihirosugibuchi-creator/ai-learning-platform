import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { getUserCategoryStats } from '@/lib/learning-stats'

/**
 * ユーザーのカテゴリー別学習統計を取得
 * GET /api/learning-stats/categories
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

    console.log(`📊 Fetching category learning stats for user: ${userId}`)

    // ユーザーのカテゴリー別学習統計を取得
    const categoryStats = await getUserCategoryStats(userId)

    console.log(`✅ Category learning stats retrieved:`, {
      userId: userId.substring(0, 8) + '...',
      categoriesCount: categoryStats.length,
      categories: categoryStats.map(stat => ({
        categoryId: stat.categoryId,
        accuracy: `${(stat.accuracy * 100).toFixed(1)}%`,
        totalAnswers: stat.totalAnswers,
        priorityScore: stat.priorityScore
      }))
    })

    return NextResponse.json({
      success: true,
      categoryStats,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in category learning stats API:', error)
    return NextResponse.json(
      { error: 'カテゴリー別学習統計の取得に失敗しました' },
      { status: 500 }
    )
  }
}