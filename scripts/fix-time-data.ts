import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTimeData() {
  console.log('🔧 時間データ修正 - ミリ秒→秒変換エラーの修正')
  console.log('='.repeat(60))
  
  const userId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

  try {
    // 1. quiz_answersの異常なtime_spentを修正
    console.log('\n📊 Step 1: quiz_answers の time_spent 修正')
    
    const { data: quizAnswers } = await supabase
      .from('quiz_answers')
      .select('*')
      .gt('time_spent', 100) // 100秒以上の異常値
    
    console.log(`❌ 異常なtime_spent値: ${quizAnswers?.length}件`)
    
    if (quizAnswers && quizAnswers.length > 0) {
      for (const answer of quizAnswers) {
        const correctedTime = Math.round(answer.time_spent / 1000) // ミリ秒→秒
        
        console.log(`  問題${answer.question_id}: ${answer.time_spent}秒 → ${correctedTime}秒`)
        
        await supabase
          .from('quiz_answers')
          .update({ time_spent: correctedTime })
          .eq('id', answer.id)
      }
      
      console.log('✅ quiz_answers の time_spent 修正完了')
    }

    // 2. 修正後の正しい時間を再計算
    console.log('\n📊 Step 2: 正しい学習時間の再計算')
    
    // 各クイズセッションの正しい時間を計算
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
    
    let totalCorrectQuizTime = 0
    
    for (const session of quizSessions || []) {
      const { data: answers } = await supabase
        .from('quiz_answers')
        .select('time_spent')
        .eq('quiz_session_id', session.id)
      
      const sessionTime = answers?.reduce((sum, answer) => sum + answer.time_spent, 0) || 0
      totalCorrectQuizTime += sessionTime
      
      console.log(`  セッション${session.id}: ${sessionTime}秒`)
    }
    
    // コース時間（正しい値は既に記録されている）
    const { data: learningProgress } = await supabase
      .from('learning_progress')
      .select('duration_seconds')
      .eq('user_id', userId)
    
    const totalCourseTime = learningProgress?.reduce((sum, progress) => sum + (progress.duration_seconds || 0), 0) || 0
    
    const totalCorrectTime = totalCorrectQuizTime + totalCourseTime
    
    console.log(`\n📊 正しい学習時間:`)
    console.log(`  クイズ時間: ${totalCorrectQuizTime}秒 (${Math.round(totalCorrectQuizTime/60)}分)`)
    console.log(`  コース時間: ${totalCourseTime}秒 (${Math.round(totalCourseTime/60)}分)`)
    console.log(`  総時間: ${totalCorrectTime}秒 (${Math.round(totalCorrectTime/60)}分)`)

    // 3. user_xp_stats_v2を正しい値に更新
    console.log('\n📊 Step 3: user_xp_stats_v2 の学習時間更新')
    
    const { error: updateStatsError } = await supabase
      .from('user_xp_stats_v2')
      .update({
        total_learning_time_seconds: totalCorrectTime,
        quiz_learning_time_seconds: totalCorrectQuizTime,
        course_learning_time_seconds: totalCourseTime,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    if (updateStatsError) {
      console.error('❌ user_xp_stats_v2 更新エラー:', updateStatsError)
    } else {
      console.log('✅ user_xp_stats_v2 更新完了')
    }

    // 4. daily_xp_recordsを正しい値に更新
    console.log('\n📊 Step 4: daily_xp_records の学習時間更新')
    
    const { data: dailyRecords } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
    
    for (const record of dailyRecords || []) {
      // その日のクイズセッションの正しい時間を計算
      const { data: dayQuizSessions } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', record.date + 'T00:00:00')
        .lt('created_at', new Date(new Date(record.date).getTime() + 24*60*60*1000).toISOString().split('T')[0] + 'T00:00:00')
      
      let dayQuizTime = 0
      for (const session of dayQuizSessions || []) {
        const { data: answers } = await supabase
          .from('quiz_answers')
          .select('time_spent')
          .eq('quiz_session_id', session.id)
        
        dayQuizTime += answers?.reduce((sum, answer) => sum + answer.time_spent, 0) || 0
      }
      
      // その日のコース時間は既存値を使用（通常正しい）
      const dayCourseTime = record.course_time_seconds || 0
      const dayTotalTime = dayQuizTime + dayCourseTime
      
      console.log(`  ${record.date}: ${record.total_time_seconds}秒 → ${dayTotalTime}秒`)
      
      await supabase
        .from('daily_xp_records')
        .update({
          quiz_time_seconds: dayQuizTime,
          total_time_seconds: dayTotalTime
        })
        .eq('id', record.id)
    }
    
    console.log('✅ daily_xp_records 更新完了')

    // 5. 修正結果の確認
    console.log('\n📊 Step 5: 修正結果確認')
    
    const { data: updatedStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    console.log(`✅ 修正後の学習時間:`)
    console.log(`  total_learning_time_seconds: ${updatedStats?.total_learning_time_seconds}秒 (${Math.round((updatedStats?.total_learning_time_seconds || 0)/60)}分)`)
    console.log(`  quiz_learning_time_seconds: ${updatedStats?.quiz_learning_time_seconds}秒`)
    console.log(`  course_learning_time_seconds: ${updatedStats?.course_learning_time_seconds}秒`)
    
    const averageSessionTime = updatedStats?.total_learning_time_seconds ? 
      Math.round(updatedStats.total_learning_time_seconds / ((updatedStats.quiz_sessions_completed || 0) + (updatedStats.course_sessions_completed || 0))) : 0
    
    console.log(`  平均セッション時間: ${averageSessionTime}秒 (${Math.round(averageSessionTime/60)}分)`)

  } catch (error) {
    console.error('❌ 修正エラー:', error)
  }
}

fixTimeData()