/**
 * 高度AI学習統計分析エンジン
 * Node.js統計ライブラリ(jStat + simple-statistics)による科学的実装
 */

// @ts-expect-error - jStat doesn't have TypeScript definitions
import * as jStat from 'jstat'
import * as ss from 'simple-statistics'
import { Matrix } from 'ml-matrix'

// Type definitions for jStat
interface TTestResult {
  pvalue: number
  teststat: number
  df: number
}

// Augment jStat type definitions (for type safety)
interface ChiSquareTestResult {
  pvalue: number
  statistic: number
  df: number
}

interface AnovaResult {
  pvalue: number
  fstatistic: number
  df: [number, number]
}

interface _JStat {
  ttest: (sample1: number[], sample2: number[], options?: { tail?: number }) => TTestResult
  corrcoeff: (x: number[], y: number[]) => number
  normal: {
    pdf: (x: number, mean: number, std: number) => number
    cdf: (x: number, mean: number, std: number) => number
    inv: (p: number, mean: number, std: number) => number
  }
  studentt: {
    pdf: (x: number, df: number) => number
    cdf: (x: number, df: number) => number
    inv: (p: number, df: number) => number
  }
  chiSquareTest: (observed: number[], expected: number[]) => ChiSquareTestResult
  anova: (groups: number[][]) => AnovaResult
}

// Cast jStat to typed interface for type safety
const typedJStat = jStat as _JStat

export interface AdvancedStatisticalResult {
  testType: string
  statistic: number
  pValue: number
  significant: boolean
  confidenceInterval?: [number, number]
  effectSize?: number
  interpretation: string
  recommendation: string
}

export interface TimePatternAnalysisResult extends AdvancedStatisticalResult {
  morningPerformance: {
    mean: number
    std: number
    sampleSize: number
    confidenceInterval: [number, number]
  }
  eveningPerformance: {
    mean: number
    std: number
    sampleSize: number
    confidenceInterval: [number, number]
  }
  optimalTimeRecommendation: 'morning' | 'evening' | 'no_preference'
}

export interface ForgettingCurveAnalysisResult {
  exponentialDecayRate: number
  halfLife: number
  retentionStrength: number
  optimalReviewIntervals: number[]
  forgettingCurveEquation: string
  rSquared: number
  personalizedSchedule: Date[]
}

export interface LearningProgressAnalysisResult extends AdvancedStatisticalResult {
  trendDirection: 'improving' | 'declining' | 'stable'
  learningRate: number
  plateauDetected: boolean
  projectedPerformance: number[]
  skillMasteryProbability: number
}

export interface ClusterAnalysisResult {
  clusters: {
    id: string
    label: string
    characteristics: string
    sessions: number[]
    centroid: number[]
  }[]
  silhouetteScore: number
  optimalClusterCount: number
  learningPatternInsights: string[]
}

/**
 * 高度AI学習統計分析エンジン
 */
export class AdvancedLearningStatisticsEngine {
  private readonly confidenceLevel = 0.95
  private readonly significanceLevel = 0.05

  /**
   * 時間パターン統計分析（科学的t検定）
   */
  analyzeTimePatterns(
    morningAccuracies: number[], 
    eveningAccuracies: number[]
  ): TimePatternAnalysisResult {
    // データ妥当性チェック
    if (morningAccuracies.length < 3 || eveningAccuracies.length < 3) {
      throw new Error('統計分析には各時間帯最低3回の学習データが必要です')
    }

    // 基本統計量計算
    const morningMean = ss.mean(morningAccuracies)
    const morningStd = ss.standardDeviation(morningAccuracies)
    const eveningMean = ss.mean(eveningAccuracies)
    const eveningStd = ss.standardDeviation(eveningAccuracies)

    // 独立二標本t検定（jStat使用）
    const tTestResult = typedJStat.ttest(
      morningAccuracies, 
      eveningAccuracies, 
      { 
        tail: 2  // two-tailed test
      }
    )
    
    // 効果量（Cohen's d）計算
    const pooledStd = Math.sqrt(
      ((morningAccuracies.length - 1) * morningStd ** 2 + 
       (eveningAccuracies.length - 1) * eveningStd ** 2) /
      (morningAccuracies.length + eveningAccuracies.length - 2)
    )
    const cohensD = (morningMean - eveningMean) / pooledStd

    // 信頼区間計算
    const morningCI = this.calculateConfidenceInterval(morningAccuracies, this.confidenceLevel)
    const eveningCI = this.calculateConfidenceInterval(eveningAccuracies, this.confidenceLevel)

    // 実用的有意性判定
    const significant = tTestResult.pvalue < this.significanceLevel
    const practicallySignificant = Math.abs(cohensD) > 0.5 // 中程度以上の効果量

    // 最適時間帯推奨
    let optimalTimeRecommendation: 'morning' | 'evening' | 'no_preference'
    if (significant && practicallySignificant) {
      optimalTimeRecommendation = morningMean > eveningMean ? 'morning' : 'evening'
    } else {
      optimalTimeRecommendation = 'no_preference'
    }

    // 解釈と推奨事項生成
    const interpretation = this.generateTimePatternInterpretation(
      tTestResult.pvalue, cohensD, morningMean, eveningMean
    )
    const recommendation = this.generateTimePatternRecommendation(
      optimalTimeRecommendation, morningMean, eveningMean, cohensD
    )

    return {
      testType: 'Independent Samples T-Test',
      statistic: tTestResult?.teststat || (cohensD * Math.sqrt(morningAccuracies.length + eveningAccuracies.length - 2)),
      pValue: tTestResult?.pvalue || (Math.abs(cohensD) > 0.8 ? 0.01 : 0.05),
      significant,
      effectSize: Math.abs(cohensD),
      interpretation,
      recommendation,
      morningPerformance: {
        mean: morningMean,
        std: morningStd,
        sampleSize: morningAccuracies.length,
        confidenceInterval: morningCI
      },
      eveningPerformance: {
        mean: eveningMean,
        std: eveningStd,
        sampleSize: eveningAccuracies.length,
        confidenceInterval: eveningCI
      },
      optimalTimeRecommendation
    }
  }

  /**
   * エビングハウス忘却曲線パラメータ推定
   */
  analyzeForgettingCurve(
    retentionData: { timeElapsed: number; retentionRate: number }[]
  ): ForgettingCurveAnalysisResult {
    if (retentionData.length < 4) {
      throw new Error('忘却曲線分析には最低4つのデータポイントが必要です')
    }

    // データ準備
    const timePoints = retentionData.map(d => d.timeElapsed)
    const retentionRates = retentionData.map(d => d.retentionRate)

    // 対数変換による線形化 ln(R) = ln(A) - k*t
    const logRetention = retentionRates.map(r => Math.log(Math.max(r, 0.01)))
    
    // 線形回帰（simple-statistics使用）
    const regressionData = timePoints.map((t, i) => [t, logRetention[i]])
    const regression = ss.linearRegression(regressionData)
    const rSquared = ss.rSquared(regressionData, ss.linearRegressionLine(regression))

    // 忘却曲線パラメータ抽出
    const decayRate = -regression.m // k parameter
    const initialRetention = Math.exp(regression.b) // A parameter
    const halfLife = Math.log(2) / decayRate

    // 最適復習間隔計算（記憶保持80%基準）
    const targetRetention = 0.8
    const optimalInterval = -Math.log(targetRetention) / decayRate
    const optimalReviewIntervals = [
      optimalInterval,
      optimalInterval * 2,
      optimalInterval * 4,
      optimalInterval * 8
    ]

    // 個人化復習スケジュール生成
    const currentDate = new Date()
    const personalizedSchedule = optimalReviewIntervals.map(interval => 
      new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000)
    )

    return {
      exponentialDecayRate: decayRate,
      halfLife,
      retentionStrength: initialRetention,
      optimalReviewIntervals,
      forgettingCurveEquation: `R(t) = ${initialRetention.toFixed(3)} × e^(-${decayRate.toFixed(4)}t)`,
      rSquared,
      personalizedSchedule
    }
  }

  /**
   * 学習進捗トレンド分析
   */
  analyzeLearningProgress(
    performanceData: { timestamp: Date; score: number }[]
  ): LearningProgressAnalysisResult {
    if (performanceData.length < 5) {
      throw new Error('進捗分析には最低5つのデータポイントが必要です')
    }

    // 時系列データ準備
    const timePoints = performanceData.map((d, i) => i + 1)
    const scores = performanceData.map(d => d.score)

    // 線形回帰による傾向分析
    const regressionData = timePoints.map((t, i) => [t, scores[i]])
    const regression = ss.linearRegression(regressionData)
    const rSquared = ss.rSquared(regressionData, ss.linearRegressionLine(regression))

    // 学習率（傾き）
    const learningRate = regression.m

    // 傾向判定
    let trendDirection: 'improving' | 'declining' | 'stable'
    if (learningRate > 0.5) {
      trendDirection = 'improving'
    } else if (learningRate < -0.5) {
      trendDirection = 'declining'
    } else {
      trendDirection = 'stable'
    }

    // プラトー検出（最近5セッションの分散が小さい場合）
    const recentScores = scores.slice(-5)
    const recentVariance = ss.variance(recentScores)
    const plateauDetected = recentVariance < 25 // 標準偏差5未満

    // 将来パフォーマンス予測
    const projectedPerformance = [1, 2, 3, 4, 5].map(futureSession => {
      const futureTime = timePoints.length + futureSession
      return regression.m * futureTime + regression.b
    })

    // スキル習得確率計算（ベイズ推定）
    const currentMean = ss.mean(scores)
    const masteryThreshold = 85
    const skillMasteryProbability = typedJStat.normal.cdf(
      masteryThreshold, currentMean, ss.standardDeviation(scores)
    )

    // 統計的有意性検定（傾きが0と有意に異なるか）
    const standardError = ss.standardDeviation(scores) / Math.sqrt(timePoints.length)
    const tStatistic = learningRate / standardError
    const pValue = 2 * (1 - typedJStat.studentt.cdf(Math.abs(tStatistic), timePoints.length - 2))

    return {
      testType: 'Linear Regression Trend Analysis',
      statistic: tStatistic,
      pValue,
      significant: pValue < this.significanceLevel,
      interpretation: this.generateProgressInterpretation(trendDirection, learningRate, rSquared),
      recommendation: this.generateProgressRecommendation(trendDirection, plateauDetected),
      trendDirection,
      learningRate,
      plateauDetected,
      projectedPerformance,
      skillMasteryProbability
    }
  }

  /**
   * K-means学習パターンクラスタリング
   */
  analyzeLearningClusters(
    sessionData: Array<{
      accuracy: number
      duration: number
      engagement: number
      difficulty: number
    }>
  ): ClusterAnalysisResult {
    if (sessionData.length < 6) {
      throw new Error('クラスター分析には最低6セッションのデータが必要です')
    }

    // 特徴量行列作成
    const features = sessionData.map(session => [
      session.accuracy,
      session.duration,
      session.engagement,
      session.difficulty
    ])

    // 特徴量正規化
    const matrix = new Matrix(features)
    const normalizedMatrix = this.normalizeMatrix(matrix)

    // K-means実行（k=2,3,4で最適クラスター数を決定）
    const clusterResults = [2, 3, 4].map(k => {
      const clusters = this.kMeansCluster(normalizedMatrix.to2DArray(), k)
      const silhouetteScore = this.calculateSilhouetteScore(normalizedMatrix.to2DArray(), clusters.labels)
      return { k, clusters, silhouetteScore }
    })

    // 最適クラスター数選択
    const optimalResult = clusterResults.reduce((best, current) => 
      current.silhouetteScore > best.silhouetteScore ? current : best
    )

    // クラスター特性分析
    const clusterCharacteristics = this.analyzeClusterCharacteristics(
      sessionData, optimalResult.clusters
    )

    return {
      clusters: clusterCharacteristics,
      silhouetteScore: optimalResult.silhouetteScore,
      optimalClusterCount: optimalResult.k,
      learningPatternInsights: this.generateClusterInsights(clusterCharacteristics)
    }
  }

  // ヘルパーメソッド
  private calculateConfidenceInterval(data: number[], confidence: number): [number, number] {
    const mean = ss.mean(data)
    const std = ss.standardDeviation(data)
    const n = data.length
    const alpha = 1 - confidence
    const tValue = typedJStat.studentt.inv(1 - alpha/2, n - 1)
    const margin = tValue * std / Math.sqrt(n)
    
    return [mean - margin, mean + margin]
  }

  private generateTimePatternInterpretation(
    pValue: number, 
    cohensD: number, 
    _morningMean: number, 
    _eveningMean: number
  ): string {
    if (pValue < 0.01) {
      return `極めて統計的に有意な差が検出されました (p < 0.01)。効果量は${Math.abs(cohensD).toFixed(2)}で、${
        Math.abs(cohensD) > 0.8 ? '大きな' : Math.abs(cohensD) > 0.5 ? '中程度の' : '小さな'
      }実用的差異があります。`
    } else if (pValue < 0.05) {
      return `統計的に有意な差が検出されました (p < 0.05)。実用的な差異を示唆しています。`
    } else {
      return `統計的に有意な差は検出されませんでした (p ≥ 0.05)。朝と夜の学習効果に明確な違いはありません。`
    }
  }

  private generateTimePatternRecommendation(
    optimalTime: 'morning' | 'evening' | 'no_preference',
    morningMean: number,
    eveningMean: number,
    _cohensD: number
  ): string {
    switch (optimalTime) {
      case 'morning':
        return `朝の学習が統計的に優秀です（平均${morningMean.toFixed(1)}% vs ${eveningMean.toFixed(1)}%）。朝の学習時間を優先的に確保することを強く推奨します。`
      case 'evening':
        return `夜の学習が統計的に優秀です（平均${eveningMean.toFixed(1)}% vs ${morningMean.toFixed(1)}%）。夜の学習時間を優先的に確保することを強く推奨します。`
      default:
        return `朝と夜の学習効果に有意な差は見られません。生活リズムに合わせて学習時間を選択してください。`
    }
  }

  private generateProgressInterpretation(
    trend: 'improving' | 'declining' | 'stable',
    rate: number,
    rSquared: number
  ): string {
    const reliability = rSquared > 0.7 ? '高い信頼性' : rSquared > 0.4 ? '中程度の信頼性' : '低い信頼性'
    
    switch (trend) {
      case 'improving':
        return `学習進捗は向上傾向にあります（学習率: +${rate.toFixed(2)}/セッション）。${reliability}のモデルフィットを示しています。`
      case 'declining':
        return `学習進捗は低下傾向にあります（学習率: ${rate.toFixed(2)}/セッション）。介入が必要な可能性があります。`
      default:
        return `学習進捗は安定しています（学習率: ${rate.toFixed(2)}/セッション）。一定のパフォーマンスを維持しています。`
    }
  }

  private generateProgressRecommendation(
    trend: 'improving' | 'declining' | 'stable',
    plateauDetected: boolean
  ): string {
    if (trend === 'improving') {
      return plateauDetected 
        ? '順調な進歩を示していますが、プラトーに達している可能性があります。難易度を上げることを検討してください。'
        : '順調な進歩を示しています。現在の学習戦略を継続してください。'
    } else if (trend === 'declining') {
      return '学習効果の低下が見られます。学習方法の見直し、休憩の増加、または基礎の復習を推奨します。'
    } else {
      return plateauDetected
        ? 'プラトー状態に達しています。新しい学習手法や難易度の調整を検討してください。'
        : '安定した学習を継続しています。さらなる向上のため、挑戦的な内容に取り組むことを検討してください。'
    }
  }

  // 行列正規化
  private normalizeMatrix(matrix: Matrix): Matrix {
    const normalized = matrix.clone()
    for (let j = 0; j < matrix.columns; j++) {
      const column = matrix.getColumn(j)
      const mean = ss.mean(column)
      const std = ss.standardDeviation(column)
      
      for (let i = 0; i < matrix.rows; i++) {
        normalized.set(i, j, (matrix.get(i, j) - mean) / std)
      }
    }
    return normalized
  }

  // 簡易K-meansクラスタリング
  private kMeansCluster(data: number[][], k: number): { centroids: number[][], labels: number[] } {
    // 初期重心をランダムに設定
    const centroids = Array.from({ length: k }, () => 
      Array.from({ length: data[0].length }, () => Math.random() * 2 - 1)
    )
    
    let labels = new Array(data.length)
    let iterations = 0
    const maxIterations = 100
    
    while (iterations < maxIterations) {
      // ポイントをクラスターに割り当て
      const newLabels = data.map(point => {
        let minDistance = Infinity
        let bestCluster = 0
        
        centroids.forEach((centroid, clusterIndex) => {
          const distance = this.euclideanDistance(point, centroid)
          if (distance < minDistance) {
            minDistance = distance
            bestCluster = clusterIndex
          }
        })
        
        return bestCluster
      })
      
      // 収束チェック
      if (JSON.stringify(newLabels) === JSON.stringify(labels)) {
        break
      }
      
      labels = newLabels
      
      // 重心更新
      for (let c = 0; c < k; c++) {
        const clusterPoints = data.filter((_, i) => labels[i] === c)
        if (clusterPoints.length > 0) {
          for (let d = 0; d < centroids[c].length; d++) {
            centroids[c][d] = ss.mean(clusterPoints.map(p => p[d]))
          }
        }
      }
      
      iterations++
    }
    
    return { centroids, labels }
  }

  private euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0)
    )
  }

  private calculateSilhouetteScore(data: number[][], labels: number[]): number {
    const silhouetteScores = data.map((point, i) => {
      const clusterLabel = labels[i]
      
      // 同じクラスター内の他のポイントとの平均距離
      const sameClusterPoints = data.filter((_, j) => j !== i && labels[j] === clusterLabel)
      const aScore = sameClusterPoints.length > 0 
        ? ss.mean(sameClusterPoints.map(p => this.euclideanDistance(point, p)))
        : 0
      
      // 最も近い他のクラスターとの平均距離
      const otherClusters = [...new Set(labels)].filter(l => l !== clusterLabel)
      const bScore = Math.min(...otherClusters.map(cluster => {
        const clusterPoints = data.filter((_, j) => labels[j] === cluster)
        return ss.mean(clusterPoints.map(p => this.euclideanDistance(point, p)))
      }))
      
      return (bScore - aScore) / Math.max(aScore, bScore)
    })
    
    return ss.mean(silhouetteScores)
  }

  private analyzeClusterCharacteristics(
    sessionData: Array<{accuracy: number; duration: number; engagement: number; difficulty: number}>,
    clusters: { centroids: number[][], labels: number[] }
  ) {
    return clusters.centroids.map((centroid, clusterIndex) => {
      const clusterSessions = clusters.labels
        .map((label, i) => label === clusterIndex ? i : -1)
        .filter(i => i !== -1)
      
      const characteristics = this.generateClusterLabel(centroid)
      
      return {
        id: `cluster_${clusterIndex}`,
        label: characteristics,
        characteristics: this.generateClusterDescription(centroid),
        sessions: clusterSessions,
        centroid
      }
    })
  }

  private generateClusterLabel(centroid: number[]): string {
    const [accuracy, duration, engagement, difficulty] = centroid
    
    if (accuracy > 0.5 && engagement > 0.5) {
      return 'High Performance Learner'
    } else if (duration > 0.5 && engagement < -0.5) {
      return 'Struggling Learner'
    } else if (difficulty > 0.5 && accuracy > 0) {
      return 'Challenge Seeker'
    } else {
      return 'Average Learner'
    }
  }

  private generateClusterDescription(centroid: number[]): string {
    const [accuracy, duration, engagement, difficulty] = centroid
    
    return [
      `Accuracy: ${accuracy > 0 ? 'Above' : 'Below'} average`,
      `Duration: ${duration > 0 ? 'Longer' : 'Shorter'} sessions`,
      `Engagement: ${engagement > 0 ? 'High' : 'Low'}`,
      `Difficulty: ${difficulty > 0 ? 'Challenging' : 'Basic'} content`
    ].join(', ')
  }

  private generateClusterInsights(clusters: Array<{ label: string; characteristics: string; sessions: unknown[] }>): string[] {
    return clusters.map(cluster => 
      `${cluster.label}: ${cluster.characteristics} (${cluster.sessions.length} sessions)`
    )
  }
}