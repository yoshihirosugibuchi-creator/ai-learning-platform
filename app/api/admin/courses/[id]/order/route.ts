import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/courses/[id]/order
 * コースの表示順序更新（管理者用）
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

    const { id: courseId } = await context.params
    const { display_order } = await request.json()

    console.log(`🔄 [AdminCourses] 表示順序更新: ${courseId} -> ${display_order}`)

    // バリデーション
    if (!display_order || display_order < 1) {
      return NextResponse.json(
        { error: '表示順序は1以上で入力してください' },
        { status: 400 }
      )
    }

    // 表示順序更新
    const { data: updatedCourse, error: updateError } = await supabaseAdmin
      .from('learning_courses')
      .update({ 
        display_order,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select('id, title, display_order')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコースが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminCourses] 表示順序更新エラー:', updateError)
      return NextResponse.json(
        { error: '表示順序の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminCourses] 表示順序更新完了: ${updatedCourse.title} -> ${updatedCourse.display_order}`)

    return NextResponse.json({
      success: true,
      course: updatedCourse,
      message: `表示順序を${display_order}に更新しました`
    })

  } catch (error) {
    console.error('❌ [AdminCourses] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: '表示順序更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}