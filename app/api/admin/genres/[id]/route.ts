import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/genres/[id]
 * ジャンル情報更新（管理者用）
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

    const { id: genreId } = await context.params
    const updateData = await request.json()

    console.log(`🔄 [AdminGenres] ジャンル更新: ${genreId}`)

    // 更新可能なフィールドのバリデーション
    const allowedFields = [
      'title', 'description', 'estimated_days', 'display_order', 'badge_data'
    ]
    
    const validUpdateData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        validUpdateData[field] = updateData[field]
      }
    }

    // フィールド別バリデーション
    if (validUpdateData.estimated_days && (validUpdateData.estimated_days < 1 || validUpdateData.estimated_days > 30)) {
      return NextResponse.json(
        { error: '予想日数は1-30日の範囲で入力してください' },
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
        { error: 'ジャンル名は必須です' },
        { status: 400 }
      )
    }

    // badge_dataの構造検証
    if (validUpdateData.badge_data) {
      const badgeData = validUpdateData.badge_data
      const requiredBadgeFields = ['id', 'icon', 'color', 'title', 'description']
      
      for (const field of requiredBadgeFields) {
        if (!badgeData[field]) {
          return NextResponse.json(
            { error: `バッジデータの${field}は必須です` },
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

    // updated_atを自動設定
    validUpdateData.updated_at = new Date().toISOString()

    // データベース更新
    const { data: updatedGenre, error: updateError } = await supabaseAdmin
      .from('learning_genres')
      .update(validUpdateData)
      .eq('id', genreId)
      .select('id, title')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたジャンルが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminGenres] 更新エラー:', updateError)
      return NextResponse.json(
        { error: 'ジャンル情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminGenres] ジャンル更新完了: ${updatedGenre.title}`)

    return NextResponse.json({
      success: true,
      genre: updatedGenre,
      updatedFields: Object.keys(validUpdateData),
      message: `ジャンル「${updatedGenre.title}」の情報を更新しました`
    })

  } catch (error) {
    console.error('❌ [AdminGenres] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'ジャンル更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}