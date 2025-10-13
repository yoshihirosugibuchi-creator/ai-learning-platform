import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface LearningProgressRecord {
  user_id: string | null
  duration_seconds: number | null
  session_id: string | null
  course_id: string
  created_at: string | null
}

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 learning_progress テーブルの duration_seconds 集計開始')

    // learning_progress テーブルから全データを取得
    const { data: records, error } = await supabaseAdmin
      .from('learning_progress')
      .select('user_id, duration_seconds, session_id, course_id, created_at')
      .order('user_id', { ascending: true })

    if (error) {
      console.error('❌ データ取得エラー:', error)
      return NextResponse.json({ error: 'Database query failed', details: error }, { status: 500 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ 
        message: 'learning_progress テーブルにデータがありません',
        totalRecords: 0,
        userStats: []
      })
    }

    console.log(`📊 総レコード数: ${records.length}`)

    // ユーザー別集計
    const userStats = new Map<string, {
      userId: string
      recordCount: number
      totalDuration: number
      avgDuration: number
      validDurationCount: number
      sessionIds: string[]
    }>()

    records.forEach((record: LearningProgressRecord) => {
      const userId = record.user_id || 'NULL'
      const duration = record.duration_seconds || 0
      const sessionId = record.session_id || 'unknown'

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          userId,
          recordCount: 0,
          totalDuration: 0,
          avgDuration: 0,
          validDurationCount: 0,
          sessionIds: []
        })
      }

      const stats = userStats.get(userId)!
      stats.recordCount++
      if (record.duration_seconds !== null && record.duration_seconds > 0) {
        stats.totalDuration += duration
        stats.validDurationCount++
        stats.sessionIds.push(sessionId)
      }
    })

    // 平均計算
    userStats.forEach((stats) => {
      stats.avgDuration = stats.validDurationCount > 0 
        ? Math.round(stats.totalDuration / stats.validDurationCount) 
        : 0
    })

    // 結果をソート（総学習時間順）
    const sortedStats = Array.from(userStats.values())
      .sort((a, b) => b.totalDuration - a.totalDuration)

    // 全体サマリー計算
    const summary = {
      totalRecords: records.length,
      totalUsers: userStats.size,
      totalDuration: sortedStats.reduce((sum, stats) => sum + stats.totalDuration, 0),
      totalValidRecords: sortedStats.reduce((sum, stats) => sum + stats.validDurationCount, 0),
      avgDurationPerSession: 0
    }

    summary.avgDurationPerSession = summary.totalValidRecords > 0 
      ? Math.round(summary.totalDuration / summary.totalValidRecords) 
      : 0

    return NextResponse.json({
      summary: {
        ...summary,
        totalDurationMinutes: Math.round(summary.totalDuration / 60),
        avgDurationMinutes: Math.round(summary.avgDurationPerSession / 60)
      },
      userStats: sortedStats.map(stats => ({
        ...stats,
        userIdDisplay: stats.userId === 'NULL' ? 'NULL' : stats.userId.substring(0, 8) + '...',
        totalDurationMinutes: Math.round(stats.totalDuration / 60),
        avgDurationMinutes: Math.round(stats.avgDuration / 60),
        sessionCount: stats.sessionIds.length
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