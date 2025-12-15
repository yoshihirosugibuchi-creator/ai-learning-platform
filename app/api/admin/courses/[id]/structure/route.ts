import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/admin/courses/[id]/structure
 * コース全体構造取得（管理者用）
 * courses → genres → themes → sessions → contents/quizzes
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

    console.log(`📚 [AdminCourseStructure] 構造取得開始: ${courseId}`)

    // 1. コース基本情報
    const { data: course, error: courseError } = await supabaseAdmin
      .from('learning_courses')
      .select('*')
      .eq('id', courseId)
      .single()

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return NextResponse.json(
          { error: '指定されたコースが見つかりません' },
          { status: 404 }
        )
      }
      throw courseError
    }

    // 2. ジャンル取得
    const { data: genres, error: genresError } = await supabaseAdmin
      .from('learning_genres')
      .select('*')
      .eq('course_id', courseId)
      .order('display_order')

    if (genresError) throw genresError

    console.log(`📂 [AdminCourseStructure] ${genres?.length || 0}件のジャンル取得`)

    // 3. テーマ取得（全ジャンルの）
    const genreIds = genres?.map(g => g.id) || []
    let themes: any[] = []
    if (genreIds.length > 0) {
      const { data: themesData, error: themesError } = await supabaseAdmin
        .from('learning_themes')
        .select('*')
        .in('genre_id', genreIds)
        .order('display_order')
      
      if (themesError) throw themesError
      themes = themesData || []
    }

    console.log(`📑 [AdminCourseStructure] ${themes.length}件のテーマ取得`)

    // 4. セッション取得（全テーマの）
    const themeIds = themes.map(t => t.id)
    let sessions: any[] = []
    if (themeIds.length > 0) {
      const { data: sessionsData, error: sessionsError } = await supabaseAdmin
        .from('learning_sessions')
        .select('*')
        .in('theme_id', themeIds)
        .order('display_order')
      
      if (sessionsError) throw sessionsError
      sessions = sessionsData || []
    }

    console.log(`📝 [AdminCourseStructure] ${sessions.length}件のセッション取得`)

    // 5. セッションコンテンツ取得（全セッションの）
    const sessionIds = sessions.map(s => s.id)
    let contents: any[] = []
    let quizzes: any[] = []
    
    if (sessionIds.length > 0) {
      // セッションコンテンツ
      const { data: contentsData, error: contentsError } = await supabaseAdmin
        .from('session_contents')
        .select('*')
        .in('session_id', sessionIds)
        .order('display_order')
      
      if (contentsError) throw contentsError
      contents = contentsData || []

      // セッションクイズ
      const { data: quizzesData, error: quizzesError } = await supabaseAdmin
        .from('session_quizzes')
        .select('*')
        .in('session_id', sessionIds)
        .order('display_order')
      
      if (quizzesError) throw quizzesError
      quizzes = quizzesData || []
    }

    console.log(`📄 [AdminCourseStructure] ${contents.length}件のコンテンツ、${quizzes.length}件のクイズ取得`)

    // 6. 階層構造組み立て
    const structuredGenres = genres?.map(genre => ({
      ...genre,
      themes: themes.filter(theme => theme.genre_id === genre.id).map(theme => ({
        ...theme,
        sessions: sessions.filter(session => session.theme_id === theme.id).map(session => ({
          ...session,
          contents: contents.filter(content => content.session_id === session.id),
          quizzes: quizzes.filter(quiz => quiz.session_id === session.id)
        }))
      }))
    })) || []

    console.log(`✅ [AdminCourseStructure] 構造組み立て完了: ${course.title}`)

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        genres: structuredGenres
      },
      statistics: {
        genres: genres?.length || 0,
        themes: themes.length,
        sessions: sessions.length,
        contents: contents.length,
        quizzes: quizzes.length
      }
    })

  } catch (error) {
    console.error('❌ [AdminCourseStructure] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コース構造取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}