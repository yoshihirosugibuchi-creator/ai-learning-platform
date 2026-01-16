import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/sessions/[id]
 * セッション情報更新（管理者用）
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

    const { id: sessionId } = await context.params
    const updateData = await request.json()

    console.log(`🔄 [AdminSessions] セッション更新: ${sessionId}`)

    // 更新可能なフィールドのバリデーション
    const allowedFields = [
      'title', 'session_type', 'estimated_minutes', 'display_order'
    ]
    
    const validUpdateData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        validUpdateData[field] = updateData[field]
      }
    }

    // フィールド別バリデーション
    if (validUpdateData.estimated_minutes && (validUpdateData.estimated_minutes < 1 || validUpdateData.estimated_minutes > 120)) {
      return NextResponse.json(
        { error: '予想時間は1-120分の範囲で入力してください' },
        { status: 400 }
      )
    }

    if (validUpdateData.display_order && validUpdateData.display_order < 1) {
      return NextResponse.json(
        { error: '表示順序は1以上で入力してください' },
        { status: 400 }
      )
    }

    if (validUpdateData.title && validUpdateData.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'セッション名は必須です' },
        { status: 400 }
      )
    }

    // session_typeの検証（Phase1-3対応）
    if (validUpdateData.session_type) {
      const validTypes = ['knowledge', 'practice', 'case_study', 'review', 'assessment']
      if (!validTypes.includes(validUpdateData.session_type)) {
        return NextResponse.json(
          { error: '無効なセッションタイプです' },
          { status: 400 }
        )
      }
    }

    // 更新対象フィールドがない場合
    if (Object.keys(validUpdateData).length === 0) {
      return NextResponse.json(
        { error: '更新するフィールドが指定されていません' },
        { status: 400 }
      )
    }

    // updated_atを自動設定
    validUpdateData.updated_at = new Date().toISOString()

    // データベース更新
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('learning_sessions')
      .update(validUpdateData)
      .eq('id', sessionId)
      .select('id, title')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたセッションが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminSessions] 更新エラー:', updateError)
      return NextResponse.json(
        { error: 'セッション情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminSessions] セッション更新完了: ${updatedSession.title}`)

    return NextResponse.json({
      success: true,
      session: updatedSession,
      updatedFields: Object.keys(validUpdateData),
      message: `セッション「${updatedSession.title}」の情報を更新しました`
    })

  } catch (error) {
    console.error('❌ [AdminSessions] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'セッション更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/sessions/[id]
 * セッション削除（管理者用）
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

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const { id: sessionId } = await context.params

    console.log(`🗑️ [AdminSessions] セッション削除開始: ${sessionId}`)

    // 1. セッションの存在確認
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, title')
      .eq('id', sessionId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたセッションが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminSessions] セッション取得エラー:', fetchError)
      return NextResponse.json(
        { error: 'セッション情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 2. コンテンツとクイズの存在確認（ある場合は削除を拒否）
    const [contentsResult, quizzesResult] = await Promise.all([
      supabaseAdmin
        .from('session_contents')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1),
      supabaseAdmin
        .from('session_quizzes')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1)
    ])

    if (contentsResult.error) {
      console.error('❌ [AdminSessions] コンテンツチェックエラー:', contentsResult.error)
      return NextResponse.json(
        { error: 'コンテンツの確認に失敗しました' },
        { status: 500 }
      )
    }

    if (quizzesResult.error) {
      console.error('❌ [AdminSessions] クイズチェックエラー:', quizzesResult.error)
      return NextResponse.json(
        { error: 'クイズの確認に失敗しました' },
        { status: 500 }
      )
    }

    const hasContents = contentsResult.data && contentsResult.data.length > 0
    const hasQuizzes = quizzesResult.data && quizzesResult.data.length > 0

    if (hasContents || hasQuizzes) {
      const items = []
      if (hasContents) items.push('コンテンツ')
      if (hasQuizzes) items.push('クイズ')
      
      return NextResponse.json(
        { error: `このセッションには${items.join('と')}が含まれています。先に${items.join('と')}を削除してください。` },
        { status: 400 }
      )
    }

    // 3. セッションを削除
    const { error: deleteError } = await supabaseAdmin
      .from('learning_sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      console.error('❌ [AdminSessions] 削除エラー:', deleteError)
      return NextResponse.json(
        { error: 'セッションの削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminSessions] セッション削除完了: ${session.title}`)

    return NextResponse.json({
      success: true,
      message: `セッション「${session.title}」を削除しました`
    })

  } catch (error) {
    console.error('❌ [AdminSessions] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'セッション削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}