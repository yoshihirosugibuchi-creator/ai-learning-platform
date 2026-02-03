import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ ステップ管理API
 * GET /api/admin/case-study/problems/[problemId]/steps - ステップ一覧取得
 * POST /api/admin/case-study/problems/[problemId]/steps - ステップ追加
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

interface RouteParams {
  params: Promise<{ problemId: string }>
}

// ステップ一覧取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { problemId } = await params

    const supabaseAdmin = getSupabaseAdmin()

    // 問題の存在確認
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .select('id, title')
      .eq('id', problemId)
      .single()

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ一覧を取得
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('problem_id', problemId)
      .order('step_number', { ascending: true })

    if (stepsError) {
      console.error('Steps fetch error:', stepsError)
      return NextResponse.json(
        { success: false, error: 'ステップの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      problem: { id: problem.id, title: problem.title },
      steps: steps || []
    })
  } catch (error) {
    console.error('Steps GET error:', error)
    return NextResponse.json(
      { success: false, error: 'ステップの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// ステップ追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { problemId } = await params
    const body = await request.json()

    const supabaseAdmin = getSupabaseAdmin()

    // 問題の存在確認
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .select('id, step_count')
      .eq('id', problemId)
      .single()

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    // 現在のステップ数を確認
    const { count: currentStepCount } = await supabaseAdmin
      .from('case_study_steps')
      .select('*', { count: 'exact', head: true })
      .eq('problem_id', problemId)

    const newStepNumber = (currentStepCount || 0) + 1

    if (newStepNumber > 8) {
      return NextResponse.json(
        { success: false, error: 'ステップは最大8個までです' },
        { status: 400 }
      )
    }

    // バリデーション
    if (!body.step_name?.trim()) {
      return NextResponse.json({ success: false, error: 'ステップ名は必須です' }, { status: 400 })
    }
    if (!body.description?.trim()) {
      return NextResponse.json({ success: false, error: '説明は必須です' }, { status: 400 })
    }
    if (!body.model_answer) {
      return NextResponse.json({ success: false, error: '模範解答は必須です' }, { status: 400 })
    }

    const validQuestionTypes = ['single', 'multiple', 'ordering', 'text', 'hybrid']
    const questionType = body.question_type || 'hybrid'
    if (!validQuestionTypes.includes(questionType)) {
      return NextResponse.json({ success: false, error: '無効な質問タイプです' }, { status: 400 })
    }

    // 選択肢が必要なタイプでoptions確認
    if (['single', 'multiple', 'hybrid'].includes(questionType)) {
      if (!body.options || !Array.isArray(body.options) || body.options.length === 0) {
        return NextResponse.json({ success: false, error: '選択肢は必須です' }, { status: 400 })
      }
    }

    // ステップを作成
    const stepData = {
      problem_id: problemId,
      step_number: body.step_number || newStepNumber,
      step_name: body.step_name.trim(),
      description: body.description.trim(),
      category_id: body.category_id || 'logical_thinking_problem_solving',
      subcategory_id: body.subcategory_id || 'structured_thinking',
      question_type: questionType,
      options: body.options || null,
      model_answer: body.model_answer,
      hint: body.hint || null,
      target_skills: body.target_skills || [],
      max_score: body.max_score || 10,
      display_order: body.step_number || newStepNumber,
    }

    const { data: step, error: stepError } = await supabaseAdmin
      .from('case_study_steps')
      .insert(stepData)
      .select()
      .single()

    if (stepError) {
      console.error('Step insert error:', stepError)
      return NextResponse.json(
        { success: false, error: 'ステップの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 問題のstep_countを更新
    await supabaseAdmin
      .from('case_study_problems')
      .update({ step_count: newStepNumber, updated_at: new Date().toISOString() })
      .eq('id', problemId)

    return NextResponse.json({
      success: true,
      step
    }, { status: 201 })
  } catch (error) {
    console.error('Steps POST error:', error)
    return NextResponse.json(
      { success: false, error: 'ステップの作成に失敗しました' },
      { status: 500 }
    )
  }
}
