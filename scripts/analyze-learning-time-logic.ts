import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeLearningTimeLogic() {
  console.log('🔍 学習時間計算ロジック全体分析')
  console.log('='.repeat(70))
  
  const userId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

  try {
    console.log('\n📚 仕様確認:')
    console.log('1. クイズ学習時間 = 各問題の回答時間 × 問題数（1セッション分）')
    console.log('2. コース学習時間 = セッション開始〜セッションクイズ完了までの時間')
    console.log('3. 総学習時間 = 全クイズセッション時間 + 全コースセッション時間')

    // 1. クイズセッションの実際のデータ分析
    console.log('\n📊 1. クイズセッション分析:')
    
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    console.log(`📋 クイズセッション数: ${quizSessions?.length}`)
    
    let totalQuizTimeFromSessions = 0
    let totalQuizTimeFromAnswers = 0
    
    for (const session of quizSessions || []) {
      // セッション全体時間（start → end）
      const sessionStart = new Date(session.session_start_time)
      const sessionEnd = new Date(session.session_end_time)
      const sessionTotalTime = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 1000)
      
      // このセッションの回答時間合計
      const { data: answers } = await supabase
        .from('quiz_answers')
        .select('time_spent')
        .eq('quiz_session_id', session.id)
      
      const answersTotalTime = answers?.reduce((sum, answer) => sum + answer.time_spent, 0) || 0
      
      totalQuizTimeFromSessions += sessionTotalTime
      totalQuizTimeFromAnswers += answersTotalTime
      
      console.log(`  ${session.created_at.split('T')[0]}:`)
      console.log(`    セッション時間: ${sessionTotalTime}秒 (${Math.round(sessionTotalTime/60)}分)`)
      console.log(`    回答時間合計: ${answersTotalTime}秒 (${Math.round(answersTotalTime/60)}分)`)
      console.log(`    問題数: ${session.total_questions}`)
      console.log(`    平均回答時間: ${Math.round(answersTotalTime/session.total_questions)}秒/問`)
    }
    
    console.log(`\n📊 クイズ時間サマリー:`)
    console.log(`  セッション時間合計: ${totalQuizTimeFromSessions}秒 (${Math.round(totalQuizTimeFromSessions/60)}分)`)
    console.log(`  回答時間合計: ${totalQuizTimeFromAnswers}秒 (${Math.round(totalQuizTimeFromAnswers/60)}分)`)
    console.log(`  どちらが正しい？ → 仕様では「回答時間合計」が正しい`)

    // 2. コースセッション分析  
    console.log('\n📊 2. コースセッション分析:')
    
    const { data: courseSessions } = await supabase
      .from('course_session_completions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    console.log(`📋 コースセッション数: ${courseSessions?.length}`)
    
    // course_session_completionsにはセッション時間が記録されていない
    // learning_progressテーブルを確認
    const { data: learningProgress } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    let totalCourseTime = 0
    
    for (const progress of learningProgress || []) {
      console.log(`  ${progress.created_at.split('T')[0]}:`)
      console.log(`    duration_seconds: ${progress.duration_seconds}秒`)
      console.log(`    session_start_time: ${progress.session_start_time}`)
      console.log(`    session_end_time: ${progress.session_end_time}`)
      
      if (progress.session_start_time && progress.session_end_time) {
        const start = new Date(progress.session_start_time)
        const end = new Date(progress.session_end_time)
        const calculatedTime = Math.round((end.getTime() - start.getTime()) / 1000)
        
        console.log(`    計算時間: ${calculatedTime}秒`)
        console.log(`    記録時間: ${progress.duration_seconds}秒`)
        
        totalCourseTime += progress.duration_seconds || calculatedTime
      }
    }
    
    console.log(`\n📊 コース時間サマリー:`)
    console.log(`  推定総時間: ${totalCourseTime}秒 (${Math.round(totalCourseTime/60)}分)`)

    // 3. 現在の記録と比較
    console.log('\n📊 3. 現在の記録と比較:')
    
    const { data: xpStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    const { data: dailyRecords } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
    
    const dailyTotalTime = dailyRecords?.reduce((sum, record) => sum + (record.total_time_seconds || 0), 0) || 0
    
    console.log(`📋 記録されているデータ:`)
    console.log(`  user_xp_stats_v2:`)
    console.log(`    total_learning_time_seconds: ${xpStats?.total_learning_time_seconds}秒`)
    console.log(`    quiz_learning_time_seconds: ${xpStats?.quiz_learning_time_seconds}秒`)
    console.log(`    course_learning_time_seconds: ${xpStats?.course_learning_time_seconds}秒`)
    console.log(`  daily_xp_records合計: ${dailyTotalTime}秒`)
    
    console.log(`\n🔍 正しい計算値:`)
    console.log(`  クイズ時間（回答時間合計）: ${totalQuizTimeFromAnswers}秒`)
    console.log(`  コース時間（推定）: ${totalCourseTime}秒`)
    console.log(`  正しい総時間: ${totalQuizTimeFromAnswers + totalCourseTime}秒`)
    
    console.log(`\n❌ 記録との差分:`)
    const correctTotal = totalQuizTimeFromAnswers + totalCourseTime
    console.log(`  XP統計との差分: ${(xpStats?.total_learning_time_seconds || 0) - correctTotal}秒`)
    console.log(`  倍率: ${Math.round((xpStats?.total_learning_time_seconds || 0) / correctTotal)}倍`)

    // 4. 修正すべき箇所の特定
    console.log('\n🔧 修正すべき箇所:')
    console.log('1. /api/xp-save/quiz/route.ts line 168:')
    console.log('   ❌ 現在: answerInserts.reduce((sum, answer) => sum + answer.time_spent, 0)')
    console.log('   ✅ 修正: 各回答のtime_spentの合計（これは正しい）')
    console.log('')
    console.log('2. /api/xp-save/course/route.ts:')
    console.log('   ❌ 確認が必要: コース学習時間の計算方法')
    console.log('')
    console.log('3. daily_xp_records更新処理:')
    console.log('   ❌ 確認が必要: 時間の重複計上がないか')

  } catch (error) {
    console.error('❌ 分析エラー:', error)
  }
}

analyzeLearningTimeLogic()