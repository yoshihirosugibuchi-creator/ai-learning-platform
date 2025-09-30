import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function finalDataIntegrityCheck() {
  console.log('🔍 Final Data Integrity Check')
  console.log('='.repeat(50))
  
  try {
    // 1. Check time data consistency
    console.log('\n⏱️ Time Data Consistency Check:')
    
    const { data: userStats } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, total_learning_time_seconds, quiz_learning_time_seconds, quiz_sessions_completed, course_sessions_completed')
      .not('total_learning_time_seconds', 'is', null)
      .order('total_learning_time_seconds', { ascending: false })
    
    userStats?.forEach((stat, index) => {
      const totalSessions = stat.quiz_sessions_completed + stat.course_sessions_completed
      const avgSessionTimeMinutes = totalSessions > 0 ? (stat.total_learning_time_seconds / totalSessions / 60).toFixed(1) : '0'
      
      console.log(`${index + 1}. User ${stat.user_id.substring(0, 8)}...`)
      console.log(`   Total time: ${stat.total_learning_time_seconds}s (${(stat.total_learning_time_seconds/60).toFixed(1)}min)`)
      console.log(`   Sessions: ${totalSessions}, Average: ${avgSessionTimeMinutes}min/session`)
      
      // Check for reasonable values
      const avgSessionMinutes = parseFloat(avgSessionTimeMinutes)
      if (avgSessionMinutes > 30) {
        console.log(`   ⚠️  WARNING: Average session time seems high (${avgSessionMinutes}min)`)
      } else if (avgSessionMinutes < 0.1 && totalSessions > 0) {
        console.log(`   ⚠️  WARNING: Average session time seems low (${avgSessionMinutes}min)`)
      } else {
        console.log(`   ✅ Session time looks reasonable`)
      }
    })
    
    // 2. Check category/subcategory data consistency
    console.log('\n📊 Category/Subcategory Data Consistency:')
    
    const { data: categories } = await supabase
      .from('user_category_xp_stats_v2')
      .select('category_id, total_xp, quiz_sessions_completed, course_sessions_completed')
      .gt('total_xp', 0)
      .order('total_xp', { ascending: false })
      .limit(5)
    
    categories?.forEach((cat, index) => {
      console.log(`${index + 1}. Category ${cat.category_id}: ${cat.total_xp} XP, ${cat.quiz_sessions_completed + cat.course_sessions_completed} sessions`)
    })
    
    const { data: subcategories } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .select('category_id, subcategory_id, total_xp, quiz_sessions_completed, course_sessions_completed')
      .gt('total_xp', 0)
      .order('total_xp', { ascending: false })
      .limit(5)
    
    subcategories?.forEach((sub, index) => {
      console.log(`${index + 1}. Subcategory ${sub.category_id}:${sub.subcategory_id}: ${sub.total_xp} XP, ${sub.quiz_sessions_completed + sub.course_sessions_completed} sessions`)
    })
    
    // 3. Check recent activity data
    console.log('\n📅 Recent Activity Data:')
    
    const { data: recentActivity } = await supabase
      .from('daily_xp_records')
      .select('user_id, date, total_xp_earned, quiz_sessions, course_sessions, total_time_seconds')
      .order('date', { ascending: false })
      .limit(7)
    
    recentActivity?.forEach((activity, index) => {
      const totalSessions = (activity.quiz_sessions || 0) + (activity.course_sessions || 0)
      const avgTime = totalSessions > 0 ? ((activity.total_time_seconds || 0) / totalSessions / 60).toFixed(1) : '0'
      
      console.log(`${index + 1}. ${activity.date} - User ${activity.user_id.substring(0, 8)}...`)
      console.log(`   XP: ${activity.total_xp_earned}, Sessions: ${totalSessions}, Avg: ${avgTime}min/session`)
    })
    
    // 4. Check XP Stats API response format
    console.log('\n🔌 XP Stats API Response Check:')
    
    // Simulate API call by getting user stats directly
    const testUserId = userStats?.[0]?.user_id
    if (testUserId) {
      const { data: apiUserStats } = await supabase
        .from('user_xp_stats_v2')
        .select('*')
        .eq('user_id', testUserId)
        .single()
      
      if (apiUserStats) {
        console.log('✅ Learning time fields present in user stats:')
        console.log(`   total_learning_time_seconds: ${apiUserStats.total_learning_time_seconds}`)
        console.log(`   quiz_learning_time_seconds: ${apiUserStats.quiz_learning_time_seconds}`)
        console.log(`   course_learning_time_seconds: ${apiUserStats.course_learning_time_seconds}`)
        
        // Verify the fields exist and have reasonable values
        if (apiUserStats.total_learning_time_seconds !== null && 
            apiUserStats.quiz_learning_time_seconds !== null && 
            apiUserStats.course_learning_time_seconds !== null) {
          console.log('✅ All learning time fields are properly initialized')
        } else {
          console.log('⚠️  Some learning time fields are null')
        }
      }
    }
    
    // 5. Check analytics calculation accuracy
    console.log('\n🧮 Analytics Calculation Accuracy:')
    
    // Manually calculate average session time for verification
    if (userStats && userStats.length > 0) {
      const mainUser = userStats[0]
      const totalSessions = mainUser.quiz_sessions_completed + mainUser.course_sessions_completed
      const totalTimeSeconds = mainUser.total_learning_time_seconds
      const calculatedAverage = totalSessions > 0 ? totalTimeSeconds / totalSessions / 60 : 0
      
      console.log(`Manual calculation for User ${mainUser.user_id.substring(0, 8)}...`)
      console.log(`   ${totalTimeSeconds} seconds ÷ ${totalSessions} sessions ÷ 60 = ${calculatedAverage.toFixed(1)} minutes`)
      console.log(`   This should match the frontend display`)
    }
    
    // 6. Final summary
    console.log('\n📋 Final Integrity Summary:')
    
    const totalUsers = userStats?.length || 0
    const usersWithReasonableTime = userStats?.filter(stat => {
      const totalSessions = stat.quiz_sessions_completed + stat.course_sessions_completed
      if (totalSessions === 0) return true // No sessions is reasonable
      const avgMinutes = stat.total_learning_time_seconds / totalSessions / 60
      return avgMinutes >= 0.1 && avgMinutes <= 30 // Reasonable range: 6 seconds to 30 minutes
    }).length || 0
    
    console.log(`✅ Total users with learning time data: ${totalUsers}`)
    console.log(`✅ Users with reasonable session times: ${usersWithReasonableTime}/${totalUsers}`)
    
    if (usersWithReasonableTime === totalUsers) {
      console.log('🎉 All user time data is within reasonable ranges!')
    } else {
      console.log(`⚠️  ${totalUsers - usersWithReasonableTime} users have potentially problematic time data`)
    }
    
    console.log('\n✅ Data integrity check completed!')
    
  } catch (error) {
    console.error('❌ Data integrity check error:', error)
  }
}

finalDataIntegrityCheck()