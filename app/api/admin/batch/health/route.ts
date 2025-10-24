import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { monitorBatchHealth } from '@/lib/batch-management'

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
    const healthStatus = await monitorBatchHealth()

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