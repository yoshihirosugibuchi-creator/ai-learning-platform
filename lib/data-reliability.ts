/**
 * データ信頼度判定システム
 * 学習データの品質と信頼性を評価し、個人化レベルを決定
 */

import { calculateRecentLearningDays, analyzeLearningConsistency, type RecentLearningDaysStats } from './recent-learning-days'

// データ信頼度レベル
export type DataReliabilityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'

// 個人化レベル
export type PersonalizationLevel = 'FULL' | 'PARTIAL' | 'BASIC' | 'NONE'

// データ信頼度評価結果
export interface DataReliabilityAssessment {
  userId: string
  reliabilityLevel: DataReliabilityLevel
  personalizationLevel: PersonalizationLevel
  confidence: number
  recentLearningStats: RecentLearningDaysStats
  consistencyMetrics: {
    streakDays: number
    longestStreak: number
    learningDaysInPeriod: number
  }
  recommendations: {
    shouldUsePersonalization: boolean
    fallbackStrategy: 'default' | 'limited_personalization' | 'conservative_personalization'
    minRequiredData: string
    nextReviewDate?: Date
  }
  lastAssessment: Date
}

/**
 * ユーザーのデータ信頼度を総合評価
 * @param userId ユーザーID
 * @returns データ信頼度評価結果
 */
export async function assessDataReliability(userId: string): Promise<DataReliabilityAssessment> {
  try {
    console.log(`🔍 Assessing data reliability for user: ${userId}`)

    // 1. 直近学習日数統計を取得
    const recentLearningStats = await calculateRecentLearningDays(userId, 7, 30)
    
    // 2. 学習継続性を分析
    const consistencyAnalysis = await analyzeLearningConsistency(userId, 30)
    
    // 3. 総合信頼度を計算
    const reliabilityScore = calculateReliabilityScore(recentLearningStats, consistencyAnalysis)
    
    // 4. 信頼度レベルを判定
    const reliabilityLevel = determineReliabilityLevel(reliabilityScore, recentLearningStats)
    
    // 5. 個人化レベルを決定
    const personalizationLevel = determinePersonalizationLevel(reliabilityLevel, recentLearningStats)
    
    // 6. 推奨事項を生成
    const recommendations = generateRecommendations(reliabilityLevel, recentLearningStats, consistencyAnalysis)

    const assessment: DataReliabilityAssessment = {
      userId,
      reliabilityLevel,
      personalizationLevel,
      confidence: reliabilityScore,
      recentLearningStats,
      consistencyMetrics: {
        streakDays: consistencyAnalysis.streakDays,
        longestStreak: consistencyAnalysis.longestStreak,
        learningDaysInPeriod: consistencyAnalysis.learningDaysInPeriod
      },
      recommendations,
      lastAssessment: new Date()
    }

    console.log(`✅ Data reliability assessment completed:`, {
      reliability: reliabilityLevel,
      personalization: personalizationLevel,
      confidence: `${reliabilityScore.toFixed(1)}%`,
      learningDays: recentLearningStats.actualLearningDays,
      streak: consistencyAnalysis.streakDays
    })

    return assessment

  } catch (error) {
    console.error('❌ Error in assessDataReliability:', error)
    return getDefaultAssessment(userId)
  }
}

/**
 * 信頼度スコアを計算（0-100）
 */
function calculateReliabilityScore(
  recentStats: RecentLearningDaysStats,
  consistency: { streakDays: number, longestStreak: number, learningDaysInPeriod: number }
): number {
  let score = 0

  // 1. 学習日数スコア（40%）
  const learningDaysScore = Math.min(40, (recentStats.actualLearningDays / 7) * 40)
  score += learningDaysScore

  // 2. 質的評価スコア（30%）
  const qualityScore = Math.min(30, (recentStats.qualityDays / Math.max(1, recentStats.actualLearningDays)) * 30)
  score += qualityScore

  // 3. 問題数スコア（20%）
  const questionScore = Math.min(20, (recentStats.totalQuestions / 50) * 20)
  score += questionScore

  // 4. 継続性スコア（10%）
  const consistencyScore = Math.min(10, (consistency.streakDays / 7) * 10)
  score += consistencyScore

  console.log(`📊 Reliability score breakdown:`, {
    learningDays: `${learningDaysScore.toFixed(1)}/40`,
    quality: `${qualityScore.toFixed(1)}/30`,
    questions: `${questionScore.toFixed(1)}/20`,
    consistency: `${consistencyScore.toFixed(1)}/10`,
    total: `${score.toFixed(1)}/100`
  })

  return score
}

/**
 * 信頼度レベルを判定
 */
function determineReliabilityLevel(
  score: number,
  recentStats: RecentLearningDaysStats
): DataReliabilityLevel {
  // 最低条件チェック
  if (recentStats.actualLearningDays === 0 || recentStats.totalQuestions < 5) {
    return 'INSUFFICIENT'
  }

  // スコアベース判定
  if (score >= 80) {
    return 'HIGH'
  } else if (score >= 60) {
    return 'MEDIUM'
  } else if (score >= 30) {
    return 'LOW'
  } else {
    return 'INSUFFICIENT'
  }
}

/**
 * 個人化レベルを決定
 */
function determinePersonalizationLevel(
  reliability: DataReliabilityLevel,
  recentStats: RecentLearningDaysStats
): PersonalizationLevel {
  switch (reliability) {
    case 'HIGH':
      return 'FULL'
    case 'MEDIUM':
      return 'PARTIAL'
    case 'LOW':
      return recentStats.totalQuestions >= 15 ? 'BASIC' : 'NONE'
    case 'INSUFFICIENT':
    default:
      return 'NONE'
  }
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(
  reliability: DataReliabilityLevel,
  recentStats: RecentLearningDaysStats,
  _consistency: { streakDays: number, longestStreak: number, learningDaysInPeriod: number }
): DataReliabilityAssessment['recommendations'] {
  const shouldUsePersonalization = reliability !== 'INSUFFICIENT'
  
  let fallbackStrategy: 'default' | 'limited_personalization' | 'conservative_personalization'
  let minRequiredData: string
  let nextReviewDate: Date | undefined

  switch (reliability) {
    case 'HIGH':
      fallbackStrategy = 'conservative_personalization'
      minRequiredData = 'No additional data required'
      nextReviewDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1週間後
      break
    
    case 'MEDIUM':
      fallbackStrategy = 'limited_personalization'
      minRequiredData = `${7 - recentStats.actualLearningDays} more learning days recommended`
      nextReviewDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3日後
      break
    
    case 'LOW':
      fallbackStrategy = 'limited_personalization'
      minRequiredData = `${Math.max(5 - recentStats.actualLearningDays, 25 - recentStats.totalQuestions)} more sessions needed`
      nextReviewDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2日後
      break
    
    case 'INSUFFICIENT':
    default:
      fallbackStrategy = 'default'
      minRequiredData = 'At least 3 learning sessions with 5+ questions each'
      nextReviewDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1日後
      break
  }

  return {
    shouldUsePersonalization,
    fallbackStrategy,
    minRequiredData,
    nextReviewDate
  }
}

/**
 * デフォルト評価結果を返す
 */
function getDefaultAssessment(userId: string): DataReliabilityAssessment {
  return {
    userId,
    reliabilityLevel: 'INSUFFICIENT',
    personalizationLevel: 'NONE',
    confidence: 0,
    recentLearningStats: {
      actualLearningDays: 0,
      periodDays: 30,
      qualityDays: 0,
      averageAccuracy: 0,
      totalQuestions: 0,
      totalStudyMinutes: 0,
      consistency: 0,
      dataReliability: 'INSUFFICIENT',
      learningDates: []
    },
    consistencyMetrics: {
      streakDays: 0,
      longestStreak: 0,
      learningDaysInPeriod: 0
    },
    recommendations: {
      shouldUsePersonalization: false,
      fallbackStrategy: 'default',
      minRequiredData: 'Start with at least 3 learning sessions',
      nextReviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    },
    lastAssessment: new Date()
  }
}

/**
 * カテゴリー別データ信頼度を評価
 * @param userId ユーザーID  
 * @param categoryId カテゴリーID
 * @returns カテゴリー固有の信頼度評価
 */
export async function assessCategoryDataReliability(
  userId: string,
  categoryId: string
): Promise<{
  categoryId: string
  reliability: DataReliabilityLevel
  personalization: PersonalizationLevel
  sessionsCount: number
  questionsCount: number
  averageAccuracy: number
  recommendation: string
}> {
  try {
    console.log(`🔍 Assessing category data reliability: ${categoryId} for user: ${userId}`)

    // カテゴリー固有の学習統計を取得（簡易版）
    // 実装では quiz_sessions から categoryId でフィルターした統計を取得
    
    // モック実装（実際はSupabaseクエリ）
    const categoryStats = {
      sessionsCount: 0,
      questionsCount: 0,
      correctCount: 0
    }

    const averageAccuracy = categoryStats.questionsCount > 0 
      ? (categoryStats.correctCount / categoryStats.questionsCount) * 100 
      : 0

    // カテゴリー固有の信頼度判定
    let reliability: DataReliabilityLevel
    let personalization: PersonalizationLevel
    let recommendation: string

    if (categoryStats.questionsCount >= 20 && categoryStats.sessionsCount >= 3) {
      reliability = 'HIGH'
      personalization = 'FULL'
      recommendation = 'Sufficient data for full personalization'
    } else if (categoryStats.questionsCount >= 10 && categoryStats.sessionsCount >= 2) {
      reliability = 'MEDIUM'
      personalization = 'PARTIAL'
      recommendation = 'Moderate data, using limited personalization'
    } else if (categoryStats.questionsCount >= 5) {
      reliability = 'LOW'
      personalization = 'BASIC'
      recommendation = 'Limited data, basic personalization only'
    } else {
      reliability = 'INSUFFICIENT'
      personalization = 'NONE'
      recommendation = 'Insufficient data, using defaults'
    }

    return {
      categoryId,
      reliability,
      personalization,
      sessionsCount: categoryStats.sessionsCount,
      questionsCount: categoryStats.questionsCount,
      averageAccuracy,
      recommendation
    }

  } catch (error) {
    console.error('❌ Error in assessCategoryDataReliability:', error)
    return {
      categoryId,
      reliability: 'INSUFFICIENT',
      personalization: 'NONE',
      sessionsCount: 0,
      questionsCount: 0,
      averageAccuracy: 0,
      recommendation: 'Error occurred, using defaults'
    }
  }
}

/**
 * 信頼度レベルに基づく推奨アクション
 * @param assessment データ信頼度評価
 * @returns 推奨アクション
 */
export function getRecommendedActions(assessment: DataReliabilityAssessment): {
  primaryAction: string
  secondaryActions: string[]
  learningGoals: string[]
} {
  switch (assessment.reliabilityLevel) {
    case 'HIGH':
      return {
        primaryAction: 'Continue current learning pace for optimal personalization',
        secondaryActions: [
          'Explore advanced features and difficulty settings',
          'Focus on weak areas identified by the system'
        ],
        learningGoals: [
          'Maintain 7+ learning days per month',
          'Keep quality session rate above 70%'
        ]
      }

    case 'MEDIUM':
      return {
        primaryAction: 'Increase learning frequency to unlock full personalization',
        secondaryActions: [
          'Aim for daily practice sessions',
          'Complete at least 5 questions per session'
        ],
        learningGoals: [
          'Reach 7 learning days in 30-day period',
          'Achieve 50+ total questions answered'
        ]
      }

    case 'LOW':
      return {
        primaryAction: 'Build consistent learning habits',
        secondaryActions: [
          'Set daily learning reminders',
          'Start with shorter, regular sessions'
        ],
        learningGoals: [
          'Complete 3-5 learning sessions per week',
          'Answer at least 25 questions total'
        ]
      }

    case 'INSUFFICIENT':
    default:
      return {
        primaryAction: 'Begin learning journey with guided practice',
        secondaryActions: [
          'Complete the onboarding quiz series',
          'Try different categories to find interests'
        ],
        learningGoals: [
          'Complete first 3 learning sessions',
          'Answer 15+ questions total'
        ]
      }
  }
}