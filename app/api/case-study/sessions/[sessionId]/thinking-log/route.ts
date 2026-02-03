import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 思考ログ送信API
 * POST /api/case-study/sessions/[sessionId]/thinking-log
 *
 * ユーザーの行動ログを記録（選択変更、記述入力、ヒント参照など）
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  )
}

// 有効なアクションタイプ
const VALID_ACTION_TYPES = [
  'choice_selected',
  'choice_changed',
  'reasoning_typed',
  'reasoning_edited',
  'hint_requested',
  'step_submitted',
  'case_expanded',
]

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

    const body = await request.json()
    const {
      step_number,
      action_type,
      action_data,
      time_since_step_start_ms,
      choices_at_action,
      reasoning_length_at_action,
    } = body

    // バリデーション
    if (!step_number || !action_type) {
      return NextResponse.json(
        { success: false, error: 'step_number と action_type は必須です' },
        { status: 400 }
      )
    }

    if (!VALID_ACTION_TYPES.includes(action_type)) {
      return NextResponse.json(
        { success: false, error: `無効なaction_typeです。有効な値: ${VALID_ACTION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // セッションの所有者確認
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('case_study_sessions')
      .select('id, user_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'このセッションへのアクセス権がありません' },
        { status: 403 }
      )
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: '完了済みまたは中断されたセッションです' },
        { status: 400 }
      )
    }

    // 思考ログを挿入
    const { data: log, error: insertError } = await supabaseAdmin
      .from('case_study_thinking_logs')
      .insert({
        session_id: sessionId,
        step_number,
        action_type,
        action_data: action_data || null,
        time_since_step_start_ms: time_since_step_start_ms || null,
        choices_at_action: choices_at_action || null,
        reasoning_length_at_action: reasoning_length_at_action || null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Thinking log insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'ログの記録に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      log_id: log.id,
    })
  } catch (error) {
    console.error('Thinking log API error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
