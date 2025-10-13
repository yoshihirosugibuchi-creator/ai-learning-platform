import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// コース完了記録テーブルの詳細調査用API
export async function GET() {
  try {
    console.log('🔍 Admin: Investigating course completion tables')
    
    // 完了記録テーブルからデータを取得
    const [sessionCompletionsResult, courseCompletionsResult, themeCompletionsResult] = await Promise.all([
      supabaseAdmin.from('course_session_completions').select('*').order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('course_completions').select('*').order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('course_theme_completions').select('*').order('created_at', { ascending: false }).limit(20)
    ])

    // カウント情報も取得
    const [sessionCountResult, courseCountResult, themeCountResult] = await Promise.all([
      supabaseAdmin.from('course_session_completions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('course_completions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('course_theme_completions').select('*', { count: 'exact', head: true })
    ])

    // 実際のセッション・テーマ数もカウント
    const [sessionsCountResult, themesCountResult] = await Promise.all([
      supabaseAdmin.from('learning_sessions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('learning_themes').select('*', { count: 'exact', head: true })
    ])

    // ユーザー別の完了統計
    const userCompletionStats = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id')
      .then(result => {
        if (result.data) {
          const userCounts = result.data.reduce((acc: Record<string, number>, session) => {
            acc[session.user_id] = (acc[session.user_id] || 0) + 1
            return acc
          }, {})
          return Object.entries(userCounts).map(([userId, count]) => ({ userId, completedSessions: count }))
        }
        return []
      })

    const response = {
      sessionCompletions: {
        data: sessionCompletionsResult.data || [],
        count: sessionCountResult.count || 0,
        error: sessionCompletionsResult.error
      },
      courseCompletions: {
        data: courseCompletionsResult.data || [],
        count: courseCountResult.count || 0,
        error: courseCompletionsResult.error
      },
      themeCompletions: {
        data: themeCompletionsResult.data || [],
        count: themeCountResult.count || 0,
        error: themeCompletionsResult.error
      },
      actualCounts: {
        totalSessions: sessionsCountResult.count || 0,
        totalThemes: themesCountResult.count || 0
      },
      userStats: userCompletionStats,
      analysis: {
        hasSessionCompletions: (sessionCountResult.count || 0) > 0,
        hasCourseCompletions: (courseCountResult.count || 0) > 0,
        hasThemeCompletions: (themeCountResult.count || 0) > 0,
        hardcodedValues: {
          sessionsPerTheme: 10, // これが実際のデータと一致するかチェック
          themesPerCourse: 5    // これが実際のデータと一致するかチェック
        }
      }
    }

    console.log(`✅ Completion records: Sessions=${sessionCountResult.count}, Courses=${courseCountResult.count}, Themes=${themeCountResult.count}`)
    console.log(`📊 Actual content: Sessions=${sessionsCountResult.count}, Themes=${themesCountResult.count}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Admin completion tables investigation error:', error)
    return NextResponse.json(
      { error: 'Failed to investigate completion tables', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}