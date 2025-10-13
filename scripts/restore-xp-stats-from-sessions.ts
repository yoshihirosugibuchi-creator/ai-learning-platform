#!/usr/bin/env tsx

/**
 * XP統計復元スクリプト
 * 実際のセッションデータから user_xp_stats_v2 のXP統計を正確に再計算・復元
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

interface UserXPStats {
  userId: string
  quizXP: number
  courseXP: number
  bonusXP: number
  totalXP: number
  quizSessions: number
  courseSessions: number
  questionsAnswered: number
  questionsCorrect: number
  averageAccuracy: number
}

async function restoreXPStatsFromSessions() {
  console.log('🔄 XP統計復元開始（実際のセッションデータから再計算）\n')

  try {
    // Step 1: 現在の時間統計を保持（破損していないデータ）
    console.log('📊 Step 1: 現在の学習時間統計保持')
    
    const { data: currentTimeStats, error: timeError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('user_id, total_learning_time_seconds, quiz_learning_time_seconds, course_learning_time_seconds')

    if (timeError) {
      console.error('❌ 現在の時間統計取得エラー:', timeError)
      return
    }

    console.log(`📈 時間統計レコード数: ${currentTimeStats?.length || 0}`)

    // Step 2: quiz_sessionsからXP統計を集計
    console.log('\n📊 Step 2: quiz_sessions からXP統計集計')
    
    const { data: quizSessions, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('user_id, total_xp, total_questions, correct_answers, accuracy_rate')

    if (quizError) {
      console.error('❌ quiz_sessions取得エラー:', quizError)
      return
    }

    console.log(`📈 クイズセッションレコード数: ${quizSessions?.length || 0}`)

    // ユーザー別クイズ統計集計
    const quizStatsByUser = new Map<string, {
      totalXP: number
      sessions: number
      questionsAnswered: number
      questionsCorrect: number
    }>()

    quizSessions?.forEach(session => {
      const userId = session.user_id
      const totalXP = session.total_xp || 0
      const totalQuestions = session.total_questions || 0
      const correctAnswers = session.correct_answers || 0

      if (!quizStatsByUser.has(userId)) {
        quizStatsByUser.set(userId, {
          totalXP: 0,
          sessions: 0,
          questionsAnswered: 0,
          questionsCorrect: 0
        })
      }

      const stats = quizStatsByUser.get(userId)!
      stats.totalXP += totalXP
      stats.sessions += 1
      stats.questionsAnswered += totalQuestions
      stats.questionsCorrect += correctAnswers
    })

    // Step 3: course_session_completionsからXP統計を集計
    console.log('\n📊 Step 3: course_session_completions からXP統計集計')
    
    const { data: courseSessions, error: courseError } = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id, earned_xp, session_quiz_correct, is_first_completion')

    if (courseError) {
      console.error('❌ course_session_completions取得エラー:', courseError)
      return
    }

    console.log(`📈 コースセッションレコード数: ${courseSessions?.length || 0}`)

    // ユーザー別コース統計集計
    const courseStatsByUser = new Map<string, {
      totalXP: number
      sessions: number
      questionsAnswered: number
      questionsCorrect: number
    }>()

    courseSessions?.forEach(session => {
      const userId = session.user_id
      const earnedXP = session.earned_xp || 0
      const sessionQuizCorrect = session.session_quiz_correct || false
      const isFirstCompletion = session.is_first_completion || false

      if (!courseStatsByUser.has(userId)) {
        courseStatsByUser.set(userId, {
          totalXP: 0,
          sessions: 0,
          questionsAnswered: 0,
          questionsCorrect: 0
        })
      }

      const stats = courseStatsByUser.get(userId)!
      stats.totalXP += earnedXP
      stats.sessions += 1
      // コース確認クイズもカウント（初回完了時のみ）
      if (isFirstCompletion) {
        stats.questionsAnswered += 1
        stats.questionsCorrect += sessionQuizCorrect ? 1 : 0
      }
    })

    // Step 4: SKP取引からボーナスXPを集計（もしあれば）
    console.log('\n📊 Step 4: ボーナスXP集計')
    
    // 現在はボーナスXPシステムが具体的でないため、既存値を保持
    const { data: currentBonusData, error: bonusError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('user_id, bonus_xp')

    if (bonusError) {
      console.error('❌ 現在のボーナスXP取得エラー:', bonusError)
      return
    }

    const bonusXPByUser = new Map<string, number>()
    currentBonusData?.forEach(data => {
      bonusXPByUser.set(data.user_id, data.bonus_xp || 0)
    })

    // Step 5: 全ユーザーの統計を統合・再計算
    console.log('\n📊 Step 5: 統合XP統計計算')

    const allUsers = new Set<string>()
    currentTimeStats?.forEach(stats => allUsers.add(stats.user_id))
    quizStatsByUser.forEach((_, userId) => allUsers.add(userId))
    courseStatsByUser.forEach((_, userId) => allUsers.add(userId))

    console.log(`📈 処理対象ユーザー数: ${allUsers.size}`)

    const restoredStats: UserXPStats[] = []

    for (const userId of allUsers) {
      const quizStats = quizStatsByUser.get(userId) || { totalXP: 0, sessions: 0, questionsAnswered: 0, questionsCorrect: 0 }
      const courseStats = courseStatsByUser.get(userId) || { totalXP: 0, sessions: 0, questionsAnswered: 0, questionsCorrect: 0 }
      const bonusXP = bonusXPByUser.get(userId) || 0

      const totalQuestionsAnswered = quizStats.questionsAnswered + courseStats.questionsAnswered
      const totalQuestionsCorrect = quizStats.questionsCorrect + courseStats.questionsCorrect
      const averageAccuracy = totalQuestionsAnswered > 0 
        ? Math.round((totalQuestionsCorrect / totalQuestionsAnswered) * 100 * 100) / 100
        : 0

      const userStats: UserXPStats = {
        userId,
        quizXP: quizStats.totalXP,
        courseXP: courseStats.totalXP,
        bonusXP: bonusXP,
        totalXP: quizStats.totalXP + courseStats.totalXP + bonusXP,
        quizSessions: quizStats.sessions,
        courseSessions: courseStats.sessions,
        questionsAnswered: totalQuestionsAnswered,
        questionsCorrect: totalQuestionsCorrect,
        averageAccuracy: averageAccuracy
      }

      restoredStats.push(userStats)
    }

    // Step 6: データベース更新（時間統計は保持）
    console.log('\n📊 Step 6: XP統計復元・データベース更新')

    let updatedCount = 0
    let errorCount = 0

    console.log('\n🔄 ユーザー別XP統計復元:')
    console.log('User ID (先頭8文字)'.padEnd(20) + 'Quiz XP'.padEnd(10) + 'Course XP'.padEnd(12) + 'Bonus XP'.padEnd(12) + 'Total XP'.padEnd(12) + '状態')
    console.log('-'.repeat(80))

    for (const stats of restoredStats) {
      const userIdDisplay = stats.userId.substring(0, 8) + '...'
      const timeStats = currentTimeStats?.find(ts => ts.user_id === stats.userId)

      try {
        // XP統計を復元（時間統計は既存値を保持）
        const { error: updateError } = await supabaseAdmin
          .from('user_xp_stats_v2')
          .update({
            // XP統計（復元）
            total_xp: stats.totalXP,
            quiz_xp: stats.quizXP,
            course_xp: stats.courseXP,
            bonus_xp: stats.bonusXP,
            // セッション統計（復元）
            quiz_sessions_completed: stats.quizSessions,
            course_sessions_completed: stats.courseSessions,
            quiz_questions_answered: stats.questionsAnswered,
            quiz_questions_correct: stats.questionsCorrect,
            quiz_average_accuracy: stats.averageAccuracy,
            // 時間統計（既存値保持）
            total_learning_time_seconds: timeStats?.total_learning_time_seconds || 0,
            quiz_learning_time_seconds: timeStats?.quiz_learning_time_seconds || 0,
            course_learning_time_seconds: timeStats?.course_learning_time_seconds || 0,
            // 更新時刻
            updated_at: new Date().toISOString()
          })
          .eq('user_id', stats.userId)

        if (updateError) {
          console.log(`${userIdDisplay.padEnd(20)}ERROR`.padEnd(10) + 'ERROR'.padEnd(12) + 'ERROR'.padEnd(12) + 'ERROR'.padEnd(12) + '❌')
          errorCount++
          console.error(`   エラー詳細: ${updateError.message}`)
        } else {
          console.log(
            `${userIdDisplay.padEnd(20)}${stats.quizXP}`.padEnd(10) + 
            `${stats.courseXP}`.padEnd(12) + 
            `${stats.bonusXP}`.padEnd(12) + 
            `${stats.totalXP}`.padEnd(12) + 
            '✅'
          )
          updatedCount++
        }
      } catch (error) {
        console.log(`${userIdDisplay.padEnd(20)}EXCEPTION`.padEnd(10) + 'EXCEPTION'.padEnd(12) + 'EXCEPTION'.padEnd(12) + 'EXCEPTION'.padEnd(12) + '❌')
        errorCount++
        console.error(`   例外詳細: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Step 7: 復元結果サマリー
    console.log('\n📊 Step 7: XP統計復元結果サマリー')
    console.log('='.repeat(50))
    console.log(`📈 処理対象ユーザー数: ${allUsers.size}`)
    console.log(`✅ 正常に復元されたユーザー数: ${updatedCount}`)
    console.log(`❌ 復元に失敗したユーザー数: ${errorCount}`)
    console.log(`📊 成功率: ${allUsers.size > 0 ? Math.round((updatedCount / allUsers.size) * 100) : 0}%`)

    // Step 8: 復元後整合性確認
    console.log('\n📊 Step 8: 復元後整合性確認')
    
    const { data: restoredData, error: verifyError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('user_id, total_xp, quiz_xp, course_xp, bonus_xp')

    if (verifyError) {
      console.error('❌ 復元後確認エラー:', verifyError)
    } else {
      let allConsistent = true
      restoredData?.forEach(data => {
        const expectedTotal = (data.quiz_xp || 0) + (data.course_xp || 0) + (data.bonus_xp || 0)
        if ((data.total_xp || 0) !== expectedTotal) {
          console.log(`❌ 整合性エラー: ${data.user_id.substring(0, 8)}... - total:${data.total_xp} ≠ 計算値:${expectedTotal}`)
          allConsistent = false
        }
      })

      if (allConsistent) {
        console.log('✅ 復元後整合性チェック: 全て正常')
      } else {
        console.log('❌ 復元後整合性チェック: 問題あり')
      }
    }

    // Step 9: 総計比較
    console.log('\n📊 Step 9: 復元前後の総計比較')
    
    const totalRestoredXP = restoredStats.reduce((sum, stats) => sum + stats.totalXP, 0)
    const totalRestoredQuizXP = restoredStats.reduce((sum, stats) => sum + stats.quizXP, 0)
    const totalRestoredCourseXP = restoredStats.reduce((sum, stats) => sum + stats.courseXP, 0)

    console.log(`復元後 - 総XP: ${totalRestoredXP}`)
    console.log(`復元後 - クイズXP: ${totalRestoredQuizXP}`)
    console.log(`復元後 - コースXP: ${totalRestoredCourseXP}`)

    console.log('\n🎉 XP統計復元完了!')

  } catch (error) {
    console.error('❌ 復元処理エラー:', error)
  }
}

// 実行
restoreXPStatsFromSessions()
  .then(() => {
    console.log('\n✅ スクリプト実行完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })