import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  try {
    console.log('🚀 Starting daily_xp_records migration...')
    
    // 1. Get all quiz sessions with their details
    const { data: quizSessions, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('user_id, created_at, total_xp, bonus_xp')
      .order('created_at', { ascending: true })
    
    if (quizError) {
      throw new Error(`Failed to fetch quiz sessions: ${quizError.message}`)
    }
    
    console.log(`📊 Found ${quizSessions?.length || 0} quiz sessions to process`)
    
    // 2. Get all course completions
    const { data: courseCompletions, error: courseError } = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id, created_at')
      .order('created_at', { ascending: true })
    
    if (courseError) {
      console.warn('⚠️ Failed to fetch course completions:', courseError.message)
    }
    
    console.log(`📚 Found ${courseCompletions?.length || 0} course completions to process`)
    
    // 3. Group data by user and date
    const dailyData: Record<string, Record<string, {
      quiz_sessions: number
      course_sessions: number
      quiz_xp_earned: number
      course_xp_earned: number
      total_xp_earned: number
      bonus_xp_earned: number
      quiz_time_seconds: number
      course_time_seconds: number
      total_time_seconds: number
    }>> = {}
    
    // Process quiz sessions
    for (const session of quizSessions || []) {
      const userId = session.user_id
      const date = session.created_at?.split('T')[0]
      
      if (!userId || !date) continue
      
      if (!dailyData[userId]) {
        dailyData[userId] = {}
      }
      
      if (!dailyData[userId][date]) {
        dailyData[userId][date] = {
          quiz_sessions: 0,
          course_sessions: 0,
          quiz_xp_earned: 0,
          course_xp_earned: 0,
          total_xp_earned: 0,
          bonus_xp_earned: 0,
          quiz_time_seconds: 0,
          course_time_seconds: 0,
          total_time_seconds: 0
        }
      }
      
      const dayRecord = dailyData[userId][date]
      dayRecord.quiz_sessions += 1
      dayRecord.quiz_xp_earned += session.total_xp || 0
      dayRecord.bonus_xp_earned += session.bonus_xp || 0
      dayRecord.total_xp_earned += session.total_xp || 0
      dayRecord.quiz_time_seconds += 15 * 60 // Estimate 15 minutes per quiz
      dayRecord.total_time_seconds += 15 * 60
    }
    
    // Process course completions
    for (const completion of courseCompletions || []) {
      const userId = completion.user_id
      const date = completion.created_at?.split('T')[0]
      
      if (!userId || !date) continue
      
      if (!dailyData[userId]) {
        dailyData[userId] = {}
      }
      
      if (!dailyData[userId][date]) {
        dailyData[userId][date] = {
          quiz_sessions: 0,
          course_sessions: 0,
          quiz_xp_earned: 0,
          course_xp_earned: 0,
          total_xp_earned: 0,
          bonus_xp_earned: 0,
          quiz_time_seconds: 0,
          course_time_seconds: 0,
          total_time_seconds: 0
        }
      }
      
      const dayRecord = dailyData[userId][date]
      dayRecord.course_sessions += 1
      dayRecord.course_xp_earned += 15 // Estimate 15 XP per course completion
      dayRecord.total_xp_earned += 15
      dayRecord.course_time_seconds += 10 * 60 // Estimate 10 minutes per course
      dayRecord.total_time_seconds += 10 * 60
    }
    
    // 4. Create daily_xp_records entries
    const recordsToInsert = []
    let totalRecords = 0
    
    for (const userId in dailyData) {
      for (const date in dailyData[userId]) {
        const record = dailyData[userId][date]
        
        recordsToInsert.push({
          user_id: userId,
          date: date,
          quiz_sessions: record.quiz_sessions,
          course_sessions: record.course_sessions,
          quiz_xp_earned: record.quiz_xp_earned,
          course_xp_earned: record.course_xp_earned,
          total_xp_earned: record.total_xp_earned,
          bonus_xp_earned: record.bonus_xp_earned,
          quiz_time_seconds: record.quiz_time_seconds,
          course_time_seconds: record.course_time_seconds,
          total_time_seconds: record.total_time_seconds
        })
        
        totalRecords++
      }
    }
    
    console.log(`📝 Prepared ${totalRecords} daily records to insert`)
    
    // 5. Insert records in batches
    const batchSize = 100
    const batches = Math.ceil(recordsToInsert.length / batchSize)
    let insertedCount = 0
    
    for (let i = 0; i < batches; i++) {
      const batch = recordsToInsert.slice(i * batchSize, (i + 1) * batchSize)
      
      const { error: insertError } = await supabaseAdmin
        .from('daily_xp_records')
        .insert(batch)
      
      if (insertError) {
        console.error(`❌ Batch ${i + 1} insert error:`, insertError)
        // Continue with other batches
      } else {
        insertedCount += batch.length
        console.log(`✅ Batch ${i + 1}/${batches} inserted successfully (${batch.length} records)`)
      }
    }
    
    // 6. Verify the results
    const { data: verifyData, error: _verifyError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('user_id, date')
      .order('date', { ascending: false })
      .limit(10)
    
    const { data: totalCount, error: _countError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('id', { count: 'exact' })
    
    console.log('✅ Migration completed successfully!')
    console.log(`📊 Total records inserted: ${insertedCount}`)
    console.log(`📊 Total records in table: ${totalCount?.length || 'unknown'}`)
    
    return NextResponse.json({
      success: true,
      summary: {
        quizSessionsProcessed: quizSessions?.length || 0,
        courseCompletionsProcessed: courseCompletions?.length || 0,
        dailyRecordsCreated: insertedCount,
        totalRecordsInTable: totalCount?.length || 0
      },
      recentRecords: verifyData || []
    })
    
  } catch (error) {
    console.error('❌ Daily XP records migration error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}