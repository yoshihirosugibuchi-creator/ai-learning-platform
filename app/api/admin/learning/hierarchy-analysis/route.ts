import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// コース階層構造とハードコードされた値の詳細分析
export async function GET() {
  try {
    console.log('🔍 Admin: Analyzing course hierarchy structure')
    
    // 全階層データを取得
    const [coursesResult, genresResult, themesResult, sessionsResult] = await Promise.all([
      supabaseAdmin.from('learning_courses').select('*').order('display_order'),
      supabaseAdmin.from('learning_genres').select('*').order('display_order'),
      supabaseAdmin.from('learning_themes').select('*').order('display_order'),
      supabaseAdmin.from('learning_sessions').select('*').order('display_order')
    ])

    const courses = coursesResult.data || []
    const genres = genresResult.data || []
    const themes = themesResult.data || []
    const sessions = sessionsResult.data || []

    // 階層構造の分析
    const hierarchyAnalysis = courses.map(course => {
      const courseGenres = genres.filter(g => g.course_id === course.id)
      // テーマはジャンル経由で取得
      const courseThemes = themes.filter(t => courseGenres.some(g => g.id === t.genre_id))
      const courseSessions = sessions.filter(s => courseThemes.some(t => t.id === s.theme_id))

      // 各ジャンルごとのテーマ数とセッション数
      const genreDetails = courseGenres.map(genre => {
        const genreThemes = themes.filter(t => t.genre_id === genre.id)
        const genreSessions = sessions.filter(s => genreThemes.some(t => t.id === s.theme_id))

        // 各テーマごとのセッション数
        const themeDetails = genreThemes.map(theme => {
          const themeSessions = sessions.filter(s => s.theme_id === theme.id)
          return {
            themeId: theme.id,
            themeTitle: theme.title,
            sessionCount: themeSessions.length,
            sessions: themeSessions.map(s => ({ id: s.id, title: s.title, type: s.session_type }))
          }
        })

        return {
          genreId: genre.id,
          genreTitle: genre.title,
          themeCount: genreThemes.length,
          sessionCount: genreSessions.length,
          themes: themeDetails
        }
      })

      return {
        courseId: course.id,
        courseTitle: course.title,
        genreCount: courseGenres.length,
        themeCount: courseThemes.length,
        sessionCount: courseSessions.length,
        genres: genreDetails
      }
    })

    // ハードコードされた値との比較分析
    const hardcodedComparison = {
      assumptions: {
        sessionsPerTheme: 10,  // ハードコードされた値
        themesPerCourse: 5     // ハードコードされた値
      },
      reality: {
        actualSessionsPerTheme: themes.map(theme => ({
          themeId: theme.id,
          themeTitle: theme.title,
          actualSessions: sessions.filter(s => s.theme_id === theme.id).length
        })),
        actualThemesPerCourse: courses.map(course => {
          const courseGenres = genres.filter(g => g.course_id === course.id)
          const courseThemes = themes.filter(t => courseGenres.some(g => g.id === t.genre_id))
          return {
            courseId: course.id,
            courseTitle: course.title,
            actualThemes: courseThemes.length
          }
        }),
        overallStats: {
          totalCourses: courses.length,
          totalGenres: genres.length,
          totalThemes: themes.length,
          totalSessions: sessions.length,
          avgGenresPerCourse: courses.length > 0 ? (genres.length / courses.length).toFixed(2) : 0,
          avgThemesPerCourse: courses.length > 0 ? (themes.length / courses.length).toFixed(2) : 0,
          avgSessionsPerTheme: themes.length > 0 ? (sessions.length / themes.length).toFixed(2) : 0,
          avgSessionsPerCourse: courses.length > 0 ? (sessions.length / courses.length).toFixed(2) : 0
        }
      }
    }

    // 問題のある仮定を特定
    const issues = []
    
    // セッション数の検証
    const sessionPerThemeVariation = themes.map(theme => 
      sessions.filter(s => s.theme_id === theme.id).length
    )
    const minSessions = Math.min(...sessionPerThemeVariation)
    const maxSessions = Math.max(...sessionPerThemeVariation)
    
    if (minSessions !== maxSessions || maxSessions !== 10) {
      issues.push({
        type: 'sessions_per_theme_mismatch',
        description: `セッション数がテーマごとに異なります。最小: ${minSessions}, 最大: ${maxSessions}, 仮定値: 10`,
        severity: 'high'
      })
    }

    // テーマ数の検証
    const themePerCourseVariation = courses.map(course => {
      const courseGenres = genres.filter(g => g.course_id === course.id)
      return themes.filter(t => courseGenres.some(g => g.id === t.genre_id)).length
    })
    const minThemes = Math.min(...themePerCourseVariation)
    const maxThemes = Math.max(...themePerCourseVariation)
    
    if (minThemes !== maxThemes || maxThemes !== 5) {
      issues.push({
        type: 'themes_per_course_mismatch',
        description: `テーマ数がコースごとに異なります。最小: ${minThemes}, 最大: ${maxThemes}, 仮定値: 5`,
        severity: 'high'
      })
    }

    const response = {
      hierarchyAnalysis,
      hardcodedComparison,
      issues,
      summary: {
        totalEntities: {
          courses: courses.length,
          genres: genres.length,
          themes: themes.length,
          sessions: sessions.length
        },
        variationRanges: {
          sessionsPerTheme: { min: minSessions, max: maxSessions },
          themesPerCourse: { min: minThemes, max: maxThemes }
        },
        hardcodedAssumptionsValid: issues.length === 0
      }
    }

    console.log(`✅ Hierarchy analysis completed. Issues found: ${issues.length}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Admin hierarchy analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze hierarchy', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}