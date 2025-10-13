#!/usr/bin/env tsx

/**
 * 学習時間統計再計算スクリプト
 * 実際のセッションデータから user_xp_stats_v2 の時間統計を正確に再計算
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

interface UserTimeStats {
  userId: string
  quizTime: number
  courseTime: number
  totalTime: number
}

async function recalculateLearningTimeStats() {
  console.log('🔄 学習時間統計再計算開始\n')

  try {
    // Step 1: 現在のuser_xp_stats_v2データを取得
    console.log('📊 Step 1: 現在のXP統計データ取得')
    
    const { data: currentStats, error: statsError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('user_id, total_learning_time_seconds, quiz_learning_time_seconds, course_learning_time_seconds')

    if (statsError) {
      console.error('❌ user_xp_stats_v2取得エラー:', statsError)
      return
    }

    console.log(`📈 現在のXP統計レコード数: ${currentStats?.length || 0}`)

    // Step 2: quiz_sessionsから実際の時間を集計
    console.log('\n📊 Step 2: quiz_sessions 実際の時間集計')
    
    const { data: quizSessions, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('user_id, duration_seconds')
      .not('duration_seconds', 'is', null)

    if (quizError) {
      console.error('❌ quiz_sessions取得エラー:', quizError)
      return
    }

    console.log(`📈 クイズセッションレコード数: ${quizSessions?.length || 0}`)

    // ユーザー別クイズ時間集計
    const quizTimeByUser = new Map<string, number>()
    quizSessions?.forEach(session => {
      const userId = session.user_id
      const duration = session.duration_seconds || 0
      quizTimeByUser.set(userId, (quizTimeByUser.get(userId) || 0) + duration)
    })

    // Step 3: course_session_completionsから実際の時間を集計
    console.log('\n📊 Step 3: course_session_completions 実際の時間集計')
    
    const { data: courseSessions, error: courseError } = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id, duration_seconds')
      .not('duration_seconds', 'is', null)

    if (courseError) {
      console.error('❌ course_session_completions取得エラー:', courseError)
      return
    }

    console.log(`📈 コースセッションレコード数: ${courseSessions?.length || 0}`)

    // ユーザー別コース時間集計
    const courseTimeByUser = new Map<string, number>()
    courseSessions?.forEach(session => {
      const userId = session.user_id
      const duration = session.duration_seconds || 0
      courseTimeByUser.set(userId, (courseTimeByUser.get(userId) || 0) + duration)
    })

    // Step 4: 全ユーザーの統計を再計算
    console.log('\n📊 Step 4: 統計再計算とデータベース更新')

    // 全ユーザーのリストを作成
    const allUsers = new Set<string>()
    currentStats?.forEach(stat => allUsers.add(stat.user_id))
    quizTimeByUser.forEach((_, userId) => allUsers.add(userId))
    courseTimeByUser.forEach((_, userId) => allUsers.add(userId))

    console.log(`📈 処理対象ユーザー数: ${allUsers.size}`)

    let updatedCount = 0
    let errorCount = 0
    const updateResults: Array<{
      userId: string
      success: boolean
      oldTotal: number
      newTotal: number
      oldQuiz: number
      newQuiz: number
      oldCourse: number
      newCourse: number
      error?: string
    }> = []

    console.log('\n🔄 ユーザー別統計更新:')
    console.log('User ID (先頭8文字)'.padEnd(20) + '更新前[総]'.padEnd(12) + '更新後[総]'.padEnd(12) + '差分[総]'.padEnd(10) + '状態')
    console.log('-'.repeat(70))

    for (const userId of allUsers) {
      const currentUserStats = currentStats?.find(stat => stat.user_id === userId)
      
      const oldQuizTime = currentUserStats?.quiz_learning_time_seconds || 0
      const oldCourseTime = currentUserStats?.course_learning_time_seconds || 0
      const oldTotalTime = currentUserStats?.total_learning_time_seconds || 0
      
      const newQuizTime = quizTimeByUser.get(userId) || 0
      const newCourseTime = courseTimeByUser.get(userId) || 0
      const newTotalTime = newQuizTime + newCourseTime

      const userIdDisplay = userId.substring(0, 8) + '...'
      const timeDiff = newTotalTime - oldTotalTime
      const timeDiffSign = timeDiff >= 0 ? '+' : ''

      try {
        // 統計を更新
        const { error: updateError } = await supabaseAdmin
          .from('user_xp_stats_v2')
          .upsert({
            user_id: userId,
            total_learning_time_seconds: newTotalTime,
            quiz_learning_time_seconds: newQuizTime,
            course_learning_time_seconds: newCourseTime,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })

        if (updateError) {
          console.log(`${userIdDisplay.padEnd(20)}ERROR`.padEnd(12) + 'ERROR'.padEnd(12) + 'ERROR'.padEnd(10) + '❌')
          errorCount++
          updateResults.push({
            userId: userIdDisplay,
            success: false,
            oldTotal: oldTotalTime,
            newTotal: newTotalTime,
            oldQuiz: oldQuizTime,
            newQuiz: newQuizTime,
            oldCourse: oldCourseTime,
            newCourse: newCourseTime,
            error: updateError.message
          })
        } else {
          console.log(
            `${userIdDisplay.padEnd(20)}${oldTotalTime}s`.padEnd(12) + 
            `${newTotalTime}s`.padEnd(12) + 
            `${timeDiffSign}${timeDiff}s`.padEnd(10) + 
            '✅'
          )
          updatedCount++
          updateResults.push({
            userId: userIdDisplay,
            success: true,
            oldTotal: oldTotalTime,
            newTotal: newTotalTime,
            oldQuiz: oldQuizTime,
            newQuiz: newQuizTime,
            oldCourse: oldCourseTime,
            newCourse: newCourseTime
          })
        }
      } catch (error) {
        console.log(`${userIdDisplay.padEnd(20)}EXCEPTION`.padEnd(12) + 'EXCEPTION'.padEnd(12) + 'EXCEPTION'.padEnd(10) + '❌')
        errorCount++
        updateResults.push({
          userId: userIdDisplay,
          success: false,
          oldTotal: oldTotalTime,
          newTotal: newTotalTime,
          oldQuiz: oldQuizTime,
          newQuiz: newQuizTime,
          oldCourse: oldCourseTime,
          newCourse: newCourseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Step 5: 結果サマリー
    console.log('\n📊 Step 5: 再計算結果サマリー')
    console.log('='.repeat(50))
    console.log(`📈 処理対象ユーザー数: ${allUsers.size}`)
    console.log(`✅ 正常に更新されたユーザー数: ${updatedCount}`)
    console.log(`❌ 更新に失敗したユーザー数: ${errorCount}`)
    console.log(`📊 成功率: ${allUsers.size > 0 ? Math.round((updatedCount / allUsers.size) * 100) : 0}%`)

    // 失敗詳細
    const failures = updateResults.filter(r => !r.success)
    if (failures.length > 0) {
      console.log('\n❌ 更新失敗詳細:')
      failures.forEach(failure => {
        console.log(`   ${failure.userId} - ${failure.error}`)
      })
    }

    // Step 6: 更新前後の統計比較
    console.log('\n📊 Step 6: 更新前後統計比較')
    
    const successfulUpdates = updateResults.filter(r => r.success)
    
    if (successfulUpdates.length > 0) {
      const totalOldTime = successfulUpdates.reduce((sum, r) => sum + r.oldTotal, 0)
      const totalNewTime = successfulUpdates.reduce((sum, r) => sum + r.newTotal, 0)
      const totalOldQuiz = successfulUpdates.reduce((sum, r) => sum + r.oldQuiz, 0)
      const totalNewQuiz = successfulUpdates.reduce((sum, r) => sum + r.newQuiz, 0)
      const totalOldCourse = successfulUpdates.reduce((sum, r) => sum + r.oldCourse, 0)
      const totalNewCourse = successfulUpdates.reduce((sum, r) => sum + r.newCourse, 0)

      console.log(`更新前 - 総時間: ${totalOldTime}s (${Math.round(totalOldTime/60)}分)`)
      console.log(`更新後 - 総時間: ${totalNewTime}s (${Math.round(totalNewTime/60)}分)`)
      console.log(`差分 - 総時間: ${totalNewTime - totalOldTime}s (${Math.round((totalNewTime - totalOldTime)/60)}分)`)
      console.log('')
      console.log(`更新前 - クイズ時間: ${totalOldQuiz}s (${Math.round(totalOldQuiz/60)}分)`)
      console.log(`更新後 - クイズ時間: ${totalNewQuiz}s (${Math.round(totalNewQuiz/60)}分)`)
      console.log(`差分 - クイズ時間: ${totalNewQuiz - totalOldQuiz}s (${Math.round((totalNewQuiz - totalOldQuiz)/60)}分)`)
      console.log('')
      console.log(`更新前 - コース時間: ${totalOldCourse}s (${Math.round(totalOldCourse/60)}分)`)
      console.log(`更新後 - コース時間: ${totalNewCourse}s (${Math.round(totalNewCourse/60)}分)`)
      console.log(`差分 - コース時間: ${totalNewCourse - totalOldCourse}s (${Math.round((totalNewCourse - totalOldCourse)/60)}分)`)
    }

    // Step 7: 再計算後の整合性確認
    console.log('\n📊 Step 7: 再計算後整合性確認')
    
    let integrityCheckPassed = true
    for (const result of successfulUpdates) {
      const expectedTotal = result.newQuiz + result.newCourse
      if (result.newTotal !== expectedTotal) {
        console.log(`❌ 整合性エラー: ${result.userId} - 総時間:${result.newTotal}s ≠ クイズ+コース:${expectedTotal}s`)
        integrityCheckPassed = false
      }
    }

    if (integrityCheckPassed) {
      console.log('✅ 再計算後の整合性チェック: 全て正常')
    } else {
      console.log('❌ 再計算後の整合性チェック: 問題あり')
    }

    console.log('\n🎉 学習時間統計再計算完了!')

  } catch (error) {
    console.error('❌ 再計算処理エラー:', error)
  }
}

// 実行
recalculateLearningTimeStats()
  .then(() => {
    console.log('\n✅ スクリプト実行完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })