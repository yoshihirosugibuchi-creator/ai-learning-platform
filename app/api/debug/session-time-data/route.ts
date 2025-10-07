import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

export async function GET() {
  try {
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
      return NextResponse.json({ error: quizError.message }, { status: 500 })
    }

    console.log(`\n📊 Quiz Sessions (${quizSessions?.length || 0} total):`)
    const sessionAnalysis = quizSessions?.map((session, index) => {
      const hasStartTime = !!session.session_start_time
      const hasEndTime = !!session.session_end_time
      const duration = hasStartTime && hasEndTime 
        ? Math.round((new Date(session.session_end_time!).getTime() - new Date(session.session_start_time!).getTime()) / 1000)
        : null

      const analysis = {
        index: index + 1,
        id: session.id.substring(0, 8) + '...',
        start: session.session_start_time || 'NULL',
        end: session.session_end_time || 'NULL',
        duration: duration ? `${duration}s` : 'NULL',
        questions: session.total_questions,
        hasTimeData: hasStartTime && hasEndTime
      }

      console.log(`  ${analysis.index}. ID: ${analysis.id}`)
      console.log(`     Start: ${analysis.start}`)
      console.log(`     End: ${analysis.end}`)
      console.log(`     Duration: ${analysis.duration}`)
      console.log(`     Questions: ${analysis.questions}`)
      console.log('')

      return analysis
    }) || []

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

    const summary = {
      userStatsTotal: userStats?.total_learning_time_seconds || 0,
      dailyRecordsTotal: totalDailyTime,
      difference: Math.abs((userStats?.total_learning_time_seconds || 0) - totalDailyTime),
      sessionsWithTimeData: sessionAnalysis.filter(s => s.hasTimeData).length,
      totalSessions: sessionAnalysis.length
    }

    return NextResponse.json({
      sessions: sessionAnalysis,
      userStats: {
        total: userStats?.total_learning_time_seconds || 0,
        quiz: userStats?.quiz_learning_time_seconds || 0,
        course: userStats?.course_learning_time_seconds || 0
      },
      dailyRecords,
      summary
    })

  } catch (error) {
    console.error('Debug session time data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}