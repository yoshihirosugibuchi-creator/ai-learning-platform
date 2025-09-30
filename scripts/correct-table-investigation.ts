import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function correctTableInvestigation() {
  console.log('🔍 正しいテーブル名での調査')
  console.log('='.repeat(50))
  
  try {
    const testUserId = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
    
    // 1. quiz_sessionsテーブル（正しいテーブル名で再確認）
    console.log('\n🎯 quiz_sessions:')
    const { data: quizSessions, error: quizError } = await supabase
      .from('quiz_sessions')
      .select('id, total_questions, correct_answers, created_at, completed')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true })
    
    if (quizError) {
      console.error(`❌ quiz_sessions エラー: ${quizError.message}`)
    } else {
      console.log(`✅ quiz_sessions: ${quizSessions?.length || 0} レコード`)
      if (quizSessions && quizSessions.length > 0) {
        console.log('最新5件:')
        quizSessions.slice(-5).forEach((session, index) => {
          const accuracy = session.total_questions > 0 ? 
            Math.round((session.correct_answers / session.total_questions) * 100) : 0
          console.log(`  ${index + 1}. ${session.created_at.split('T')[0]}: ${accuracy}% (${session.correct_answers}/${session.total_questions})`)
        })
      }
    }
    
    // 2. learning_progressテーブル（正しいテーブル名）
    console.log('\n📚 learning_progress:')
    const { data: learningProgress, error: learningError } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true })
    
    if (learningError) {
      console.error(`❌ learning_progress エラー: ${learningError.message}`)
    } else {
      console.log(`✅ learning_progress: ${learningProgress?.length || 0} レコード`)
      if (learningProgress && learningProgress.length > 0) {
        console.log('最新5件:')
        learningProgress.slice(-5).forEach((progress, index) => {
          console.log(`  ${index + 1}. ${progress.created_at.split('T')[0]}: ${progress.course_id || 'N/A'} - ${progress.completed ? '完了' : '未完了'}`)
        })
      }
    }
    
    // 3. 正確な整合性チェック
    console.log('\n⚖️ 修正された整合性チェック:')
    
    const { data: userStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', testUserId)
      .single()
    
    const { data: dailyRecords } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', testUserId)
    
    const xpQuizSessions = userStats?.quiz_sessions_completed || 0
    const xpCourseSessions = userStats?.course_sessions_completed || 0
    const xpTotalSessions = xpQuizSessions + xpCourseSessions
    
    const dailyQuizSessions = dailyRecords?.reduce((sum, r) => sum + (r.quiz_sessions || 0), 0) || 0
    const dailyCourseSessions = dailyRecords?.reduce((sum, r) => sum + (r.course_sessions || 0), 0) || 0
    const dailyTotalSessions = dailyQuizSessions + dailyCourseSessions
    
    const directQuizSessions = quizSessions?.length || 0
    const directCourseSessions = learningProgress?.length || 0
    const directTotalSessions = directQuizSessions + directCourseSessions
    
    console.log('セッション数比較:')
    console.log(`  XP Stats: ${xpTotalSessions} (${xpQuizSessions} quiz + ${xpCourseSessions} course)`)
    console.log(`  Daily Records: ${dailyTotalSessions} (${dailyQuizSessions} quiz + ${dailyCourseSessions} course)`)
    console.log(`  Direct Tables: ${directTotalSessions} (${directQuizSessions} quiz + ${directCourseSessions} course)`)
    
    // 4. 正答率の比較
    console.log('\n📊 正答率比較:')
    
    const xpAccuracy = userStats?.quiz_average_accuracy || 0
    console.log(`  XP Stats accuracy: ${xpAccuracy}%`)
    
    if (quizSessions && quizSessions.length > 0) {
      const totalQuestions = quizSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0)
      const totalCorrect = quizSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0)
      const directAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions * 100) : 0
      
      console.log(`  Direct calculation: ${directAccuracy.toFixed(1)}% (${totalCorrect}/${totalQuestions})`)
      
      if (Math.abs(xpAccuracy - directAccuracy) > 1) {
        console.log(`  ❌ 正答率の不整合: ${Math.abs(xpAccuracy - directAccuracy).toFixed(1)}% 差`)
      } else {
        console.log(`  ✅ 正答率は一致`)
      }
    }
    
    // 5. 問題の特定
    console.log('\n🔍 問題の特定:')
    
    if (xpTotalSessions > directTotalSessions) {
      console.log(`❌ XP Stats が Direct Tables より ${xpTotalSessions - directTotalSessions} セッション多い`)
      console.log('   原因: 削除されたセッションが XP Stats に残っている可能性')
    }
    
    if (dailyTotalSessions !== directTotalSessions) {
      console.log(`❌ Daily Records と Direct Tables の不整合: ${Math.abs(dailyTotalSessions - directTotalSessions)} セッション差`)
      console.log('   原因: daily_xp_records の更新タイミングの問題')
    }
    
    // 週間データが過小評価される理由
    console.log('\n📅 週間データが少ない理由:')
    console.log(`  Daily Records の最古の記録: ${dailyRecords?.[0]?.date || 'なし'}`)
    console.log(`  Quiz Sessions の最古の記録: ${quizSessions?.[0]?.created_at.split('T')[0] || 'なし'}`)
    console.log('  → daily_xp_records に古いデータが記録されていない可能性')
    
    console.log('\n✅ 調査完了')
    
  } catch (error) {
    console.error('❌ 調査エラー:', error)
  }
}

correctTableInvestigation()