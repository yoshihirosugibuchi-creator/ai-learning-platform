import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { getBatchStats } from '@/lib/batch-management-server'

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
    const days = parseInt(searchParams.get('days') || '30')

    // バッチ統計取得
    const statsResult = await getBatchStats(undefined, days)

    return NextResponse.json(statsResult)

  } catch (error) {
    console.error('バッチ統計取得エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'バッチ統計取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}