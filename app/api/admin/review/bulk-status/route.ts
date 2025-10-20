import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// ======================================================================
// レビュー問題の一括ステータス変更API
// ======================================================================

// POST: 複数問題のステータス一括変更
export async function POST(request: NextRequest) {
  try {
    // システム管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { questionIds, status, reviewNotes, reviewScore } = body

    // バリデーション
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'Question IDs are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'editing']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`📝 Bulk updating status for ${questionIds.length} questions to ${status}`)

    // 現在のデータを取得（履歴用）
    const { data: currentQuestions, error: fetchError } = await supabaseAdmin
      .from('quiz_questions_review')
      .select('id, status')
      .in('id', questionIds)

    if (fetchError) {
      console.error('❌ Error fetching current questions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch questions', details: fetchError.message },
        { status: 500 }
      )
    }

    // 更新データの準備
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // レビュー関連データの追加
    if (status === 'approved' || status === 'rejected') {
      updateData.reviewed_at = new Date().toISOString()
      updateData.reviewed_by = userId
      if (reviewNotes) updateData.review_notes = reviewNotes
      if (reviewScore) updateData.review_score = reviewScore
    }

    // 一括更新実行
    const { data, error } = await supabaseAdmin
      .from('quiz_questions_review')
      .update(updateData)
      .in('id', questionIds)
      .select()

    if (error) {
      console.error('❌ Error updating questions:', error)
      return NextResponse.json(
        { error: 'Failed to update questions', details: error.message },
        { status: 500 }
      )
    }

    // 履歴に一括記録
    const historyRecords = currentQuestions?.map(q => ({
      review_question_id: q.id,
      action_type: 'status_changed',
      previous_status: q.status,
      new_status: status,
      changes: {
        status: { old: q.status, new: status },
        ...(reviewNotes && { review_notes: { old: null, new: reviewNotes } }),
        ...(reviewScore && { review_score: { old: null, new: reviewScore } })
      },
      comment: `Bulk status change to ${status}`,
      performed_by: userId
    })) || []

    if (historyRecords.length > 0) {
      const { error: historyError } = await supabaseAdmin
        .from('quiz_review_history')
        .insert(historyRecords)

      if (historyError) {
        console.error('⚠️ Error recording history:', historyError)
        // 履歴記録に失敗してもメイン処理は続行
      }
    }

    console.log(`✅ Bulk updated ${data.length} questions to status: ${status}`)

    return NextResponse.json({
      success: true,
      data,
      message: `Successfully updated ${data.length} questions to ${status}`,
      summary: {
        requested: questionIds.length,
        updated: data.length,
        status
      }
    })

  } catch (error) {
    console.error('❌ Bulk status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}