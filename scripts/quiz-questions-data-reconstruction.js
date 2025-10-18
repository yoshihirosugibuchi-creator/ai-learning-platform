#!/usr/bin/env node

/**
 * Quiz Questions Data Reconstruction Script
 * Safely reconstructs quiz_questions table with clean ID numbering
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function reconstructQuizQuestionsData() {
  console.log('🚀 Quiz Questions データ再構築開始')
  console.log('=====================================\n')

  try {
    // Step 1: Create backup table with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupTableName = `quiz_questions_backup_${timestamp.substring(0, 19)}`
    
    console.log('📦 Step 1: バックアップテーブル作成')
    
    // Note: Supabase doesn't support CREATE TABLE AS SELECT via client
    // So we'll backup data programmatically
    const { data: originalData, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('id')

    if (fetchError) throw fetchError
    
    console.log(`   取得データ: ${originalData.length}件`)
    
    // Save backup to file as well
    const fs = require('fs')
    const path = require('path')
    const backupDir = path.join(process.cwd(), 'database', 'backup')
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    const backupFilePath = path.join(backupDir, `quiz_questions_full_backup_${timestamp.substring(0, 19)}.json`)
    fs.writeFileSync(backupFilePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalRecords: originalData.length,
      data: originalData
    }, null, 2))
    
    console.log(`   ✅ バックアップファイル作成: ${path.basename(backupFilePath)}`)

    // Step 2: Extract active data (is_deleted = false)
    console.log('\\n🔍 Step 2: 有効データ抽出')
    
    const activeData = originalData.filter(q => !q.is_deleted)
    const deletedData = originalData.filter(q => q.is_deleted)
    
    console.log(`   有効データ: ${activeData.length}件`)
    console.log(`   削除データ: ${deletedData.length}件`)
    
    // Sort by legacy_id to maintain question order
    activeData.sort((a, b) => a.legacy_id - b.legacy_id)
    
    console.log('   削除予定データ:')
    deletedData.forEach(q => {
      console.log(`     ID:${q.id}/L:${q.legacy_id} - ${q.question.substring(0, 50)}...`)
    })

    // Step 3: Prepare data for reinsertion with new legacy_id sequence
    console.log('\\n🔧 Step 3: データ準備（legacy_id連番化）')
    
    const reconstructedData = activeData.map((question, index) => {
      const newLegacyId = index + 1 // Start from 1
      
      return {
        // Remove id to let SERIAL auto-increment
        legacy_id: newLegacyId,
        category_id: question.category_id,
        subcategory: question.subcategory,
        subcategory_id: question.subcategory_id,
        question: question.question,
        option1: question.option1,
        option2: question.option2,
        option3: question.option3,
        option4: question.option4,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        difficulty: question.difficulty,
        time_limit: question.time_limit,
        related_topics: question.related_topics,
        source: question.source,
        is_deleted: false,
        created_at: question.created_at,
        updated_at: new Date().toISOString()
      }
    })
    
    console.log(`   再構築データ準備完了: ${reconstructedData.length}件`)
    console.log(`   新legacy_id範囲: 1 - ${reconstructedData.length}`)

    // Step 4: Clear existing data
    console.log('\\n🗑️ Step 4: 既存データクリア')
    
    const { error: deleteError } = await supabase
      .from('quiz_questions')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (deleteError) throw deleteError
    
    console.log('   ✅ 既存データ削除完了')

    // Step 5: Reset SERIAL sequence
    console.log('\\n🔄 Step 5: IDシーケンスリセット')
    
    // Reset the sequence to start from 1
    // Note: This requires raw SQL execution
    // For safety, we'll let it auto-increment naturally

    // Step 6: Insert reconstructed data in batches
    console.log('\\n📥 Step 6: 再構築データ挿入')
    
    const BATCH_SIZE = 50
    let insertedCount = 0
    
    for (let i = 0; i < reconstructedData.length; i += BATCH_SIZE) {
      const batch = reconstructedData.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      
      console.log(`   バッチ ${batchNum}/${Math.ceil(reconstructedData.length / BATCH_SIZE)}: ${batch.length}件`)
      
      const { error: insertError } = await supabase
        .from('quiz_questions')
        .insert(batch)
      
      if (insertError) {
        console.error(`   ❌ バッチ ${batchNum} エラー:`, insertError)
        throw insertError
      }
      
      insertedCount += batch.length
      console.log(`   ✅ バッチ ${batchNum} 完了`)
    }

    // Step 7: Verify reconstruction
    console.log('\\n✅ Step 7: 再構築検証')
    
    const { data: newData, error: verifyError } = await supabase
      .from('quiz_questions')
      .select('id, legacy_id, is_deleted')
      .order('id')
    
    if (verifyError) throw verifyError
    
    const newTotal = newData.length
    const newActive = newData.filter(q => !q.is_deleted).length
    const newDeleted = newData.filter(q => q.is_deleted).length
    
    console.log('   再構築後の状況:')
    console.log(`     総数: ${newTotal}`)
    console.log(`     有効: ${newActive}`)
    console.log(`     削除済: ${newDeleted}`)
    
    const newIds = newData.map(q => q.id)
    const newLegacyIds = newData.map(q => q.legacy_id)
    
    console.log(`     新ID範囲: ${Math.min(...newIds)} - ${Math.max(...newIds)}`)
    console.log(`     新Legacy ID範囲: ${Math.min(...newLegacyIds)} - ${Math.max(...newLegacyIds)}`)

    // Verify data integrity
    const expectedCount = activeData.length
    if (newActive === expectedCount) {
      console.log('   ✅ データ整合性確認: OK')
    } else {
      console.log(`   ❌ データ整合性エラー: 期待値${expectedCount} vs 実際${newActive}`)
    }

    console.log('\\n🎉 Quiz Questions データ再構築完了')
    console.log('===================================')
    console.log(`📊 結果サマリー:`)
    console.log(`   元データ: ${originalData.length}件 (有効${activeData.length}件、削除${deletedData.length}件)`)
    console.log(`   新データ: ${newTotal}件 (有効${newActive}件)`)
    console.log(`   バックアップ: ${path.basename(backupFilePath)}`)
    console.log(`   ID範囲: ${Math.min(...newIds)} - ${Math.max(...newIds)}`)
    console.log(`   Legacy ID範囲: 1 - ${Math.max(...newLegacyIds)}`)

  } catch (error) {
    console.error('❌ 再構築エラー:', error.message)
    console.error('詳細:', error)
    process.exit(1)
  }
}

// Execute reconstruction
reconstructQuizQuestionsData()