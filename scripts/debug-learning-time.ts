import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugLearningTime() {
  console.log('🔍 学習時間データ詳細調査')
  console.log('='.repeat(60))
  
  const userId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07' // ユーザーID

  try {
    // 1. user_xp_stats_v2の時間データを確認
    console.log('\n📊 user_xp_stats_v2 の学習時間データ:')
    const { data: xpStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (xpStats) {
      console.log(`⏱️ total_learning_time_seconds: ${xpStats.total_learning_time_seconds}秒`)
      console.log(`⏱️ quiz_learning_time_seconds: ${xpStats.quiz_learning_time_seconds}秒`)
      console.log(`⏱️ course_learning_time_seconds: ${xpStats.course_learning_time_seconds}秒`)
      console.log(`📈 quiz_sessions_completed: ${xpStats.quiz_sessions_completed}`)
      console.log(`📈 course_sessions_completed: ${xpStats.course_sessions_completed}`)
      
      const totalSessions = xpStats.quiz_sessions_completed + xpStats.course_sessions_completed
      const averageMinutes = xpStats.total_learning_time_seconds ? 
        Math.round(xpStats.total_learning_time_seconds / totalSessions / 60) : 0
      console.log(`📊 計算: ${xpStats.total_learning_time_seconds}秒 ÷ ${totalSessions}セッション = ${averageMinutes}分/セッション`)
      console.log(`📊 総時間: ${Math.round(xpStats.total_learning_time_seconds / 60)}分 = ${Math.round(xpStats.total_learning_time_seconds / 3600)}時間`)
    }

    // 2. daily_xp_recordsの時間データを確認
    console.log('\n📊 daily_xp_records の学習時間データ:')
    const { data: dailyRecords } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (dailyRecords && dailyRecords.length > 0) {
      console.log(`📅 記録数: ${dailyRecords.length}日分`)
      
      let totalDailyTime = 0
      dailyRecords.forEach((record, index) => {
        if (index < 5) { // 最新5日分を表示
          console.log(`  ${record.date}: ${record.total_time_seconds}秒 (${Math.round(record.total_time_seconds / 60)}分)`)
        }
        totalDailyTime += record.total_time_seconds || 0
      })
      
      console.log(`📊 daily_records総計: ${totalDailyTime}秒 = ${Math.round(totalDailyTime / 60)}分 = ${Math.round(totalDailyTime / 3600)}時間`)
    }

    // 3. 週間の時間計算を再現
    console.log('\n📊 週間計算シミュレーション (過去4週間):')
    const now = new Date()
    
    for (let i = 0; i < 4; i++) {
      const weeksAgo = i
      const target = new Date(now)
      target.setDate(now.getDate() - (weeksAgo * 7))
      
      // その週の月曜日と日曜日を計算
      const dayOfWeek = target.getDay()
      const monday = new Date(target)
      monday.setDate(target.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      monday.setHours(0, 0, 0, 0)
      
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      
      const mondayStr = monday.toISOString().split('T')[0]
      const sundayStr = sunday.toISOString().split('T')[0]
      
      console.log(`\n📅 Week ${i + 1} (${mondayStr} - ${sundayStr}):`)
      
      const { data: weekRecords } = await supabase
        .from('daily_xp_records')
        .select('*')
        .eq('user_id', userId)
        .gte('date', mondayStr)
        .lte('date', sundayStr)
      
      if (weekRecords && weekRecords.length > 0) {
        const totalWeekTime = weekRecords.reduce((sum, record) => sum + (record.total_time_seconds || 0), 0)
        const totalSessions = weekRecords.reduce((sum, record) => 
          sum + (record.quiz_sessions || 0) + (record.course_sessions || 0), 0)
        
        console.log(`  📊 記録日数: ${weekRecords.length}日`)
        console.log(`  ⏱️ 総時間: ${totalWeekTime}秒 = ${Math.round(totalWeekTime / 60)}分`)
        console.log(`  📈 総セッション: ${totalSessions}`)
        
        weekRecords.forEach(record => {
          if (record.total_time_seconds > 0) {
            console.log(`    ${record.date}: ${record.total_time_seconds}秒 (${Math.round(record.total_time_seconds / 60)}分)`)
          }
        })
      } else {
        console.log(`  ❌ データなし`)
      }
    }

    // 4. quiz_sessionsの実際のセッション時間を確認
    console.log('\n📊 quiz_sessions の実際のセッション時間:')
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (quizSessions && quizSessions.length > 0) {
      console.log(`📅 最新10セッション:`)
      quizSessions.forEach((session, index) => {
        const start = new Date(session.session_start_time)
        const end = new Date(session.session_end_time)
        const durationMs = end.getTime() - start.getTime()
        const durationMinutes = Math.round(durationMs / 1000 / 60)
        
        console.log(`  ${index + 1}. ${session.created_at.split('T')[0]}: ${durationMinutes}分 (${session.total_questions}問)`)
      })
    }

  } catch (error) {
    console.error('❌ 調査エラー:', error)
  }
}

debugLearningTime()