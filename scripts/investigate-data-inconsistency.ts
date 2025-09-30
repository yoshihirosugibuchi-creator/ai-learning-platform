import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigateDataInconsistency() {
  console.log('🔍 データ不整合調査')
  console.log('='.repeat(50))
  
  try {
    const testUserId = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
    
    // 1. user_xp_stats_v2からの概要統計
    console.log('\n📊 概要統計 (user_xp_stats_v2):')
    const { data: userStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', testUserId)
      .single()
    
    if (userStats) {
      console.log(`  quiz_sessions_completed: ${userStats.quiz_sessions_completed}`)
      console.log(`  course_sessions_completed: ${userStats.course_sessions_completed}`)
      console.log(`  total_sessions: ${userStats.quiz_sessions_completed + userStats.course_sessions_completed}`)
      console.log(`  quiz_average_accuracy: ${userStats.quiz_average_accuracy}`)
      console.log(`  total_learning_time_seconds: ${userStats.total_learning_time_seconds}`)
    }
    
    // 2. daily_xp_recordsからの週間データ合計
    console.log('\n📅 週間データ合計 (daily_xp_records):')
    const { data: allDailyRecords } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', testUserId)
      .order('date', { ascending: true })
    
    if (allDailyRecords) {
      const totalQuizSessions = allDailyRecords.reduce((sum, record) => sum + (record.quiz_sessions || 0), 0)
      const totalCourseSessions = allDailyRecords.reduce((sum, record) => sum + (record.course_sessions || 0), 0)
      const totalSessions = totalQuizSessions + totalCourseSessions
      
      console.log(`  total_quiz_sessions: ${totalQuizSessions}`)
      console.log(`  total_course_sessions: ${totalCourseSessions}`)
      console.log(`  total_sessions: ${totalSessions}`)
      
      console.log('\n  Daily records breakdown:')
      allDailyRecords.forEach(record => {
        const sessions = (record.quiz_sessions || 0) + (record.course_sessions || 0)
        console.log(`    ${record.date}: ${sessions} sessions (${record.quiz_sessions || 0} quiz, ${record.course_sessions || 0} course)`)
      })
    }
    
    // 3. quiz_sessionsからの直接データ
    console.log('\n🎯 クイズセッション直接データ (quiz_sessions):')
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('id, total_questions, correct_answers, created_at, completed')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true })
    
    if (quizSessions) {
      console.log(`  Total quiz sessions: ${quizSessions.length}`)
      console.log(`  Completed quiz sessions: ${quizSessions.filter(s => s.completed).length}`)
      
      // 正答率の計算
      const totalQuestions = quizSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0)
      const totalCorrect = quizSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0)
      const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100).toFixed(1) : 0
      
      console.log(`  Total questions: ${totalQuestions}`)
      console.log(`  Total correct: ${totalCorrect}`)
      console.log(`  Overall accuracy: ${overallAccuracy}%`)
      
      // 日付別のセッション数
      const sessionsByDate = new Map()
      quizSessions.forEach(session => {
        const date = session.created_at.split('T')[0]
        sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1)
      })
      
      console.log('\n  Quiz sessions by date:')
      Array.from(sessionsByDate.entries())
        .sort()
        .forEach(([date, count]) => {
          console.log(`    ${date}: ${count} sessions`)
        })
    }
    
    // 4. course_learning_progressからのコースデータ
    console.log('\n📚 コース学習データ (course_learning_progress):')
    const { data: courseProgress } = await supabase
      .from('course_learning_progress')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true })
    
    if (courseProgress) {
      console.log(`  Total course progress records: ${courseProgress.length}`)
      console.log(`  Completed course sessions: ${courseProgress.filter(c => c.completed).length}`)
      
      // 日付別のコースセッション数
      const courseSessionsByDate = new Map()
      courseProgress.forEach(progress => {
        const date = progress.created_at.split('T')[0]
        courseSessionsByDate.set(date, (courseSessionsByDate.get(date) || 0) + 1)
      })
      
      console.log('\n  Course sessions by date:')
      Array.from(courseSessionsByDate.entries())
        .sort()
        .forEach(([date, count]) => {
          console.log(`    ${date}: ${count} sessions`)
        })
    }
    
    // 5. 整合性チェック
    console.log('\n⚖️ 整合性チェック:')
    
    const xpQuizSessions = userStats?.quiz_sessions_completed || 0
    const xpCourseSessions = userStats?.course_sessions_completed || 0
    const xpTotalSessions = xpQuizSessions + xpCourseSessions
    
    const dailyQuizSessions = allDailyRecords?.reduce((sum, r) => sum + (r.quiz_sessions || 0), 0) || 0
    const dailyCourseSessions = allDailyRecords?.reduce((sum, r) => sum + (r.course_sessions || 0), 0) || 0
    const dailyTotalSessions = dailyQuizSessions + dailyCourseSessions
    
    const directQuizSessions = quizSessions?.length || 0
    const directCourseSessions = courseProgress?.length || 0
    const directTotalSessions = directQuizSessions + directCourseSessions
    
    console.log('  セッション数比較:')
    console.log(`    XP Stats: ${xpTotalSessions} (${xpQuizSessions} quiz + ${xpCourseSessions} course)`)
    console.log(`    Daily Records: ${dailyTotalSessions} (${dailyQuizSessions} quiz + ${dailyCourseSessions} course)`)
    console.log(`    Direct Tables: ${directTotalSessions} (${directQuizSessions} quiz + ${directCourseSessions} course)`)
    
    if (xpTotalSessions !== dailyTotalSessions) {
      console.log(`    ❌ XP Stats と Daily Records の不整合: ${Math.abs(xpTotalSessions - dailyTotalSessions)} セッション差`)
    }
    
    if (xpTotalSessions !== directTotalSessions) {
      console.log(`    ❌ XP Stats と Direct Tables の不整合: ${Math.abs(xpTotalSessions - directTotalSessions)} セッション差`)
    }
    
    if (dailyTotalSessions !== directTotalSessions) {
      console.log(`    ❌ Daily Records と Direct Tables の不整合: ${Math.abs(dailyTotalSessions - directTotalSessions)} セッション差`)
    }
    
    console.log('\n✅ 調査完了')
    
  } catch (error) {
    console.error('❌ 調査エラー:', error)
  }
}

investigateDataInconsistency()