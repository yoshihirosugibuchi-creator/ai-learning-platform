import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/admin/sessions/[id]/contents
 * セッションに新しいコンテンツを作成（管理者用）
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

    console.log(`✨ [AdminContents] 新規コンテンツ作成: session ${sessionId}`)

    // 必須フィールドの検証
    if (!createData.content_type) {
      return NextResponse.json(
        { error: 'コンテンツタイプは必須です' },
        { status: 400 }
      )
    }

    if (!createData.content || createData.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'コンテンツ本文は必須です' },
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
      .from('session_contents')
      .select('display_order')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrderData?.display_order || 0) + 1

    // content_typeの検証
    const validTypes = ['text', 'markdown', 'video', 'audio', 'image', 'interactive']
    if (!validTypes.includes(createData.content_type)) {
      return NextResponse.json(
        { error: '無効なコンテンツタイプです' },
        { status: 400 }
      )
    }

    // 新しいコンテンツデータ
    const newContent = {
      id: `${sessionId}_content_${nextOrder}`,
      session_id: sessionId,
      content_type: createData.content_type,
      title: createData.title || null,
      content: createData.content,
      duration: createData.duration || null,
      display_order: createData.display_order || nextOrder
    }

    // データベースに挿入
    const { data: createdContent, error: createError } = await supabaseAdmin
      .from('session_contents')
      .insert(newContent)
      .select('*')
      .single()

    if (createError) {
      console.error('❌ [AdminContents] 作成エラー:', createError)
      return NextResponse.json(
        { error: 'コンテンツの作成に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminContents] コンテンツ作成完了: ${createdContent.title || createdContent.content_type}`)

    return NextResponse.json({
      success: true,
      content: createdContent,
      message: `新しいコンテンツを作成しました`
    })

  } catch (error) {
    console.error('❌ [AdminContents] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コンテンツ作成中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}