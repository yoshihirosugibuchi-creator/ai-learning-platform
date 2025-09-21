#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllTablesRLS() {
  console.log('🔍 Supabaseの全テーブルとRLS状態を確認しています...\n')

  try {
    // Supabaseの全テーブルとRLS状態を取得
    const { data: allTables, error } = await supabase
      .rpc('get_table_rls_status')
      .select()

    if (error) {
      // RPC関数が存在しない場合は直接クエリ
      console.log('⚠️ RPC関数が存在しないため、pg_tablesから直接取得します\n')
      
      // PostgreSQLメタデータから取得
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')

      if (tableError) {
        console.error('❌ Error fetching tables:', tableError)
        return
      }

      console.log('📊 **現在のSupabaseテーブル一覧**')
      console.log('=' .repeat(60))
      
      const tableNames = tables?.map(t => t.table_name).sort() || []
      
      for (const tableName of tableNames) {
        // RLS状態を個別に確認（可能な場合）
        try {
          // テーブルの詳細情報を取得
          const { data: tableInfo, error: infoError } = await supabase
            .from(tableName)
            .select('*')
            .limit(0)
          
          const hasRLS = !infoError // エラーがない場合はアクセス可能
          console.log(`${tableName.padEnd(35)} | ${hasRLS ? '✅ アクセス可能' : '🔒 RLS制限あり'}`)
          
        } catch (e) {
          console.log(`${tableName.padEnd(35)} | ❓ 確認不可`)
        }
      }

      console.log('\n📋 **PRODUCTION_CHECKLIST.md用テーブルリスト**')
      console.log('=' .repeat(60))
      console.log('以下をCOPYしてPRODUCTION_CHECKLIST.mdに追加してください：\n')
      
      console.log('```sql')
      console.log('-- 全テーブルのRLSを有効化（本番前必須）')
      tableNames.forEach(tableName => {
        console.log(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`)
      })
      console.log('```\n')

      console.log('**RLS確認クエリ用テーブルリスト**：')
      console.log(`'${tableNames.join("', '")}'`)

      console.log('\n📝 **各テーブルのポリシー例**')
      console.log('=' .repeat(60))
      
      // 一般的なポリシーパターンを提案
      tableNames.forEach(tableName => {
        if (tableName.includes('user') || tableName.includes('quiz') || tableName.includes('progress') || tableName.includes('settings')) {
          console.log(`-- ${tableName} のポリシー`)
          console.log(`CREATE POLICY "Users can manage own ${tableName}" ON ${tableName}`)
          console.log(`  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);\n`)
        } else if (tableName.includes('questions') || tableName.includes('categories') || tableName.includes('skill_levels')) {
          console.log(`-- ${tableName} のポリシー (読み取り専用)`)
          console.log(`CREATE POLICY "${tableName} are viewable by everyone" ON ${tableName}`)
          console.log(`  FOR SELECT USING (true);\n`)
        }
      })

    } else {
      // RPC関数が存在する場合の処理
      console.log('📊 **RLS状態付きテーブル一覧**')
      console.log('=' .repeat(60))
      
      allTables?.forEach((table: any) => {
        const rlsStatus = table.rowsecurity ? '🔒 RLS有効' : '⚠️ RLS無効'
        console.log(`${table.tablename.padEnd(35)} | ${rlsStatus}`)
      })
    }

  } catch (error) {
    console.error('❌ Critical error:', error)
    
    // フォールバック：既知のテーブルリスト
    console.log('\n📋 **既知のテーブルリスト（フォールバック）**')
    console.log('=' .repeat(60))
    
    const knownTables = [
      'users', 'quiz_results', 'quiz_questions', 'category_progress', 
      'detailed_quiz_data', 'skp_transactions', 'learning_sessions', 
      'learning_progress', 'user_progress', 'user_settings', 'user_badges', 
      'knowledge_card_collection', 'wisdom_card_collection'
    ]
    
    console.log('既知のテーブル:')
    knownTables.forEach(table => console.log(`- ${table}`))
    
    console.log('\n⚠️ 実際のSupabaseで追加のテーブルがある可能性があります。')
    console.log('Supabase Table Editorで直接確認することを推奨します。')
  }

  // RLS無効化スクリプトも生成
  console.log('\n🔧 **開発中にRLSを無効化する方法（参考用）**')
  console.log('=' .repeat(60))
  console.log('```sql')
  console.log('-- 開発効率のためRLSを無効化（本番では使用禁止）')
  console.log('-- ⚠️ この操作は開発環境でのみ実行してください')
  console.log('')
  console.log('-- 例：usersテーブルのRLS無効化')
  console.log('ALTER TABLE users DISABLE ROW LEVEL SECURITY;')
  console.log('')
  console.log('-- 例：全テーブルの一括無効化（危険）')
  console.log('-- DO NOT RUN IN PRODUCTION!')
  console.log('```')
}

// 実行
checkAllTablesRLS().then(() => {
  console.log('\n✅ テーブル・RLS状態確認完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})