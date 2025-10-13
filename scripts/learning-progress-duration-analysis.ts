#!/usr/bin/env tsx

/**
 * learning_progress テーブルの duration_seconds をユーザーID別に集計
 */

import { supabaseAdmin } from '../lib/supabase-admin'

interface LearningProgressRecord {
  user_id: string | null
  duration_seconds: number | null
  session_id: string | null
  course_id: string
  created_at: string | null
}

async function analyzeLearningProgressDuration() {
  console.log('🔍 learning_progress テーブルの duration_seconds 集計開始\n')

  try {
    // learning_progress テーブルから全データを取得
    const { data: records, error } = await supabaseAdmin
      .from('learning_progress')
      .select('user_id, duration_seconds, session_id, course_id, created_at')
      .order('user_id', { ascending: true })

    if (error) {
      console.error('❌ データ取得エラー:', error)
      return
    }

    if (!records || records.length === 0) {
      console.log('⚠️ learning_progress テーブルにデータがありません')
      return
    }

    console.log(`📊 総レコード数: ${records.length}\n`)

    // ユーザー別集計
    const userStats = new Map<string, {
      recordCount: number
      totalDuration: number
      avgDuration: number
      validDurationCount: number
      sessions: string[]
    }>()

    records.forEach((record: LearningProgressRecord) => {
      const userId = record.user_id || 'NULL'
      const duration = record.duration_seconds || 0
      const sessionId = record.session_id || 'unknown'

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          recordCount: 0,
          totalDuration: 0,
          avgDuration: 0,
          validDurationCount: 0,
          sessions: []
        })
      }

      const stats = userStats.get(userId)!
      stats.recordCount++
      if (record.duration_seconds !== null) {
        stats.totalDuration += duration
        stats.validDurationCount++
        stats.sessions.push(sessionId)
      }
    })

    // 平均計算
    userStats.forEach((stats, userId) => {
      stats.avgDuration = stats.validDurationCount > 0 
        ? Math.round(stats.totalDuration / stats.validDurationCount) 
        : 0
    })

    // 結果表示
    console.log('📋 ユーザー別 learning_progress duration_seconds 集計結果:')
    console.log('=' .repeat(80))
    console.log('User ID'.padEnd(40) + 'Records'.padEnd(10) + 'Total(sec)'.padEnd(12) + 'Avg(sec)'.padEnd(10) + 'Valid Count')
    console.log('-'.repeat(80))

    // 総学習時間順でソート
    const sortedStats = Array.from(userStats.entries())
      .sort(([,a], [,b]) => b.totalDuration - a.totalDuration)

    let grandTotal = 0
    let grandValidCount = 0
    let grandRecordCount = 0

    sortedStats.forEach(([userId, stats]) => {
      const userIdDisplay = userId === 'NULL' ? 'NULL' : userId.substring(0, 8) + '...'
      const totalDisplay = stats.totalDuration.toString()
      const avgDisplay = stats.avgDuration.toString()
      
      console.log(
        userIdDisplay.padEnd(40) + 
        stats.recordCount.toString().padEnd(10) + 
        totalDisplay.padEnd(12) + 
        avgDisplay.padEnd(10) + 
        stats.validDurationCount.toString()
      )

      grandTotal += stats.totalDuration
      grandValidCount += stats.validDurationCount
      grandRecordCount += stats.recordCount
    })

    console.log('-'.repeat(80))
    console.log(
      'TOTAL'.padEnd(40) + 
      grandRecordCount.toString().padEnd(10) + 
      grandTotal.toString().padEnd(12) + 
      (grandValidCount > 0 ? Math.round(grandTotal / grandValidCount) : 0).toString().padEnd(10) + 
      grandValidCount.toString()
    )

    console.log('\n📊 サマリー:')
    console.log(`- 全体レコード数: ${grandRecordCount}`)
    console.log(`- duration_seconds が記録されているレコード数: ${grandValidCount}`)
    console.log(`- 総学習時間: ${grandTotal}秒 (${Math.round(grandTotal / 60)}分)`)
    console.log(`- 平均学習時間: ${grandValidCount > 0 ? Math.round(grandTotal / grandValidCount) : 0}秒/セッション`)
    console.log(`- ユニークユーザー数: ${userStats.size}`)

  } catch (error) {
    console.error('❌ 分析処理エラー:', error)
  }
}

// 実行
analyzeLearningProgressDuration()
  .then(() => {
    console.log('\n✅ 分析完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 実行エラー:', error)
    process.exit(1)
  })