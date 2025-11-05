import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * system_alertsテーブルのRLSポリシーテスト用API
 * GET /api/admin/test-system-alerts
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    console.log(`🔍 Testing system_alerts RLS policies for user: ${userId}, role: ${role}`)

    const testResults = {
      user_id: userId,
      user_role: role,
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    }

    // Test 1: 通常のSupabaseクライアント（RLS適用）でSELECT
    try {
      const { data: normalSelectData, error: normalSelectError } = await supabase
        .from('system_alerts')
        .select('*')
        .limit(5)

      testResults.tests.push({
        test: 'normal_client_select',
        client: 'supabase (RLS適用)',
        success: !normalSelectError,
        error: normalSelectError?.message,
        data_count: normalSelectData?.length || 0,
        data_sample: normalSelectData?.slice(0, 2) || []
      })
    } catch (error) {
      testResults.tests.push({
        test: 'normal_client_select',
        client: 'supabase (RLS適用)',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data_count: 0
      })
    }

    // Test 2: 管理者Supabaseクライアント（RLSバイパス）でSELECT
    try {
      const { data: adminSelectData, error: adminSelectError } = await supabaseAdmin
        .from('system_alerts')
        .select('alert_type, COUNT(*) as count')
        .limit(10)

      testResults.tests.push({
        test: 'admin_client_select',
        client: 'supabaseAdmin (RLSバイパス)',
        success: !adminSelectError,
        error: adminSelectError?.message,
        data_count: adminSelectData?.length || 0,
        data_sample: adminSelectData?.slice(0, 3) || []
      })
    } catch (error) {
      testResults.tests.push({
        test: 'admin_client_select',
        client: 'supabaseAdmin (RLSバイパス)',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data_count: 0
      })
    }

    // Test 3: 通常のSupabaseクライアント（RLS適用）でINSERT
    try {
      const { data: normalInsertData, error: normalInsertError } = await supabase
        .from('system_alerts')
        .insert({
          title: 'RLS Test Alert',
          alert_type: 'test_alert',
          message: `RLS test by user ${userId}`,
          severity: 'info',
          user_id: userId
        })
        .select()

      testResults.tests.push({
        test: 'normal_client_insert',
        client: 'supabase (RLS適用)',
        success: !normalInsertError,
        error: normalInsertError?.message,
        inserted_data: normalInsertData || null
      })

      // テストデータをクリーンアップ
      if (!normalInsertError && normalInsertData && normalInsertData.length > 0) {
        await supabaseAdmin
          .from('system_alerts')
          .delete()
          .eq('id', normalInsertData[0].id)
      }
    } catch (error) {
      testResults.tests.push({
        test: 'normal_client_insert',
        client: 'supabase (RLS適用)',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 4: 実際の統計情報を管理者クライアントで取得
    try {
      const { data: alertStats, error: statsError } = await supabaseAdmin
        .from('system_alerts')
        .select('alert_type')

      if (!statsError && alertStats) {
        const stats = alertStats.reduce((acc: any, alert: any) => {
          acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1
          return acc
        }, {})

        testResults.tests.push({
          test: 'alert_statistics',
          client: 'supabaseAdmin (RLSバイパス)',
          success: true,
          total_alerts: alertStats.length,
          alert_types: stats
        })
      } else {
        testResults.tests.push({
          test: 'alert_statistics',
          client: 'supabaseAdmin (RLSバイパス)',
          success: false,
          error: statsError?.message
        })
      }
    } catch (error) {
      testResults.tests.push({
        test: 'alert_statistics',
        client: 'supabaseAdmin (RLSバイパス)',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    console.log('✅ system_alerts RLS test completed:', testResults)

    return NextResponse.json(testResults)

  } catch (error) {
    console.error('❌ Error in system_alerts RLS test:', error)
    return NextResponse.json(
      { error: 'テスト実行中にエラーが発生しました' },
      { status: 500 }
    )
  }
}