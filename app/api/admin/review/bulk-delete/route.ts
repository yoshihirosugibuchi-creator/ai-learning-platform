import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function DELETE(request: NextRequest) {
  try {
    // システム管理者権限チェック（厳密な権限確認）
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'System administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { questionIds } = body

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'Question IDs are required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ System Admin ${userId}: Bulk deleting ${questionIds.length} questions`)

    // 削除対象の問題が却下・差し戻し状態のみであることを確認
    const { data: questionsToDelete, error: fetchError } = await supabaseAdmin
      .from('quiz_questions_review')
      .select('id, status')
      .in('id', questionIds)

    if (fetchError) {
      console.error('❌ Failed to fetch questions for deletion:', fetchError)
      return NextResponse.json(
        { error: 'Failed to validate questions for deletion' },
        { status: 500 }
      )
    }

    // 却下状態でない問題があるかチェック（差し戻しは却下として記録されている）
    const invalidQuestions = questionsToDelete?.filter(q => 
      q.status !== 'rejected'
    ) || []

    if (invalidQuestions.length > 0) {
      return NextResponse.json(
        { 
          error: `Only rejected questions can be deleted. Found ${invalidQuestions.length} questions in different status.`,
          invalid_questions: invalidQuestions.map(q => ({ id: q.id, status: q.status }))
        },
        { status: 400 }
      )
    }

    // 一括削除実行
    const { error: deleteError } = await supabaseAdmin
      .from('quiz_questions_review')
      .delete()
      .in('id', questionIds)

    if (deleteError) {
      console.error('❌ Failed to delete questions:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete questions', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`✅ System Admin ${userId}: Successfully deleted ${questionIds.length} questions`)

    return NextResponse.json({
      success: true,
      deleted_count: questionIds.length,
      message: `${questionIds.length}問を削除しました`
    })

  } catch (error) {
    console.error('❌ Bulk delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}