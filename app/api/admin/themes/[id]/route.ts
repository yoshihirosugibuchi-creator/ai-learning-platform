import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/themes/[id]
 * テーマ情報更新（管理者用）
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

    const { id: themeId } = await context.params
    const updateData = await request.json()

    console.log(`🔄 [AdminThemes] テーマ更新: ${themeId}`)

    // 更新可能なフィールドのバリデーション
    const allowedFields = [
      'title', 'description', 'estimated_minutes', 'display_order', 'reward_card_data'
    ]
    
    const validUpdateData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        validUpdateData[field] = updateData[field]
      }
    }

    // フィールド別バリデーション
    if (validUpdateData.estimated_minutes && (validUpdateData.estimated_minutes < 5 || validUpdateData.estimated_minutes > 180)) {
      return NextResponse.json(
        { error: '予想時間は5-180分の範囲で入力してください' },
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
        { error: 'テーマ名は必須です' },
        { status: 400 }
      )
    }

    // reward_card_dataの構造検証
    if (validUpdateData.reward_card_data) {
      const rewardData = validUpdateData.reward_card_data
      const requiredFields = ['id', 'icon', 'color', 'title', 'summary', 'keyPoints']
      
      for (const field of requiredFields) {
        if (rewardData[field] === undefined) {
          return NextResponse.json(
            { error: `ナレッジカードデータの${field}は必須です` },
            { status: 400 }
          )
        }
      }

      // keyPointsが配列であることを確認
      if (!Array.isArray(rewardData.keyPoints)) {
        return NextResponse.json(
          { error: 'キーポイントは配列形式で入力してください' },
          { status: 400 }
        )
      }

      // 空のキーポイントを除外
      rewardData.keyPoints = rewardData.keyPoints.filter((point: string) => 
        typeof point === 'string' && point.trim().length > 0
      )
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
    const { data: updatedTheme, error: updateError } = await supabaseAdmin
      .from('learning_themes')
      .update(validUpdateData)
      .eq('id', themeId)
      .select('id, title')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたテーマが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminThemes] 更新エラー:', updateError)
      return NextResponse.json(
        { error: 'テーマ情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminThemes] テーマ更新完了: ${updatedTheme.title}`)

    return NextResponse.json({
      success: true,
      theme: updatedTheme,
      updatedFields: Object.keys(validUpdateData),
      message: `テーマ「${updatedTheme.title}」の情報を更新しました`
    })

  } catch (error) {
    console.error('❌ [AdminThemes] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'テーマ更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/themes/[id]
 * テーマ削除（管理者用）
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

    const { id: themeId } = await context.params

    console.log(`🗑️ [AdminThemes] テーマ削除開始: ${themeId}`)

    // 1. テーマの存在確認
    const { data: theme, error: fetchError } = await supabaseAdmin
      .from('learning_themes')
      .select('id, title')
      .eq('id', themeId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたテーマが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminThemes] テーマ取得エラー:', fetchError)
      return NextResponse.json(
        { error: 'テーマ情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 2. セッションの存在確認（セッションがある場合は削除を拒否）
    const { data: sessions, error: sessionCheckError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id')
      .eq('theme_id', themeId)
      .limit(1)

    if (sessionCheckError) {
      console.error('❌ [AdminThemes] セッションチェックエラー:', sessionCheckError)
      return NextResponse.json(
        { error: 'セッションの確認に失敗しました' },
        { status: 500 }
      )
    }

    if (sessions && sessions.length > 0) {
      return NextResponse.json(
        { error: 'このテーマにはセッションが含まれています。先にセッションを削除してください。' },
        { status: 400 }
      )
    }

    // 3. テーマを削除
    const { error: deleteError } = await supabaseAdmin
      .from('learning_themes')
      .delete()
      .eq('id', themeId)

    if (deleteError) {
      console.error('❌ [AdminThemes] 削除エラー:', deleteError)
      return NextResponse.json(
        { error: 'テーマの削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminThemes] テーマ削除完了: ${theme.title}`)

    return NextResponse.json({
      success: true,
      message: `テーマ「${theme.title}」を削除しました`
    })

  } catch (error) {
    console.error('❌ [AdminThemes] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'テーマ削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}