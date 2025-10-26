import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Environment check:', {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'NONE',
      nodeEnv: process.env.NODE_ENV
    })

    // supabase-adminの実際のインポートテスト
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    
    // 簡単なクエリテスト
    const { data, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Supabase admin query error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      })
    }

    return NextResponse.json({
      success: true,
      message: 'supabaseAdmin works correctly',
      serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      queryResult: data
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}