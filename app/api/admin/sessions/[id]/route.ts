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

    // session_typeの検証
    if (validUpdateData.session_type) {
      const validTypes = ['lesson', 'practice', 'quiz', 'review', 'assessment']
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