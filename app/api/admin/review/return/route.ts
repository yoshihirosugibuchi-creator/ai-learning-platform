import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック（admin または system_admin）
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { questionIds, returnReason } = body

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'Question IDs are required' },
        { status: 400 }
      )
    }

    if (!returnReason || !returnReason.trim()) {
      return NextResponse.json(
        { error: 'Return reason is required' },
        { status: 400 }
      )
    }

    console.log(`📤 Admin ${userId}: Returning ${questionIds.length} questions with reason: ${returnReason}`)

    // 対象問題の状態確認（承認済みまたは編集中のもののみ差し戻し可能）
    console.log('📋 Checking questions for return:', questionIds)
    const { data: questionsToReturn, error: fetchError } = await supabaseAdmin
      .from('quiz_questions_review')
      .select('id, status, question')
      .in('id', questionIds)

    if (fetchError) {
      console.error('❌ Failed to fetch questions for return:', fetchError)
      return NextResponse.json(
        { error: 'Failed to validate questions for return' },
        { status: 500 }
      )
    }

    // 差し戻し可能な状態でない問題があるかチェック（承認済みのもののみ）
    const invalidQuestions = questionsToReturn?.filter(q => 
      q.status !== 'approved'
    ) || []

    if (invalidQuestions.length > 0) {
      return NextResponse.json(
        { 
          error: `Only approved questions can be returned. Found ${invalidQuestions.length} questions in different status.`,
          invalid_questions: invalidQuestions.map(q => ({ id: q.id, status: q.status }))
        },
        { status: 400 }
      )
    }

    // 一括差し戻し実行（差し戻し理由付きで却下として処理）
    console.log('🔄 Updating questions to rejected status with return reason')
    const finalNotes = `[差し戻し] ${returnReason.trim()}`
    const { error: updateError } = await supabaseAdmin
      .from('quiz_questions_review')
      .update({
        status: 'rejected',
        review_notes: finalNotes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId
      })
      .in('id', questionIds)

    if (updateError) {
      console.error('❌ Failed to return questions:', updateError)
      return NextResponse.json(
        { error: 'Failed to return questions', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Admin ${userId}: Successfully returned ${questionIds.length} questions`)

    return NextResponse.json({
      success: true,
      returned_count: questionIds.length,
      message: `${questionIds.length}問を差し戻しました（却下ステータスで記録）`,
      return_reason: finalNotes
    })

  } catch (error) {
    console.error('❌ Return questions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}