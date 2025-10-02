import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

// 削除順序（依存関係を考慮）
const deletionOrder = [
  'detailed_quiz_data',
  'quiz_results', 
  'user_progress',
  'category_progress',
  'user_subcategory_xp_stats',
  'user_category_xp_stats',
  'user_xp_stats',
  'xp_settings'
]

async function deleteAllDataFromTables() {
  console.log('🗑️ レガシーテーブル全データ削除開始（テーブル構造は保持）')
  console.log('='.repeat(60))
  console.log('✅ バックアップ済み: ./database/backup/legacy_tables_backup_20251001/')
  console.log('')
  
  const results: Array<{tableName: string, success: boolean, deletedCount?: number, error?: string}> = []
  
  for (const tableName of deletionOrder) {
    try {
      console.log(`🔍 ${tableName} のデータ削除中...`)
      
      // 削除前のレコード数確認
      const { count: preCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      console.log(`📊 削除前: ${preCount}件`)
      
      if (!preCount || preCount === 0) {
        console.log(`⚠️ ${tableName}: データが空のため、削除をスキップ`)
        results.push({ tableName, success: true, deletedCount: 0 })
        continue
      }
      
      // 全データ削除（DELETE FROM table_name）
      const { error, count: deletedCount } = await supabase
        .from(tableName)
        .delete()
        .neq('id', 'dummy-id-that-never-exists') // 全レコード削除のトリック
      
      if (error) {
        console.error(`❌ ${tableName}: ${error.message}`)
        results.push({ tableName, success: false, error: error.message })
        continue
      }
      
      console.log(`✅ ${tableName}: ${deletedCount || preCount}件削除完了`)
      results.push({ tableName, success: true, deletedCount: deletedCount || preCount })
      
      // 削除後確認
      const { count: postCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      console.log(`🔍 削除後: ${postCount}件`)
      
    } catch (err) {
      console.error(`❌ ${tableName} エラー:`, (err as Error).message)
      results.push({ tableName, success: false, error: (err as Error).message })
    }
    
    console.log('') // 空行
  }
  
  // 結果サマリー
  const successCount = results.filter(r => r.success).length
  const totalDeleted = results.reduce((sum, r) => sum + (r.deletedCount || 0), 0)
  
  console.log('📊 削除結果サマリー')
  console.log('='.repeat(50))
  console.log(`📈 処理テーブル数: ${deletionOrder.length}`)
  console.log(`✅ 成功: ${successCount}`)
  console.log(`❌ 失敗: ${deletionOrder.length - successCount}`)
  console.log(`🗑️ 削除レコード数: ${totalDeleted}`)
  
  console.log('\n📋 テーブル別結果:')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    const info = result.success 
      ? `${result.deletedCount}件削除` 
      : `エラー: ${result.error}`
    console.log(`  ${status} ${result.tableName}: ${info}`)
  })
  
  if (successCount === deletionOrder.length) {
    console.log('\n🎉 全レガシーテーブルのデータ削除が完了しました')
    console.log('📝 注意: テーブル構造は残っています（データのみ削除）')
    console.log('🔧 完全削除にはSupabase UIでのテーブル削除が必要です')
  } else {
    console.log('\n⚠️ 一部のテーブルでデータ削除に失敗しました')
  }
  
  return { successCount, totalDeleted, results }
}

// スクリプト実行
deleteAllDataFromTables()
  .then(summary => {
    console.log('\n✅ データ削除スクリプト完了')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ スクリプトエラー:', error)
    process.exit(1)
  })