import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAllUsersTimeData() {
  console.log('🔧 全ユーザー時間データ修正 - ミリ秒→秒変換エラーの全体修正')
  console.log('='.repeat(70))

  try {
    // Step 1: 全quiz_answersの異常なtime_spentを修正
    console.log('\n📊 Step 1: 全quiz_answers の time_spent 修正 (>100秒の異常値)')
    
    const { data: abnormalAnswers, error: fetchError } = await supabase
      .from('quiz_answers')
      .select('id, time_spent')
      .gt('time_spent', 100) // 100秒以上の異常値
    
    if (fetchError) {
      throw new Error(`quiz_answers取得エラー: ${fetchError.message}`)
    }
    
    console.log(`❌ 異常なtime_spent値: ${abnormalAnswers?.length || 0}件`)
    
    if (abnormalAnswers && abnormalAnswers.length > 0) {
      // バッチ更新用のデータ準備
      const updates = abnormalAnswers.map(answer => ({
        id: answer.id,
        time_spent: Math.round(answer.time_spent / 1000) // ミリ秒→秒
      }))
      
      // バッチ更新実行（1000件ずつ）
      const batchSize = 1000
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        
        console.log(`  バッチ ${Math.floor(i / batchSize) + 1}: ${batch.length}件修正中...`)
        
        for (const update of batch) {
          await supabase
            .from('quiz_answers')
            .update({ time_spent: update.time_spent })
            .eq('id', update.id)
        }
      }
      
      console.log('✅ quiz_answers の time_spent 修正完了')
    }

    // Step 2: 全ユーザーのuser_xp_stats_v2学習時間統計を再計算
    console.log('\n📊 Step 2: 全ユーザーの user_xp_stats_v2 学習時間統計再計算')
    
    const { data: allUsers, error: usersError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id')
    
    if (usersError) {
      throw new Error(`users取得エラー: ${usersError.message}`)
    }
    
    console.log(`👥 対象ユーザー数: ${allUsers?.length || 0}`)
    
    let processedUsers = 0
    for (const user of allUsers || []) {
      try {
        // そのユーザーの全クイズセッションの正しい時間を計算
        const { data: quizSessions } = await supabase
          .from('quiz_sessions')
          .select('id')
          .eq('user_id', user.user_id)
        
        let totalQuizTime = 0
        for (const session of quizSessions || []) {
          const { data: answers } = await supabase
            .from('quiz_answers')
            .select('time_spent')
            .eq('quiz_session_id', session.id)
          
          totalQuizTime += answers?.reduce((sum, answer) => sum + answer.time_spent, 0) || 0
        }
        
        // そのユーザーのコース時間を取得
        const { data: learningProgress } = await supabase
          .from('learning_progress')
          .select('duration_seconds')
          .eq('user_id', user.user_id)
        
        const totalCourseTime = learningProgress?.reduce((sum, progress) => sum + (progress.duration_seconds || 0), 0) || 0
        const totalCorrectTime = totalQuizTime + totalCourseTime
        
        // user_xp_stats_v2を更新
        await supabase
          .from('user_xp_stats_v2')
          .update({
            total_learning_time_seconds: totalCorrectTime,
            quiz_learning_time_seconds: totalQuizTime,
            course_learning_time_seconds: totalCourseTime,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id)
        
        processedUsers++
        if (processedUsers % 10 === 0) {
          console.log(`  進捗: ${processedUsers}/${allUsers?.length} ユーザー処理完了`)
        }
        
      } catch (userError) {
        console.warn(`⚠️ ユーザー ${user.user_id.substring(0, 8)}... 処理エラー:`, userError)
      }
    }
    
    console.log(`✅ user_xp_stats_v2 修正完了: ${processedUsers}ユーザー`)

    // Step 3: 全daily_xp_recordsの学習時間統計を再計算
    console.log('\n📊 Step 3: 全daily_xp_records の学習時間統計再計算')
    
    const { data: allDailyRecords, error: dailyError } = await supabase
      .from('daily_xp_records')
      .select('*')
    
    if (dailyError) {
      throw new Error(`daily_xp_records取得エラー: ${dailyError.message}`)
    }
    
    console.log(`📅 対象レコード数: ${allDailyRecords?.length || 0}`)
    
    let processedRecords = 0
    for (const record of allDailyRecords || []) {
      try {
        // その日のクイズセッションの正しい時間を計算
        const dateStart = record.date + 'T00:00:00'
        const dateEnd = new Date(new Date(record.date).getTime() + 24*60*60*1000).toISOString().split('T')[0] + 'T00:00:00'
        
        const { data: dayQuizSessions } = await supabase
          .from('quiz_sessions')
          .select('id')
          .eq('user_id', record.user_id)
          .gte('created_at', dateStart)
          .lt('created_at', dateEnd)
        
        let dayQuizTime = 0
        for (const session of dayQuizSessions || []) {
          const { data: answers } = await supabase
            .from('quiz_answers')
            .select('time_spent')
            .eq('quiz_session_id', session.id)
          
          dayQuizTime += answers?.reduce((sum, answer) => sum + answer.time_spent, 0) || 0
        }
        
        // その日のコース時間（既存値を使用、通常正しい）
        const dayCourseTime = record.course_time_seconds || 0
        const dayTotalTime = dayQuizTime + dayCourseTime
        
        // daily_xp_recordsを更新
        await supabase
          .from('daily_xp_records')
          .update({
            quiz_time_seconds: dayQuizTime,
            total_time_seconds: dayTotalTime
          })
          .eq('id', record.id)
        
        processedRecords++
        if (processedRecords % 50 === 0) {
          console.log(`  進捗: ${processedRecords}/${allDailyRecords?.length} レコード処理完了`)
        }
        
      } catch (recordError) {
        console.warn(`⚠️ レコード ${record.id} 処理エラー:`, recordError)
      }
    }
    
    console.log(`✅ daily_xp_records 修正完了: ${processedRecords}レコード`)

    // Step 4: 修正結果のサマリー
    console.log('\n📊 Step 4: 修正結果サマリー')
    
    // 修正後の統計
    const { data: fixedAnswers } = await supabase
      .from('quiz_answers')
      .select('time_spent')
      .gt('time_spent', 100)
    
    const { data: totalStats } = await supabase
      .from('user_xp_stats_v2')
      .select('total_learning_time_seconds, quiz_learning_time_seconds, course_learning_time_seconds')
    
    const avgTotalTime = totalStats?.reduce((sum, stat) => sum + (stat.total_learning_time_seconds || 0), 0) || 0
    const avgQuizTime = totalStats?.reduce((sum, stat) => sum + (stat.quiz_learning_time_seconds || 0), 0) || 0
    
    console.log(`📊 修正結果:`)
    console.log(`  残存異常値(>100秒): ${fixedAnswers?.length || 0}件`)
    console.log(`  全ユーザー総学習時間平均: ${Math.round(avgTotalTime / (totalStats?.length || 1) / 60)}分`)
    console.log(`  全ユーザークイズ時間平均: ${Math.round(avgQuizTime / (totalStats?.length || 1) / 60)}分`)
    
    console.log('\n🎉 全ユーザー時間データ修正完了！')

  } catch (error) {
    console.error('❌ 全体修正エラー:', error)
  }
}

fixAllUsersTimeData()