import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * オプションマスタ個別操作API
 * GET    /api/admin/case-study/options/[optionId] - 単一取得
 * PUT    /api/admin/case-study/options/[optionId] - 更新
 * DELETE /api/admin/case-study/options/[optionId] - 削除
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'development') {
    const testUserId = request.headers.get('x-test-user-id')
    const testRole = request.headers.get('x-test-role')
    if (testUserId && testRole && ['admin', 'system_admin'].includes(testRole)) {
      return { userId: testUserId, role: testRole }
    }
  }

  if (!authHeader?.startsWith('Bearer ')) return null

  const supabaseAdmin = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'system_admin'].includes(userData.role)) return null
  return { userId: user.id, role: userData.role }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ optionId: string }> }
) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { optionId } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('case_study_options')
      .select('*')
      .eq('id', optionId)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'オプションが見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ success: true, option: data })
  } catch (error) {
    console.error('Option GET error:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ optionId: string }> }
) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { optionId } = await params
    const body = await request.json()
    const supabaseAdmin = getSupabaseAdmin()

    const allowedFields = ['code', 'name', 'name_en', 'description', 'display_order', 'is_active', 'target_skills', 'is_extended']
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const { data, error } = await supabaseAdmin
      .from('case_study_options')
      .update(updateData)
      .eq('id', optionId)
      .select()
      .single()

    if (error) {
      console.error('Option update error:', error)
      return NextResponse.json({ success: false, error: '更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, option: data })
  } catch (error) {
    console.error('Option PUT error:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ optionId: string }> }
) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { optionId } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('case_study_options')
      .delete()
      .eq('id', optionId)

    if (error) {
      console.error('Option delete error:', error)
      return NextResponse.json({ success: false, error: '削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Option DELETE error:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 })
  }
}
