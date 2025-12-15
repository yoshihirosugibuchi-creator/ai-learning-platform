import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/contents/[id]
 * コンテンツ情報更新（管理者用）
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

    const { id: contentId } = await context.params
    const updateData = await request.json()

    console.log(`🔄 [AdminContents] コンテンツ更新: ${contentId}`)

    // 更新可能なフィールドのバリデーション
    const allowedFields = [
      'content_type', 'title', 'content', 'duration', 'display_order'
    ]
    
    const validUpdateData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        validUpdateData[field] = updateData[field]
      }
    }

    // フィールド別バリデーション
    if (validUpdateData.duration && (validUpdateData.duration < 1 || validUpdateData.duration > 180)) {
      return NextResponse.json(
        { error: '予想時間は1-180分の範囲で入力してください' },
        { status: 400 }
      )
    }

    if (validUpdateData.display_order && validUpdateData.display_order < 1) {
      return NextResponse.json(
        { error: '表示順序は1以上で入力してください' },
        { status: 400 }
      )
    }

    if (validUpdateData.content !== undefined && validUpdateData.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'コンテンツ本文は必須です' },
        { status: 400 }
      )
    }

    // content_typeの検証
    if (validUpdateData.content_type) {
      const validTypes = ['text', 'markdown', 'video', 'audio', 'image', 'interactive']
      if (!validTypes.includes(validUpdateData.content_type)) {
        return NextResponse.json(
          { error: '無効なコンテンツタイプです' },
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
    const { data: updatedContent, error: updateError } = await supabaseAdmin
      .from('session_contents')
      .update(validUpdateData)
      .eq('id', contentId)
      .select('id, title, content_type')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコンテンツが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminContents] 更新エラー:', updateError)
      return NextResponse.json(
        { error: 'コンテンツ情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminContents] コンテンツ更新完了: ${updatedContent.title || updatedContent.content_type}`)

    return NextResponse.json({
      success: true,
      content: updatedContent,
      updatedFields: Object.keys(validUpdateData),
      message: `コンテンツの情報を更新しました`
    })

  } catch (error) {
    console.error('❌ [AdminContents] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コンテンツ更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/contents/[id]
 * コンテンツ削除（管理者用）
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

    const { id: contentId } = await context.params

    console.log(`🗑️ [AdminContents] コンテンツ削除: ${contentId}`)

    // データベースから削除
    const { data: deletedContent, error: deleteError } = await supabaseAdmin
      .from('session_contents')
      .delete()
      .eq('id', contentId)
      .select('id, title, content_type')
      .single()

    if (deleteError) {
      if (deleteError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコンテンツが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminContents] 削除エラー:', deleteError)
      return NextResponse.json(
        { error: 'コンテンツの削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminContents] コンテンツ削除完了: ${deletedContent.title || deletedContent.content_type}`)

    return NextResponse.json({
      success: true,
      content: deletedContent,
      message: `コンテンツを削除しました`
    })

  } catch (error) {
    console.error('❌ [AdminContents] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コンテンツ削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}