import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ケーススタディ コース連動詳細API
 * GET /api/admin/case-study/course-links/[linkId]
 * PUT /api/admin/case-study/course-links/[linkId]
 * DELETE /api/admin/case-study/course-links/[linkId]
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

// GET: コース連動詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: link, error } = await supabaseAdmin
      .from('case_study_course_links')
      .select('*')
      .eq('id', linkId)
      .single()

    if (error || !link) {
      return NextResponse.json(
        { success: false, error: 'コース連動が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      link
    })

  } catch (error) {
    console.error('Admin course link detail error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: コース連動更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    // 更新可能なフィールド（テーブル定義に合わせる）
    const updateData: Record<string, unknown> = {}
    const allowedFields = ['display_after_session']

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // updated_atを自動設定
    updateData.updated_at = new Date().toISOString()

    const { data: link, error } = await supabaseAdmin
      .from('case_study_course_links')
      .update(updateData)
      .eq('id', linkId)
      .select()
      .single()

    if (error || !link) {
      console.error('Course link update error:', error)
      return NextResponse.json(
        { success: false, error: 'コース連動の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      link
    })

  } catch (error) {
    console.error('Admin course link update error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: コース連動削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('case_study_course_links')
      .delete()
      .eq('id', linkId)

    if (error) {
      console.error('Course link delete error:', error)
      return NextResponse.json(
        { success: false, error: 'コース連動の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'コース連動を削除しました'
    })

  } catch (error) {
    console.error('Admin course link delete error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
