import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { getBatchHistory } from '@/lib/batch-management'

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

    // URLパラメータ取得
    const { searchParams } = new URL(request.url)
    const processType = searchParams.get('process_type') || undefined
    const status = searchParams.get('status') || undefined
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '50')

    // バッチ履歴取得
    const historyResult = await getBatchHistory({
      process_type: processType as any,
      status: status as any,
      days,
      limit
    })

    return NextResponse.json(historyResult)

  } catch (error) {
    console.error('バッチ履歴取得エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'バッチ履歴取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}