import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ケーススタディ問題 注目日設定API
 * PUT /api/admin/case-study/problems/[problemId]/featured
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

// PUT: 注目日設定
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  try {
    const { problemId } = await params
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    const { featured_date } = body

    // 日付フォーマット検証（YYYY-MM-DD または null）
    if (featured_date !== null) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(featured_date)) {
        return NextResponse.json(
          { success: false, error: '日付形式が無効です（YYYY-MM-DD）' },
          { status: 400 }
        )
      }

      // 有効な日付かチェック
      const date = new Date(featured_date)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { success: false, error: '無効な日付です' },
          { status: 400 }
        )
      }
    }

    // 問題存在確認
    const { data: currentProblem, error: fetchError } = await supabaseAdmin
      .from('case_study_problems')
      .select('id, status, featured_date')
      .eq('id', problemId)
      .single()

    if (fetchError || !currentProblem) {
      return NextResponse.json(
        { success: false, error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    // 同じ日付に既に別の問題が設定されていないかチェック
    if (featured_date) {
      const { data: existingFeatured } = await supabaseAdmin
        .from('case_study_problems')
        .select('id, title')
        .eq('featured_date', featured_date)
        .neq('id', problemId)
        .single()

      if (existingFeatured) {
        return NextResponse.json(
          {
            success: false,
            error: `この日付には既に別の問題が設定されています: ${existingFeatured.title}`,
            conflicting_problem_id: existingFeatured.id
          },
          { status: 409 }
        )
      }
    }

    // 注目日を更新
    const { data: problem, error: updateError } = await supabaseAdmin
      .from('case_study_problems')
      .update({
        featured_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', problemId)
      .select()
      .single()

    if (updateError || !problem) {
      console.error('Problem featured date update error:', updateError)
      return NextResponse.json(
        { success: false, error: '注目日の設定に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      problem,
      previous_featured_date: currentProblem.featured_date,
      new_featured_date: featured_date
    })

  } catch (error) {
    console.error('Admin problem featured error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
