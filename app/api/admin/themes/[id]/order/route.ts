import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/themes/[id]/order
 * テーマの表示順序更新
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId || (role !== 'admin' && role !== 'teacher')) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 401 }
      )
    }

    const { id: themeId } = await context.params
    const body = await request.json()
    const { display_order } = body

    if (typeof display_order !== 'number' || display_order < 1) {
      return NextResponse.json(
        { error: '表示順序は1以上の数値である必要があります' },
        { status: 400 }
      )
    }

    // テーマの表示順序を更新
    const { error } = await supabaseAdmin
      .from('learning_themes')
      .update({ 
        display_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', themeId)

    if (error) {
      console.error('Theme order update error:', error)
      return NextResponse.json(
        { error: 'テーマの並び順更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'テーマの並び順が更新されました'
    })

  } catch (error) {
    console.error('Theme order update error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}