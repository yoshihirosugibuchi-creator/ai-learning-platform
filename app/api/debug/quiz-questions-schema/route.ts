import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Analyzing quiz_questions table schema...')
    
    // テーブル定義の確認 - 直接quiz_questionsテーブルから構造を推定
    const { data: sampleRecord, error: sampleError } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .limit(1)
      .single()
    
    let tableStructure = null
    if (!sampleError && sampleRecord) {
      tableStructure = Object.entries(sampleRecord).map(([key, value]) => ({
        column_name: key,
        sample_value: value,
        type: typeof value
      }))
    }
    
    // 実際のidの値を確認
    const { data: idSamples, error: idSampleError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question')
      .order('id', { ascending: true })
      .limit(10)
    
    if (idSampleError) {
      console.error('❌ Sample data query error:', idSampleError)
    }
    
    // idの最大値と最小値を確認 - 集計クエリで代替
    const { data: idStats, error: statsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    // RPC関数が存在しない場合の代替手段
    let minMaxIds = null
    if (statsError) {
      const { data: minMaxData, error: minMaxError } = await supabaseAdmin
        .from('quiz_questions')
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
      
      const { data: maxData, error: maxError } = await supabaseAdmin
        .from('quiz_questions')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
      
      if (!minMaxError && !maxError && minMaxData && maxData) {
        minMaxIds = {
          min_id: minMaxData[0]?.id,
          max_id: maxData[0]?.id
        }
      }
    }
    
    console.log('✅ Quiz questions schema analysis completed')
    
    return NextResponse.json({
      schema: {
        tableStructure: tableStructure || [],
        sampleRecord: sampleRecord || null
      },
      idAnalysis: {
        samples: idSamples || [],
        stats: idStats || minMaxIds,
        totalRecords: idSamples?.length || 0
      },
      patterns: {
        idSequence: idSamples?.map(item => item.id) || [],
        legacyIdSequence: idSamples?.map(item => item.legacy_id) || [],
        comparison: idSamples?.map(item => ({
          id: item.id,
          legacy_id: item.legacy_id,
          difference: item.id - item.legacy_id
        })) || []
      }
    })
    
  } catch (error) {
    console.error('❌ Quiz questions schema analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}