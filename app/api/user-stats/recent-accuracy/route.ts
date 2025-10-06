import { NextRequest, NextResponse } from 'next/server'
import { assessDataReliability } from '@/lib/data-reliability'
import { calculateRecentLearningDays } from '@/lib/recent-learning-days'
import { AdaptiveFallbackSystem } from '@/lib/fallback-strategy'

/**
 * ユーザーの直近正答率と信頼度情報を取得
 * GET /api/user-stats/recent-accuracy?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    console.log(`📊 Fetching recent accuracy stats for user: ${userId}`)

    // 1. データ信頼度評価
    const reliabilityAssessment = await assessDataReliability(userId)
    
    // 2. 直近学習日数統計
    const learningStats = await calculateRecentLearningDays(userId, 7, 30)
    
    // 3. フォールバックシステムの推奨事項
    const fallbackSystem = new AdaptiveFallbackSystem()
    const adaptiveAdjustments = await fallbackSystem.getAdaptiveAdjustments(userId, {
      accuracy: learningStats.averageAccuracy,
      questionsAnswered: learningStats.totalQuestions,
      sessionLength: Math.round(learningStats.totalStudyMinutes / Math.max(1, learningStats.actualLearningDays))
    })

    // 4. 総合レスポンス作成
    const response = {
      userId,
      timestamp: new Date().toISOString(),
      
      // 直近正答率情報
      recentAccuracy: {
        percentage: learningStats.averageAccuracy,
        totalQuestions: learningStats.totalQuestions,
        actualLearningDays: learningStats.actualLearningDays,
        periodDays: learningStats.periodDays,
        qualityDays: learningStats.qualityDays,
        consistency: learningStats.consistency,
        studyTimeMinutes: learningStats.totalStudyMinutes
      },

      // データ信頼度情報
      dataReliability: {
        level: reliabilityAssessment.reliabilityLevel,
        confidence: reliabilityAssessment.confidence,
        personalizationLevel: reliabilityAssessment.personalizationLevel,
        shouldUsePersonalization: reliabilityAssessment.recommendations.shouldUsePersonalization,
        fallbackStrategy: reliabilityAssessment.recommendations.fallbackStrategy
      },

      // 学習継続性指標
      consistency: {
        streakDays: reliabilityAssessment.consistencyMetrics.streakDays,
        longestStreak: reliabilityAssessment.consistencyMetrics.longestStreak,
        learningDaysInPeriod: reliabilityAssessment.consistencyMetrics.learningDaysInPeriod
      },

      // 適応的推奨事項
      recommendations: {
        difficultyAdjustment: adaptiveAdjustments.difficultyAdjustment,
        sessionLengthRecommendation: adaptiveAdjustments.sessionLengthRecommendation,
        breakRecommendation: adaptiveAdjustments.breakRecommendation,
        motivationalMessage: adaptiveAdjustments.motivationalMessage,
        minRequiredData: reliabilityAssessment.recommendations.minRequiredData,
        nextReviewDate: reliabilityAssessment.recommendations.nextReviewDate
      },

      // 学習日程詳細
      learningDates: learningStats.learningDates,
      
      // メタ情報
      meta: {
        dataSource: reliabilityAssessment.reliabilityLevel === 'INSUFFICIENT' ? 'default' : 'personalized',
        calculationMethod: 'actual_learning_days_7_in_30',
        lastAssessment: reliabilityAssessment.lastAssessment
      }
    }

    console.log(`✅ Recent accuracy stats calculated:`, {
      accuracy: `${learningStats.averageAccuracy.toFixed(1)}%`,
      reliability: reliabilityAssessment.reliabilityLevel,
      learningDays: learningStats.actualLearningDays,
      personalization: reliabilityAssessment.personalizationLevel
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error in recent-accuracy API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * ユーザーの学習統計を更新（管理者用）
 * POST /api/user-stats/recent-accuracy
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, forceRecalculation } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    console.log(`🔄 Updating user stats for: ${userId}, force: ${forceRecalculation}`)

    // 強制再計算または通常更新
    const reliabilityAssessment = await assessDataReliability(userId)
    
    // 更新完了レスポンス
    const response = {
      userId,
      updated: true,
      timestamp: new Date().toISOString(),
      newReliabilityLevel: reliabilityAssessment.reliabilityLevel,
      newPersonalizationLevel: reliabilityAssessment.personalizationLevel,
      confidence: reliabilityAssessment.confidence,
      message: 'User stats updated successfully'
    }

    console.log(`✅ User stats updated:`, {
      userId,
      reliability: reliabilityAssessment.reliabilityLevel,
      personalization: reliabilityAssessment.personalizationLevel
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error updating user stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update user stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * 複数ユーザーの統計比較（管理者用）
 * PUT /api/user-stats/recent-accuracy
 */
export async function PUT(request: NextRequest) {
  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameter: userIds (array)' },
        { status: 400 }
      )
    }

    console.log(`📊 Comparing stats for ${userIds.length} users`)

    // 並列でユーザー統計を取得
    const userStatsPromises = userIds.map(async (userId: string) => {
      try {
        const assessment = await assessDataReliability(userId)
        const learningStats = await calculateRecentLearningDays(userId, 7, 30)
        
        return {
          userId,
          reliability: assessment.reliabilityLevel,
          personalization: assessment.personalizationLevel,
          accuracy: learningStats.averageAccuracy,
          learningDays: learningStats.actualLearningDays,
          questions: learningStats.totalQuestions,
          streak: assessment.consistencyMetrics.streakDays,
          confidence: assessment.confidence
        }
      } catch (error) {
        console.error(`Error getting stats for user ${userId}:`, error)
        return {
          userId,
          error: 'Failed to fetch stats'
        }
      }
    })

    const userStats = await Promise.all(userStatsPromises)

    // 統計サマリー計算
    const validStats = userStats.filter(stat => !('error' in stat))
    const summary = {
      totalUsers: userIds.length,
      validStats: validStats.length,
      averageAccuracy: validStats.reduce((sum, stat) => sum + (stat as { accuracy: number }).accuracy, 0) / validStats.length,
      averageLearningDays: validStats.reduce((sum, stat) => sum + (stat as { learningDays: number }).learningDays, 0) / validStats.length,
      reliabilityDistribution: {
        HIGH: validStats.filter(stat => (stat as { reliability: string }).reliability === 'HIGH').length,
        MEDIUM: validStats.filter(stat => (stat as { reliability: string }).reliability === 'MEDIUM').length,
        LOW: validStats.filter(stat => (stat as { reliability: string }).reliability === 'LOW').length,
        INSUFFICIENT: validStats.filter(stat => (stat as { reliability: string }).reliability === 'INSUFFICIENT').length
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      summary,
      userStats,
      message: 'User stats comparison completed'
    }

    console.log(`✅ Stats comparison completed for ${userIds.length} users`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error in stats comparison:', error)
    return NextResponse.json(
      { 
        error: 'Failed to compare user stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}