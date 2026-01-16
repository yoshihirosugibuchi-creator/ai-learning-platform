import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/quizzes/[id]
 * クイズ情報更新（管理者用）
 */
export async function PATCH(
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

    const { id: quizId } = await context.params
    const updateData = await request.json()

    console.log(`🔄 [AdminQuizzes] クイズ更新: ${quizId}`)

    // 更新可能なフィールドのバリデーション
    const allowedFields = [
      'question', 'options', 'correct_answer', 'explanation', 'quiz_type', 'display_order'
    ]
    
    const validUpdateData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        validUpdateData[field] = updateData[field]
      }
    }

    // フィールド別バリデーション
    if (validUpdateData.display_order && validUpdateData.display_order < 1) {
      return NextResponse.json(
        { error: '表示順序は1以上で入力してください' },
        { status: 400 }
      )
    }

    if (validUpdateData.question !== undefined && validUpdateData.question.trim().length === 0) {
      return NextResponse.json(
        { error: '問題文は必須です' },
        { status: 400 }
      )
    }

    if (validUpdateData.explanation !== undefined && validUpdateData.explanation.trim().length === 0) {
      return NextResponse.json(
        { error: '解説は必須です' },
        { status: 400 }
      )
    }

    // quiz_typeの検証（Phase1-3対応）
    if (validUpdateData.quiz_type) {
      const validTypes = ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'sorting', 'essay']
      if (!validTypes.includes(validUpdateData.quiz_type)) {
        return NextResponse.json(
          { error: '無効なクイズタイプです' },
          { status: 400 }
        )
      }
    }

    // optionsとcorrect_answerの検証
    if (validUpdateData.options || validUpdateData.correct_answer !== undefined) {
      const options = validUpdateData.options || []
      const correctAnswer = validUpdateData.correct_answer !== undefined ? validUpdateData.correct_answer : 0

      if (Array.isArray(options)) {
        const validOptions = options.filter((opt: string) => typeof opt === 'string' && opt.trim())
        
        if (validOptions.length < 2) {
          return NextResponse.json(
            { error: '選択肢を2つ以上入力してください' },
            { status: 400 }
          )
        }

        if (correctAnswer < 0 || correctAnswer >= options.length) {
          return NextResponse.json(
            { error: '正解のインデックスが無効です' },
            { status: 400 }
          )
        }

        if (!options[correctAnswer] || !options[correctAnswer].trim()) {
          return NextResponse.json(
            { error: '正解の選択肢が空です' },
            { status: 400 }
          )
        }
      }
    }

    // 更新対象フィールドがない場合
    if (Object.keys(validUpdateData).length === 0) {
      return NextResponse.json(
        { error: '更新するフィールドが指定されていません' },
        { status: 400 }
      )
    }

    // データベース更新（session_quizzesテーブルにはupdated_atカラムがないため設定しない）
    const { data: updatedQuiz, error: updateError } = await supabaseAdmin
      .from('session_quizzes')
      .update(validUpdateData)
      .eq('id', quizId)
      .select('id, question, quiz_type')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたクイズが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminQuizzes] 更新エラー:', updateError)
      return NextResponse.json(
        { error: 'クイズ情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminQuizzes] クイズ更新完了: ${updatedQuiz.question.substring(0, 30)}...`)

    return NextResponse.json({
      success: true,
      quiz: updatedQuiz,
      updatedFields: Object.keys(validUpdateData),
      message: `クイズの情報を更新しました`
    })

  } catch (error) {
    console.error('❌ [AdminQuizzes] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'クイズ更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/quizzes/[id]
 * クイズ削除（管理者用）
 */
export async function DELETE(
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

    const { id: quizId } = await context.params

    console.log(`🗑️ [AdminQuizzes] クイズ削除: ${quizId}`)

    // データベースから削除
    const { data: deletedQuiz, error: deleteError } = await supabaseAdmin
      .from('session_quizzes')
      .delete()
      .eq('id', quizId)
      .select('id, question, quiz_type')
      .single()

    if (deleteError) {
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたクイズが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminQuizzes] 削除エラー:', deleteError)
      return NextResponse.json(
        { error: 'クイズの削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminQuizzes] クイズ削除完了: ${deletedQuiz.question.substring(0, 30)}...`)

    return NextResponse.json({
      success: true,
      quiz: deletedQuiz,
      message: `クイズを削除しました`
    })

  } catch (error) {
    console.error('❌ [AdminQuizzes] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'クイズ削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}