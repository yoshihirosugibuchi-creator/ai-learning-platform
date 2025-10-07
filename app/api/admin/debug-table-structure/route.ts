import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 user_xp_stats_v2テーブル構造を調査中...')
    
    // テーブル構造確認のための情報スキーマクエリ
    const { data: tableInfo, error: tableError } = await (supabaseAdmin as any)
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'user_xp_stats_v2')
      .eq('table_schema', 'public')
    
    if (tableError) {
      console.error('❌ テーブル情報取得エラー:', tableError)
    }
    
    // テーブルの実際のレコード確認
    const { data: sampleRecords, error: recordError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('*')
      .limit(1)
    
    if (recordError) {
      console.error('❌ レコード取得エラー:', recordError)
    }
    
    // テーブルのプライマリキー確認
    const { data: constraintInfo, error: constraintError } = await (supabaseAdmin as any)
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'user_xp_stats_v2')
      .eq('table_schema', 'public')
    
    if (constraintError) {
      console.error('❌ 制約情報取得エラー:', constraintError)
    }
    
    const analysis = {
      tableStructure: tableInfo || [],
      sampleRecord: sampleRecords?.[0] || null,
      constraints: constraintInfo || [],
      tableError: tableError?.message || null,
      recordError: recordError?.message || null,
      constraintError: constraintError?.message || null
    }
    
    console.log('📊 テーブル分析結果:', analysis)
    
    return NextResponse.json({
      success: true,
      analysis
    })
    
  } catch (error) {
    console.error('❌ 調査エラー:', error)
    return NextResponse.json(
      { error: 'Investigation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}