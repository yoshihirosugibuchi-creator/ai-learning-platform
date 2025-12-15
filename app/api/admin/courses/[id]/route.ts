import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isValidDifficulty } from '@/lib/skill-levels-helper'

/**
 * GET /api/admin/courses/[id]
 * コース詳細取得（管理者用）
 */
export async function GET(
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

    console.log(`📚 [AdminCourses] コース詳細取得: ${courseId}`)

    // コース詳細を取得
    const { data: course, error } = await supabaseAdmin
      .from('learning_courses')
      .select(`
        id,
        title,
        description,
        difficulty,
        status,
        icon,
        color,
        display_order,
        estimated_days,
        badge_data,
        created_at,
        updated_at
      `)
      .eq('id', courseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコースが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminCourses] データベースエラー:', error)
      return NextResponse.json(
        { error: 'コース詳細の取得に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminCourses] コース詳細取得完了: ${course.title}`)

    return NextResponse.json({
      success: true,
      course
    })

  } catch (error) {
    console.error('❌ [AdminCourses] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コース詳細取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/courses/[id]
 * コース情報更新（管理者用）
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
    const updateData = await request.json()

    console.log(`🔄 [AdminCourses] コース更新: ${courseId}`)

    // 更新可能なフィールドのバリデーション
    const allowedFields = [
      'title', 'description', 'difficulty', 'icon', 
      'color', 'estimated_days', 'display_order', 'badge_data'
    ]
    
    const validUpdateData: any = {}
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        validUpdateData[field] = updateData[field]
      }
    }

    // フィールド別バリデーション
    if (validUpdateData.difficulty) {
      const isValid = await isValidDifficulty(validUpdateData.difficulty)
      if (!isValid) {
        return NextResponse.json(
          { error: '無効な難易度レベルです' },
          { status: 400 }
        )
      }
    }

    if (validUpdateData.estimated_days && (validUpdateData.estimated_days < 1 || validUpdateData.estimated_days > 365)) {
      return NextResponse.json(
        { error: '予想日数は1-365日の範囲で入力してください' },
        { status: 400 }
      )
    }

    if (validUpdateData.display_order && validUpdateData.display_order < 1) {
      return NextResponse.json(
        { error: '表示順序は1以上で入力してください' },
        { status: 400 }
      )
    }

    // badge_dataの構造検証（警告ログのみ、保存は継続）
    if (validUpdateData.badge_data) {
      const badgeData = validUpdateData.badge_data
      const requiredBadgeFields = ['id', 'icon', 'color', 'title', 'description']
      const missingFields = []
      
      for (const field of requiredBadgeFields) {
        if (!badgeData[field]) {
          missingFields.push(field)
        }
      }
      
      if (missingFields.length > 0) {
        console.warn(`⚠️ [AdminCourses] Badge data incomplete, missing: ${missingFields.join(', ')}`)
      }

      // 有効期限のバリデーション
      if (badgeData.validityPeriodMonths !== null && badgeData.validityPeriodMonths !== undefined) {
        if (badgeData.validityPeriodMonths < 1 || badgeData.validityPeriodMonths > 60) {
          return NextResponse.json(
            { error: '有効期限は1-60ヶ月の範囲で入力してください' },
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
    const { data: updatedCourse, error: updateError } = await supabaseAdmin
      .from('learning_courses')
      .update(validUpdateData)
      .eq('id', courseId)
      .select('id, title')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコースが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminCourses] 更新エラー:', updateError)
      return NextResponse.json(
        { error: 'コース情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminCourses] コース更新完了: ${updatedCourse.title}`)

    return NextResponse.json({
      success: true,
      course: updatedCourse,
      updatedFields: Object.keys(validUpdateData),
      message: `コース「${updatedCourse.title}」の情報を更新しました`
    })

  } catch (error) {
    console.error('❌ [AdminCourses] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コース更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}