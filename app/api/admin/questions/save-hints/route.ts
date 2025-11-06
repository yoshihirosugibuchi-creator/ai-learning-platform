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

    // 統合テーブルでヒント情報を更新
    const { data: result, error: updateError } = await supabaseAdmin
      .from('quiz_questions')
      .update({
        level1_hint: level1_hint || null,
        level2_hint: level2_hint || null,
        level3_hint: level3_hint || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', question_id)
      .select('id, level1_hint, level2_hint, level3_hint')
      .single()

    if (updateError) {
      console.error('ヒント更新エラー:', updateError)
      return NextResponse.json({ error: 'ヒントの更新に失敗しました' }, { status: 500 })
    }

    // 保存したヒントの統計を計算
    const hintsCount = [level1_hint, level2_hint, level3_hint].filter(hint => hint && hint.trim()).length

    // 操作ログを記録（将来の監査機能実装時に追加予定）
    console.log(`ヒント保存完了: 問題ID=${question_id}, アクション=update(統合テーブル), ヒント数=${hintsCount}`)

    return NextResponse.json({
      success: true,
      message: 'ヒントを正常に保存しました',
      hint: result,
      stats: {
        question_id,
        hints_saved: hintsCount,
        action: 'updated'
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