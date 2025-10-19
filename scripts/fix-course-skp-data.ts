/**
 * user_xp_stats_v2のcourse_skp不具合データ修正スクリプト
 * 
 * 問題:
 * 1. 不正解時のSKP(2 SKP)がcourse_skpに反映されていない
 * 2. コース完了ボーナス(50 SKP)がbonus_skpに誤分類されている
 * 
 * 修正内容:
 * 1. skp_transactionsテーブルから正しいcourse_skp値を再計算
 * 2. bonus_skpからcourse_skpへの移動
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

interface UserSKPStats {
  user_id: string
  current_course_skp: number
  current_bonus_skp: number
  correct_course_skp: number
  course_completion_bonus: number
  total_skp_diff: number
}

async function main() {
  console.log('🔧 Starting course_skp data fix...')
  
  try {
    // 1. 全ユーザーのSKP取引記録から正しいcourse_skpを計算
    console.log('📊 Calculating correct course_skp from skp_transactions...')
    
    const { data: skpTransactions, error: transError } = await supabase
      .from('skp_transactions')
      .select('user_id, source, amount, description')
      .eq('type', 'earned')
      .order('user_id')
    
    if (transError) {
      throw new Error(`Failed to fetch SKP transactions: ${transError.message}`)
    }
    
    console.log(`📋 Found ${skpTransactions.length} SKP transactions`)
    
    // ユーザー別にSKP取引を集計
    const userSKPMap = new Map<string, {
      courseSessions: number
      courseCompletions: number
      streakBonus: number
      other: number
    }>()
    
    for (const transaction of skpTransactions) {
      if (!transaction.user_id) continue
      
      if (!userSKPMap.has(transaction.user_id)) {
        userSKPMap.set(transaction.user_id, {
          courseSessions: 0,
          courseCompletions: 0,
          streakBonus: 0,
          other: 0
        })
      }
      
      const userSKP = userSKPMap.get(transaction.user_id)!
      
      if (transaction.source?.startsWith('course_session_')) {
        // コースセッション関連SKP（正解10 or 不正解2）
        userSKP.courseSessions += transaction.amount
      } else if (transaction.source?.startsWith('course_completion_')) {
        // コース完了ボーナス（50 SKP）
        userSKP.courseCompletions += transaction.amount
      } else if (transaction.source?.includes('streak')) {
        // ストリークボーナス
        userSKP.streakBonus += transaction.amount
      } else {
        // その他
        userSKP.other += transaction.amount
      }
    }
    
    console.log(`👥 Processing ${userSKPMap.size} users...`)
    
    // 2. 現在のuser_xp_stats_v2データを取得
    const { data: currentStats, error: statsError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, course_skp, bonus_skp, total_skp')
    
    if (statsError) {
      throw new Error(`Failed to fetch user stats: ${statsError.message}`)
    }
    
    // 3. 修正が必要なユーザーを特定
    const usersToFix: UserSKPStats[] = []
    
    for (const stats of currentStats) {
      const userSKP = userSKPMap.get(stats.user_id)
      if (!userSKP) continue
      
      // 正しいcourse_skp = セッションSKP + 完了ボーナスSKP
      const correctCourseSKP = userSKP.courseSessions + userSKP.courseCompletions
      
      // コース完了ボーナスがbonus_skpに含まれている分
      const courseCompletionInBonusSKP = userSKP.courseCompletions
      
      if (stats.course_skp !== correctCourseSKP || courseCompletionInBonusSKP > 0) {
        usersToFix.push({
          user_id: stats.user_id,
          current_course_skp: stats.course_skp,
          current_bonus_skp: stats.bonus_skp,
          correct_course_skp: correctCourseSKP,
          course_completion_bonus: courseCompletionInBonusSKP,
          total_skp_diff: correctCourseSKP - stats.course_skp
        })
      }
    }
    
    console.log(`🔍 Found ${usersToFix.length} users with incorrect course_skp`)
    
    if (usersToFix.length === 0) {
      console.log('✅ No users need fixing')
      return
    }
    
    // 4. 修正内容を表示
    console.log('\n📋 Users to fix:')
    console.log('User ID\t\t\t\t\tCurrent\tCorrect\tDiff\tBonus→Course')
    console.log('─'.repeat(80))
    
    for (const user of usersToFix) {
      console.log(`${user.user_id.substring(0, 8)}...\t${user.current_course_skp}\t${user.correct_course_skp}\t${user.total_skp_diff}\t${user.course_completion_bonus}`)
    }
    
    // 5. 修正実行の確認
    console.log(`\n🚨 About to fix ${usersToFix.length} users. Continue? (y/N)`)
    
    // 実際のスクリプト実行時はここで入力待ちにする
    // 今回は自動実行用にコメントアウト
    
    // 6. 修正実行
    console.log('\n🔧 Executing fixes...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const user of usersToFix) {
      try {
        // bonus_skpからコース完了ボーナス分を減算、course_skpに正しい値を設定
        const newBonusSKP = user.current_bonus_skp - user.course_completion_bonus
        
        const { error: updateError } = await supabase
          .from('user_xp_stats_v2')
          .update({
            course_skp: user.correct_course_skp,
            bonus_skp: newBonusSKP,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id)
        
        if (updateError) {
          console.error(`❌ Failed to update user ${user.user_id.substring(0, 8)}: ${updateError.message}`)
          errorCount++
        } else {
          console.log(`✅ Fixed user ${user.user_id.substring(0, 8)}: course_skp ${user.current_course_skp}→${user.correct_course_skp}`)
          successCount++
        }
      } catch (error) {
        console.error(`❌ Error updating user ${user.user_id.substring(0, 8)}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n🎉 Fix completed: ${successCount} success, ${errorCount} errors`)
    
    // 7. 修正後の確認
    console.log('\n📊 Verification...')
    
    const { data: verificationStats, error: verifyError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, course_skp, bonus_skp, total_skp')
      .in('user_id', usersToFix.map(u => u.user_id))
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
      return
    }
    
    console.log('User ID\t\t\t\tCourse SKP\tBonus SKP\tTotal SKP')
    console.log('─'.repeat(60))
    
    for (const stats of verificationStats) {
      console.log(`${stats.user_id.substring(0, 8)}...\t${stats.course_skp}\t\t${stats.bonus_skp}\t\t${stats.total_skp}`)
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// 実行
if (require.main === module) {
  main().then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  }).catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}

export { main }