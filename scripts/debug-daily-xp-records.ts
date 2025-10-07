// Debug daily_xp_records table access and data
import { supabaseAdmin } from '../lib/supabase-admin.js'

async function debugDailyXPRecords() {
  console.log('🔍 Debugging daily_xp_records table...')
  
  const userId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
  
  try {
    // 1. Check if table exists and basic access
    console.log('📋 Testing basic table access...')
    const { data: tableTest, error: tableError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('id')
      .limit(1)
    
    console.log('Table access test:', { data: tableTest, error: tableError })
    
    // 2. Check user's records
    console.log('👤 Checking user records...')
    const { data: userRecords, error: userError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    console.log('User records:', { count: userRecords?.length || 0, error: userError })
    if (userRecords && userRecords.length > 0) {
      console.log('Sample records:', userRecords.slice(0, 3))
    }
    
    // 3. Check all records count
    console.log('📊 Checking total records...')
    const { data: allRecords, error: allError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('user_id, date')
      .order('date', { ascending: false })
      .limit(10)
    
    console.log('All records:', { count: allRecords?.length || 0, error: allError })
    if (allRecords && allRecords.length > 0) {
      console.log('Sample all records:', allRecords)
    }
    
    // 4. Check quiz_sessions for this user to see if they should have daily records
    console.log('🎯 Checking quiz sessions...')
    const { data: quizSessions, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id, created_at, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('Quiz sessions:', { count: quizSessions?.length || 0, error: quizError })
    if (quizSessions && quizSessions.length > 0) {
      console.log('Recent sessions:', quizSessions.map(s => ({
        id: s.id.substring(0, 8),
        date: s.created_at?.split('T')[0]
      })))
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugDailyXPRecords()