import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { getRunningBatches } from '@/lib/batch-management-server'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // システム管理者権限チェック
    if (userRole !== 'system_admin') {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    // バッチヘルス監視実行
    const { batches: runningBatches, error } = await getRunningBatches()
    
    if (error) {
      return NextResponse.json({
        success: true,
        health: {
          status: 'critical',
          message: 'データベース接続エラー',
          details: {
            stuck_processes: 0,
            recent_failures: 0
          }
        }
      })
    }

    // ヘルス状態を分析
    const stuckProcesses = runningBatches.filter(batch => {
      if (!batch.started_at) return false
      const startTime = new Date(batch.started_at).getTime()
      const now = Date.now()
      const hoursSinceStart = (now - startTime) / (1000 * 60 * 60)
      return hoursSinceStart > 2 // 2時間以上動いているプロセスは停止扱い
    }).length

    // 直近の失敗数をチェック（ここでは実装簡略化）
    const recentFailures = 0

    let status: 'healthy' | 'warning' | 'critical'
    let message: string

    if (stuckProcesses > 0) {
      status = 'critical'
      message = `${stuckProcesses}個のプロセスが停止状態です`
    } else if (runningBatches.length > 5) {
      status = 'warning'
      message = `実行中プロセスが多数あります (${runningBatches.length}個)`
    } else {
      status = 'healthy'
      message = 'バッチシステムは正常に動作しています'
    }

    const healthStatus = {
      status,
      message,
      details: {
        stuck_processes: stuckProcesses,
        recent_failures: recentFailures,
        running_processes: runningBatches.length
      }
    }

    return NextResponse.json({
      success: true,
      health: healthStatus
    })

  } catch (error) {
    console.error('バッチヘルス監視エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'バッチヘルス監視中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}