import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Detailed quiz_questions ID analysis...')
    
    // 全レコードのid, legacy_idのペアを確認
    const { data: allRecords, error: allError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question, created_at, updated_at')
      .order('id', { ascending: true })
    
    if (allError) {
      console.error('❌ All records query error:', allError)
      return NextResponse.json({ error: 'Query failed', details: allError.message }, { status: 500 })
    }
    
    // IDパターン分析
    const patterns = {
      matching: 0,          // id == legacy_id
      idGreater: 0,         // id > legacy_id
      legacyGreater: 0,     // legacy_id > id
      mismatches: [] as Array<{id: number, legacy_id: number, difference: number}>
    }
    
    const idGaps: Array<{from: number, to: number, gap: number}> = []
    const legacyIdGaps: Array<{from: number, to: number, gap: number}> = []
    let prevId = 0
    let prevLegacyId = 0
    
    allRecords?.forEach((record, index) => {
      const { id, legacy_id } = record
      
      // パターン分析
      if (id === legacy_id) {
        patterns.matching++
      } else if (id > legacy_id) {
        patterns.idGreater++
        patterns.mismatches.push({ id, legacy_id, difference: id - legacy_id })
      } else {
        patterns.legacyGreater++
        patterns.mismatches.push({ id, legacy_id, difference: id - legacy_id })
      }
      
      // ギャップ分析
      if (index > 0) {
        if (id !== prevId + 1) {
          idGaps.push({ from: prevId, to: id, gap: id - prevId - 1 })
        }
        if (legacy_id !== prevLegacyId + 1) {
          legacyIdGaps.push({ from: prevLegacyId, to: legacy_id, gap: legacy_id - prevLegacyId - 1 })
        }
      }
      
      prevId = id
      prevLegacyId = legacy_id
    })
    
    // 統計情報
    const stats = {
      totalRecords: allRecords?.length || 0,
      idRange: {
        min: allRecords?.[0]?.id || 0,
        max: allRecords?.[allRecords.length - 1]?.id || 0
      },
      legacyIdRange: {
        min: Math.min(...(allRecords?.map(r => r.legacy_id) || [0])),
        max: Math.max(...(allRecords?.map(r => r.legacy_id) || [0]))
      }
    }
    
    // サンプルデータ
    const samples = {
      first10: allRecords?.slice(0, 10) || [],
      last10: allRecords?.slice(-10) || [],
      mismatches: patterns.mismatches.slice(0, 20), // 最初の20件の不一致
      significantGaps: idGaps.filter(gap => gap.gap > 1).slice(0, 10)
    }
    
    console.log('✅ Detailed quiz questions ID analysis completed')
    
    return NextResponse.json({
      summary: {
        ...stats,
        patterns: {
          matching: patterns.matching,
          idGreater: patterns.idGreater,
          legacyGreater: patterns.legacyGreater,
          totalMismatches: patterns.mismatches.length
        }
      },
      analysis: {
        idGaps: idGaps.length,
        legacyIdGaps: legacyIdGaps.length,
        isIdSequential: idGaps.length === 0,
        isLegacyIdSequential: legacyIdGaps.length === 0
      },
      samples,
      gapDetails: {
        idGaps: idGaps.slice(0, 10),
        legacyIdGaps: legacyIdGaps.slice(0, 10)
      }
    })
    
  } catch (error) {
    console.error('❌ Detailed quiz questions ID analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}