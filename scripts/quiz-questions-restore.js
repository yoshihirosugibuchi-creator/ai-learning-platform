#!/usr/bin/env node

/**
 * Quiz Questions Data Restoration Script
 * Restores quiz_questions from backup file
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function restoreQuizQuestions() {
  console.log('🔄 Quiz Questions データ復元開始')
  console.log('=====================================\n')

  try {
    // Find the latest backup file
    const backupDir = path.join(process.cwd(), 'database', 'backup')
    const backupFileName = 'quiz_questions_full_backup_2025-10-18T05-20-22.json'
    const backupFilePath = path.join(backupDir, backupFileName)
    
    console.log(`📂 バックアップファイル読み込み: ${backupFileName}`)
    
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`バックアップファイルが見つかりません: ${backupFilePath}`)
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'))
    console.log(`   取得データ: ${backupData.totalRecords}件`)
    console.log(`   バックアップ日時: ${backupData.timestamp}`)

    // Step 1: Clear current data
    console.log('\n🗑️ Step 1: 現在のデータクリア')
    
    const { error: deleteError } = await supabase
      .from('quiz_questions')
      .delete()
      .neq('id', 0) // Delete all records
    
    if (deleteError) throw deleteError
    
    console.log('   ✅ 現在のデータ削除完了')

    // Step 2: Restore original data in batches
    console.log('\n📥 Step 2: 元データ復元')
    
    const originalData = backupData.data
    const BATCH_SIZE = 50
    let restoredCount = 0
    
    for (let i = 0; i < originalData.length; i += BATCH_SIZE) {
      const batch = originalData.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      
      console.log(`   バッチ ${batchNum}/${Math.ceil(originalData.length / BATCH_SIZE)}: ${batch.length}件`)
      
      // Prepare data for insertion (remove auto-generated fields if present)
      const insertData = batch.map(item => {
        const { ...restData } = item
        return restData
      })
      
      const { error: insertError } = await supabase
        .from('quiz_questions')
        .insert(insertData)
      
      if (insertError) {
        console.error(`   ❌ バッチ ${batchNum} エラー:`, insertError)
        throw insertError
      }
      
      restoredCount += batch.length
      console.log(`   ✅ バッチ ${batchNum} 完了`)
    }

    // Step 3: Verify restoration
    console.log('\n✅ Step 3: 復元検証')
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('quiz_questions')
      .select('id, legacy_id, is_deleted')
      .order('id')
    
    if (verifyError) throw verifyError
    
    const restoredTotal = verifyData.length
    const restoredActive = verifyData.filter(q => !q.is_deleted).length
    const restoredDeleted = verifyData.filter(q => q.is_deleted).length
    
    const restoredIds = verifyData.map(q => q.id)
    const restoredLegacyIds = verifyData.map(q => q.legacy_id)
    
    console.log('   復元後の状況:')
    console.log(`     総数: ${restoredTotal}`)
    console.log(`     有効: ${restoredActive}`)
    console.log(`     削除済: ${restoredDeleted}`)
    console.log(`     ID範囲: ${Math.min(...restoredIds)} - ${Math.max(...restoredIds)}`)
    console.log(`     Legacy ID範囲: ${Math.min(...restoredLegacyIds)} - ${Math.max(...restoredLegacyIds)}`)

    // Verify data integrity
    if (restoredTotal === backupData.totalRecords) {
      console.log('   ✅ データ整合性確認: OK')
    } else {
      console.log(`   ❌ データ整合性エラー: 期待値${backupData.totalRecords} vs 実際${restoredTotal}`)
    }

    console.log('\n🎉 Quiz Questions データ復元完了')
    console.log('===================================')
    console.log(`📊 復元結果:`)
    console.log(`   復元データ: ${restoredTotal}件`)
    console.log(`   元データ: ${backupData.totalRecords}件`)
    console.log(`   バックアップ元: ${backupFileName}`)

  } catch (error) {
    console.error('❌ 復元エラー:', error.message)
    console.error('詳細:', error)
    process.exit(1)
  }
}

// Execute restoration
restoreQuizQuestions()