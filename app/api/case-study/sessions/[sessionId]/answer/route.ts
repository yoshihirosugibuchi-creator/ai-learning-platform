import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type {
  CaseStudyStepDetailInsert,
  CaseStudyThinkingLogInsert,
  CaseStudyAnswerResponse
} from '@/lib/types/case-study'

/**
 * ケーススタディ 回答提出API
 * POST /api/case-study/sessions/[sessionId]/answer
 *
 * Request Body:
 * {
 *   step_id: string
 *   step_number: number
 *   selected_choices?: string[]     // 選択肢の選択結果
 *   reasoning_text?: string         // 記述回答
 *   hint_used?: boolean             // ヒント使用フラグ
 *   confidence_level?: number       // 自己評価 1-5
 *   time_spent_ms: number           // 回答時間（ミリ秒）
 *   step_started_at?: string        // ステップ開始時刻
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

interface AnswerRequestBody {
  step_id: string
  step_number: number
  selected_choices?: string[]
  reasoning_text?: string
  hint_used?: boolean
  confidence_level?: number
  time_spent_ms: number
  step_started_at?: string
}

export async function POST(
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

    const body: AnswerRequestBody = await request.json()
    const {
      step_id,
      step_number,
      selected_choices,
      reasoning_text,
      hint_used = false,
      confidence_level,
      time_spent_ms,
      step_started_at
    } = body

    if (!step_id || !step_number) {
      return NextResponse.json(
        { success: false, error: 'step_id と step_number は必須です' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // セッション情報を取得・所有権確認
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('case_study_sessions')
      .select(`
        *,
        case_study_problems (
          id,
          step_count,
          difficulty
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .single()

    if (sessionError || !session) {
      console.error('Session fetch error:', sessionError)
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    // ステップ情報を取得
    const { data: step, error: stepError } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('id', step_id)
      .single()

    if (stepError || !step) {
      console.error('Step fetch error:', stepError)
      return NextResponse.json(
        { success: false, error: 'ステップが見つかりません' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // 既存の回答があるか確認（過去ステップの修正対応）
    const { data: existingDetail } = await supabaseAdmin
      .from('case_study_step_details')
      .select('id, quiz_answer_id')
      .eq('session_id', sessionId)
      .eq('step_number', step_number)
      .maybeSingle()

    if (existingDetail) {
      // === 既存回答の更新 ===
      await supabaseAdmin
        .from('quiz_answers')
        .update({
          user_answer: selected_choices && selected_choices.length > 0 ? 0 : null,
          time_spent: Math.round(time_spent_ms / 1000),
          hint_used: hint_used,
          max_hint_level: hint_used ? 1 : 0,
          hint_usage_details: hint_used ? { used: true } : null,
          confidence_level: confidence_level || null
        })
        .eq('id', existingDetail.quiz_answer_id)

      await supabaseAdmin
        .from('case_study_step_details')
        .update({
          selected_choices: selected_choices || null,
          reasoning_text: reasoning_text || null,
          step_answered_at: now
        })
        .eq('id', existingDetail.id)

      // 思考ログを記録（step_updated）
      const updateLogData: CaseStudyThinkingLogInsert = {
        session_id: sessionId,
        step_number: step_number,
        action_type: 'step_updated' as CaseStudyThinkingLogInsert['action_type'],
        action_data: {
          selected_choices: selected_choices || [],
          has_reasoning: !!reasoning_text,
          reasoning_length: reasoning_text?.length || 0
        } as unknown as CaseStudyThinkingLogInsert['action_data'],
        timestamp: now,
        time_since_step_start_ms: time_spent_ms,
        choices_at_action: selected_choices || null,
        reasoning_length_at_action: reasoning_text?.length || 0
      }

      await supabaseAdmin
        .from('case_study_thinking_logs')
        .insert(updateLogData)

      console.log(`📝 Answer updated: session=${sessionId}, step=${step_number}`)

      return NextResponse.json({
        success: true,
        is_update: true,
        is_last_step: false
      } as CaseStudyAnswerResponse)
    }

    // === 新規回答の作成 ===

    // quiz_answers にレコードを作成（XP集計システムとの互換性）
    // Note: ケーススタディ回答は quiz_session_id = NULL
    //       リレーションは case_study_step_details.quiz_answer_id で管理
    const quizAnswerData = {
      user_id: user.id,
      quiz_session_id: null, // ケーススタディはquiz_sessionsを使用しない
      question_id: step_id,
      session_type: 'case_study',
      user_answer: selected_choices && selected_choices.length > 0 ? 0 : null, // 選択肢のインデックス（仮）
      is_correct: false, // AI採点後に更新
      time_spent: Math.round(time_spent_ms / 1000), // 秒に変換
      is_timeout: false,
      category_id: step.category_id,
      subcategory_id: step.subcategory_id,
      difficulty: session.case_study_problems?.difficulty || 'intermediate',
      hint_used: hint_used,
      max_hint_level: hint_used ? 1 : 0, // ケーススタディは0または1
      hint_usage_details: hint_used ? { used: true } : null,
      confidence_level: confidence_level || null,
      review_needed: false, // 完了時に更新
      review_reason: null,
      earned_xp: 0, // 完了時に計算
      course_id: null,
      course_session_id: null,
      genre_id: null,
      theme_id: null
    }

    const { data: quizAnswer, error: quizAnswerError } = await supabaseAdmin
      .from('quiz_answers')
      .insert(quizAnswerData)
      .select('id')
      .single()

    if (quizAnswerError || !quizAnswer) {
      console.error('Quiz answer creation error:', quizAnswerError)
      return NextResponse.json(
        { success: false, error: '回答の保存に失敗しました' },
        { status: 500 }
      )
    }

    // case_study_step_details にレコードを作成
    const stepDetailData: CaseStudyStepDetailInsert = {
      quiz_answer_id: quizAnswer.id,
      session_id: sessionId,
      step_id: step_id,
      step_number: step_number,
      selected_choices: selected_choices || null,
      reasoning_text: reasoning_text || null,
      step_started_at: step_started_at || null,
      step_answered_at: now
    }

    const { error: stepDetailError } = await supabaseAdmin
      .from('case_study_step_details')
      .insert(stepDetailData)

    if (stepDetailError) {
      console.error('Step detail creation error:', stepDetailError)
      return NextResponse.json(
        { success: false, error: '回答詳細の保存に失敗しました' },
        { status: 500 }
      )
    }

    // 思考ログを記録（step_submitted）
    const thinkingLogData: CaseStudyThinkingLogInsert = {
      session_id: sessionId,
      step_number: step_number,
      action_type: 'step_submitted',
      action_data: {
        selected_choices: selected_choices || [],
        has_reasoning: !!reasoning_text,
        reasoning_length: reasoning_text?.length || 0
      } as unknown as CaseStudyThinkingLogInsert['action_data'],
      timestamp: now,
      time_since_step_start_ms: time_spent_ms,
      choices_at_action: selected_choices || null,
      reasoning_length_at_action: reasoning_text?.length || 0
    }

    await supabaseAdmin
      .from('case_study_thinking_logs')
      .insert(thinkingLogData)

    // ヒント使用時はセッションのヒントカウントを更新
    if (hint_used) {
      await supabaseAdmin
        .from('case_study_sessions')
        .update({
          hint_count: (session.hint_count || 0) + 1,
          updated_at: now
        })
        .eq('id', sessionId)
    }

    // 次のステップを計算
    const totalSteps = session.case_study_problems?.step_count || 5
    const isLastStep = step_number >= totalSteps
    const nextStep = isLastStep ? step_number : step_number + 1

    // セッションの現在ステップを更新
    await supabaseAdmin
      .from('case_study_sessions')
      .update({
        current_step: nextStep,
        updated_at: now
      })
      .eq('id', sessionId)

    const response: CaseStudyAnswerResponse = {
      success: true,
      next_step: isLastStep ? undefined : nextStep,
      is_last_step: isLastStep
    }

    console.log(`📝 Answer submitted: session=${sessionId}, step=${step_number}, isLast=${isLastStep}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Case study answer error:', error)
    return NextResponse.json(
      { success: false, error: '回答提出に失敗しました' },
      { status: 500 }
    )
  }
}
