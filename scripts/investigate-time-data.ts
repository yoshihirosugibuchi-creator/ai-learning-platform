import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigateTimeData() {
  console.log('🔍 Investigating time data units in the database...')
  
  try {
    // Check recent quiz answers for time_spent values
    const { data: recentAnswers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('quiz_session_id, time_spent, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (answersError) {
      console.error('Error fetching quiz answers:', answersError)
    } else {
      console.log('\n📝 Recent quiz answer time_spent values:')
      recentAnswers?.forEach((answer, index) => {
        console.log(`${index + 1}. Session: ${answer.quiz_session_id.substring(0, 8)}..., Time: ${answer.time_spent}ms, Date: ${answer.created_at}`)
      })
      
      if (recentAnswers && recentAnswers.length > 0) {
        const times = recentAnswers.map(a => a.time_spent).filter(t => t != null)
        const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
        console.log(`\n📊 Recent answers stats:`)
        console.log(`   Min time: ${Math.min(...times)}ms`)
        console.log(`   Max time: ${Math.max(...times)}ms`)
        console.log(`   Average: ${avgTime.toFixed(0)}ms (${(avgTime/1000).toFixed(1)} seconds)`)
      }
    }
    
    // Check current user_xp_stats_v2 learning time values
    const { data: xpStats, error: statsError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, total_learning_time_seconds, quiz_learning_time_seconds, course_learning_time_seconds, quiz_sessions_completed, course_sessions_completed')
      .order('total_learning_time_seconds', { ascending: false })
      .limit(5)
    
    if (statsError) {
      console.error('Error fetching XP stats:', statsError)
    } else {
      console.log('\n⏱️ Current user learning time statistics:')
      xpStats?.forEach((stat, index) => {
        const totalSessions = stat.quiz_sessions_completed + stat.course_sessions_completed
        const avgSessionTime = totalSessions > 0 ? (stat.total_learning_time_seconds / totalSessions / 60).toFixed(1) : '0'
        console.log(`${index + 1}. User: ${stat.user_id.substring(0, 8)}..., Total: ${stat.total_learning_time_seconds}s, Sessions: ${totalSessions}, Avg: ${avgSessionTime}min`)
      })
    }
    
    // Check if we have any quiz sessions with duration data
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, duration, created_at')
      .not('duration', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (sessionsError) {
      console.error('Error fetching quiz sessions:', sessionsError)
    } else {
      console.log('\n🎯 Quiz sessions with duration data:')
      sessions?.forEach((session, index) => {
        console.log(`${index + 1}. Session: ${session.id.substring(0, 8)}..., Duration: ${session.duration}ms, Date: ${session.created_at}`)
      })
    }
    
    // Check daily_xp_records for accumulated time data
    const { data: dailyRecords, error: dailyError } = await supabase
      .from('daily_xp_records')
      .select('user_id, date, total_time_seconds, quiz_sessions, course_sessions')
      .not('total_time_seconds', 'is', null)
      .order('date', { ascending: false })
      .limit(10)
    
    if (dailyError) {
      console.error('Error fetching daily records:', dailyError)
    } else {
      console.log('\n📅 Recent daily XP records with time data:')
      dailyRecords?.forEach((record, index) => {
        const totalSessions = (record.quiz_sessions || 0) + (record.course_sessions || 0)
        const avgTime = totalSessions > 0 ? (record.total_time_seconds / totalSessions / 60).toFixed(1) : '0'
        console.log(`${index + 1}. User: ${record.user_id.substring(0, 8)}..., Date: ${record.date}, Time: ${record.total_time_seconds}s, Sessions: ${totalSessions}, Avg: ${avgTime}min`)
      })
    }
    
    console.log('\n🔍 Analysis complete!')
    
  } catch (error) {
    console.error('Investigation error:', error)
  }
}

investigateTimeData()