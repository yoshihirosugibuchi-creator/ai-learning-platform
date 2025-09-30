import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTimeUnitConversion() {
  console.log('🔧 Starting time unit conversion fix...')
  
  try {
    // Step 1: Analyze all quiz_answers to understand the time format
    console.log('\n📊 Analyzing all quiz_answers time_spent data...')
    
    const { data: allAnswers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('time_spent, created_at')
      .not('time_spent', 'is', null)
      .order('created_at', { ascending: true })
    
    if (answersError) {
      console.error('Error fetching quiz answers:', answersError)
      return
    }
    
    if (!allAnswers || allAnswers.length === 0) {
      console.log('No quiz answers with time data found.')
      return
    }
    
    // Analyze time patterns
    const times = allAnswers.map(a => a.time_spent)
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
    
    console.log(`📈 Time analysis (${times.length} records):`)
    console.log(`   Min: ${minTime}ms (${(minTime/1000).toFixed(1)}s)`)
    console.log(`   Max: ${maxTime}ms (${(maxTime/1000).toFixed(1)}s)`)
    console.log(`   Average: ${avgTime.toFixed(0)}ms (${(avgTime/1000).toFixed(1)}s)`)
    
    // All time values appear to be in milliseconds, so we need to convert to seconds for aggregation
    const totalTimeInSeconds = times.reduce((sum, t) => sum + (t / 1000), 0)
    
    console.log(`\n⏱️ Corrected total time: ${totalTimeInSeconds.toFixed(0)} seconds (${(totalTimeInSeconds/60).toFixed(1)} minutes)`)
    
    // Step 2: Recalculate user learning time statistics with correct units
    console.log('\n🔄 Recalculating user learning time statistics...')
    
    // Get all users with quiz answers
    const { data: userAnswers, error: userAnswersError } = await supabase
      .from('quiz_answers')
      .select(`
        quiz_session_id,
        time_spent,
        quiz_sessions!inner(user_id)
      `)
      .not('time_spent', 'is', null)
    
    if (userAnswersError) {
      console.error('Error fetching user answers:', userAnswersError)
      return
    }
    
    // Group by user and calculate corrected totals
    const userTimeMap = new Map<string, {
      totalTimeSeconds: number,
      quizTimeSeconds: number,
      sessionCount: number
    }>()
    
    userAnswers?.forEach(answer => {
      const userId = (answer.quiz_sessions as any).user_id
      const timeInSeconds = answer.time_spent / 1000 // Convert ms to seconds
      
      if (!userTimeMap.has(userId)) {
        userTimeMap.set(userId, {
          totalTimeSeconds: 0,
          quizTimeSeconds: 0,
          sessionCount: 0
        })
      }
      
      const userTime = userTimeMap.get(userId)!
      userTime.totalTimeSeconds += timeInSeconds
      userTime.quizTimeSeconds += timeInSeconds
    })
    
    // Get session counts for each user
    const { data: sessionCounts, error: sessionError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, quiz_sessions_completed, course_sessions_completed')
    
    if (sessionError) {
      console.error('Error fetching session counts:', sessionError)
      return
    }
    
    // Update user statistics
    console.log('\n📝 Updating user learning time statistics...')
    
    const updates = []
    for (const [userId, timeData] of userTimeMap) {
      const userStats = sessionCounts?.find(s => s.user_id === userId)
      if (!userStats) continue
      
      const totalSessions = userStats.quiz_sessions_completed + userStats.course_sessions_completed
      const avgSessionTimeMinutes = totalSessions > 0 ? timeData.totalTimeSeconds / totalSessions / 60 : 0
      
      console.log(`👤 User ${userId.substring(0, 8)}...: ${timeData.totalTimeSeconds.toFixed(0)}s total, ${totalSessions} sessions, avg ${avgSessionTimeMinutes.toFixed(1)}min`)
      
      updates.push({
        user_id: userId,
        total_learning_time_seconds: Math.round(timeData.totalTimeSeconds),
        quiz_learning_time_seconds: Math.round(timeData.quizTimeSeconds),
        course_learning_time_seconds: 0 // No course time data available yet
      })
    }
    
    // Batch update user_xp_stats_v2
    if (updates.length > 0) {
      console.log(`\n🚀 Updating ${updates.length} user records...`)
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('user_xp_stats_v2')
          .update({
            total_learning_time_seconds: update.total_learning_time_seconds,
            quiz_learning_time_seconds: update.quiz_learning_time_seconds,
            course_learning_time_seconds: update.course_learning_time_seconds
          })
          .eq('user_id', update.user_id)
        
        if (updateError) {
          console.error(`Error updating user ${update.user_id}:`, updateError)
        } else {
          console.log(`✅ Updated user ${update.user_id.substring(0, 8)}...`)
        }
      }
    }
    
    // Step 3: Update daily_xp_records with corrected time data
    console.log('\n📅 Updating daily XP records...')
    
    const { data: dailyAnswers, error: dailyError } = await supabase
      .from('quiz_answers')
      .select(`
        time_spent,
        created_at,
        quiz_sessions!inner(user_id)
      `)
      .not('time_spent', 'is', null)
    
    if (dailyError) {
      console.error('Error fetching daily answers:', dailyError)
      return
    }
    
    // Group by user and date
    const dailyTimeMap = new Map<string, number>() // key: userId_date, value: totalTimeSeconds
    
    dailyAnswers?.forEach(answer => {
      const userId = (answer.quiz_sessions as any).user_id
      const date = new Date(answer.created_at).toISOString().split('T')[0]
      const key = `${userId}_${date}`
      const timeInSeconds = answer.time_spent / 1000
      
      dailyTimeMap.set(key, (dailyTimeMap.get(key) || 0) + timeInSeconds)
    })
    
    // Update daily records
    for (const [key, totalTime] of dailyTimeMap) {
      const [userId, date] = key.split('_')
      
      const { error: dailyUpdateError } = await supabase
        .from('daily_xp_records')
        .update({ total_time_seconds: Math.round(totalTime) })
        .eq('user_id', userId)
        .eq('date', date)
      
      if (dailyUpdateError) {
        console.error(`Error updating daily record ${key}:`, dailyUpdateError)
      }
    }
    
    console.log(`✅ Updated ${dailyTimeMap.size} daily records`)
    
    console.log('\n🎉 Time unit conversion fix completed!')
    console.log('📊 All time data is now correctly stored in seconds for aggregation.')
    
  } catch (error) {
    console.error('Fix process error:', error)
  }
}

fixTimeUnitConversion()