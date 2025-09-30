import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function simpleDebug() {
  console.log('🔍 Simple Analytics Debug - パフォーマンスページ問題調査')
  console.log('='.repeat(60))
  
  try {
    // テストユーザーIDを取得
    const { data: userStats } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, total_learning_time_seconds, quiz_sessions_completed, course_sessions_completed')
      .not('total_learning_time_seconds', 'is', null)
      .limit(1)
    
    if (!userStats || userStats.length === 0) {
      console.log('❌ No user data found')
      return
    }
    
    const testUserId = userStats[0].user_id
    const userStat = userStats[0]
    console.log(`👤 Testing with User: ${testUserId.substring(0, 8)}...`)
    
    // 1. 週間進捗計算をテスト
    console.log('\n📅 週間進捗データ計算テスト:')
    
    const now = new Date()
    
    for (let i = 0; i < 4; i++) {
      // 週の境界を計算（月曜始まり）
      const target = new Date(now)
      target.setDate(now.getDate() - (i * 7))
      
      const dayOfWeek = target.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
      const monday = new Date(target)
      monday.setDate(target.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      monday.setHours(0, 0, 0, 0)
      
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      
      const mondayStr = monday.toISOString().split('T')[0]
      const sundayStr = sunday.toISOString().split('T')[0]
      
      console.log(`\n週${i + 1}: ${mondayStr} - ${sundayStr}`)
      
      // daily_xp_recordsから週のデータを取得
      const { data: dailyRecords } = await supabase
        .from('daily_xp_records')
        .select('*')
        .eq('user_id', testUserId)
        .gte('date', mondayStr)
        .lte('date', sundayStr)
        .order('date', { ascending: true })
      
      console.log(`  Daily records found: ${dailyRecords?.length || 0}`)
      
      if (dailyRecords && dailyRecords.length > 0) {
        const totalQuizSessions = dailyRecords.reduce((sum, record) => sum + (record.quiz_sessions || 0), 0)
        const totalCourseSessions = dailyRecords.reduce((sum, record) => sum + (record.course_sessions || 0), 0)
        const completedSessions = totalQuizSessions + totalCourseSessions
        
        console.log(`  Quiz sessions: ${totalQuizSessions}`)
        console.log(`  Course sessions: ${totalCourseSessions}`)
        console.log(`  Total sessions: ${completedSessions}`)
        
        // quiz_sessionsから詳細データを取得（正答率計算用）
        const { data: quizSessions } = await supabase
          .from('quiz_sessions')
          .select('total_questions, correct_answers')
          .eq('user_id', testUserId)
          .gte('created_at', monday.toISOString())
          .lte('created_at', sunday.toISOString())
        
        let averageScore = 0
        if (quizSessions && quizSessions.length > 0) {
          const totalQuestions = quizSessions.reduce((sum, session) => sum + (session.total_questions || 0), 0)
          const totalCorrect = quizSessions.reduce((sum, session) => sum + (session.correct_answers || 0), 0)
          averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
        }
        
        console.log(`  Average score: ${averageScore}%`)
        
        // 学習時間の計算（推定）
        const estimatedTimeSpent = (totalQuizSessions * 5) + (totalCourseSessions * 10)
        console.log(`  Estimated time: ${estimatedTimeSpent}分`)
        
      } else {
        console.log(`  No data for this week`)
      }
    }
    
    // 2. 平均セッション時間の計算テスト
    console.log('\n⏱️ 平均セッション時間計算テスト:')
    
    const totalSessions = userStat.quiz_sessions_completed + userStat.course_sessions_completed
    const totalTimeSeconds = userStat.total_learning_time_seconds
    const avgSessionTime = totalSessions > 0 ? totalTimeSeconds / totalSessions / 60 : 0
    
    console.log(`  Total learning time: ${totalTimeSeconds}秒`)
    console.log(`  Total sessions: ${totalSessions}`)
    console.log(`  Average session time: ${avgSessionTime.toFixed(1)}分`)
    
    // 3. 最近のquiz_answersデータ確認
    console.log('\n🎯 最近のクイズ回答時間データ:')
    
    const { data: recentAnswers } = await supabase
      .from('quiz_answers')
      .select(`
        time_spent,
        created_at,
        quiz_sessions!inner(user_id)
      `)
      .eq('quiz_sessions.user_id', testUserId)
      .not('time_spent', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentAnswers && recentAnswers.length > 0) {
      const times = recentAnswers.map(a => a.time_spent)
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
      
      console.log(`  Recent answers: ${recentAnswers.length}`)
      console.log(`  Time range: ${Math.min(...times)}ms - ${Math.max(...times)}ms`)
      console.log(`  Average time: ${avgTime.toFixed(0)}ms (${(avgTime/1000).toFixed(1)}秒)`)
    }
    
    console.log('\n✅ 分析完了')
    console.log('\n🔍 パフォーマンスページが更新されない可能性:')
    console.log('1. 週間進捗データが空の場合、"パフォーマンスデータなし"が表示される')
    console.log('2. キャッシュが効いている可能性がある')
    console.log('3. getLearningAnalytics関数が正しく週間データを計算していない可能性')
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

simpleDebug()