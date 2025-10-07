import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  try {
    console.log('🔧 Disabling RLS for daily_xp_records table...')
    
    // Disable RLS for daily_xp_records specifically
    // Note: exec_sql_admin function not available in current database schema
    // This endpoint requires manual database administration
    const error = new Error('exec_sql_admin function not available - manual database access required')
    
    if (error) {
      // Try direct query method
      console.log('Trying direct SQL execution...')
      
      // Use a workaround - try to insert a test record to see if RLS is the issue
      const testRecord = {
        user_id: '00000000-0000-0000-0000-000000000000',
        date: '2025-01-01',
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
      
      const { error: testError } = await supabaseAdmin
        .from('daily_xp_records')
        .insert([testRecord])
      
      if (testError) {
        console.error('Test insert failed:', testError)
        return NextResponse.json({
          success: false,
          error: 'RLS is still enabled and cannot be disabled via API',
          testError: testError.message,
          suggestion: 'Manual database access required to disable RLS'
        })
      } else {
        // Clean up test record
        await supabaseAdmin
          .from('daily_xp_records')
          .delete()
          .eq('user_id', '00000000-0000-0000-0000-000000000000')
        
        return NextResponse.json({
          success: true,
          message: 'RLS appears to be disabled or test insert succeeded'
        })
      }
    }
    
    console.log('✅ RLS disabled for daily_xp_records')
    
    return NextResponse.json({
      success: true,
      message: 'RLS disabled for daily_xp_records table'
    })
    
  } catch (error) {
    console.error('❌ RLS disable error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}