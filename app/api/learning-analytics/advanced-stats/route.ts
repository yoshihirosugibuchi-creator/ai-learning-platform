import { NextRequest, NextResponse } from 'next/server'
import { AdvancedLearningStatisticsEngine } from '@/lib/advanced-learning-statistics'

interface AdvancedStatsRequest {
  analysisType: 'time-patterns' | 'forgetting-curve' | 'learning-progress' | 'clustering'
  data: Record<string, unknown>
}

interface AdvancedStatsResponse {
  success: boolean
  result?: unknown
  error?: string
  executionTime?: number
}

/**
 * 高度AI学習統計分析API
 * Node.js統計ライブラリ(jStat + simple-statistics)による科学的実装
 */
export async function POST(request: NextRequest): Promise<NextResponse<AdvancedStatsResponse>> {
  const startTime = Date.now()
  
  try {
    const body: AdvancedStatsRequest = await request.json()
    const { analysisType, data } = body

    if (!analysisType || !data) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: analysisType and data'
      }, { status: 400 })
    }

    const engine = new AdvancedLearningStatisticsEngine()
    
    // 型ガード関数
    const isNumberArray = (value: unknown): value is number[] => 
      Array.isArray(value) && value.every(item => typeof item === 'number')
    
    const isRetentionDataArray = (value: unknown): value is Array<{ timeElapsed: number; retentionRate: number }> =>
      Array.isArray(value) && value.every(item => 
        typeof item === 'object' && item !== null &&
        'timeElapsed' in item && 'retentionRate' in item &&
        typeof item.timeElapsed === 'number' && typeof item.retentionRate === 'number'
      )

    const isPerformanceDataArray = (value: unknown): value is Array<{ timestamp: Date; score: number }> =>
      Array.isArray(value) && value.every(item => 
        typeof item === 'object' && item !== null &&
        'timestamp' in item && 'score' in item &&
        typeof item.score === 'number'
      )

    const isSessionDataArray = (value: unknown): value is Array<{ accuracy: number; duration: number; engagement: number; difficulty: number }> =>
      Array.isArray(value) && value.every(item => 
        typeof item === 'object' && item !== null &&
        'accuracy' in item && 'duration' in item && 'engagement' in item && 'difficulty' in item &&
        typeof item.accuracy === 'number' && typeof item.duration === 'number' &&
        typeof item.engagement === 'number' && typeof item.difficulty === 'number'
      )

    let result: unknown

    switch (analysisType) {
      case 'time-patterns':
        if (!isNumberArray(data.morningAccuracies) || !isNumberArray(data.eveningAccuracies)) {
          return NextResponse.json({
            success: false,
            error: 'Time pattern analysis requires morningAccuracies and eveningAccuracies as number arrays'
          }, { status: 400 })
        }
        result = engine.analyzeTimePatterns(
          data.morningAccuracies, 
          data.eveningAccuracies
        )
        break

      case 'forgetting-curve':
        if (!isRetentionDataArray(data.retentionData)) {
          return NextResponse.json({
            success: false,
            error: 'Forgetting curve analysis requires retentionData array with {timeElapsed, retentionRate} objects'
          }, { status: 400 })
        }
        result = engine.analyzeForgettingCurve(data.retentionData)
        break

      case 'learning-progress':
        if (!isPerformanceDataArray(data.performanceData)) {
          return NextResponse.json({
            success: false,
            error: 'Learning progress analysis requires performanceData array with {timestamp, score} objects'
          }, { status: 400 })
        }
        result = engine.analyzeLearningProgress(data.performanceData)
        break

      case 'clustering':
        if (!isSessionDataArray(data.sessionData)) {
          return NextResponse.json({
            success: false,
            error: 'Clustering analysis requires sessionData array with {accuracy, duration, engagement, difficulty} objects'
          }, { status: 400 })
        }
        result = engine.analyzeLearningClusters(data.sessionData)
        break

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown analysis type: ${analysisType}`
        }, { status: 400 })
    }

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      result,
      executionTime
    })

  } catch (error) {
    console.error('Advanced statistics API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}

/**
 * 高度統計分析APIのドキュメント
 */
export async function GET(): Promise<NextResponse> {
  const documentation = {
    endpoint: '/api/learning-analytics/advanced-stats',
    method: 'POST',
    description: 'Node.js統計ライブラリによる高度AI学習分析サービス',
    libraries: ['jStat', 'simple-statistics', 'ml-matrix'],
    features: [
      '科学的統計検定（t検定、ANOVA、カイ二乗検定）',
      'エビングハウス忘却曲線パラメータ推定',
      '学習進捗トレンド分析（線形回帰）',
      'K-meansクラスタリング',
      '効果量計算（Cohen\'s d）',
      '信頼区間・p値の正確計算',
      'シルエット分析による最適クラスター数決定'
    ],
    parameters: {
      analysisType: {
        type: 'string',
        enum: ['time-patterns', 'forgetting-curve', 'learning-progress', 'clustering'],
        description: '実行する高度分析タイプ'
      },
      data: {
        type: 'object',
        description: '分析対象データ（分析タイプにより異なる）'
      }
    },
    examples: {
      'time-patterns': {
        analysisType: 'time-patterns',
        data: {
          morningAccuracies: [85.2, 78.6, 92.1, 88.4, 90.7],
          eveningAccuracies: [72.3, 68.9, 75.1, 71.2, 69.8]
        },
        returns: {
          testType: 'Independent Samples T-Test',
          statistic: 5.71,
          pValue: 0.001,
          significant: true,
          effectSize: 3.61,
          morningPerformance: { mean: 86.6, confidenceInterval: [82.1, 91.1] },
          optimalTimeRecommendation: 'morning'
        }
      },
      'forgetting-curve': {
        analysisType: 'forgetting-curve',
        data: {
          retentionData: [
            { timeElapsed: 1, retentionRate: 0.95 },
            { timeElapsed: 7, retentionRate: 0.75 },
            { timeElapsed: 30, retentionRate: 0.45 },
            { timeElapsed: 90, retentionRate: 0.25 }
          ]
        },
        returns: {
          exponentialDecayRate: 0.0234,
          halfLife: 29.6,
          optimalReviewIntervals: [12.5, 25.0, 50.0, 100.0],
          forgettingCurveEquation: 'R(t) = 0.987 × e^(-0.0234t)'
        }
      },
      'learning-progress': {
        analysisType: 'learning-progress',
        data: {
          performanceData: [
            { timestamp: '2024-01-01', score: 65 },
            { timestamp: '2024-01-03', score: 72 },
            { timestamp: '2024-01-05', score: 78 },
            { timestamp: '2024-01-07', score: 85 },
            { timestamp: '2024-01-09', score: 82 }
          ]
        },
        returns: {
          trendDirection: 'improving',
          learningRate: 4.2,
          plateauDetected: false,
          projectedPerformance: [87, 91, 95, 99, 103],
          skillMasteryProbability: 0.73
        }
      },
      'clustering': {
        analysisType: 'clustering',
        data: {
          sessionData: [
            { accuracy: 85, duration: 25, engagement: 8, difficulty: 6 },
            { accuracy: 92, duration: 30, engagement: 9, difficulty: 7 },
            { accuracy: 68, duration: 45, engagement: 5, difficulty: 4 },
            { accuracy: 76, duration: 20, engagement: 6, difficulty: 5 },
            { accuracy: 89, duration: 35, engagement: 8, difficulty: 7 },
            { accuracy: 71, duration: 40, engagement: 5, difficulty: 4 }
          ]
        },
        returns: {
          clusters: [
            { id: 'cluster_0', label: 'High Performance Learner', sessions: [0, 1, 4] },
            { id: 'cluster_1', label: 'Struggling Learner', sessions: [2, 3, 5] }
          ],
          silhouetteScore: 0.67,
          optimalClusterCount: 2
        }
      }
    },
    advantages: [
      '正確な統計検定・信頼区間',
      'サンプルサイズに対する適切な統計量',
      '効果量による実用的有意性判定',
      '忘却曲線の科学的パラメータ推定',
      '機械学習品質のクラスタリング',
      'レスポンス速度・精度共に高品質'
    ]
  }

  return NextResponse.json(documentation)
}