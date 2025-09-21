import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Checking users table status...')
    
    // Check if users table exists and is accessible
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ Users table error:', error)
      
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({
          exists: false,
          error: 'Users table does not exist',
          code: error.code,
          message: error.message,
          recommendation: 'Run the SQL script in database/create_users_table.sql'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        exists: false,
        error: 'Users table access error',
        code: error.code,
        message: error.message
      }, { status: 500 })
    }
    
    // Try to get a count of users
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    console.log('✅ Users table exists and is accessible')
    
    return NextResponse.json({
      exists: true,
      accessible: true,
      userCount: count || 0,
      message: 'Users table is working correctly'
    })
    
  } catch (error) {
    console.error('❌ Database debug error:', error)
    return NextResponse.json({
      exists: false,
      error: 'Database connection error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}