import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Environment check:', {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV
    })

    // テーブル存在確認
    const { data, error } = await supabaseAdmin
      .from('daily_analytics_batch_log')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Supabase query error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }

    return NextResponse.json({
      success: true,
      message: 'daily_analytics_batch_log table accessible',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      data
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}