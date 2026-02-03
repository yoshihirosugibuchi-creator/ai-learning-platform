import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ケーススタディ問題ステータス変更API
 * PUT /api/admin/case-study/problems/[problemId]/status
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

// PUT: ステータス変更
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

    const { status } = body
    const validStatuses = ['draft', 'review', 'active', 'archived']

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '無効なステータスです' },
        { status: 400 }
      )
    }

    // 現在の問題を取得
    const { data: currentProblem, error: fetchError } = await supabaseAdmin
      .from('case_study_problems')
      .select('status')
      .eq('id', problemId)
      .single()

    if (fetchError || !currentProblem) {
      return NextResponse.json(
        { success: false, error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    // ステータス遷移ルール（オプション: 厳格なワークフロー）
    const allowedTransitions: Record<string, string[]> = {
      draft: ['review', 'archived'],
      review: ['draft', 'active', 'archived'],
      active: ['archived'],
      archived: ['draft']
    }

    if (!allowedTransitions[currentProblem.status]?.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `${currentProblem.status}から${status}への変更は許可されていません`,
          allowed_transitions: allowedTransitions[currentProblem.status]
        },
        { status: 400 }
      )
    }

    // ステータス更新
    const { data: problem, error: updateError } = await supabaseAdmin
      .from('case_study_problems')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', problemId)
      .select()
      .single()

    if (updateError || !problem) {
      console.error('Problem status update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'ステータスの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      problem,
      previous_status: currentProblem.status,
      new_status: status
    })

  } catch (error) {
    console.error('Admin problem status error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
