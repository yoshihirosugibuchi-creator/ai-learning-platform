#!/usr/bin/env node

/**
 * リセット後の検証スクリプト
 * 全ユーザーデータが正しく削除されたかを確認
 */

const { createClient } = require('@supabase/supabase-js')
const { RESET_CONFIG } = require('./reset-all-users-improved')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyReset() {
  try {
    console.log('🔍 リセット後の検証を開始します')
    console.log('=====================================')
    
    // 検証対象テーブル一覧
    const allTables = [
      ...Object.keys(RESET_CONFIG.specialTables),
      ...RESET_CONFIG.standardTables
    ]
    
    const results = {}
    let totalRecords = 0
    let tablesWithData = []
    
    for (const table of allTables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`⚠️  ${table}: エラー - ${error.message}`)
          results[table] = { status: 'error', count: null, error: error.message }
        } else {
          const recordCount = count || 0
          totalRecords += recordCount
          
          if (recordCount > 0) {
            console.log(`❌ ${table}: ${recordCount}件 (データが残存)`)
            tablesWithData.push({ table, count: recordCount })
            results[table] = { status: 'has_data', count: recordCount }
          } else {
            console.log(`✅ ${table}: ${recordCount}件`)
            results[table] = { status: 'clean', count: recordCount }
          }
        }
      } catch (err) {
        console.log(`⚠️  ${table}: 例外 - ${err.message}`)
        results[table] = { status: 'exception', count: null, error: err.message }
      }
    }
    
    // サマリー
    console.log('')
    console.log('🎯 検証結果サマリー')
    console.log('=====================================')
    console.log(`検証テーブル数: ${allTables.length}`)
    console.log(`総残存レコード数: ${totalRecords}`)
    console.log(`データが残存するテーブル数: ${tablesWithData.length}`)
    
    if (totalRecords === 0) {
      console.log('')
      console.log('🎉 ✅ リセットが正常に完了しています')
      console.log('💡 全ユーザーデータが正しく削除されました')
    } else {
      console.log('')
      console.log('⚠️  リセットが不完全です')
      console.log('')
      console.log('📋 データが残存するテーブル:')
      tablesWithData.forEach(({ table, count }) => {
        console.log(`  - ${table}: ${count}件`)
      })
      
      // 追加清理の提案
      console.log('')
      console.log('🔧 追加清理を実行する場合:')
      tablesWithData.forEach(({ table }) => {
        if (RESET_CONFIG.specialTables[table]) {
          console.log(`  # ${table} (特別処理)`)
          console.log(`  node -e "require('./scripts/reset-all-users-improved').resetAllUserData({dryRun:false})"`)
        } else {
          console.log(`  # ${table}`)
          console.log(`  node -e "const {createClient}=require('@supabase/supabase-js'); const s=createClient('${process.env.NEXT_PUBLIC_SUPABASE_URL}','${process.env.SUPABASE_SERVICE_ROLE_KEY}'); s.from('${table}').delete().not('user_id','is',null).then(r=>console.log('${table}:',r.count||0,'deleted'))"`)
        }
      })
    }
    
    // 詳細結果をJSONで出力（オプション）
    if (process.argv.includes('--json')) {
      console.log('')
      console.log('📄 詳細結果 (JSON):')
      console.log(JSON.stringify(results, null, 2))
    }
    
    return {
      success: totalRecords === 0,
      totalRecords,
      tablesWithData,
      results
    }
    
  } catch (error) {
    console.error('❌ 検証中にエラーが発生しました:', error)
    throw error
  }
}

// ヘルプ表示
function showHelp() {
  console.log(`
リセット検証スクリプト

使用方法:
  node scripts/verify-reset.js [オプション]

オプション:
  --json        結果を詳細なJSON形式でも出力
  --help, -h    このヘルプを表示

例:
  # 基本的な検証
  node scripts/verify-reset.js
  
  # JSON出力付き
  node scripts/verify-reset.js --json
`)
}

// メイン実行
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    return
  }
  
  try {
    const result = await verifyReset()
    process.exit(result.success ? 0 : 1)
  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error.message)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main()
}

module.exports = { verifyReset }