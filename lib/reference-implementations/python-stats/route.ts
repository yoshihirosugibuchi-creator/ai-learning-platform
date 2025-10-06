import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

interface StatisticalAnalysisRequest {
  analysisType: 'time-pattern' | 'difficulty-progression' | 'learning-clustering'
  data: unknown
}

interface StatisticalAnalysisResponse {
  success: boolean
  result?: unknown
  error?: string
  executionTime?: number
}

/**
 * Python統計分析サービス API エンドポイント
 * scipy/numpyの代替として標準ライブラリベースの実装
 */
export async function POST(request: NextRequest): Promise<NextResponse<StatisticalAnalysisResponse>> {
  const startTime = Date.now()
  
  try {
    const body: StatisticalAnalysisRequest = await request.json()
    const { analysisType, data } = body

    if (!analysisType || !data) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: analysisType and data'
      }, { status: 400 })
    }

    // Python統計サービススクリプトのパス
    const pythonScriptPath = path.join(process.cwd(), 'lib', 'python-stats-service.py')
    
    // Python統計分析を実行
    const result = await executePythonStatistics(pythonScriptPath, analysisType, data)
    
    const executionTime = Date.now() - startTime

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error,
        executionTime
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      result: result.data,
      executionTime
    })

  } catch (error) {
    console.error('Python statistics API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}

/**
 * Python統計分析スクリプトを実行
 */
function executePythonStatistics(
  scriptPath: string, 
  analysisType: string, 
  inputData: unknown
): Promise<{ data?: unknown; error?: string }> {
  return new Promise((resolve) => {
    try {
      // Python3でスクリプトを実行
      const pythonProcess = spawn('python3', [scriptPath, analysisType], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      // データをJSONとして標準入力に送信
      pythonProcess.stdin.write(JSON.stringify(inputData))
      pythonProcess.stdin.end()

      // 標準出力を収集
      pythonProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      // 標準エラーを収集
      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      // プロセス終了時の処理
      pythonProcess.on('close', (code: number) => {
        if (code !== 0) {
          console.error('Python process failed:', stderr)
          resolve({
            error: `Python analysis failed with code ${code}: ${stderr}`
          })
          return
        }

        try {
          // JSON結果をパース
          const result = JSON.parse(stdout)
          resolve({ data: result })
        } catch (parseError) {
          console.error('Failed to parse Python output:', stdout)
          resolve({
            error: `Failed to parse Python output: ${parseError}`
          })
        }
      })

      // タイムアウト設定（30秒）
      const timeout = setTimeout(() => {
        pythonProcess.kill()
        resolve({
          error: 'Python analysis timed out after 30 seconds'
        })
      }, 30000)

      pythonProcess.on('close', () => {
        clearTimeout(timeout)
      })

    } catch (error) {
      resolve({
        error: `Failed to execute Python script: ${error}`
      })
    }
  })
}

/**
 * 統計分析APIの使用例とドキュメント
 */
export async function GET(): Promise<NextResponse> {
  const documentation = {
    endpoint: '/api/learning-analytics/python-stats',
    method: 'POST',
    description: 'Python標準ライブラリベースの統計分析サービス',
    parameters: {
      analysisType: {
        type: 'string',
        enum: ['time-pattern', 'difficulty-progression', 'learning-clustering'],
        description: '実行する分析タイプ'
      },
      data: {
        type: 'object',
        description: '分析対象データ'
      }
    },
    examples: {
      'time-pattern': {
        analysisType: 'time-pattern',
        data: {
          morning_accuracies: [85, 78, 92, 88],
          evening_accuracies: [72, 68, 75, 71]
        }
      },
      'difficulty-progression': {
        analysisType: 'difficulty-progression',
        data: {
          difficulty_progression: [65, 72, 78, 85, 82],
          time_points: [1, 2, 3, 4, 5]
        }
      },
      'learning-clustering': {
        analysisType: 'learning-clustering',
        data: {
          learning_sessions: [
            { accuracy: 85, duration_minutes: 25 },
            { accuracy: 92, duration_minutes: 30 },
            { accuracy: 68, duration_minutes: 45 }
          ]
        }
      }
    },
    features: [
      'Independent two-sample t-test (手動実装)',
      'Pearson correlation coefficient (手動実装)', 
      'Simple clustering analysis (統計的グループ分け)',
      'Trend analysis and recommendations',
      'No external dependencies (標準ライブラリのみ)'
    ],
    limitations: [
      'scipy/numpyなしのため、一部統計機能は簡易実装',
      'p値計算は近似値',
      'クラスタリングは四分位ベースの簡易版'
    ]
  }

  return NextResponse.json(documentation)
}