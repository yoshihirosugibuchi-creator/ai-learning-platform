import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 CSV Import Process Simulation...')
    
    // 現在のデータベースの状態を確認
    const { data: currentData, error: currentError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question')
      .order('id')
      .limit(10)
    
    if (currentError) {
      console.error('❌ Current data query error:', currentError)
      return NextResponse.json({ error: 'Query failed', details: currentError.message }, { status: 500 })
    }
    
    // 現在のCSV取込処理をシミュレート
    console.log('📋 Current CSV import process simulation:')
    
    // Step 1: 全データ削除のシミュレーション
    console.log('Step 1: 全データ削除 (DELETE * FROM quiz_questions)')
    
    // Step 2: CSVデータからの挿入シミュレーション
    const csvSimulationData = [
      { csv_id: 20, question: '問題B（元legacy_id=10）' },
      { csv_id: 10, question: '問題A（元legacy_id=20）' },
      { csv_id: 30, question: '問題C（変更なし）' },
      { csv_id: 40, question: '新問題D' }
    ]
    
    console.log('Step 2: CSV데이터 삽입')
    
    // 挿入後の結果をシミュレート（SERIAL自動採番）
    const simulatedResults = csvSimulationData.map((csvRow, index) => {
      // 現在の最大ID（591）から続きで採番される
      const newId = 592 + index
      
      return {
        id: newId,
        legacy_id: csvRow.csv_id,
        question: csvRow.question,
        operation: 'INSERT'
      }
    })
    
    // 元のデータとの対応関係を分析
    const originalMapping = currentData?.slice(0, 3).map(original => {
      const csvMatch = csvSimulationData.find(csv => csv.csv_id === original.legacy_id)
      const newRecord = simulatedResults.find(sim => sim.legacy_id === original.legacy_id)
      
      return {
        original: {
          id: original.id,
          legacy_id: original.legacy_id,
          question: original.question
        },
        csv_found: !!csvMatch,
        after_import: newRecord ? {
          id: newRecord.id,
          legacy_id: newRecord.legacy_id,
          question: newRecord.question
        } : null,
        id_changed: newRecord ? original.id !== newRecord.id : true,
        legacy_id_preserved: newRecord ? original.legacy_id === newRecord.legacy_id : false
      }
    })
    
    // IDスワップの例を作成
    const idSwapExample = {
      before: [
        { id: 1, legacy_id: 10, question: '問題A' },
        { id: 2, legacy_id: 20, question: '問題B' }
      ],
      csv_edit: [
        { csv_id: 20, question: '問題B' },  // 元legacy_id=10を20に変更
        { csv_id: 10, question: '問題A' }   // 元legacy_id=20を10に変更
      ],
      after_import: [
        { id: 592, legacy_id: 20, question: '問題B' },  // 新しいID、新しいlegacy_id
        { id: 593, legacy_id: 10, question: '問題A' }   // 新しいID、新しいlegacy_id
      ],
      impact: {
        id_changes: 'ALL IDs change (SERIAL auto-increment)',
        legacy_id_changes: 'legacy_id follows CSV',
        quiz_answers_impact: 'BROKEN - quiz_answers still reference old legacy_ids'
      }
    }
    
    console.log('✅ CSV import simulation completed')
    
    return NextResponse.json({
      current_process: {
        method: 'DELETE ALL + INSERT',
        id_assignment: 'SERIAL auto-increment (continues from max)',
        legacy_id_assignment: 'From CSV id column'
      },
      simulation: {
        current_data: currentData?.slice(0, 3) || [],
        csv_simulation: csvSimulationData,
        simulated_results: simulatedResults,
        original_mapping: originalMapping
      },
      id_swap_example: idSwapExample,
      critical_issues: {
        id_stability: 'IDs are NOT stable - always change on import',
        legacy_id_flexibility: 'legacy_id follows CSV completely',
        data_integrity: 'quiz_answers become orphaned',
        recommended_solution: 'Use UPSERT with legacy_id as key instead of DELETE+INSERT'
      }
    })
    
  } catch (error) {
    console.error('❌ CSV import simulation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}