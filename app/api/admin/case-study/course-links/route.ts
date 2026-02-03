import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ケーススタディ コース連動API
 * GET /api/admin/case-study/course-links
 * POST /api/admin/case-study/course-links
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

// GET: コース連動一覧取得
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    const problemId = searchParams.get('problem_id')
    const courseId = searchParams.get('course_id')

    let query = supabaseAdmin
      .from('case_study_course_links')
      .select('*')
      .order('created_at', { ascending: false })

    if (problemId) {
      query = query.eq('problem_id', problemId)
    }
    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: links, error } = await query

    if (error) {
      console.error('Course links fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'コース連動の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      links: links || []
    })

  } catch (error) {
    console.error('Admin course links error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: コース連動作成
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    const {
      problem_id,
      course_id,
      display_after_session = null,
    } = body

    // バリデーション
    if (!problem_id || !course_id) {
      return NextResponse.json(
        { success: false, error: 'problem_idとcourse_idは必須です' },
        { status: 400 }
      )
    }

    // 問題存在確認
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .select('id')
      .eq('id', problem_id)
      .single()

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: '指定された問題が見つかりません' },
        { status: 404 }
      )
    }

    // コース存在確認（learning_coursesテーブルを参照）
    const { data: course, error: courseError } = await supabaseAdmin
      .from('learning_courses')
      .select('id')
      .eq('id', course_id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: '指定されたコースが見つかりません' },
        { status: 404 }
      )
    }

    // 重複チェック
    const { data: existingLink } = await supabaseAdmin
      .from('case_study_course_links')
      .select('id')
      .eq('problem_id', problem_id)
      .eq('course_id', course_id)
      .maybeSingle()

    if (existingLink) {
      return NextResponse.json(
        { success: false, error: 'この問題とコースの組み合わせは既に存在します' },
        { status: 409 }
      )
    }

    // コース連動作成
    const { data: link, error: createError } = await supabaseAdmin
      .from('case_study_course_links')
      .insert({
        problem_id,
        course_id,
        display_after_session,
      })
      .select()
      .single()

    if (createError || !link) {
      console.error('Course link creation error:', createError)
      return NextResponse.json(
        { success: false, error: 'コース連動の作成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      link
    }, { status: 201 })

  } catch (error) {
    console.error('Admin course link creation error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
