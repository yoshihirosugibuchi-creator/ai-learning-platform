#!/usr/bin/env tsx

/**
 * 重要データ監視スクリプト
 * デグレ防止: セッション時間記録の継続監視
 */

import { supabaseAdmin } from '../lib/supabase-admin'

interface DataHealthMetrics {
  totalSessions: number
  sessionsWithTime: number
  sessionsWithoutTime: number
  completionRate: number
  recentSessionsCount: number
  recentSessionsWithTimeCount: number
}

async function monitorCriticalData() {
  console.log('🔍 Critical Data Health Monitor\n')

  try {
    // 1. 過去24時間のセッション時間記録状況を監視
    console.log('📊 Step 1: Session Time Recording Health Check')
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    // 全セッション数
    const { data: allSessions, error: allError } = await supabaseAdmin
      .from('course_session_completions')
      .select('id, session_start_time, session_end_time, duration_seconds, created_at')
      .gte('created_at', yesterday.toISOString())
    
    if (allError) {
      console.error('❌ Failed to fetch session data:', allError)
      return
    }

    // セッション時間データありのセッション数
    const sessionsWithTime = allSessions?.filter(session => 
      session.session_start_time && 
      session.session_end_time && 
      session.duration_seconds !== null
    ) || []

    const metrics: DataHealthMetrics = {
      totalSessions: allSessions?.length || 0,
      sessionsWithTime: sessionsWithTime.length,
      sessionsWithoutTime: (allSessions?.length || 0) - sessionsWithTime.length,
      completionRate: allSessions?.length ? 
        Math.round((sessionsWithTime.length / allSessions.length) * 100) : 0,
      recentSessionsCount: allSessions?.length || 0,
      recentSessionsWithTimeCount: sessionsWithTime.length
    }

    // 2. ヘルスメトリクス表示
    console.log('📈 Past 24 Hours Session Health Metrics:')
    console.log('='.repeat(50))
    console.log(`📊 Total Sessions: ${metrics.totalSessions}`)
    console.log(`✅ Sessions with Time Data: ${metrics.sessionsWithTime}`)
    console.log(`❌ Sessions without Time Data: ${metrics.sessionsWithoutTime}`)
    console.log(`📈 Time Recording Completion Rate: ${metrics.completionRate}%`)

    // 3. アラート判定
    console.log('\n🚨 Alert Status:')
    
    if (metrics.completionRate < 95) {
      console.log(`🔴 CRITICAL ALERT: Session time recording completion rate is ${metrics.completionRate}%`)
      console.log('   This indicates a potential regression in session time recording!')
      
      // デグレの可能性があるセッションを詳細表示
      const sessionsWithoutTime = allSessions?.filter(session => 
        !session.session_start_time || 
        !session.session_end_time || 
        session.duration_seconds === null
      ) || []

      console.log('\n🔍 Sessions missing time data (first 3):')
      sessionsWithoutTime.slice(0, 3).forEach((session, index) => {
        console.log(`${index + 1}. ID: ${session.id}`)
        console.log(`   Created: ${session.created_at}`)
        console.log(`   Start Time: ${session.session_start_time || 'NULL'}`)
        console.log(`   End Time: ${session.session_end_time || 'NULL'}`)
        console.log(`   Duration: ${session.duration_seconds || 'NULL'}`)
        console.log('')
      })
    } else if (metrics.completionRate < 99) {
      console.log(`🟡 WARNING: Session time recording completion rate is ${metrics.completionRate}%`)
      console.log('   Monitor for potential issues.')
    } else {
      console.log(`🟢 HEALTHY: Session time recording completion rate is ${metrics.completionRate}%`)
    }

    // 4. 過去7日間のトレンド分析
    console.log('\n📊 Step 2: 7-Day Trend Analysis')
    
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { data: weekSessions } = await supabaseAdmin
      .from('course_session_completions')
      .select('created_at, session_start_time, session_end_time, duration_seconds')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: true })

    if (weekSessions) {
      // 日別集計
      const dailyStats = new Map<string, { total: number; withTime: number }>()
      
      weekSessions.forEach(session => {
        const date = session.created_at?.substring(0, 10) // YYYY-MM-DD
        if (!date) return
        
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { total: 0, withTime: 0 })
        }
        
        const stats = dailyStats.get(date)!
        stats.total++
        
        if (session.session_start_time && session.session_end_time && session.duration_seconds !== null) {
          stats.withTime++
        }
      })

      console.log('📅 Daily Session Time Recording Rates:')
      console.log('Date'.padEnd(12) + 'Total'.padEnd(8) + 'With Time'.padEnd(12) + 'Rate'.padEnd(8))
      console.log('-'.repeat(40))
      
      Array.from(dailyStats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, stats]) => {
          const rate = stats.total > 0 ? Math.round((stats.withTime / stats.total) * 100) : 0
          console.log(
            date.padEnd(12) + 
            stats.total.toString().padEnd(8) + 
            stats.withTime.toString().padEnd(12) + 
            `${rate}%`.padEnd(8)
          )
        })
    }

    // 5. 推奨アクション
    console.log('\n💡 Recommended Actions:')
    
    if (metrics.completionRate < 95) {
      console.log('🔧 IMMEDIATE ACTION REQUIRED:')
      console.log('   1. Check course completion API for regression')
      console.log('   2. Verify INSERT statement includes session time fields')
      console.log('   3. Run pre-commit validation script')
      console.log('   4. Review recent commits for unintended field removals')
    } else if (metrics.completionRate < 99) {
      console.log('👀 MONITORING RECOMMENDED:')
      console.log('   1. Continue monitoring for 24-48 hours')
      console.log('   2. Investigate occasional missing session times')
    } else {
      console.log('✅ SYSTEM HEALTHY:')
      console.log('   1. Continue regular monitoring')
      console.log('   2. No immediate action required')
    }

    console.log('\n🎉 Critical data monitoring complete!')

  } catch (error) {
    console.error('❌ Monitoring error:', error)
  }
}

// 実行
monitorCriticalData()
  .then(() => {
    console.log('\n✅ Monitoring script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script execution error:', error)
    process.exit(1)
  })