import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { loadXPSettings } from '@/lib/xp-settings'

export async function GET() {
  try {
    console.log('🔍 System Health Check開始...')

    const healthChecks = []
    let overallStatus = 'healthy'

    // 1. XP設定テーブル接続確認
    try {
      const { data: xpSettings, error: xpError } = await supabaseAdmin
        .from('xp_level_skp_settings')
        .select('*')
        .limit(1)

      if (xpError) {
        healthChecks.push({
          component: 'xp_settings_table',
          status: 'critical',
          message: 'xp_level_skp_settingsテーブルアクセスエラー',
          error: xpError.message
        })
        overallStatus = 'critical'
      } else {
        healthChecks.push({
          component: 'xp_settings_table',
          status: 'healthy',
          message: 'xp_level_skp_settingsテーブル正常',
          recordCount: xpSettings?.length || 0
        })
      }
    } catch (error) {
      healthChecks.push({
        component: 'xp_settings_table',
        status: 'critical',
        message: 'xp_level_skp_settingsテーブル接続失敗',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      overallStatus = 'critical'
    }

    // 2. XP設定ロード機能確認
    try {
      const xpSettings = await loadXPSettings()
      
      if (!xpSettings) {
        healthChecks.push({
          component: 'xp_settings_load',
          status: 'critical',
          message: 'XP設定ロード失敗 - null返却'
        })
        overallStatus = 'critical'
      } else {
        healthChecks.push({
          component: 'xp_settings_load',
          status: 'healthy',
          message: 'XP設定ロード正常',
          settings: {
            hasQuizXP: !!xpSettings.xp_quiz.basic,
            hasCourseXP: !!xpSettings.xp_course.basic,
            hasLevelThresholds: !!xpSettings.level.overall_threshold
          }
        })
      }
    } catch (error) {
      healthChecks.push({
        component: 'xp_settings_load',
        status: 'critical',
        message: 'XP設定ロード例外エラー',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      overallStatus = 'critical'
    }

    // 3. システムアラートテーブル接続確認
    try {
      const { error: alertError } = await supabaseAdmin
        .from('system_alerts')
        .select('id')
        .limit(1)

      if (alertError) {
        healthChecks.push({
          component: 'system_alerts_table',
          status: 'warning',
          message: 'system_alertsテーブルアクセスエラー（監視機能制限）',
          error: alertError.message
        })
        if (overallStatus === 'healthy') overallStatus = 'warning'
      } else {
        healthChecks.push({
          component: 'system_alerts_table',
          status: 'healthy',
          message: 'system_alertsテーブル正常'
        })
      }
    } catch (error) {
      healthChecks.push({
        component: 'system_alerts_table',
        status: 'warning',
        message: 'system_alertsテーブル未作成または接続失敗',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      if (overallStatus === 'healthy') overallStatus = 'warning'
    }

    // 4. 重要テーブル存在確認
    const tableChecks = [
      { name: 'user_xp_stats_v2', accessor: () => supabaseAdmin.from('user_xp_stats_v2') },
      { name: 'quiz_sessions', accessor: () => supabaseAdmin.from('quiz_sessions') },
      { name: 'quiz_answers', accessor: () => supabaseAdmin.from('quiz_answers') },
      { name: 'xp_level_skp_settings', accessor: () => supabaseAdmin.from('xp_level_skp_settings') }
    ]

    for (const table of tableChecks) {
      try {
        const { error } = await table.accessor()
          .select('*')
          .limit(1)

        if (error) {
          healthChecks.push({
            component: `table_${table.name}`,
            status: 'critical',
            message: `${table.name}テーブルアクセスエラー`,
            error: error.message
          })
          overallStatus = 'critical'
        } else {
          healthChecks.push({
            component: `table_${table.name}`,
            status: 'healthy',
            message: `${table.name}テーブル正常`
          })
        }
      } catch (error) {
        healthChecks.push({
          component: `table_${table.name}`,
          status: 'critical',
          message: `${table.name}テーブル接続失敗`,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        overallStatus = 'critical'
      }
    }

    // ヘルスチェック結果をログに記録
    try {
      await supabaseAdmin
        .from('system_health_logs')
        .insert({
          check_type: 'system_startup',
          status: overallStatus,
          metrics: {
            totalChecks: healthChecks.length,
            healthyCount: healthChecks.filter(c => c.status === 'healthy').length,
            warningCount: healthChecks.filter(c => c.status === 'warning').length,
            criticalCount: healthChecks.filter(c => c.status === 'critical').length
          },
          details: `System health check completed - Overall status: ${overallStatus}`
        })
    } catch (error) {
      console.warn('⚠️ ヘルスログ記録失敗:', error)
    }

    console.log(`✅ System Health Check完了 - Status: ${overallStatus}`)

    return NextResponse.json({
      overallStatus,
      timestamp: new Date().toISOString(),
      healthChecks,
      summary: {
        total: healthChecks.length,
        healthy: healthChecks.filter(c => c.status === 'healthy').length,
        warning: healthChecks.filter(c => c.status === 'warning').length,
        critical: healthChecks.filter(c => c.status === 'critical').length
      }
    })

  } catch (error) {
    console.error('❌ System Health Check失敗:', error)
    return NextResponse.json({
      overallStatus: 'critical',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}