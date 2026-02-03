import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 思考ログAPI
 * GET /api/admin/case-study/thinking-logs - ページネーション付きログ一覧
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

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const sessionId = searchParams.get('session_id')

    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin
      .from('case_study_thinking_logs')
      .select('*', { count: 'exact' })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    query = query
      .order('timestamp', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: logs, count, error } = await query

    if (error) {
      console.error('Thinking logs query error:', error)
      return NextResponse.json(
        { success: false, error: 'ログの取得に失敗しました' },
        { status: 500 }
      )
    }

    const total = count || 0

    return NextResponse.json({
      success: true,
      logs: logs || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Thinking logs GET error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
