import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Analyzing PostgreSQL sequence state...')
    
    // 実際のID範囲を確認してシーケンス状態を推定
    const { data: maxRecord, error: maxError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    const { data: minRecord, error: minError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .order('id', { ascending: true })
      .limit(1)
      .single()
    
    // シーケンス推定値
    let sequenceEstimation = null
    if (!maxError && maxRecord) {
      sequenceEstimation = {
        estimated_current_value: maxRecord.id,
        next_value_will_be: maxRecord.id + 1,
        min_id: minRecord?.id || null,
        max_id: maxRecord.id
      }
    }
    
    // 最近追加されたレコードを確認（created_at順）
    const { data: recentRecords, error: recentError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentError) {
      console.error('❌ Recent records query error:', recentError)
    }
    
    // IDの分布を確認
    const { data: idDistribution, error: distError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .order('id')
    
    const gaps: Array<{ from: number; to: number; gap: number }> = []
    if (idDistribution && !distError) {
      for (let i = 1; i < idDistribution.length; i++) {
        const prev = idDistribution[i-1].id
        const current = idDistribution[i].id
        if (current - prev > 1) {
          gaps.push({ from: prev, to: current, gap: current - prev - 1 })
        }
      }
    }
    
    // 次に挿入される予想ID（テスト用）
    const predictedNextId = (maxRecord?.id || 0) + 1
    
    console.log('✅ Sequence analysis completed')
    
    return NextResponse.json({
      sequence: {
        name: 'quiz_questions_id_seq',
        estimation: sequenceEstimation,
        analysisMethod: 'Table-based estimation'
      },
      table: {
        maxId: maxRecord?.id || 0,
        minId: minRecord?.id || 0,
        totalRecords: recentRecords?.length || 0,
        predictedNextAutoId: predictedNextId
      },
      recentActivity: {
        lastInserted: recentRecords?.[0] || null,
        recent10: recentRecords || [],
        hasRecent: (recentRecords?.length || 0) > 0
      },
      analysis: {
        sequenceEstimated: sequenceEstimation !== null,
        analysisComplete: !maxError && !minError && !recentError,
        note: 'Analysis based on table data due to sequence access limitations'
      }
    })
    
  } catch (error) {
    console.error('❌ Sequence analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}