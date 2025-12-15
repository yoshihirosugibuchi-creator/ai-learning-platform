import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * PATCH /api/admin/courses/[id]/status
 * コースステータス変更（管理者用）
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
    const { status } = await request.json()

    // ステータス値の検証
    const validStatuses = ['draft', 'coming_soon', 'available', 'archived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '無効なステータス値です' },
        { status: 400 }
      )
    }

    console.log(`🔄 [AdminCourses] コースステータス変更: ${courseId} -> ${status}`)

    // コースの存在確認とステータス更新
    const { data: course, error: updateError } = await supabaseAdmin
      .from('learning_courses')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select('id, title, status')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコースが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminCourses] ステータス更新エラー:', updateError)
      return NextResponse.json(
        { error: 'ステータス更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminCourses] ステータス更新完了: ${course.title} -> ${status}`)

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        status: course.status
      },
      message: `コース「${course.title}」のステータスを「${getStatusLabel(status)}」に変更しました`
    })

  } catch (error) {
    console.error('❌ [AdminCourses] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'ステータス変更中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// ステータス日本語ラベル
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: '下書き',
    coming_soon: '準備中',
    available: '公開中',
    archived: 'アーカイブ'
  }
  return labels[status] || status
}