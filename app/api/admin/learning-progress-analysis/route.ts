import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface CourseCompletionRecord {
  user_id: string | null
  session_id: string | null
  course_id: string
  theme_id: string | null
  genre_id: string | null
  completion_time: string | null
}

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 course_session_completions テーブルの学習進捗分析開始')

    // course_session_completions テーブルから全データを取得
    const { data: records, error } = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id, session_id, course_id, theme_id, genre_id, completion_time')
      .order('user_id', { ascending: true })

    if (error) {
      console.error('❌ データ取得エラー:', error)
      return NextResponse.json({ error: 'Database query failed', details: error }, { status: 500 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ 
        message: 'course_session_completions テーブルにデータがありません',
        totalRecords: 0,
        userStats: []
      })
    }

    console.log(`📊 総レコード数: ${records.length}`)

    // ユーザー別集計
    const userStats = new Map<string, {
      userId: string
      recordCount: number
      courseCount: number
      sessionCount: number
      themeCount: number
      genreCount: number
      courses: Set<string>
      sessions: Set<string>
      themes: Set<string>
      genres: Set<string>
      firstCompletion: string | null
      lastCompletion: string | null
    }>()

    records.forEach((record: CourseCompletionRecord) => {
      const userId = record.user_id || 'NULL'

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userId,
          recordCount: 0,
          courseCount: 0,
          sessionCount: 0,
          themeCount: 0,
          genreCount: 0,
          courses: new Set(),
          sessions: new Set(),
          themes: new Set(),
          genres: new Set(),
          firstCompletion: null,
          lastCompletion: null
        })
      }

      const stats = userStats.get(userId)!
      stats.recordCount++
      
      if (record.course_id) stats.courses.add(record.course_id)
      if (record.session_id) stats.sessions.add(record.session_id)
      if (record.theme_id) stats.themes.add(record.theme_id)
      if (record.genre_id) stats.genres.add(record.genre_id)

      // 初回・最終完了日時の更新
      const completionTime = record.completion_time
      if (completionTime) {
        if (!stats.firstCompletion || completionTime < stats.firstCompletion) {
          stats.firstCompletion = completionTime
        }
        if (!stats.lastCompletion || completionTime > stats.lastCompletion) {
          stats.lastCompletion = completionTime
        }
      }
    })

    // カウント数更新
    userStats.forEach((stats) => {
      stats.courseCount = stats.courses.size
      stats.sessionCount = stats.sessions.size
      stats.themeCount = stats.themes.size
      stats.genreCount = stats.genres.size
    })

    // 結果をソート（レコード数順）
    const sortedStats = Array.from(userStats.values())
      .sort((a, b) => b.recordCount - a.recordCount)

    // 全体サマリー計算
    const summary = {
      totalRecords: records.length,
      totalUsers: userStats.size,
      totalUniqueCourses: new Set(records.map(r => r.course_id)).size,
      totalUniqueSessions: new Set(records.map(r => r.session_id).filter(Boolean)).size,
      totalUniqueThemes: new Set(records.map(r => r.theme_id).filter(Boolean)).size,
      totalUniqueGenres: new Set(records.map(r => r.genre_id).filter(Boolean)).size,
      avgCompletionsPerUser: Math.round(records.length / userStats.size)
    }

    return NextResponse.json({
      summary,
      userStats: sortedStats.map(stats => ({
        userIdDisplay: stats.userId === 'NULL' ? 'NULL' : stats.userId.substring(0, 8) + '...',
        recordCount: stats.recordCount,
        courseCount: stats.courseCount,
        sessionCount: stats.sessionCount,
        themeCount: stats.themeCount,
        genreCount: stats.genreCount,
        firstCompletion: stats.firstCompletion,
        lastCompletion: stats.lastCompletion,
        learningPeriodDays: stats.firstCompletion && stats.lastCompletion 
          ? Math.ceil((new Date(stats.lastCompletion).getTime() - new Date(stats.firstCompletion).getTime()) / (1000 * 60 * 60 * 24))
          : 0
      }))
    })

  } catch (error) {
    console.error('❌ 分析処理エラー:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error },
      { status: 500 }
    )
  }
}