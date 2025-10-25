#!/usr/bin/env node

/**
 * 全ユーザーデータリセットスクリプト（改良版）
 * 今回の修正で発見した問題を解決済み
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// テーブル削除設定
const RESET_CONFIG = {
  // 特別な削除条件が必要なテーブル
  specialTables: {
    'quiz_answers': {
      method: 'date_filter',
      condition: { column: 'created_at', operator: 'gte', value: '2020-01-01' },
      description: 'created_atベースで全削除（UUID型id回避）'
    }
  },
  
  // 標準的な削除条件のテーブル
  standardTables: [
    'learning_progress',
    'user_badges',
    'user_xp_stats_v2',
    'user_category_xp_stats_v2',
    'user_subcategory_xp_stats_v2',
    'course_session_completions',
    'course_theme_completions',
    'course_completions',
    'knowledge_card_collection',
    'user_knowledge_collection_v2',
    'wisdom_card_collection',
    'user_settings',
    'skp_transactions',
    'daily_xp_records',
    'quiz_sessions',
    'learning_analytics_summary',
    'learning_effectiveness_tracking',
    'learning_recommendations',
    'unified_learning_session_analytics',
    'user_learning_profiles',
    'spaced_repetition_schedule'
  ]
}

async function resetAllUserData(options = {}) {
  const { dryRun = false, verbose = true } = options
  
  try {
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - 実際の削除は行いません')
    } else {
      console.log('🚨 全ユーザーデータリセット開始')
      console.log('⚠️  警告: 全ユーザーの全データが削除されます')
    }
    console.log('')

    const deletedTables = []
    const errors = []
    const deletedCounts = {}
    let totalProcessed = 0

    // 1. 特別な処理が必要なテーブル
    for (const [table, config] of Object.entries(RESET_CONFIG.specialTables)) {
      totalProcessed++
      console.log(`🔄 [${totalProcessed}] Processing ${table} (${config.description})...`)
      
      if (dryRun) {
        console.log(`   📋 DRY RUN: Would delete from ${table}`)
        deletedTables.push(`${table} (DRY RUN)`)
        deletedCounts[table] = 'DRY_RUN'
        continue
      }
      
      try {
        let query = supabaseAdmin.from(table).delete()
        
        if (config.method === 'date_filter') {
          query = query.gte(config.condition.column, config.condition.value)
        }
        
        const { error, count } = await query
        
        if (error) {
          console.error(`   ❌ Error deleting ${table}:`, error.message)
          errors.push(`${table}: ${error.message}`)
        } else {
          console.log(`   ✅ ${table} deleted (${count || 0} records)`)
          deletedTables.push(table)
          deletedCounts[table] = count || 0
        }
      } catch (err) {
        console.error(`   ❌ Exception deleting ${table}:`, err.message)
        errors.push(`${table}: ${err.message}`)
      }
    }

    // 2. 標準的な削除処理のテーブル
    for (const table of RESET_CONFIG.standardTables) {
      totalProcessed++
      console.log(`🔄 [${totalProcessed}] Processing ${table}...`)
      
      if (dryRun) {
        console.log(`   📋 DRY RUN: Would delete from ${table} where user_id IS NOT NULL`)
        deletedTables.push(`${table} (DRY RUN)`)
        deletedCounts[table] = 'DRY_RUN'
        continue
      }
      
      try {
        // user_idがNULLでないレコードを削除
        const { error, count } = await supabaseAdmin
          .from(table)
          .delete()
          .not('user_id', 'is', null)
        
        if (error) {
          console.error(`   ❌ Error deleting ${table}:`, error.message)
          errors.push(`${table}: ${error.message}`)
        } else {
          console.log(`   ✅ ${table} deleted (${count || 0} records)`)
          deletedTables.push(table)
          deletedCounts[table] = count || 0
        }
      } catch (err) {
        console.error(`   ❌ Exception deleting ${table}:`, err.message)
        errors.push(`${table}: ${err.message}`)
      }
    }

    // 3. 結果サマリー
    const totalDeletedRecords = Object.values(deletedCounts)
      .filter(count => typeof count === 'number')
      .reduce((sum, count) => sum + count, 0)

    console.log('')
    console.log('🎉 全ユーザーデータリセット完了')
    console.log('=====================================')
    console.log(`処理されたテーブル: ${totalProcessed}`)
    console.log(`成功したテーブル: ${deletedTables.length}`)
    console.log(`エラーが発生したテーブル: ${errors.length}`)
    if (!dryRun) {
      console.log(`総削除レコード数: ${totalDeletedRecords}`)
    }
    console.log('')
    
    if (verbose) {
      console.log('📊 テーブル別結果:')
      Object.entries(deletedCounts).forEach(([table, count]) => {
        const status = errors.some(err => err.startsWith(table)) ? '❌' : '✅'
        console.log(`  ${status} ${table}: ${count}${typeof count === 'number' ? '件' : ''}`)
      })
    }
    
    if (errors.length > 0) {
      console.log('')
      console.log('⚠️ エラー詳細:')
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    console.log('')
    if (dryRun) {
      console.log('🔍 DRY RUN 完了 - 実際の削除は行われませんでした')
      console.log('💡 実際に削除する場合は --execute オプションを付けて実行してください')
    } else {
      console.log('✅ リセット完了')
      
      // 最終検証の提案
      console.log('')
      console.log('🔍 最終検証を実行する場合:')
      console.log('  node scripts/verify-reset.js')
    }

    return {
      success: errors.length === 0,
      deletedTables,
      deletedCounts,
      totalDeletedRecords: dryRun ? 'DRY_RUN' : totalDeletedRecords,
      errors,
      dryRun
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
    throw error
  }
}

// CLI引数処理
function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun: !args.includes('--execute'),
    verbose: !args.includes('--quiet'),
    help: args.includes('--help') || args.includes('-h')
  }
}

// ヘルプ表示
function showHelp() {
  console.log(`
全ユーザーデータリセットスクリプト（改良版）

使用方法:
  node scripts/reset-all-users-improved.js [オプション]

オプション:
  --execute     実際に削除を実行（デフォルトはDRY RUN）
  --quiet       詳細なログを非表示
  --help, -h    このヘルプを表示

例:
  # DRY RUN（削除されません）
  node scripts/reset-all-users-improved.js
  
  # 実際に削除を実行
  node scripts/reset-all-users-improved.js --execute
  
  # 静かに実行
  node scripts/reset-all-users-improved.js --execute --quiet

注意:
  --execute を付けない限り、実際の削除は行われません（安全機能）
`)
}

// メイン実行
async function main() {
  const options = parseArgs()
  
  if (options.help) {
    showHelp()
    return
  }
  
  if (options.dryRun) {
    console.log('💡 DRY RUN モードで実行中（--execute が指定されていません）')
    console.log('💡 実際に削除するには --execute オプションを付けてください')
    console.log('')
  }
  
  try {
    await resetAllUserData(options)
  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error.message)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main()
}

module.exports = { resetAllUserData, RESET_CONFIG }