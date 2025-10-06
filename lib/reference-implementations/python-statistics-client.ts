/**
 * Python統計分析クライアント
 * FastAPIの代替として標準ライブラリベースの実装
 */

interface PythonStatisticsRequest {
  analysisType: 'time-pattern' | 'difficulty-progression' | 'learning-clustering'
  data: unknown
}

interface PythonStatisticsResponse {
  success: boolean
  result?: unknown
  error?: string
  executionTime?: number
}

export class PythonStatisticsClient {
  private readonly baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }

  /**
   * 時間パターン分析（朝vs夜のパフォーマンス）
   */
  async analyzeTimePatterns(morningAccuracies: number[], eveningAccuracies: number[]): Promise<unknown> {
    return this.callPythonAPI('time-pattern', {
      morning_accuracies: morningAccuracies,
      evening_accuracies: eveningAccuracies
    })
  }

  /**
   * 難易度進行分析
   */
  async analyzeDifficultyProgression(scores: number[], timePoints?: number[]): Promise<unknown> {
    return this.callPythonAPI('difficulty-progression', {
      difficulty_progression: scores,
      time_points: timePoints || scores.map((_, i) => i + 1)
    })
  }

  /**
   * 学習パターンクラスタリング分析
   */
  async analyzeLearningClusters(sessions: Array<{ accuracy: number; duration_minutes: number }>): Promise<unknown> {
    return this.callPythonAPI('learning-clustering', {
      learning_sessions: sessions
    })
  }

  /**
   * 統計的有意性検定（t検定）
   */
  async performTTest(sample1: number[], sample2: number[], _testName: string = 'comparison'): Promise<unknown> {
    // t検定は時間パターン分析の一部として実装
    return this.analyzeTimePatterns(sample1, sample2)
  }

  /**
   * 相関分析
   */
  async analyzeCorrelation(xValues: number[], yValues: number[], _analysisName: string = 'correlation'): Promise<unknown> {
    // 相関分析は難易度進行分析の一部として実装
    return this.analyzeDifficultyProgression(yValues, xValues)
  }

  /**
   * Python統計APIを呼び出す共通メソッド
   */
  private async callPythonAPI(analysisType: string, data: unknown): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/learning-analytics/python-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType,
          data
        } as PythonStatisticsRequest)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: PythonStatisticsResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Python statistics analysis failed')
      }

      return result.result
    } catch (error) {
      console.error('Python statistics API error:', error)
      throw error
    }
  }

  /**
   * 統計分析の健全性チェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 簡単なテストデータで動作確認
      const testResult = await this.analyzeTimePatterns([80, 85, 90], [70, 75, 80])
      return Boolean(testResult && typeof testResult === 'object')
    } catch (error) {
      console.error('Python statistics health check failed:', error)
      return false
    }
  }
}

// シングルトンインスタンス
export const pythonStatsClient = new PythonStatisticsClient()

// 型定義のエクスポート
export type {
  PythonStatisticsRequest,
  PythonStatisticsResponse
}