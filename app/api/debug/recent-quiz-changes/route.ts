import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Analyzing recent quiz_questions changes...')
    
    // 最近更新されたレコードを確認
    const { data: recentUpdates, error: updateError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20)
    
    if (updateError) {
      console.error('❌ Recent updates query error:', updateError)
    }
    
    // id=1,2のレコードを詳しく確認
    const { data: specificRecords, error: specificError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question, created_at, updated_at')
      .in('legacy_id', [1, 2])
      .order('legacy_id')
    
    if (specificError) {
      console.error('❌ Specific records query error:', specificError)
    }
    
    // 同じ時刻に更新されたレコードを確認（一括更新の証拠）
    const recentTimestamps = recentUpdates?.map(r => r.updated_at).slice(0, 5) || []
    const batchUpdateAnalysis = []
    
    for (const timestamp of recentTimestamps) {
      const { data: batchRecords, error: batchError } = await supabaseAdmin
        .from('quiz_questions')
        .select('id, legacy_id, question')
        .eq('updated_at', timestamp || '')
        .order('legacy_id')
        .limit(10)
      
      if (!batchError && batchRecords && batchRecords.length > 1) {
        batchUpdateAnalysis.push({
          timestamp,
          recordCount: batchRecords.length,
          records: batchRecords
        })
      }
    }
    
    // 最新の問題をチェック（id=1,2の内容確認）
    const id1Record = specificRecords?.find(r => r.legacy_id === 1)
    const id2Record = specificRecords?.find(r => r.legacy_id === 2)
    
    console.log('✅ Recent quiz questions changes analysis completed')
    
    return NextResponse.json({
      analysis: {
        totalRecentUpdates: recentUpdates?.length || 0,
        latestUpdateTime: recentUpdates?.[0]?.updated_at || null,
        batchUpdatesDetected: batchUpdateAnalysis.length
      },
      currentState: {
        legacy_id_1: id1Record ? {
          id: id1Record.id,
          legacy_id: id1Record.legacy_id,
          question: id1Record.question.substring(0, 50) + '...',
          updated_at: id1Record.updated_at
        } : null,
        legacy_id_2: id2Record ? {
          id: id2Record.id,
          legacy_id: id2Record.legacy_id,
          question: id2Record.question.substring(0, 50) + '...',
          updated_at: id2Record.updated_at
        } : null
      },
      recentUpdates: recentUpdates?.slice(0, 10).map(r => ({
        id: r.id,
        legacy_id: r.legacy_id,
        question: r.question.substring(0, 30) + '...',
        updated_at: r.updated_at
      })) || [],
      batchUpdateAnalysis: batchUpdateAnalysis.slice(0, 3),
      evidence: {
        sameUpdateTime: batchUpdateAnalysis.length > 0 ? 'YES - Batch operation detected' : 'NO - Individual updates',
        updatePattern: (recentUpdates?.length || 0) > 0 ? 'Recent activity detected' : 'No recent updates'
      }
    })
    
  } catch (error) {
    console.error('❌ Recent quiz changes analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}