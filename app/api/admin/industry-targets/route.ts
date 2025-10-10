import { NextRequest, NextResponse } from 'next/server'
import { getIndustryLevelTargets } from '@/lib/industry-xp-analytics'
import { getCurrentUserRole } from '@/lib/auth-helpers'

/**
 * GET /api/admin/industry-targets
 * 業界レベル目標データの取得（管理者用）
 */
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 管理者権限確認
    if (userRole !== 'system_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const industryId = searchParams.get('industryId') || undefined
    const level = searchParams.get('level') || undefined

    console.log('📋 Loading industry targets via API...', { industryId, level })

    // 業界目標データ取得
    const targets = await getIndustryLevelTargets(industryId, level)

    return NextResponse.json({
      success: true,
      targets,
      count: targets.length
    })

  } catch (error) {
    console.error('❌ Industry targets API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      targets: []
    }, { status: 500 })
  }
}

/**
 * PUT /api/admin/industry-targets
 * 業界レベル目標データの更新（管理者用）
 */
export async function PUT(request: NextRequest) {
  try {
    // 管理者権限チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 管理者権限確認
    if (userRole !== 'system_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { targets } = body

    if (!targets || !Array.isArray(targets)) {
      return NextResponse.json({ error: 'Invalid targets data' }, { status: 400 })
    }

    console.log('💾 Updating industry targets via API...', { count: targets.length })

    // TODO: 業界目標データ更新処理を実装
    // const updatedTargets = await updateIndustryLevelTargets(targets)

    return NextResponse.json({
      success: true,
      message: 'Industry targets updated successfully',
      // updatedTargets
    })

  } catch (error) {
    console.error('❌ Industry targets update API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}