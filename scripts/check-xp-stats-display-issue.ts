#!/usr/bin/env tsx

/**
 * 学習統計のXP表示問題調査スクリプト
 * 総合XP表示の問題を特定
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database-types-official'

// 環境変数を直接設定
const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkXPStatsDisplayIssue() {
  console.log('🔍 学習統計XP表示問題調査開始\n')

  try {
    // Step 1: user_xp_stats_v2 の全データを確認
    console.log('📊 Step 1: user_xp_stats_v2 XP関連フィールド確認')
    
    const { data: xpStatsData, error: xpError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select(`
        user_id,
        total_xp,
        quiz_xp,
        course_xp,
        bonus_xp,
        total_learning_time_seconds,
        quiz_learning_time_seconds,
        course_learning_time_seconds,
        updated_at
      `)
      .order('total_xp', { ascending: false })

    if (xpError) {
      console.error('❌ user_xp_stats_v2取得エラー:', xpError)
      return
    }

    console.log(`📈 XP統計レコード数: ${xpStatsData?.length || 0}`)

    if (xpStatsData && xpStatsData.length > 0) {
      console.log('\n🔍 現在のXP統計詳細:')
      console.log('User ID (先頭8文字)'.padEnd(20) + 
                  'Total XP'.padEnd(12) + 
                  'Quiz XP'.padEnd(12) + 
                  'Course XP'.padEnd(12) + 
                  'Bonus XP'.padEnd(12) + 
                  '計算値'.padEnd(12) + 
                  '整合性')
      console.log('-'.repeat(90))

      for (const stats of xpStatsData) {
        const userIdDisplay = stats.user_id.substring(0, 8) + '...'
        const totalXP = stats.total_xp || 0
        const quizXP = stats.quiz_xp || 0
        const courseXP = stats.course_xp || 0
        const bonusXP = stats.bonus_xp || 0
        const calculatedTotal = quizXP + courseXP + bonusXP
        const isConsistent = totalXP === calculatedTotal

        console.log(
          userIdDisplay.padEnd(20) +
          totalXP.toString().padEnd(12) +
          quizXP.toString().padEnd(12) +
          courseXP.toString().padEnd(12) +
          bonusXP.toString().padEnd(12) +
          calculatedTotal.toString().padEnd(12) +
          (isConsistent ? '✅' : '❌')
        )

        // 詳細表示（不整合がある場合）
        if (!isConsistent) {
          console.log(`   ⚠️ 不整合: total_xp=${totalXP} ≠ quiz+course+bonus=${calculatedTotal}`)
          console.log(`   📅 最終更新: ${stats.updated_at}`)
        }
      }
    }

    // Step 2: 最近の時間統計更新による影響を確認
    console.log('\n📊 Step 2: 時間統計更新タイミング確認')
    
    // 最近更新されたレコードを確認
    const recentUpdates = xpStatsData?.filter(stats => {
      const updatedAt = new Date(stats.updated_at || '')
      const now = new Date()
      const timeDiff = now.getTime() - updatedAt.getTime()
      return timeDiff < 30 * 60 * 1000 // 30分以内
    })

    if (recentUpdates && recentUpdates.length > 0) {
      console.log(`⚠️ 最近30分以内に更新されたレコード: ${recentUpdates.length}件`)
      recentUpdates.forEach(stats => {
        console.log(`   ${stats.user_id.substring(0, 8)}... - 更新時刻: ${stats.updated_at}`)
      })
    } else {
      console.log('ℹ️ 最近30分以内に更新されたレコードはありません')
    }

    // Step 3: 時間統計再計算スクリプトでupsertされたフィールドを確認
    console.log('\n📊 Step 3: upsert時のフィールド確認')
    
    // recalculate-learning-time-stats.ts で更新されたフィールドをチェック
    console.log('⚠️ 時間統計再計算スクリプトで更新されたフィールド:')
    console.log('   - total_learning_time_seconds')
    console.log('   - quiz_learning_time_seconds')
    console.log('   - course_learning_time_seconds')
    console.log('   - updated_at')
    console.log('')
    console.log('🚨 潜在的問題: upsert時にXP関連フィールドが意図せず初期化された可能性')

    // Step 4: データベースのデフォルト値確認
    console.log('\n📊 Step 4: XPフィールドのNULL/ゼロ値確認')
    
    const nullXPUsers = xpStatsData?.filter(stats => 
      stats.total_xp === null || 
      stats.quiz_xp === null || 
      stats.course_xp === null || 
      stats.bonus_xp === null ||
      stats.total_xp === 0
    )

    if (nullXPUsers && nullXPUsers.length > 0) {
      console.log(`❌ XPがNULLまたは0のユーザー: ${nullXPUsers.length}件`)
      nullXPUsers.forEach(stats => {
        console.log(`   ${stats.user_id.substring(0, 8)}... - total:${stats.total_xp}, quiz:${stats.quiz_xp}, course:${stats.course_xp}, bonus:${stats.bonus_xp}`)
      })
    } else {
      console.log('✅ 全ユーザーのXPフィールドに値が設定されています')
    }

    // Step 5: 修復推奨事項
    console.log('\n📊 Step 5: 問題特定と修復推奨事項')
    
    const hasXPIssues = xpStatsData?.some(stats => {
      const totalXP = stats.total_xp || 0
      const quizXP = stats.quiz_xp || 0
      const courseXP = stats.course_xp || 0
      const bonusXP = stats.bonus_xp || 0
      return totalXP !== (quizXP + courseXP + bonusXP) || totalXP === 0
    })

    if (hasXPIssues) {
      console.log('🚨 **XP表示問題が確認されました**')
      console.log('')
      console.log('🔧 **推定原因:**')
      console.log('   1. 時間統計再計算時のupsert操作で、XPフィールドが意図せずリセット')
      console.log('   2. upsert時にonConflictでuser_idのみ指定、他フィールドが上書き')
      console.log('   3. 部分更新ではなく全フィールド更新により既存XP値が消失')
      console.log('')
      console.log('🛠️ **修復方法:**')
      console.log('   1. 時間統計再計算前のXPデータをバックアップから復元')
      console.log('   2. または、実際のセッションデータからXP統計を再計算')
      console.log('   3. 今後のupsert操作では既存XP値を保持するよう修正')
    } else {
      console.log('✅ XP表示に問題は見つかりませんでした')
    }

    console.log('\n🎉 XP表示問題調査完了!')

  } catch (error) {
    console.error('❌ 調査処理エラー:', error)
  }
}

// 実行
checkXPStatsDisplayIssue()
  .then(() => {
    console.log('\n✅ スクリプト実行完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })