import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

// 削除対象テーブル一覧
const legacyTables = [
  'category_progress',
  'detailed_quiz_data', 
  'quiz_results',
  'user_category_xp_stats',
  'user_progress',
  'user_subcategory_xp_stats',
  'user_xp_stats',
  'xp_settings'
]

interface BackupResult {
  tableName: string
  success: boolean
  recordCount: number
  error?: string
  filePath?: string
}

async function backupLegacyTables() {
  console.log('🔄 レガシーテーブル バックアップ開始')
  console.log('='.repeat(50))
  
  const backupDir = './database/backup/legacy_tables_backup_20251001'
  const results: BackupResult[] = []
  
  // バックアップディレクトリの確認
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
    console.log(`📁 バックアップディレクトリ作成: ${backupDir}`)
  }
  
  for (const tableName of legacyTables) {
    try {
      console.log(`\n📊 ${tableName} のバックアップ中...`)
      
      // テーブルデータを全取得
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
      
      if (error) {
        console.error(`❌ ${tableName}: ${error.message}`)
        results.push({
          tableName,
          success: false,
          recordCount: 0,
          error: error.message
        })
        continue
      }
      
      const recordCount = count || 0
      console.log(`📈 ${tableName}: ${recordCount}件のレコード`)
      
      if (recordCount === 0) {
        console.log(`⚠️ ${tableName}: データが空のため、バックアップをスキップ`)
        results.push({
          tableName,
          success: true,
          recordCount: 0
        })
        continue
      }
      
      // JSONファイルとしてバックアップ保存
      const backupData = {
        tableName,
        backupDate: new Date().toISOString(),
        recordCount,
        data: data || []
      }
      
      const fileName = `${tableName}_backup.json`
      const filePath = path.join(backupDir, fileName)
      
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2))
      console.log(`✅ ${tableName}: バックアップ完了 → ${fileName}`)
      
      results.push({
        tableName,
        success: true,
        recordCount,
        filePath: fileName
      })
      
    } catch (err) {
      const errorMessage = (err as Error).message
      console.error(`❌ ${tableName} バックアップエラー:`, errorMessage)
      results.push({
        tableName,
        success: false,
        recordCount: 0,
        error: errorMessage
      })
    }
  }
  
  // バックアップサマリーの作成
  const summary = {
    backupDate: new Date().toISOString(),
    totalTables: legacyTables.length,
    successfulBackups: results.filter(r => r.success).length,
    failedBackups: results.filter(r => !r.success).length,
    totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0),
    results
  }
  
  const summaryPath = path.join(backupDir, 'backup_summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
  
  // 結果表示
  console.log('\n📊 バックアップ結果サマリー')
  console.log('='.repeat(50))
  console.log(`📁 保存先: ${backupDir}`)
  console.log(`📈 総テーブル数: ${summary.totalTables}`)
  console.log(`✅ 成功: ${summary.successfulBackups}`)
  console.log(`❌ 失敗: ${summary.failedBackups}`)
  console.log(`📊 総レコード数: ${summary.totalRecords}`)
  
  console.log('\n📋 テーブル別結果:')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    const info = result.success 
      ? `${result.recordCount}件` 
      : `エラー: ${result.error}`
    console.log(`  ${status} ${result.tableName}: ${info}`)
  })
  
  if (summary.failedBackups > 0) {
    console.log('\n⚠️ 一部のテーブルでバックアップに失敗しました')
    console.log('失敗したテーブルは削除前に手動確認をお勧めします')
  } else {
    console.log('\n🎉 全テーブルのバックアップが正常に完了しました')
  }
  
  return summary
}

// スクリプト実行
backupLegacyTables()
  .then(summary => {
    console.log('\n✅ バックアップスクリプト完了')
    process.exit(summary.failedBackups > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('❌ バックアップスクリプトエラー:', error)
    process.exit(1)
  })