import { NextRequest, NextResponse } from 'next/server'
import { getIndustryLevelTargets, updateIndustryLevelTarget } from '@/lib/industry-xp-analytics'
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
    const { targetId, updates } = body

    // 単一目標更新の場合
    if (targetId && updates) {
      console.log('💾 Updating single industry target via API...', { targetId, updates })
      
      const success = await updateIndustryLevelTarget(targetId, updates)
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Industry target updated successfully'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to update industry target'
        }, { status: 500 })
      }
    }

    // 複数目標一括更新の場合
    const { targets } = body
    if (!targets || !Array.isArray(targets)) {
      return NextResponse.json({ error: 'Invalid request format. Expected targetId+updates or targets array' }, { status: 400 })
    }

    console.log('💾 Batch updating industry targets via API...', { count: targets.length })

    const results = await Promise.all(
      targets.map(async (target: { id: string; updates: any }) => {
        return await updateIndustryLevelTarget(target.id, target.updates)
      })
    )

    const successCount = results.filter(Boolean).length

    return NextResponse.json({
      success: successCount === targets.length,
      message: `${successCount}/${targets.length} targets updated successfully`,
      successCount,
      totalCount: targets.length
    })

  } catch (error) {
    console.error('❌ Industry targets update API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}