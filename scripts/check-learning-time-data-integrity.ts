#!/usr/bin/env tsx

/**
 * 学習時間データ整合性チェックスクリプト
 * user_xp_stats_v2 の時間統計 vs 実際のセッションデータ集計値
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

interface XPStatsData {
  user_id: string
  total_learning_time_seconds: number | null
  quiz_learning_time_seconds: number | null
  course_learning_time_seconds: number | null
}

interface QuizSessionData {
  user_id: string
  duration_seconds: number | null
}

interface CourseSessionData {
  user_id: string
  duration_seconds: number | null
}

async function checkLearningTimeIntegrity() {
  console.log('🔍 学習時間データ整合性チェック開始\n')

  try {
    // Step 1: user_xp_stats_v2 から時間統計を取得
    console.log('📊 Step 1: user_xp_stats_v2 時間統計取得')
    
    const { data: xpStatsData, error: xpError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('user_id, total_learning_time_seconds, quiz_learning_time_seconds, course_learning_time_seconds')
      .not('total_learning_time_seconds', 'is', null)
      .order('total_learning_time_seconds', { ascending: false })

    if (xpError) {
      console.error('❌ user_xp_stats_v2取得エラー:', xpError)
      return
    }

    console.log(`📈 XP統計レコード数: ${xpStatsData?.length || 0}`)

    // Step 2: quiz_sessions から実際の時間を集計
    console.log('\n📊 Step 2: quiz_sessions 実際の時間集計')
    
    const { data: quizSessionsData, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('user_id, duration_seconds')
      .not('duration_seconds', 'is', null)

    if (quizError) {
      console.error('❌ quiz_sessions取得エラー:', quizError)
      return
    }

    console.log(`📈 クイズセッションレコード数: ${quizSessionsData?.length || 0}`)

    // Step 3: course_session_completions から実際の時間を集計
    console.log('\n📊 Step 3: course_session_completions 実際の時間集計')
    
    const { data: courseSessionsData, error: courseError } = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id, duration_seconds')
      .not('duration_seconds', 'is', null)

    if (courseError) {
      console.error('❌ course_session_completions取得エラー:', courseError)
      return
    }

    console.log(`📈 コースセッションレコード数: ${courseSessionsData?.length || 0}`)

    // Step 4: ユーザー別集計と比較
    console.log('\n📊 Step 4: ユーザー別データ整合性分析')
    
    // クイズセッション時間をユーザー別に集計
    const quizTimeByUser = new Map<string, number>()
    quizSessionsData?.forEach(session => {
      const userId = session.user_id
      const duration = session.duration_seconds || 0
      quizTimeByUser.set(userId, (quizTimeByUser.get(userId) || 0) + duration)
    })

    // コースセッション時間をユーザー別に集計
    const courseTimeByUser = new Map<string, number>()
    courseSessionsData?.forEach(session => {
      const userId = session.user_id
      const duration = session.duration_seconds || 0
      courseTimeByUser.set(userId, (courseTimeByUser.get(userId) || 0) + duration)
    })

    console.log('🔍 整合性チェック結果:')
    console.log('='.repeat(120))
    console.log('User ID (先頭8文字)'.padEnd(20) + 
                'XP統計[総]'.padEnd(12) + 
                'XP統計[クイズ]'.padEnd(15) + 
                'XP統計[コース]'.padEnd(15) + 
                '実際[クイズ]'.padEnd(12) + 
                '実際[コース]'.padEnd(12) + 
                '計算[総]'.padEnd(10) + 
                '整合性')
    console.log('-'.repeat(120))

    let totalChecked = 0
    let totalMatched = 0
    let totalMismatched = 0
    const mismatches: Array<{
      userId: string
      xpTotal: number
      xpQuiz: number
      xpCourse: number
      actualQuiz: number
      actualCourse: number
      calculatedTotal: number
      issue: string
    }> = []

    for (const xpStats of xpStatsData || []) {
      const userId = xpStats.user_id
      const userIdDisplay = userId.substring(0, 8) + '...'
      
      const xpTotal = xpStats.total_learning_time_seconds || 0
      const xpQuiz = xpStats.quiz_learning_time_seconds || 0
      const xpCourse = xpStats.course_learning_time_seconds || 0
      
      const actualQuiz = quizTimeByUser.get(userId) || 0
      const actualCourse = courseTimeByUser.get(userId) || 0
      const calculatedTotal = actualQuiz + actualCourse

      totalChecked++

      // 整合性チェック
      let status = '✅'
      let issue = ''
      
      // 1. 総時間 = クイズ時間 + コース時間 (XP統計内)
      const xpInternalConsistent = xpTotal === (xpQuiz + xpCourse)
      
      // 2. XP統計のクイズ時間 = 実際のクイズセッション集計
      const quizTimeConsistent = xpQuiz === actualQuiz
      
      // 3. XP統計のコース時間 = 実際のコースセッション集計
      const courseTimeConsistent = xpCourse === actualCourse
      
      // 4. XP統計の総時間 = 実際の総セッション集計
      const totalTimeConsistent = xpTotal === calculatedTotal

      if (!xpInternalConsistent || !quizTimeConsistent || !courseTimeConsistent || !totalTimeConsistent) {
        status = '❌'
        totalMismatched++
        
        const issues = []
        if (!xpInternalConsistent) issues.push('XP統計内不整合')
        if (!quizTimeConsistent) issues.push('クイズ時間不一致')
        if (!courseTimeConsistent) issues.push('コース時間不一致') 
        if (!totalTimeConsistent) issues.push('総時間不一致')
        issue = issues.join(', ')
        
        mismatches.push({
          userId: userIdDisplay,
          xpTotal,
          xpQuiz,
          xpCourse,
          actualQuiz,
          actualCourse,
          calculatedTotal,
          issue
        })
      } else {
        totalMatched++
      }

      console.log(
        userIdDisplay.padEnd(20) +
        `${xpTotal}s`.padEnd(12) +
        `${xpQuiz}s`.padEnd(15) +
        `${xpCourse}s`.padEnd(15) +
        `${actualQuiz}s`.padEnd(12) +
        `${actualCourse}s`.padEnd(12) +
        `${calculatedTotal}s`.padEnd(10) +
        status
      )
    }

    // Step 5: サマリーレポート
    console.log('\n📊 Step 5: 整合性サマリー')
    console.log('='.repeat(50))
    console.log(`📈 チェック対象ユーザー数: ${totalChecked}`)
    console.log(`✅ 整合性OK: ${totalMatched}`)
    console.log(`❌ 整合性NG: ${totalMismatched}`)
    console.log(`📊 整合性率: ${totalChecked > 0 ? Math.round((totalMatched / totalChecked) * 100) : 0}%`)

    // 不整合詳細
    if (mismatches.length > 0) {
      console.log('\n❌ 不整合詳細 (上位10件):')
      console.log('-'.repeat(80))
      mismatches.slice(0, 10).forEach((mismatch, index) => {
        console.log(`${index + 1}. ${mismatch.userId}`)
        console.log(`   問題: ${mismatch.issue}`)
        console.log(`   XP統計 - 総:${mismatch.xpTotal}s, クイズ:${mismatch.xpQuiz}s, コース:${mismatch.xpCourse}s`)
        console.log(`   実際値 - クイズ:${mismatch.actualQuiz}s, コース:${mismatch.actualCourse}s, 計算総:${mismatch.calculatedTotal}s`)
        console.log('')
      })
    }

    // Step 6: 集計サマリー
    console.log('\n📊 Step 6: 全体集計サマリー')
    const totalXPTime = (xpStatsData || []).reduce((sum, stats) => sum + (stats.total_learning_time_seconds || 0), 0)
    const totalXPQuizTime = (xpStatsData || []).reduce((sum, stats) => sum + (stats.quiz_learning_time_seconds || 0), 0)
    const totalXPCourseTime = (xpStatsData || []).reduce((sum, stats) => sum + (stats.course_learning_time_seconds || 0), 0)
    
    const totalActualQuizTime = Array.from(quizTimeByUser.values()).reduce((sum, time) => sum + time, 0)
    const totalActualCourseTime = Array.from(courseTimeByUser.values()).reduce((sum, time) => sum + time, 0)
    
    console.log(`XP統計合計 - 総時間: ${totalXPTime}s (${Math.round(totalXPTime/60)}分)`)
    console.log(`XP統計合計 - クイズ時間: ${totalXPQuizTime}s (${Math.round(totalXPQuizTime/60)}分)`)
    console.log(`XP統計合計 - コース時間: ${totalXPCourseTime}s (${Math.round(totalXPCourseTime/60)}分)`)
    console.log(`実際セッション合計 - クイズ時間: ${totalActualQuizTime}s (${Math.round(totalActualQuizTime/60)}分)`)
    console.log(`実際セッション合計 - コース時間: ${totalActualCourseTime}s (${Math.round(totalActualCourseTime/60)}分)`)
    console.log(`実際セッション合計 - 総時間: ${totalActualQuizTime + totalActualCourseTime}s (${Math.round((totalActualQuizTime + totalActualCourseTime)/60)}分)`)

    console.log('\n🎉 学習時間データ整合性チェック完了!')

  } catch (error) {
    console.error('❌ チェック処理エラー:', error)
  }
}

// 実行
checkLearningTimeIntegrity()
  .then(() => {
    console.log('\n✅ スクリプト実行完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })