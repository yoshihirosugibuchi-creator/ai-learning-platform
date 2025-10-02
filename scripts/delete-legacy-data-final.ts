import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

// 削除対象テーブルとその主キー
const tablesWithKeys = [
  { table: 'detailed_quiz_data', primaryKey: 'id' },
  { table: 'quiz_results', primaryKey: 'id' },
  { table: 'user_progress', primaryKey: 'id' },
  { table: 'category_progress', primaryKey: 'id' },
  { table: 'user_subcategory_xp_stats', primaryKey: 'id' },
  { table: 'user_category_xp_stats', primaryKey: 'id' },
  { table: 'user_xp_stats', primaryKey: 'user_id' }, // このテーブルはuser_idが主キー
  { table: 'xp_settings', primaryKey: 'setting_key' } // このテーブルはsetting_keyが主キー
]

async function deleteAllLegacyData() {
  console.log('🗑️ レガシーテーブル データ完全削除')
  console.log('='.repeat(50))
  console.log('✅ バックアップ済み: ./database/backup/legacy_tables_backup_20251001/')
  console.log('')
  
  let totalDeleted = 0
  let successCount = 0
  
  for (const { table, primaryKey } of tablesWithKeys) {
    try {
      console.log(`🔍 ${table} 処理中...`)
      
      // まず存在するレコードを取得
      const { data: records, error: selectError, count } = await supabase
        .from(table)
        .select(primaryKey, { count: 'exact' })
      
      if (selectError) {
        console.error(`❌ ${table}: 取得エラー - ${selectError.message}`)
        continue
      }
      
      console.log(`📊 ${table}: ${count}件のレコード存在`)
      
      if (!records || records.length === 0) {
        console.log(`⚠️ ${table}: データが空のため、スキップ`)
        successCount++
        continue
      }
      
      // 各レコードを個別に削除
      let deletedInTable = 0
      for (const record of records) {
        const keyValue = (record as any)[primaryKey]
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq(primaryKey, keyValue)
        
        if (deleteError) {
          console.error(`❌ ${table}[${keyValue}]: ${deleteError.message}`)
        } else {
          deletedInTable++
        }
      }
      
      console.log(`✅ ${table}: ${deletedInTable}/${records.length}件削除完了`)
      totalDeleted += deletedInTable
      
      if (deletedInTable === records.length) {
        successCount++
      }
      
      // 削除後確認
      const { count: postCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      console.log(`🔍 ${table} 削除後: ${postCount}件`)
      
    } catch (err) {
      console.error(`❌ ${table} 処理エラー:`, (err as Error).message)
    }
    
    console.log('') // 空行
  }
  
  console.log('📊 削除完了サマリー')
  console.log('='.repeat(40))
  console.log(`📈 処理テーブル数: ${tablesWithKeys.length}`)
  console.log(`✅ 完全削除成功: ${successCount}`)
  console.log(`🗑️ 総削除レコード数: ${totalDeleted}`)
  
  if (successCount === tablesWithKeys.length) {
    console.log('\n🎉 全レガシーテーブルのデータ削除が完了しました！')
    console.log('📝 テーブル構造は保持されています')
    console.log('🚀 v2システムへの移行完了です')
  } else {
    console.log('\n⚠️ 一部のテーブルで削除に失敗しました')
    console.log('📋 手動確認をお勧めします')
  }
  
  return { successCount, totalDeleted, totalTables: tablesWithKeys.length }
}

// スクリプト実行
deleteAllLegacyData()
  .then(summary => {
    console.log('\n✅ レガシーデータ削除完了')
    console.log(`📊 最終結果: ${summary.successCount}/${summary.totalTables}テーブル成功、${summary.totalDeleted}レコード削除`)
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ 削除スクリプトエラー:', error)
    process.exit(1)
  })