#!/usr/bin/env node

/**
 * 全ユーザーデータリセットスクリプト（修正版）
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetAllUserData() {
  try {
    console.log('🚨 全ユーザーデータリセット開始')
    console.log('⚠️  警告: 全ユーザーの全データが削除されます')

    const deletedTables = []
    const errors = []
    const deletedCounts = {}

    // リセット対象テーブル一覧
    const tables = [
      'learning_progress',
      'user_badges', 
      'user_xp_stats_v2',
      'user_category_xp_stats_v2',
      'user_subcategory_xp_stats_v2',
      'quiz_answers',
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

    for (const table of tables) {
      try {
        console.log(`🔄 Processing ${table}...`)
        
        let query
        if (table === 'quiz_answers') {
          // quiz_answersは全削除（idが0より大きいもの = 全て）
          query = supabaseAdmin
            .from(table)
            .delete()
            .gt('id', 0)
        } else {
          // その他はuser_idがNULLでないもの全て削除
          query = supabaseAdmin
            .from(table)
            .delete()
            .not('user_id', 'is', null)
        }

        const { error, count } = await query

        if (error) {
          console.error(`❌ Error deleting ${table}:`, error)
          errors.push(`${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table} deleted (${count || 0} records)`)
          deletedTables.push(table)
          deletedCounts[table] = count || 0
        }
      } catch (err) {
        console.error(`❌ Exception deleting ${table}:`, err)
        errors.push(`${table}: ${err.message}`)
      }
    }

    // 総削除レコード数を計算
    const totalDeletedRecords = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0)

    console.log('')
    console.log('🎉 全ユーザーデータリセット完了')
    console.log('=====================================')
    console.log('削除されたテーブル:', deletedTables.length)
    console.log('総削除レコード数:', totalDeletedRecords)
    console.log('')
    console.log('📊 テーブル別削除件数:')
    Object.entries(deletedCounts).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count}件`)
    })
    
    if (errors.length > 0) {
      console.log('')
      console.log('⚠️ エラー:')
      errors.forEach(error => console.log(`  - ${error}`))
    }

    console.log('')
    console.log('✅ リセット完了')

  } catch (error) {
    console.error('❌ 予期しないエラー:', error)
  }
}

// スクリプト実行
resetAllUserData()