import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ ヒント取得API
 * GET /api/case-study/sessions/[sessionId]/hint?step_number=1
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
    const { searchParams } = new URL(request.url)
    const stepNumber = parseInt(searchParams.get('step_number') || '0', 10)

    if (!stepNumber) {
      return NextResponse.json(
        { success: false, error: 'step_number は必須です' },
        { status: 400 }
      )
    }

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
      .select('id, user_id, problem_id, status, hint_count')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: '進行中のセッションのみヒントを取得できます' },
        { status: 400 }
      )
    }

    // ステップ情報からヒントを取得
    const { data: step, error: stepError } = await supabaseAdmin
      .from('case_study_steps')
      .select('id, step_number, hint')
      .eq('problem_id', session.problem_id)
      .eq('step_number', stepNumber)
      .single()

    if (stepError || !step) {
      return NextResponse.json(
        { success: false, error: 'ステップが見つかりません' },
        { status: 404 }
      )
    }

    if (!step.hint) {
      return NextResponse.json(
        { success: false, error: 'このステップにはヒントがありません' },
        { status: 404 }
      )
    }

    // 思考ログに記録
    await supabaseAdmin
      .from('case_study_thinking_logs')
      .insert({
        session_id: sessionId,
        step_number: stepNumber,
        action_type: 'hint_requested',
        action_data: {},
        timestamp: new Date().toISOString()
      })

    // セッションのヒントカウントを更新
    await supabaseAdmin
      .from('case_study_sessions')
      .update({
        hint_count: (session.hint_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    console.log(`💡 Hint requested: session=${sessionId}, step=${stepNumber}`)

    return NextResponse.json({
      success: true,
      hint: step.hint,
      step_number: stepNumber
    })

  } catch (error) {
    console.error('Hint fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'ヒント取得に失敗しました' },
      { status: 500 }
    )
  }
}
