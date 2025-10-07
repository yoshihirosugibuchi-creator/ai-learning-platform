import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Checking RLS status for key tables...')
    
    // Check RLS status for key tables
    // exec_sql function not available in current database schema
    const rlsStatus = null
    const error = new Error('exec_sql function not available - using fallback method')
    
    if (error) {
      // Fallback query method - test table access directly
      const tableTests = []
      
      try {
        const { data: dailyXpTest } = await supabaseAdmin
          .from('daily_xp_records')
          .select('id')
          .limit(1)
        tableTests.push({ table: 'daily_xp_records', accessible: true, count: dailyXpTest?.length || 0 })
      } catch {
        tableTests.push({ table: 'daily_xp_records', accessible: false, count: 0 })
      }
      
      return NextResponse.json({
        method: 'fallback',
        error: error.message,
        tableTests
      })
    }
    
    console.log('📊 RLS Status:', rlsStatus)
    
    return NextResponse.json({
      success: true,
      rlsStatus: rlsStatus || [],
      summary: {
        enabled: 0, // exec_sql function not available
        disabled: 0 // exec_sql function not available  
      }
    })
    
  } catch (error) {
    console.error('❌ RLS check error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}