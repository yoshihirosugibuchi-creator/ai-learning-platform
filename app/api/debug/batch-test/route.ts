// バッチ処理ステップ別デバッグAPI
// 各処理段階でのエラー発生箇所を特定

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/debug/batch-test
 * バッチ処理の各ステップを個別テスト
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      target_date = "2025-10-25",
      test_user_id = "82413077-a06d-4d9c-82bb-6fdb6a6b8e13"
    } = body

    console.log(`[バッチテスト] 開始: ${target_date}, ユーザー: ${test_user_id}`)

    const testResults = {
      target_date,
      test_user_id,
      step_results: {} as Record<string, any>
    }

    // Step 1: ユーザー取得テスト
    try {
      const { data: activeUsers, error } = await supabaseAdmin
        .from('daily_xp_records')
        .select('user_id')
        .eq('date', target_date)
        .order('user_id')

      if (error) throw error

      const uniqueUsers = [...new Set(activeUsers?.map(record => record.user_id) || [])]
      
      testResults.step_results['step1_user_detection'] = {
        success: true,
        raw_users: activeUsers,
        unique_users: uniqueUsers,
        contains_test_user: uniqueUsers.includes(test_user_id)
      }
    } catch (error) {
      testResults.step_results['step1_user_detection'] = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Step 2: learning-quality-calculator テスト
    try {
      const { calculateLearningQualityScore } = await import('@/lib/learning-quality-calculator')
      
      const qualityScore = await calculateLearningQualityScore(
        test_user_id,
        target_date,
        30
      )
      
      testResults.step_results['step2_quality_score'] = {
        success: true,
        quality_score: qualityScore
      }
    } catch (error) {
      testResults.step_results['step2_quality_score'] = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    // Step 3: hourly-efficiency データ取得・解析テスト
    try {
      const { data: dailyRecord } = await supabaseAdmin
        .from('daily_xp_records')
        .select('hourly_efficiency_data')
        .eq('user_id', test_user_id)
        .eq('date', target_date)
        .single()

      let hourlyAnalysisResult = null
      if (dailyRecord?.hourly_efficiency_data) {
        const { 
          parseHourlyEfficiencyData,
          getPeakStudyHour,
          getStudyTimeMinutes 
        } = await import('@/lib/hourly-efficiency')
        
        const hourlyData = parseHourlyEfficiencyData(dailyRecord.hourly_efficiency_data)
        const peakHour = getPeakStudyHour(hourlyData)
        const studyTimeMinutes = getStudyTimeMinutes(hourlyData)
        
        hourlyAnalysisResult = {
          hourly_data: hourlyData,
          peak_hour: peakHour,
          study_time_minutes: studyTimeMinutes
        }
      }

      testResults.step_results['step3_hourly_analysis'] = {
        success: true,
        has_hourly_data: !!dailyRecord?.hourly_efficiency_data,
        raw_hourly_data: dailyRecord?.hourly_efficiency_data,
        analysis_result: hourlyAnalysisResult
      }
    } catch (error) {
      testResults.step_results['step3_hourly_analysis'] = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    // Step 4: データベース更新テスト（更新しない、テストのみ）
    try {
      const updateData = {
        learning_quality_score: 85.5,
        peak_study_hour: 14,
        study_time_minutes: 45
      }

      // 実際には更新しない、構文チェックのみ
      testResults.step_results['step4_database_update'] = {
        success: true,
        update_data: updateData,
        note: 'テストのため実際の更新は実行していません'
      }
    } catch (error) {
      testResults.step_results['step4_database_update'] = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // 総合判定
    const allStepsSuccessful = Object.values(testResults.step_results).every(
      (result: any) => result.success === true
    )

    const failedSteps = Object.keys(testResults.step_results).filter(
      step => !testResults.step_results[step].success
    )

    return NextResponse.json({
      success: true,
      test_results: testResults,
      diagnosis: {
        all_steps_successful: allStepsSuccessful,
        failed_steps: failedSteps,
        potential_issues: failedSteps.length > 0 ? [
          `以下のステップでエラー発生: ${failedSteps.join(', ')}`,
          'バッチ処理でのユーザー数0の原因はこれらのエラーの可能性'
        ] : [
          'すべてのステップが成功',
          'バッチ処理の問題は他の箇所にある可能性（認証、環境変数等）'
        ]
      }
    })

  } catch (error) {
    console.error('[バッチテスト] メインエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'バッチテスト中にメインエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}