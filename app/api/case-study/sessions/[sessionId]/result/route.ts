import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ 結果取得API
 * GET /api/case-study/sessions/[sessionId]/result
 */

// 認証付きSupabaseクライアント作成
function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // 認証確認
    const supabase = getSupabaseWithAuth(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // セッション情報を取得
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('case_study_sessions')
      .select(`
        *,
        case_study_problems (
          id,
          title,
          case_text,
          primary_category_id,
          primary_subcategory_id,
          difficulty,
          industry,
          scenario_type,
          estimated_minutes,
          step_count
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    if (session.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: '完了したセッションのみ結果を取得できます' },
        { status: 400 }
      )
    }

    // ステップ情報と回答詳細を取得
    const { data: steps } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('problem_id', session.problem_id)
      .order('step_number')

    const { data: stepDetails } = await supabaseAdmin
      .from('case_study_step_details')
      .select('*')
      .eq('session_id', sessionId)
      .order('step_number')

    // ルーブリック軸情報を取得
    const { data: rubricAxes } = await supabaseAdmin
      .from('case_study_rubric_axes')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    // ステップと回答詳細を結合
    const stepsWithDetails = steps?.map(step => {
      const detail = stepDetails?.find(d => d.step_number === step.step_number)
      return {
        step_number: step.step_number,
        step_name: step.step_name,
        description: step.description,
        question_type: step.question_type,
        options: step.options,
        model_answer: step.model_answer, // 結果画面では模範解答を表示
        target_skills: step.target_skills,
        max_score: step.max_score,
        user_answer: {
          selected_choices: detail?.selected_choices,
          reasoning_text: detail?.reasoning_text
        },
        scoring: detail?.step_scoring
      }
    }) || []

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        started_at: session.started_at,
        completed_at: session.completed_at,
        total_time_seconds: session.total_time_seconds,
        hint_count: session.hint_count,
        total_score: session.total_score,
        max_possible_score: session.max_possible_score,
        score_percentage: session.score_percentage,
        is_retry: session.is_retry,
        xp_earned: session.xp_earned,
        skp_earned: session.skp_earned,
        bonus_details: session.bonus_details
      },
      problem: session.case_study_problems,
      scoring_result: session.scoring_result,
      steps_with_details: stepsWithDetails,
      rubric_axes: rubricAxes
    })

  } catch (error) {
    console.error('Result fetch error:', error)
    return NextResponse.json(
      { success: false, error: '結果取得に失敗しました' },
      { status: 500 }
    )
  }
}
