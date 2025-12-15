import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/admin/courses
 * コース一覧取得（管理者用）
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [AdminCourses] Request headers:', {
      authorization: request.headers.get('authorization'),
      cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
      userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...'
    })
    
    const { userId, role, error } = await getCurrentUserRole(request)
    
    console.log('🔍 [AdminCourses] Auth result:', { userId, role, error })
    
    if (!userId) {
      console.log('❌ [AdminCourses] No userId, returning 401')
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

    console.log('📚 [AdminCourses] コース一覧取得開始')

    // コース一覧を取得（作成日順）
    const { data: courses, error: dbError } = await supabaseAdmin
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
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (dbError) {
      console.error('❌ [AdminCourses] データベースエラー:', dbError)
      return NextResponse.json(
        { error: 'コースデータの取得に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminCourses] ${courses?.length || 0}件のコースを取得`)

    // 統計情報も含めて返却
    const stats = {
      total: courses?.length || 0,
      draft: courses?.filter(c => c.status === 'draft').length || 0,
      coming_soon: courses?.filter(c => c.status === 'coming_soon').length || 0,
      available: courses?.filter(c => c.status === 'available').length || 0,
      archived: courses?.filter(c => c.status === 'archived').length || 0
    }

    return NextResponse.json({
      success: true,
      courses: courses || [],
      stats
    })

  } catch (error) {
    console.error('❌ [AdminCourses] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コース一覧取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}