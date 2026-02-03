import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ルーブリック軸詳細API
 * GET    /api/admin/case-study/rubric-axes/[axisId] - 詳細取得
 * PUT    /api/admin/case-study/rubric-axes/[axisId] - 更新
 * DELETE /api/admin/case-study/rubric-axes/[axisId] - 削除
 */

// Service Role用Supabaseクライアント
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// 認証・権限チェック
async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  // 開発環境でのテスト用バイパス
  if (process.env.NODE_ENV === 'development') {
    const testUserId = request.headers.get('x-test-user-id')
    const testRole = request.headers.get('x-test-role')
    if (testUserId && testRole && ['admin', 'system_admin'].includes(testRole)) {
      return { userId: testUserId, role: testRole }
    }
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const supabaseAdmin = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return null
  }

  // ユーザーのロールを確認
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'system_admin'].includes(userData.role)) {
    return null
  }

  return { userId: user.id, role: userData.role }
}

// GET: ルーブリック軸詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ axisId: string }> }
) {
  try {
    const { axisId } = await params
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: axis, error } = await supabaseAdmin
      .from('case_study_rubric_axes')
      .select('*')
      .eq('id', axisId)
      .single()

    if (error || !axis) {
      return NextResponse.json(
        { success: false, error: 'ルーブリック軸が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      axis
    })

  } catch (error) {
    console.error('Admin rubric axis detail error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: ルーブリック軸更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ axisId: string }> }
) {
  try {
    const { axisId } = await params
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    // 更新可能なフィールド
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'axis_code', 'axis_name', 'rubric_group_code', 'rubric_group_name',
      'definition', 'evaluation_points', 'score_anchors',
      'display_order', 'is_active'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    updateData.updated_at = new Date().toISOString()

    const { data: axis, error } = await supabaseAdmin
      .from('case_study_rubric_axes')
      .update(updateData)
      .eq('id', axisId)
      .select()
      .single()

    if (error || !axis) {
      console.error('Rubric axis update error:', error)
      return NextResponse.json(
        { success: false, error: 'ルーブリック軸の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      axis
    })

  } catch (error) {
    console.error('Admin rubric axis update error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: ルーブリック軸削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ axisId: string }> }
) {
  try {
    const { axisId } = await params
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('case_study_rubric_axes')
      .delete()
      .eq('id', axisId)

    if (error) {
      console.error('Rubric axis delete error:', error)
      return NextResponse.json(
        { success: false, error: 'ルーブリック軸の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin rubric axis delete error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
