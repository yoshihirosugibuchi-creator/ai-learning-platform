#!/usr/bin/env npx tsx

import { supabaseAdmin } from '../lib/supabase-admin'

const USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

async function debugSessionTimeData() {
  console.log('🔍 Debugging session time data...')
  console.log(`👤 User ID: ${USER_ID.substring(0, 8)}...`)

  // Quiz sessions data
  const { data: quizSessions, error: quizError } = await supabaseAdmin
    .from('quiz_sessions')
    .select('id, session_start_time, session_end_time, created_at, total_questions')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })
    .limit(5)

  if (quizError) {
    console.error('❌ Quiz sessions error:', quizError)
    return
  }

  console.log(`\n📊 Quiz Sessions (${quizSessions?.length || 0} total):`)
  quizSessions?.forEach((session, index) => {
    const hasStartTime = !!session.session_start_time
    const hasEndTime = !!session.session_end_time
    const duration = hasStartTime && hasEndTime 
      ? Math.round((new Date(session.session_end_time!).getTime() - new Date(session.session_start_time!).getTime()) / 1000)
      : null

    console.log(`  ${index + 1}. ID: ${session.id.substring(0, 8)}...`)
    console.log(`     Start: ${session.session_start_time || 'NULL'}`)
    console.log(`     End: ${session.session_end_time || 'NULL'}`)
    console.log(`     Duration: ${duration ? `${duration}s` : 'NULL'}`)
    console.log(`     Questions: ${session.total_questions}`)
    console.log('')
  })

  // User XP stats
  const { data: userStats } = await supabaseAdmin
    .from('user_xp_stats_v2')
    .select('total_learning_time_seconds, quiz_learning_time_seconds, course_learning_time_seconds')
    .eq('user_id', USER_ID)
    .single()

  console.log('📈 User XP Stats:')
  console.log(`  Total learning time: ${userStats?.total_learning_time_seconds || 0}s (${Math.round((userStats?.total_learning_time_seconds || 0) / 60)}m)`)
  console.log(`  Quiz learning time: ${userStats?.quiz_learning_time_seconds || 0}s`)
  console.log(`  Course learning time: ${userStats?.course_learning_time_seconds || 0}s`)

  // Daily XP records
  const { data: dailyRecords } = await supabaseAdmin
    .from('daily_xp_records')
    .select('date, total_time_seconds, quiz_time_seconds, course_time_seconds')
    .eq('user_id', USER_ID)
    .order('date', { ascending: false })
    .limit(5)

  console.log('\n📅 Daily XP Records:')
  dailyRecords?.forEach(record => {
    console.log(`  ${record.date}: ${record.total_time_seconds || 0}s total`)
  })

  const totalDailyTime = dailyRecords?.reduce((sum, record) => sum + (record.total_time_seconds || 0), 0) || 0
  console.log(`\n🧮 Summary:`)
  console.log(`  User stats total: ${userStats?.total_learning_time_seconds || 0}s`)
  console.log(`  Daily records total: ${totalDailyTime}s`)
  console.log(`  Difference: ${Math.abs((userStats?.total_learning_time_seconds || 0) - totalDailyTime)}s`)
}

debugSessionTimeData().catch(console.error)