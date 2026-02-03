import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ セッション情報取得API
 * GET /api/case-study/sessions/[sessionId]
 *
 * セッション・問題・ステップ情報を返す（学習ページ用）
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

    // セッション情報を取得・所有権確認
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('case_study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    // 完了済みセッションの場合はリダイレクト情報を返す
    if (session.status === 'completed') {
      return NextResponse.json({
        success: true,
        redirect: `/case-study/result/${sessionId}`,
        status: 'completed'
      })
    }

    // 問題情報を取得
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .select('*')
      .eq('id', session.problem_id)
      .single()

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: '問題情報が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ情報を取得
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('problem_id', session.problem_id)
      .order('step_number', { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ステップ情報が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ情報からヒントと模範解答を除外（学習者向け）
    const sanitizedSteps = steps.map(step => ({
      id: step.id,
      problem_id: step.problem_id,
      step_number: step.step_number,
      step_name: step.step_name,
      description: step.description,
      category_id: step.category_id,
      subcategory_id: step.subcategory_id,
      question_type: step.question_type,
      options: step.options,
      model_answer: {},
      hint: null,
      target_skills: step.target_skills,
      max_score: step.max_score,
      display_order: step.display_order,
      created_at: step.created_at
    }))

    // 既存の回答を取得（セッション再開時に前ステップの回答を表示するため）
    let existingResponses: { step_number: number, selected_choices: string[], reasoning_text: string, hint_used: boolean }[] = []

    const { data: stepDetails } = await supabaseAdmin
      .from('case_study_step_details')
      .select('step_number, selected_choices, reasoning_text, quiz_answer_id')
      .eq('session_id', sessionId)
      .order('step_number', { ascending: true })

    if (stepDetails && stepDetails.length > 0) {
      // quiz_answersからヒント使用情報を取得
      const quizAnswerIds = stepDetails.map(d => d.quiz_answer_id).filter(Boolean)
      const hintMap = new Map<string, boolean>()

      if (quizAnswerIds.length > 0) {
        const { data: quizAnswers } = await supabaseAdmin
          .from('quiz_answers')
          .select('id, max_hint_level')
          .in('id', quizAnswerIds)

        if (quizAnswers) {
          quizAnswers.forEach(qa => {
            hintMap.set(qa.id, (qa.max_hint_level || 0) > 0)
          })
        }
      }

      existingResponses = stepDetails.map(d => ({
        step_number: d.step_number,
        selected_choices: (d.selected_choices as string[]) || [],
        reasoning_text: (d.reasoning_text as string) || '',
        hint_used: hintMap.get(d.quiz_answer_id) || false
      }))
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        problem_id: session.problem_id,
        status: session.status,
        current_step: session.current_step || 1,
        is_retry: session.is_retry,
        hint_count: session.hint_count
      },
      problem,
      steps: sanitizedSteps,
      existingResponses
    })

  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'セッション情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
