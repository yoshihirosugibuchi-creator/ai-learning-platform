import { createClient } from '@supabase/supabase-js'
import { getLearningAnalytics } from '../lib/supabase-analytics'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log('Environment check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Not set')

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAnalyticsData() {
  console.log('🔍 Analytics Debug - パフォーマンスページ表示問題調査')
  console.log('='.repeat(60))
  
  try {
    // テストユーザーIDを取得
    const { data: userStats } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id')
      .not('total_learning_time_seconds', 'is', null)
      .limit(1)
    
    if (!userStats || userStats.length === 0) {
      console.log('❌ No user data found')
      return
    }
    
    const testUserId = userStats[0].user_id
    console.log(`👤 Testing with User: ${testUserId.substring(0, 8)}...`)
    
    // 1. アナリティクス関数の出力を確認
    console.log('\n📊 getLearningAnalytics function output:')
    const analytics = await getLearningAnalytics(testUserId)
    
    console.log('Analytics data:')
    console.log(`  totalSessions: ${analytics.totalSessions}`)
    console.log(`  completedSessions: ${analytics.completedSessions}`)
    console.log(`  averageSessionTime: ${analytics.averageSessionTime}分`)
    console.log(`  accuracy: ${analytics.accuracy}%`)
    console.log(`  weeklyProgress length: ${analytics.weeklyProgress.length}`)
    
    if (analytics.weeklyProgress.length > 0) {
      console.log('\n📅 週間進捗データ:')
      analytics.weeklyProgress.forEach((week, index) => {
        console.log(`${index + 1}. ${week.week}:`)
        console.log(`   Sessions: ${week.sessionsCompleted}`)
        console.log(`   Average Score: ${week.averageScore}%`)
        console.log(`   Time Spent: ${week.timeSpent}分`)
      })
    } else {
      console.log('\n⚠️ 週間進捗データが空です')
    }
    
    // 2. 直接データベースから週間データを確認
    console.log('\n🗄️ Direct database weekly data check:')
    
    const { data: dailyRecords } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', testUserId)
      .order('date', { ascending: false })
      .limit(30)
    
    console.log(`Daily records found: ${dailyRecords?.length || 0}`)
    
    if (dailyRecords && dailyRecords.length > 0) {
      console.log('Recent daily records:')
      dailyRecords.slice(0, 5).forEach((record, index) => {
        const totalSessions = (record.quiz_sessions || 0) + (record.course_sessions || 0)
        console.log(`${index + 1}. ${record.date}: ${totalSessions} sessions, ${record.total_xp_earned || 0} XP`)
      })
    }
    
    // 3. Quiz sessions データを確認
    console.log('\n🎯 Quiz sessions data check:')
    
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('id, total_questions, correct_answers, created_at')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`Quiz sessions found: ${quizSessions?.length || 0}`)
    
    if (quizSessions && quizSessions.length > 0) {
      console.log('Recent quiz sessions:')
      quizSessions.slice(0, 5).forEach((session, index) => {
        const accuracy = session.total_questions > 0 ? 
          Math.round((session.correct_answers / session.total_questions) * 100) : 0
        console.log(`${index + 1}. ${session.created_at.split('T')[0]}: ${accuracy}% accuracy (${session.correct_answers}/${session.total_questions})`)
      })
    }
    
    // 4. XP Stats APIレスポンスをシミュレート
    console.log('\n🔌 XP Stats API simulation:')
    
    const { data: xpStatsData } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', testUserId)
      .single()
    
    if (xpStatsData) {
      console.log('XP Stats data:')
      console.log(`  total_learning_time_seconds: ${xpStatsData.total_learning_time_seconds}`)
      console.log(`  quiz_learning_time_seconds: ${xpStatsData.quiz_learning_time_seconds}`)
      console.log(`  quiz_sessions_completed: ${xpStatsData.quiz_sessions_completed}`)
      console.log(`  quiz_average_accuracy: ${xpStatsData.quiz_average_accuracy}`)
      
      const totalSessions = xpStatsData.quiz_sessions_completed + xpStatsData.course_sessions_completed
      const avgTime = totalSessions > 0 ? (xpStatsData.total_learning_time_seconds / totalSessions / 60).toFixed(1) : 0
      console.log(`  Calculated avg session time: ${avgTime}分`)
    }
    
    // 5. フロントエンドでのキャッシュ問題を確認
    console.log('\n🔄 Cache and refresh analysis:')
    console.log('- パフォーマンスページは analytics.weeklyProgress と analytics.averageSessionTime を表示')
    console.log('- 更新ボタンがあるかキャッシュをクリアしているか確認が必要')
    console.log('- getLearningAnalyticsが最新データを返しているか検証')
    
    console.log('\n✅ Debug analysis complete!')
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugAnalyticsData()