import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

interface SaveHintsRequest {
  question_id: number
  level1_hint?: string | null
  level2_hint?: string | null
  level3_hint?: string | null
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // システム管理者権限チェック
    if (userRole !== 'system_admin') {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    const body: SaveHintsRequest = await request.json()
    const { question_id, level1_hint, level2_hint, level3_hint } = body

    // バリデーション
    if (!question_id) {
      return NextResponse.json({ error: '問題IDが必要です' }, { status: 400 })
    }

    // 問題の存在確認
    const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .eq('id', question_id)
      .eq('is_deleted', false)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: '問題が見つかりません' }, { status: 404 })
    }

    // 既存のヒントレコードを確認
    const { data: existingHint, error: hintCheckError } = await supabaseAdmin
      .from('quiz_hints')
      .select('id')
      .eq('question_id', question_id)
      .single()

    if (hintCheckError && hintCheckError.code !== 'PGRST116') {
      console.error('既存ヒント確認エラー:', hintCheckError)
      return NextResponse.json({ error: 'ヒント確認中にエラーが発生しました' }, { status: 500 })
    }

    // ヒントデータの準備
    const hintData = {
      question_id,
      level1_hint: level1_hint || null,
      level2_hint: level2_hint || null,
      level3_hint: level3_hint || null,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }

    let result
    if (existingHint) {
      // 既存レコードを更新
      const { data, error } = await supabaseAdmin
        .from('quiz_hints')
        .update(hintData)
        .eq('id', existingHint.id)
        .select()
        .single()

      if (error) {
        console.error('ヒント更新エラー:', error)
        return NextResponse.json({ error: 'ヒントの更新に失敗しました' }, { status: 500 })
      }
      result = data
    } else {
      // 新規レコードを作成
      const { data, error } = await supabaseAdmin
        .from('quiz_hints')
        .insert({
          ...hintData,
          created_by: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('ヒント作成エラー:', error)
        return NextResponse.json({ error: 'ヒントの作成に失敗しました' }, { status: 500 })
      }
      result = data
    }

    // 保存したヒントの統計を計算
    const hintsCount = [level1_hint, level2_hint, level3_hint].filter(hint => hint && hint.trim()).length

    // 操作ログを記録（将来の監査機能実装時に追加予定）
    console.log(`ヒント保存完了: 問題ID=${question_id}, アクション=${existingHint ? 'update' : 'create'}, ヒント数=${hintsCount}`)

    return NextResponse.json({
      success: true,
      message: 'ヒントを正常に保存しました',
      hint: result,
      stats: {
        question_id,
        hints_saved: hintsCount,
        action: existingHint ? 'updated' : 'created'
      }
    })

  } catch (error) {
    console.error('ヒント保存エラー:', error)
    return NextResponse.json(
      { error: 'ヒント保存中にエラーが発生しました' },
      { status: 500 }
    )
  }
}