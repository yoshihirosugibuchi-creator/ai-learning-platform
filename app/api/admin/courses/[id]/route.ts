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

/**
 * DELETE /api/admin/courses/[id]
 * コース削除（管理者用）
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

    const { id: courseId } = await context.params

    console.log(`🗑️ [AdminCourses] コース削除開始: ${courseId}`)

    // 1. コースの存在とステータス確認
    const { data: course, error: fetchError } = await supabaseAdmin
      .from('learning_courses')
      .select('id, title, status')
      .eq('id', courseId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコースが見つかりません' },
          { status: 404 }
        )
      }
      
      console.error('❌ [AdminCourses] コース取得エラー:', fetchError)
      return NextResponse.json(
        { error: 'コース情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 2. アクティブコースの削除防止
    if (course.status === 'available') {
      return NextResponse.json(
        { error: '公開中のコースは削除できません。ステータスを変更してから削除してください。' },
        { status: 400 }
      )
    }

    // 3. カスケード削除実行
    console.log(`🔄 [AdminCourses] カスケード削除実行: ${course.title}`)
    
    // 関連データを明示的に削除（逆順でFK制約に対応）
    
    // 3-1. ジャンル一覧を取得
    const { data: genres } = await supabaseAdmin
      .from('learning_genres')
      .select('id')
      .eq('course_id', courseId)
    
    if (genres && genres.length > 0) {
      const genreIds = genres.map(g => g.id)
      
      // 3-2. テーマ一覧を取得
      const { data: themes } = await supabaseAdmin
        .from('learning_themes')
        .select('id')
        .in('genre_id', genreIds)
      
      if (themes && themes.length > 0) {
        const themeIds = themes.map(t => t.id)
        
        // 3-3. セッション一覧を取得
        const { data: sessions } = await supabaseAdmin
          .from('learning_sessions')
          .select('id')
          .in('theme_id', themeIds)
        
        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map(s => s.id)
          
          // 3-4. クイズを削除
          const { error: quizDeleteError } = await supabaseAdmin
            .from('session_quizzes')
            .delete()
            .in('session_id', sessionIds)
          
          if (quizDeleteError) {
            console.error('❌ クイズ削除エラー:', quizDeleteError)
          }
          
          // 3-5. コンテンツを削除
          const { error: contentDeleteError } = await supabaseAdmin
            .from('session_contents')
            .delete()
            .in('session_id', sessionIds)
          
          if (contentDeleteError) {
            console.error('❌ コンテンツ削除エラー:', contentDeleteError)
          }
        }
        
        // 3-6. セッションを削除
        const { error: sessionDeleteError } = await supabaseAdmin
          .from('learning_sessions')
          .delete()
          .in('theme_id', themeIds)
        
        if (sessionDeleteError) {
          console.error('❌ セッション削除エラー:', sessionDeleteError)
        }
      }
      
      // 3-7. テーマを削除
      const { error: themeDeleteError } = await supabaseAdmin
        .from('learning_themes')
        .delete()
        .in('genre_id', genreIds)
      
      if (themeDeleteError) {
        console.error('❌ テーマ削除エラー:', themeDeleteError)
      }
      
      // 3-8. ジャンルを削除
      const { error: genreDeleteError } = await supabaseAdmin
        .from('learning_genres')
        .delete()
        .in('id', genreIds)
      
      if (genreDeleteError) {
        console.error('❌ ジャンル削除エラー:', genreDeleteError)
      }
    }
    
    // 3-9. 最後にコースを削除
    const { error: deleteError } = await supabaseAdmin
      .from('learning_courses')
      .delete()
      .eq('id', courseId)

    if (deleteError) {
      console.error('❌ [AdminCourses] 削除エラー:', deleteError)
      return NextResponse.json(
        { error: 'コースの削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminCourses] コース削除完了: ${course.title}`)

    return NextResponse.json({
      success: true,
      message: `コース「${course.title}」を削除しました`
    })

  } catch (error) {
    console.error('❌ [AdminCourses] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コース削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}