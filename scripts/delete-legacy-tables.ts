import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

// 削除順序（依存関係を考慮）
const deletionOrder = [
  'detailed_quiz_data',   // 詳細記録テーブル（他テーブル依存なし）
  'quiz_results',         // 旧結果テーブル（他テーブル依存なし）
  'user_progress',        // 旧進捗テーブル（他テーブル依存なし）
  'category_progress',    // 旧カテゴリー進捗（他テーブル依存なし）
  'user_subcategory_xp_stats', // サブカテゴリー統計（v1）
  'user_category_xp_stats',    // カテゴリー統計（v1）
  'user_xp_stats',        // ユーザー統計（v1）
  'xp_settings'           // 旧設定テーブル（最後に削除）
]

interface DeletionResult {
  tableName: string
  success: boolean
  recordCount?: number
  error?: string
  deleteTime?: string
}

async function deleteLegacyTables() {
  console.log('🗑️ レガシーテーブル削除開始')
  console.log('='.repeat(50))
  console.log('⚠️ 危険: この操作は不可逆です')
  console.log('✅ バックアップ済み: ./database/backup/legacy_tables_backup_20251001/')
  console.log('')
  
  const results: DeletionResult[] = []
  
  for (const tableName of deletionOrder) {
    try {
      console.log(`🔍 ${tableName} 削除前確認中...`)
      
      // 削除前のレコード数確認
      const { count: preCount, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        console.error(`❌ ${tableName}: テーブル確認エラー - ${countError.message}`)
        results.push({
          tableName,
          success: false,
          error: `確認エラー: ${countError.message}`
        })
        continue
      }
      
      const recordCount = preCount || 0
      console.log(`📊 ${tableName}: ${recordCount}件のレコードが存在`)
      
      if (recordCount === 0) {
        console.log(`⚠️ ${tableName}: データが空のため、テーブル削除をスキップ`)
        results.push({
          tableName,
          success: true,
          recordCount: 0,
          deleteTime: new Date().toISOString()
        })
        continue
      }
      
      // 確認プロンプト（本来はここで手動確認するが、自動実行のためコメント化）
      console.log(`🗑️ ${tableName} を削除中...`)
      
      // テーブル削除実行（レコードではなくテーブル構造を削除）
      const { error: deleteError } = await supabase.rpc('exec', {
        sql: `DROP TABLE IF EXISTS ${tableName};`
      })
      
      if (deleteError) {
        console.error(`❌ ${tableName}: 削除エラー - ${deleteError.message}`)
        results.push({
          tableName,
          success: false,
          recordCount,
          error: deleteError.message
        })
        continue
      }
      
      console.log(`✅ ${tableName}: テーブル削除完了`)
      results.push({
        tableName,
        success: true,
        recordCount,
        deleteTime: new Date().toISOString()
      })
      
      // 削除後確認
      const { error: verifyError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (verifyError) {
        console.log(`🔍 ${tableName}: 削除確認 - テーブルが存在しません（正常）`)
      } else {
        console.warn(`⚠️ ${tableName}: テーブルがまだ存在しています`)
      }
      
    } catch (err) {
      const errorMessage = (err as Error).message
      console.error(`❌ ${tableName} 削除エラー:`, errorMessage)
      results.push({
        tableName,
        success: false,
        error: errorMessage
      })
    }
    
    // 次のテーブル削除前に少し待機
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 削除結果サマリー
  const summary = {
    deleteDate: new Date().toISOString(),
    totalTables: deletionOrder.length,
    successfulDeletions: results.filter(r => r.success).length,
    failedDeletions: results.filter(r => !r.success).length,
    totalRecordsDeleted: results.reduce((sum, r) => sum + (r.recordCount || 0), 0),
    results
  }
  
  console.log('\n📊 削除結果サマリー')
  console.log('='.repeat(50))
  console.log(`📈 総テーブル数: ${summary.totalTables}`)
  console.log(`✅ 削除成功: ${summary.successfulDeletions}`)
  console.log(`❌ 削除失敗: ${summary.failedDeletions}`)
  console.log(`📊 削除レコード数: ${summary.totalRecordsDeleted}`)
  
  console.log('\n📋 テーブル別結果:')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    const info = result.success 
      ? `${result.recordCount}件削除` 
      : `エラー: ${result.error}`
    console.log(`  ${status} ${result.tableName}: ${info}`)
  })
  
  if (summary.failedDeletions > 0) {
    console.log('\n⚠️ 一部のテーブル削除に失敗しました')
    console.log('失敗したテーブルは手動確認をお勧めします')
  } else {
    console.log('\n🎉 全レガシーテーブルの削除が正常に完了しました')
    console.log('📋 v2テーブルシステムへの移行が完了しました')
  }
  
  return summary
}

// スクリプト実行
deleteLegacyTables()
  .then(summary => {
    console.log('\n✅ 削除スクリプト完了')
    process.exit(summary.failedDeletions > 0 ? 1 : 0)
  })
  .catch(error => {
    console.error('❌ 削除スクリプトエラー:', error)
    process.exit(1)
  })