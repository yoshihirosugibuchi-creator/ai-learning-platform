// バッチ処理結果確認API
// daily_xp_recordsテーブルの更新状況を確認

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/debug/batch-result-check
 * バッチ処理後のdaily_xp_records更新状況確認
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetDate = searchParams.get('date') || '2025-10-25'
    
    console.log(`[バッチ結果確認] 対象日: ${targetDate}`)

    // 1. 処理対象ユーザーのdaily_xp_recordsデータ取得
    const { data: dailyRecords, error } = await supabaseAdmin
      .from('daily_xp_records')
      .select(`
        user_id,
        date,
        total_xp_earned,
        quiz_sessions,
        course_sessions,
        learning_quality_score,
        peak_study_hour,
        study_time_minutes,
        hourly_efficiency_data
      `)
      .eq('date', targetDate)
      .order('user_id')

    if (error) {
      throw new Error(`データ取得エラー: ${error.message}`)
    }

    // 2. バッチ処理ログの最新結果確認
    const { data: batchLogs, error: logError } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('*')
      .eq('process_date', targetDate)
      .order('created_at', { ascending: false })
      .limit(3)

    if (logError) {
      throw new Error(`バッチログ取得エラー: ${logError.message}`)
    }

    // 3. 各ユーザーの分析結果評価
    const analysisResults = dailyRecords?.map(record => {
      const hasHourlyData = !!record.hourly_efficiency_data
      const hasQualityScore = record.learning_quality_score !== null
      const hasPeakHour = record.peak_study_hour !== null
      const hasStudyTime = record.study_time_minutes !== null

      return {
        user_id: record.user_id,
        activity_summary: {
          total_xp: record.total_xp_earned,
          quiz_sessions: record.quiz_sessions,
          course_sessions: record.course_sessions
        },
        batch_analytics: {
          learning_quality_score: record.learning_quality_score,
          peak_study_hour: record.peak_study_hour,
          study_time_minutes: record.study_time_minutes
        },
        data_availability: {
          has_hourly_data: hasHourlyData,
          has_quality_score: hasQualityScore,
          has_peak_hour: hasPeakHour,
          has_study_time: hasStudyTime
        },
        update_status: {
          fully_processed: hasQualityScore && hasPeakHour && hasStudyTime,
          partial_processed: hasQualityScore || hasPeakHour || hasStudyTime,
          not_processed: !hasQualityScore && !hasPeakHour && !hasStudyTime
        }
      }
    }) || []

    // 4. 全体サマリー
    const totalUsers = analysisResults.length
    const fullyProcessed = analysisResults.filter(r => r.update_status.fully_processed).length
    const partialProcessed = analysisResults.filter(r => r.update_status.partial_processed).length
    const notProcessed = analysisResults.filter(r => r.update_status.not_processed).length

    return NextResponse.json({
      success: true,
      target_date: targetDate,
      batch_result_analysis: {
        summary: {
          total_users: totalUsers,
          fully_processed: fullyProcessed,
          partial_processed: partialProcessed,
          not_processed: notProcessed,
          success_rate: totalUsers > 0 ? Math.round((fullyProcessed / totalUsers) * 100) : 0
        },
        user_details: analysisResults,
        recent_batch_logs: batchLogs
      },
      database_update_status: {
        table: 'daily_xp_records',
        updated_fields: [
          'learning_quality_score',
          'peak_study_hour', 
          'study_time_minutes'
        ],
        update_success: fullyProcessed > 0,
        update_coverage: `${fullyProcessed}/${totalUsers}ユーザー`
      }
    })

  } catch (error) {
    console.error('[バッチ結果確認] エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'バッチ結果確認中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}