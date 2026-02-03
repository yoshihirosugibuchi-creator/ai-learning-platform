import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 選ばれし課題 選択API
 * GET: ユーザーの現在の選択を取得
 * PUT: ユーザーの選択を更新
 */

export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの選択を取得
    const { data: selections, error } = await supabaseAdmin
      .from('user_challenge_selections')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching selections:', error)
      return NextResponse.json({ error: '選択の取得に失敗しました' }, { status: 500 })
    }

    // スロットタイプごとに整理
    const result: Record<string, {
      content_id: string
      content_name: string | null
      selected_by: string
    } | null> = {
      course: null,
      quiz_pack: null,
      case_study: null
    }

    selections?.forEach(sel => {
      result[sel.slot_type] = {
        content_id: sel.content_id,
        content_name: sel.content_name,
        selected_by: sel.selected_by || 'user'
      }
    })

    return NextResponse.json({ success: true, selections: result })

  } catch (error) {
    console.error('Challenge selections GET error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 認証確認
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { slot_type, content_id, content_name } = body

    // バリデーション
    if (!slot_type || !['course', 'quiz_pack', 'case_study'].includes(slot_type)) {
      return NextResponse.json({ error: '無効なスロットタイプ' }, { status: 400 })
    }

    if (!content_id) {
      return NextResponse.json({ error: 'コンテンツIDが必要です' }, { status: 400 })
    }

    // Upsert (存在すれば更新、なければ挿入)
    const { data, error } = await supabaseAdmin
      .from('user_challenge_selections')
      .upsert({
        user_id: user.id,
        slot_type,
        content_id,
        content_name: content_name || null,
        selected_by: 'user',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,slot_type'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving selection:', error)
      return NextResponse.json({ error: '選択の保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, selection: data })

  } catch (error) {
    console.error('Challenge selections PUT error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
