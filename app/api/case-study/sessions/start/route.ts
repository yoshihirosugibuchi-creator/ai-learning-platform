import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type {
  CaseStudyProblemRow,
  CaseStudyStepRow,
  CaseStudySessionInsert,
  CaseStudyStartSessionResponse
} from '@/lib/types/case-study'

/**
 * ケーススタディ セッション開始API
 * POST /api/case-study/sessions/start
 *
 * Request Body:
 * {
 *   problem_id: string  // 問題ID
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   session_id: string
 *   is_retry: boolean
 *   problem: CaseStudyProblem
 *   steps: CaseStudyStep[]
 *   current_step: number
 * }
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

// Service Role用Supabaseクライアント（管理者操作用）
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

export async function POST(request: Request) {
  try {
    // 認証確認
    const supabase = getSupabaseWithAuth(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    // リクエストボディ取得
    const body = await request.json()
    const { problem_id } = body

    if (!problem_id) {
      return NextResponse.json(
        { success: false, error: 'problem_id は必須です' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 問題情報を取得
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .select('*')
      .eq('id', problem_id)
      .eq('status', 'active')
      .single()

    if (problemError || !problem) {
      console.error('Problem fetch error:', problemError)
      return NextResponse.json(
        { success: false, error: '指定された問題が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ情報を取得
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('problem_id', problem_id)
      .order('step_number', { ascending: true })

    if (stepsError || !steps || steps.length === 0) {
      console.error('Steps fetch error:', stepsError)
      return NextResponse.json(
        { success: false, error: 'ステップ情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 過去に完了したセッションがあるか確認（再学習判定）
    const { data: completedSessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('problem_id', problem_id)
      .eq('status', 'completed')
      .limit(1)

    const isRetry = !!(completedSessions && completedSessions.length > 0)

    // 進行中のセッションがあるか確認
    const { data: existingSessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('id, current_step')
      .eq('user_id', user.id)
      .eq('problem_id', problem_id)
      .eq('status', 'in_progress')
      .limit(1)

    let sessionId: string
    let currentStep: number

    if (existingSessions && existingSessions.length > 0) {
      // 既存の進行中セッションを使用
      sessionId = existingSessions[0].id
      currentStep = existingSessions[0].current_step || 1
      console.log(`📋 Resuming existing session: ${sessionId}, step: ${currentStep}`)
    } else {
      // 新規セッション作成
      const sessionData: CaseStudySessionInsert = {
        user_id: user.id,
        problem_id: problem_id,
        status: 'in_progress',
        current_step: 1,
        is_retry: isRetry,
        started_at: new Date().toISOString(),
        hint_count: 0,
        xp_earned: 0,
        skp_earned: 0
      }

      const { data: newSession, error: sessionError } = await supabaseAdmin
        .from('case_study_sessions')
        .insert(sessionData)
        .select('id')
        .single()

      if (sessionError || !newSession) {
        console.error('Session creation error:', sessionError)
        return NextResponse.json(
          { success: false, error: 'セッション作成に失敗しました' },
          { status: 500 }
        )
      }

      sessionId = newSession.id
      currentStep = 1
      console.log(`📋 Created new session: ${sessionId}, is_retry: ${isRetry}`)
    }

    // ステップ情報からヒントと採点基準を除外（学習者向け）
    // Note: 型の整合性のため model_answer と hint は空のダミー値を設定
    const sanitizedSteps: CaseStudyStepRow[] = steps.map((step) => ({
      id: step.id,
      problem_id: step.problem_id,
      step_number: step.step_number,
      step_name: step.step_name,
      description: step.description,
      category_id: step.category_id,
      subcategory_id: step.subcategory_id,
      question_type: step.question_type,
      options: step.options,
      model_answer: {} as CaseStudyStepRow['model_answer'], // クライアントには送らない（空オブジェクト）
      hint: null, // ヒント要求時に別途取得
      target_skills: step.target_skills,
      max_score: step.max_score,
      display_order: step.display_order,
      created_at: step.created_at
    }))

    const response: CaseStudyStartSessionResponse = {
      success: true,
      session_id: sessionId,
      is_retry: isRetry,
      problem: problem as CaseStudyProblemRow,
      steps: sanitizedSteps,
      current_step: currentStep
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Case study session start error:', error)
    return NextResponse.json(
      { success: false, error: 'セッション開始に失敗しました' },
      { status: 500 }
    )
  }
}
