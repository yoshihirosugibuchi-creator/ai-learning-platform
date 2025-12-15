import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/admin/sessions/[id]/quizzes
 * セッションに新しいクイズを作成（管理者用）
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // コース学習メンテナンス機能は管理者でもアクセス可能
    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const { id: sessionId } = await context.params
    const createData = await request.json()

    console.log(`✨ [AdminQuizzes] 新規クイズ作成: session ${sessionId}`)

    // 必須フィールドの検証
    if (!createData.question || createData.question.trim().length === 0) {
      return NextResponse.json(
        { error: '問題文は必須です' },
        { status: 400 }
      )
    }

    if (!createData.explanation || createData.explanation.trim().length === 0) {
      return NextResponse.json(
        { error: '解説は必須です' },
        { status: 400 }
      )
    }

    if (!Array.isArray(createData.options) || createData.options.length < 2) {
      return NextResponse.json(
        { error: '選択肢を2つ以上入力してください' },
        { status: 400 }
      )
    }

    if (createData.correct_answer < 0 || createData.correct_answer >= createData.options.length) {
      return NextResponse.json(
        { error: '正解のインデックスが無効です' },
        { status: 400 }
      )
    }

    // セッションの存在確認
    const { data: _session, error: sessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, title')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたセッションが見つかりません' },
          { status: 404 }
        )
      }
      throw sessionError
    }

    // 現在の最大display_orderを取得
    const { data: maxOrderData } = await supabaseAdmin
      .from('session_quizzes')
      .select('display_order')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrderData?.display_order || 0) + 1

    // quiz_typeの検証
    const validTypes = ['multiple_choice', 'true_false', 'fill_blank', 'short_answer']
    const quizType = createData.quiz_type || 'multiple_choice'
    if (!validTypes.includes(quizType)) {
      return NextResponse.json(
        { error: '無効なクイズタイプです' },
        { status: 400 }
      )
    }

    // 新しいクイズデータ
    const newQuiz = {
      id: `${sessionId}_quiz_${nextOrder}`,
      session_id: sessionId,
      question: createData.question.trim(),
      options: createData.options,
      correct_answer: createData.correct_answer,
      explanation: createData.explanation.trim(),
      quiz_type: quizType,
      display_order: createData.display_order || nextOrder
    }

    // データベースに挿入
    const { data: createdQuiz, error: createError } = await supabaseAdmin
      .from('session_quizzes')
      .insert(newQuiz)
      .select('*')
      .single()

    if (createError) {
      console.error('❌ [AdminQuizzes] 作成エラー:', createError)
      return NextResponse.json(
        { error: 'クイズの作成に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminQuizzes] クイズ作成完了: ${createdQuiz.question.substring(0, 30)}...`)

    return NextResponse.json({
      success: true,
      quiz: createdQuiz,
      message: `新しいクイズを作成しました`
    })

  } catch (error) {
    console.error('❌ [AdminQuizzes] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'クイズ作成中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}