import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ問題インポートAPI
 * POST /api/admin/case-study/import - AI生成JSON → 問題+ステップ一括作成
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

interface ImportStep {
  step_number: number
  step_name: string
  description: string
  category_id: string
  subcategory_id: string
  question_type: string
  options: Array<{
    id: string
    text: string
    is_correct: boolean
    partial_score: number
  }>
  model_answer: {
    ideal_choices?: string[]
    acceptable_choices?: string[]
    essential_points?: string[]
    scoring_anchors?: Record<string, string>
  }
  hint?: string
  target_skills: string[]
  max_score: number
}

interface ImportProblem {
  title: string
  case_text: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty: string
  industry?: string
  scenario_type?: string
  estimated_minutes?: number
  step_count?: number
  steps: ImportStep[]
  // 生成メタデータ
  generation_model?: string
  generation_prompt?: string
}

export async function POST(request: NextRequest) {
  console.log('[Import API] POST called')
  try {
    const auth = await checkAdminAuth(request)
    console.log('[Import API] Auth result:', auth ? 'authenticated' : 'not authenticated')
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const body: ImportProblem = await request.json()
    console.log('[Import API] Body received:', {
      title: body.title,
      case_text: body.case_text?.substring(0, 100) + '...',
      stepsCount: body.steps?.length,
      difficulty: body.difficulty,
      primary_category_id: body.primary_category_id,
    })

    // バリデーション
    if (!body.title?.trim()) {
      console.log('[Import API] Validation failed: title missing')
      return NextResponse.json({ success: false, error: 'タイトルは必須です' }, { status: 400 })
    }
    if (!body.case_text?.trim()) {
      return NextResponse.json({ success: false, error: 'ケーステキストは必須です' }, { status: 400 })
    }
    if (!body.steps || body.steps.length === 0) {
      return NextResponse.json({ success: false, error: 'ステップは1つ以上必要です' }, { status: 400 })
    }
    if (body.steps.length < 5 || body.steps.length > 8) {
      return NextResponse.json({ success: false, error: 'ステップ数は5〜8の範囲で指定してください' }, { status: 400 })
    }

    const validDifficulties = ['basic', 'intermediate', 'advanced', 'expert']
    if (body.difficulty && !validDifficulties.includes(body.difficulty)) {
      return NextResponse.json({ success: false, error: '無効な難易度です' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 問題を作成
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .insert({
        title: body.title.trim(),
        case_text: body.case_text.trim(),
        primary_category_id: body.primary_category_id || 'logical_thinking_problem_solving',
        primary_subcategory_id: body.primary_subcategory_id || 'structured_thinking_mece',
        difficulty: body.difficulty || 'intermediate',
        industry: body.industry || null,
        scenario_type: body.scenario_type || null,
        estimated_minutes: body.estimated_minutes || 30,
        step_count: body.steps.length,
        status: 'draft',
        is_ai_generated: true,
        generation_model: body.generation_model || null,
        generation_prompt: body.generation_prompt || null,
        created_by: auth.userId,
      })
      .select()
      .single()

    if (problemError || !problem) {
      console.error('[Import API] Problem insert error:', problemError)
      return NextResponse.json(
        { success: false, error: `問題の作成に失敗しました: ${problemError?.message || 'unknown'}` },
        { status: 500 }
      )
    }
    console.log('[Import API] Problem created:', problem.id)

    // question_type の変換マッピング（UI値 → DB値）
    const questionTypeMap: Record<string, string> = {
      'multiple_choice': 'multiple',
      'descriptive': 'text',
      'hybrid': 'hybrid',
      // DB値がそのまま来た場合もサポート
      'single': 'single',
      'multiple': 'multiple',
      'ordering': 'ordering',
      'text': 'text',
    }

    // ステップを一括挿入
    const stepsToInsert = body.steps.map((step, index) => {
      const rawQuestionType = step.question_type || 'hybrid'
      const dbQuestionType = questionTypeMap[rawQuestionType] || 'hybrid'

      return {
        problem_id: problem.id,
        step_number: step.step_number || index + 1,
        step_name: step.step_name,
        description: step.description,
        category_id: step.category_id || body.primary_category_id || 'logical_thinking_problem_solving',
        subcategory_id: step.subcategory_id || body.primary_subcategory_id || 'structured_thinking_mece',
        question_type: dbQuestionType,
        options: step.options || null,
        model_answer: step.model_answer || {},
        hint: step.hint || null,
        target_skills: step.target_skills || [],
        max_score: step.max_score || 20,
        display_order: step.step_number || index + 1,
      }
    })

    const { error: stepsError } = await supabaseAdmin
      .from('case_study_steps')
      .insert(stepsToInsert)

    if (stepsError) {
      console.error('[Import API] Steps insert error:', stepsError)
      // 問題を削除（ロールバック）
      await supabaseAdmin.from('case_study_problems').delete().eq('id', problem.id)
      return NextResponse.json(
        { success: false, error: `ステップの作成に失敗しました: ${stepsError.message}` },
        { status: 500 }
      )
    }

    console.log('[Import API] Steps created:', stepsToInsert.length)
    console.log('[Import API] Import successful, problem ID:', problem.id)

    return NextResponse.json({
      success: true,
      problem,
      step_count: stepsToInsert.length,
    })
  } catch (error) {
    console.error('[Import API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: `インポートに失敗しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
