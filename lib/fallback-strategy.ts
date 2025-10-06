/**
 * フォールバック戦略実装
 * データ信頼度に基づく適応的フォールバック処理
 */

import { assessDataReliability, assessCategoryDataReliability, type DataReliabilityLevel, type PersonalizationLevel } from './data-reliability'
import { Question } from './types'

// フォールバック戦略の種類
export type FallbackStrategy = 'default' | 'limited_personalization' | 'conservative_personalization'

// フォールバック設定
export interface FallbackConfig {
  strategy: FallbackStrategy
  personalizationLevel: PersonalizationLevel
  useDefaults: {
    difficulty: boolean
    categorySelection: boolean
    questionPriority: boolean
    reviewSchedule: boolean
  }
  adaptiveThresholds: {
    minQuestionsForPersonalization: number
    minAccuracyForAdvancement: number
    maxDifficultyIncrement: number
  }
}

// フォールバック結果
export interface FallbackResult<T> {
  data: T
  source: 'personalized' | 'fallback' | 'default'
  reliability: DataReliabilityLevel
  confidence: number
  reason?: string
}

/**
 * 適応的フォールバック処理システム
 */
export class AdaptiveFallbackSystem {
  private fallbackConfigs: Map<FallbackStrategy, FallbackConfig>

  constructor() {
    this.fallbackConfigs = new Map([
      ['default', {
        strategy: 'default',
        personalizationLevel: 'NONE',
        useDefaults: {
          difficulty: true,
          categorySelection: true,
          questionPriority: true,
          reviewSchedule: true
        },
        adaptiveThresholds: {
          minQuestionsForPersonalization: 50,
          minAccuracyForAdvancement: 75,
          maxDifficultyIncrement: 1
        }
      }],
      ['limited_personalization', {
        strategy: 'limited_personalization',
        personalizationLevel: 'BASIC',
        useDefaults: {
          difficulty: false,
          categorySelection: true,
          questionPriority: false,
          reviewSchedule: true
        },
        adaptiveThresholds: {
          minQuestionsForPersonalization: 25,
          minAccuracyForAdvancement: 65,
          maxDifficultyIncrement: 1
        }
      }],
      ['conservative_personalization', {
        strategy: 'conservative_personalization',
        personalizationLevel: 'PARTIAL',
        useDefaults: {
          difficulty: false,
          categorySelection: false,
          questionPriority: false,
          reviewSchedule: false
        },
        adaptiveThresholds: {
          minQuestionsForPersonalization: 15,
          minAccuracyForAdvancement: 60,
          maxDifficultyIncrement: 2
        }
      }]
    ])
  }

  /**
   * 難易度選択のフォールバック処理
   * @param userId ユーザーID
   * @param categoryId カテゴリーID
   * @param userPreferredDifficulty ユーザー希望難易度
   * @returns フォールバック処理された難易度
   */
  async getDifficultyWithFallback(
    userId: string,
    categoryId: string,
    userPreferredDifficulty?: string
  ): Promise<FallbackResult<string>> {
    try {
      console.log(`🎯 Getting difficulty with fallback for user: ${userId}, category: ${categoryId}`)

      // データ信頼度を評価
      const assessment = await assessDataReliability(userId)
      const categoryAssessment = await assessCategoryDataReliability(userId, categoryId)
      
      const config = this.fallbackConfigs.get(assessment.recommendations.fallbackStrategy)!

      // 難易度決定ロジック
      if (config.useDefaults.difficulty || categoryAssessment.reliability === 'INSUFFICIENT') {
        // デフォルト難易度を使用
        const defaultDifficulty = 'intermediate'
        return {
          data: defaultDifficulty,
          source: 'default',
          reliability: assessment.reliabilityLevel,
          confidence: 50,
          reason: 'Using default difficulty due to insufficient data'
        }
      }

      // 個人化された難易度判定
      if (userPreferredDifficulty && this.isValidDifficulty(userPreferredDifficulty)) {
        // カテゴリー固有の制約を適用
        const adjustedDifficulty = this.adjustDifficultyByCategory(
          userPreferredDifficulty,
          categoryAssessment,
          config
        )

        return {
          data: adjustedDifficulty,
          source: 'personalized',
          reliability: categoryAssessment.reliability,
          confidence: Math.min(95, categoryAssessment.averageAccuracy),
          reason: adjustedDifficulty !== userPreferredDifficulty 
            ? `Adjusted from ${userPreferredDifficulty} based on category performance`
            : 'Using personalized difficulty'
        }
      }

      // パフォーマンスベースの推奨難易度
      const recommendedDifficulty = this.calculateRecommendedDifficulty(
        categoryAssessment.averageAccuracy,
        categoryAssessment.questionsCount
      )

      return {
        data: recommendedDifficulty,
        source: 'fallback',
        reliability: categoryAssessment.reliability,
        confidence: Math.max(60, categoryAssessment.averageAccuracy * 0.8),
        reason: 'Calculated based on category performance'
      }

    } catch (error) {
      console.error('❌ Error in getDifficultyWithFallback:', error)
      return {
        data: 'intermediate',
        source: 'default',
        reliability: 'INSUFFICIENT',
        confidence: 0,
        reason: 'Error occurred, using safe default'
      }
    }
  }

  /**
   * 問題選択のフォールバック処理
   * @param userId ユーザーID
   * @param questions 候補問題リスト
   * @param categoryId カテゴリーID
   * @param difficulty 難易度
   * @param count 必要問題数
   * @returns フォールバック処理された問題リスト
   */
  async getQuestionsWithFallback(
    userId: string,
    questions: Question[],
    categoryId: string,
    difficulty: string,
    count: number = 10
  ): Promise<FallbackResult<Question[]>> {
    try {
      console.log(`📝 Getting questions with fallback: ${count} questions`)

      const assessment = await assessDataReliability(userId)
      const config = this.fallbackConfigs.get(assessment.recommendations.fallbackStrategy)!

      if (config.useDefaults.questionPriority || assessment.reliabilityLevel === 'INSUFFICIENT') {
        // ランダム選択（デフォルト）
        const shuffledQuestions = this.shuffleArray([...questions])
        const selectedQuestions = shuffledQuestions.slice(0, count)

        return {
          data: selectedQuestions,
          source: 'default',
          reliability: assessment.reliabilityLevel,
          confidence: 50,
          reason: 'Using random selection due to insufficient learning data'
        }
      }

      // 個人化された問題選択を試行
      try {
        const { selectQuestionsByPriority } = await import('./question-priority')
        const personalizedQuestions = await selectQuestionsByPriority(
          questions,
          userId,
          categoryId,
          difficulty,
          count
        )

        return {
          data: personalizedQuestions,
          source: 'personalized',
          reliability: assessment.reliabilityLevel,
          confidence: assessment.confidence,
          reason: 'Using personalized question prioritization'
        }

      } catch (priorityError) {
        console.warn('⚠️ Personalized selection failed, using fallback:', priorityError)
        
        // 保守的フォールバック: 部分的個人化
        const partiallyPersonalizedQuestions = this.selectQuestionsPartialPersonalization(
          questions,
          count
        )

        return {
          data: partiallyPersonalizedQuestions,
          source: 'fallback',
          reliability: assessment.reliabilityLevel,
          confidence: 70,
          reason: 'Personalized selection failed, using partial personalization'
        }
      }

    } catch (error) {
      console.error('❌ Error in getQuestionsWithFallback:', error)
      const fallbackQuestions = questions.slice(0, count)
      
      return {
        data: fallbackQuestions,
        source: 'default',
        reliability: 'INSUFFICIENT',
        confidence: 0,
        reason: 'Error occurred, using simple selection'
      }
    }
  }

  /**
   * カテゴリー推奨のフォールバック処理
   * @param userId ユーザーID
   * @param availableCategories 利用可能カテゴリー
   * @returns フォールバック処理されたカテゴリー推奨
   */
  async getCategoryRecommendationsWithFallback(
    userId: string,
    availableCategories: string[]
  ): Promise<FallbackResult<string[]>> {
    try {
      console.log(`🏷️ Getting category recommendations with fallback`)

      const assessment = await assessDataReliability(userId)
      const config = this.fallbackConfigs.get(assessment.recommendations.fallbackStrategy)!

      if (config.useDefaults.categorySelection || assessment.reliabilityLevel === 'INSUFFICIENT') {
        // デフォルトカテゴリー推奨
        const defaultCategories = this.getDefaultCategoryRecommendations(availableCategories)
        
        return {
          data: defaultCategories,
          source: 'default',
          reliability: assessment.reliabilityLevel,
          confidence: 60,
          reason: 'Using default category recommendations'
        }
      }

      // 個人化されたカテゴリー推奨（モック実装）
      const personalizedCategories = await this.getPersonalizedCategoryRecommendations(
        userId,
        availableCategories,
        assessment
      )

      return {
        data: personalizedCategories,
        source: 'personalized',
        reliability: assessment.reliabilityLevel,
        confidence: assessment.confidence,
        reason: 'Using learning history-based recommendations'
      }

    } catch (error) {
      console.error('❌ Error in getCategoryRecommendationsWithFallback:', error)
      
      return {
        data: availableCategories.slice(0, 3),
        source: 'default',
        reliability: 'INSUFFICIENT',
        confidence: 0,
        reason: 'Error occurred, using basic selection'
      }
    }
  }

  /**
   * 学習進捗に基づく適応的調整
   * @param userId ユーザーID
   * @param currentPerformance 現在のパフォーマンス
   * @returns 調整済み設定
   */
  async getAdaptiveAdjustments(
    userId: string,
    currentPerformance: {
      accuracy: number
      questionsAnswered: number
      sessionLength: number
    }
  ): Promise<{
    difficultyAdjustment: number
    sessionLengthRecommendation: number
    breakRecommendation: boolean
    motivationalMessage: string
  }> {
    try {
      const assessment = await assessDataReliability(userId)
      const config = this.fallbackConfigs.get(assessment.recommendations.fallbackStrategy)!

      // 難易度調整計算
      let difficultyAdjustment = 0
      if (currentPerformance.accuracy > config.adaptiveThresholds.minAccuracyForAdvancement) {
        difficultyAdjustment = Math.min(
          config.adaptiveThresholds.maxDifficultyIncrement,
          Math.floor((currentPerformance.accuracy - 70) / 10)
        )
      } else if (currentPerformance.accuracy < 50) {
        difficultyAdjustment = -1
      }

      // セッション長推奨
      const sessionLengthRecommendation = this.calculateOptimalSessionLength(
        currentPerformance.sessionLength,
        currentPerformance.accuracy
      )

      // 休憩推奨
      const breakRecommendation = currentPerformance.sessionLength > 30 && currentPerformance.accuracy < 60

      // 励ましメッセージ
      const motivationalMessage = this.generateMotivationalMessage(
        assessment.reliabilityLevel,
        currentPerformance.accuracy
      )

      return {
        difficultyAdjustment,
        sessionLengthRecommendation,
        breakRecommendation,
        motivationalMessage
      }

    } catch (error) {
      console.error('❌ Error in getAdaptiveAdjustments:', error)
      return {
        difficultyAdjustment: 0,
        sessionLengthRecommendation: 15,
        breakRecommendation: false,
        motivationalMessage: 'Keep learning at your own pace!'
      }
    }
  }

  // ヘルパーメソッド

  private isValidDifficulty(difficulty: string): boolean {
    return ['basic', 'intermediate', 'advanced', 'expert'].includes(difficulty)
  }

  private adjustDifficultyByCategory(
    requestedDifficulty: string,
    categoryAssessment: Awaited<ReturnType<typeof assessCategoryDataReliability>>,
    config: FallbackConfig
  ): string {
    const difficulties = ['basic', 'intermediate', 'advanced', 'expert']
    const requestedIndex = difficulties.indexOf(requestedDifficulty)
    
    // パフォーマンスが低い場合は難易度を下げる
    if (categoryAssessment.averageAccuracy < config.adaptiveThresholds.minAccuracyForAdvancement) {
      const adjustedIndex = Math.max(0, requestedIndex - 1)
      return difficulties[adjustedIndex]
    }

    return requestedDifficulty
  }

  private calculateRecommendedDifficulty(accuracy: number, questionsCount: number): string {
    if (questionsCount < 10) return 'intermediate' // 安全な初期値

    if (accuracy >= 85) return 'advanced'
    if (accuracy >= 70) return 'intermediate'
    if (accuracy >= 50) return 'basic'
    return 'basic'
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  private selectQuestionsPartialPersonalization(questions: Question[], count: number): Question[] {
    // 部分的個人化: 前半をランダム、後半を難易度順で選択
    const shuffled = this.shuffleArray(questions)
    const halfCount = Math.floor(count / 2)
    
    const randomPart = shuffled.slice(0, halfCount)
    const remainingPart = shuffled.slice(halfCount, count)
    
    return [...randomPart, ...remainingPart]
  }

  private getDefaultCategoryRecommendations(categories: string[]): string[] {
    // 一般的に人気が高いとされるカテゴリーを優先
    const popularCategories = ['ビジネス戦略', 'マーケティング', 'データ分析', 'プログラミング']
    
    const recommendations = categories
      .filter(cat => popularCategories.includes(cat))
      .slice(0, 3)
    
    // 不足分を他のカテゴリーで補完
    if (recommendations.length < 3) {
      const remaining = categories
        .filter(cat => !recommendations.includes(cat))
        .slice(0, 3 - recommendations.length)
      recommendations.push(...remaining)
    }

    return recommendations
  }

  private async getPersonalizedCategoryRecommendations(
    userId: string,
    availableCategories: string[],
    _assessment: Awaited<ReturnType<typeof assessDataReliability>>
  ): Promise<string[]> {
    // 学習履歴に基づくカテゴリー推奨（モック実装）
    console.log(`Getting personalized recommendations for ${userId}`)
    
    // 実装では学習履歴から弱点分野やXPの低いカテゴリーを特定
    return availableCategories.slice(0, 3)
  }

  private calculateOptimalSessionLength(currentLength: number, accuracy: number): number {
    if (accuracy > 80) {
      return Math.min(currentLength + 5, 30) // 成績良好時は少し延長
    }
    if (accuracy < 60) {
      return Math.max(currentLength - 5, 10) // 成績不振時は短縮
    }
    return currentLength // 現状維持
  }

  private generateMotivationalMessage(reliability: DataReliabilityLevel, accuracy: number): string {
    if (reliability === 'HIGH' && accuracy > 80) {
      return '素晴らしい成績です！この調子で新しい分野にも挑戦してみましょう！'
    }
    if (reliability === 'MEDIUM' && accuracy > 70) {
      return 'とても良いペースです！継続的な学習でさらに上達できます！'
    }
    if (accuracy > 60) {
      return '着実に進歩しています！少しずつでも続けることが大切です！'
    }
    return '学習を始めたばかりですね！焦らずに基礎から固めていきましょう！'
  }
}