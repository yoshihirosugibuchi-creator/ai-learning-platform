// 日次バッチ処理デバッグAPI
// ユーザー数ゼロ問題の調査用エンドポイント

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/debug/batch-analysis
 * 日次バッチ処理の問題調査用デバッグ情報
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetDate = searchParams.get('date') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log(`[デバッグ] 調査対象日: ${targetDate}`)

    // 1. daily_xp_records テーブルの該当日データ確認
    const { data: dailyRecords, error: dailyError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('user_id, date, total_xp_earned, quiz_sessions, course_sessions')
      .eq('date', targetDate)
      .limit(10)

    // 2. 総ユーザー数カウント
    const { count: totalUsers, error: countError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('*', { count: 'exact', head: true })
      .eq('date', targetDate)

    // 3. quiz_sessions テーブルの該当日データ確認
    const { data: quizSessions, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('user_id, created_at, total_questions, correct_answers')
      .gte('created_at', `${targetDate}T00:00:00.000Z`)
      .lt('created_at', `${targetDate}T23:59:59.999Z`)
      .limit(5)

    // 4. course_session_completions テーブルの該当日データ確認
    const { data: courseSessions, error: courseError } = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id, completion_time, session_id')
      .gte('completion_time', `${targetDate}T00:00:00.000Z`)
      .lt('completion_time', `${targetDate}T23:59:59.999Z`)
      .limit(5)

    // 5. 最新のバッチログ確認
    const { data: batchLogs, error: batchError } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .eq('process_date', targetDate)
      .order('created_at', { ascending: false })
      .limit(3)

    // 6. 全体統計確認
    const { count: totalDailyRecords } = await supabaseAdmin
      .from('daily_xp_records')
      .select('*', { count: 'exact', head: true })

    const { count: totalQuizSessions } = await supabaseAdmin
      .from('quiz_sessions')
      .select('*', { count: 'exact', head: true })

    const { count: totalCourseSessions } = await supabaseAdmin
      .from('course_session_completions')
      .select('*', { count: 'exact', head: true })

    // エラーチェック
    const errors = []
    if (dailyError) errors.push(`daily_xp_records: ${dailyError.message}`)
    if (countError) errors.push(`count: ${countError.message}`)
    if (quizError) errors.push(`quiz_sessions: ${quizError.message}`)
    if (courseError) errors.push(`course_sessions: ${courseError.message}`)
    if (batchError) errors.push(`batch_log: ${batchError.message}`)

    return NextResponse.json({
      success: true,
      target_date: targetDate,
      investigation_results: {
        target_date_users: {
          count: totalUsers || 0,
          sample_records: dailyRecords || [],
          error: dailyError?.message || null
        },
        quiz_activity: {
          sample_sessions: quizSessions || [],
          error: quizError?.message || null
        },
        course_activity: {
          sample_sessions: courseSessions || [],
          error: courseError?.message || null
        },
        batch_logs: {
          recent_logs: batchLogs || [],
          error: batchError?.message || null
        },
        global_statistics: {
          total_daily_records: totalDailyRecords || 0,
          total_quiz_sessions: totalQuizSessions || 0,
          total_course_sessions: totalCourseSessions || 0
        }
      },
      errors: errors.length > 0 ? errors : null,
      debug_info: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        node_env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[デバッグ] バッチ分析エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'デバッグ分析中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/debug/batch-analysis
 * 手動バッチテスト実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      target_date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      test_user_id = null
    } = body

    console.log(`[デバッグ] 手動バッチテスト: ${target_date}`)

    // getTargetUsers関数のロジックを再現
    const { data: activeUsers, error } = await supabaseAdmin
      .from('daily_xp_records')
      .select('user_id')
      .eq('date', target_date)
      .order('user_id')

    if (error) {
      throw new Error(`アクティブユーザー取得エラー: ${error.message}`)
    }

    const uniqueUsers = [...new Set(activeUsers?.map(record => record.user_id) || [])]

    // 特定ユーザーのテスト
    let testUserData = null
    if (test_user_id) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('daily_xp_records')
        .select('*')
        .eq('user_id', test_user_id)
        .eq('date', target_date)
        .single()

      if (!userError && userData) {
        testUserData = userData
      }
    }

    return NextResponse.json({
      success: true,
      test_results: {
        target_date,
        raw_active_users: activeUsers || [],
        unique_users: uniqueUsers,
        total_users: uniqueUsers.length,
        test_user_data: testUserData,
        expected_process_count: uniqueUsers.length
      },
      diagnosis: {
        has_users_for_date: uniqueUsers.length > 0,
        possible_issues: uniqueUsers.length === 0 ? [
          'daily_xp_recordsテーブルに該当日のデータが存在しない',
          '前日にアクティビティがあったユーザーがいない',
          'データベース接続の問題',
          'タイムゾーンの問題（JST vs UTC）'
        ] : []
      }
    })

  } catch (error) {
    console.error('[デバッグ] 手動バッチテストエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: '手動バッチテスト中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}