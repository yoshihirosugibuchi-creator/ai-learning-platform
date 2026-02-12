import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ケーススタディ問題詳細API
 * GET /api/admin/case-study/problems/[problemId]
 * PUT /api/admin/case-study/problems/[problemId]
 * DELETE /api/admin/case-study/problems/[problemId]
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

// GET: 問題詳細取得
export async function GET(
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

    // 問題とステップを取得
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .select('*')
      .eq('id', problemId)
      .single()

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    const { data: steps } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('problem_id', problemId)
      .order('step_number')

    // セッション統計を取得
    const { data: sessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('id, status, score_percentage')
      .eq('problem_id', problemId)

    const stats = {
      total_sessions: sessions?.length || 0,
      completed_sessions: sessions?.filter(s => s.status === 'completed').length || 0,
      avg_score: sessions?.filter(s => s.status === 'completed' && s.score_percentage != null)
        .reduce((sum, s, _, arr) => sum + (s.score_percentage || 0) / arr.length, 0) || 0
    }

    // コース連動情報を取得
    const { data: courseLinks } = await supabaseAdmin
      .from('case_study_course_links')
      .select('*')
      .eq('problem_id', problemId)

    return NextResponse.json({
      success: true,
      problem,
      steps: steps || [],
      stats,
      course_links: courseLinks || []
    })

  } catch (error) {
    console.error('Admin problem detail error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: 問題更新
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

    // 更新可能なフィールド
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'title', 'case_text', 'primary_category_id', 'primary_subcategory_id',
      'difficulty', 'industry', 'scenario_type', 'estimated_minutes',
      'step_count', 'step_template', 'status', 'featured_date', 'scoring_ai_provider'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    updateData.updated_at = new Date().toISOString()

    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .update(updateData)
      .eq('id', problemId)
      .select()
      .single()

    if (problemError || !problem) {
      console.error('Problem update error:', problemError)
      return NextResponse.json(
        { success: false, error: '問題の更新に失敗しました' },
        { status: 500 }
      )
    }

    // ステップの更新がある場合
    if (body.steps && Array.isArray(body.steps)) {
      for (const step of body.steps) {
        if (step.id) {
          // 既存ステップの更新
          const stepUpdateData: Record<string, unknown> = {}
          const stepFields = [
            'step_name', 'description', 'category_id', 'subcategory_id',
            'question_type', 'options', 'model_answer', 'hint',
            'target_skills', 'max_score', 'display_order'
          ]

          for (const field of stepFields) {
            if (step[field] !== undefined) {
              stepUpdateData[field] = step[field]
            }
          }

          if (Object.keys(stepUpdateData).length > 0) {
            await supabaseAdmin
              .from('case_study_steps')
              .update(stepUpdateData)
              .eq('id', step.id)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      problem
    })

  } catch (error) {
    console.error('Admin problem update error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: 問題削除
export async function DELETE(
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

    // セッションが存在するか確認
    const { data: sessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('id')
      .eq('problem_id', problemId)
      .limit(1)

    if (sessions && sessions.length > 0) {
      // セッションが存在する場合は論理削除（archived）
      const { error: updateError } = await supabaseAdmin
        .from('case_study_problems')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', problemId)

      if (updateError) {
        console.error('Problem archive error:', updateError)
        return NextResponse.json(
          { success: false, error: '問題のアーカイブに失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '学習履歴があるため、アーカイブしました',
        archived: true
      })
    }

    // セッションがない場合は物理削除
    const { error: deleteError } = await supabaseAdmin
      .from('case_study_problems')
      .delete()
      .eq('id', problemId)

    if (deleteError) {
      console.error('Problem delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: '問題の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '問題を削除しました',
      deleted: true
    })

  } catch (error) {
    console.error('Admin problem delete error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
