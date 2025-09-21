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

// 既知のテーブルリスト + 推測されるテーブル
const POSSIBLE_TABLES = [
  // 既知のユーザー関連テーブル
  'users',
  'user_progress',
  'user_settings', 
  'user_badges',
  
  // クイズ関連テーブル
  'quiz_questions',
  'quiz_results',
  'detailed_quiz_data',
  
  // 学習・進捗関連テーブル
  'learning_sessions',
  'learning_progress',
  'category_progress',
  
  // コレクション関連テーブル
  'knowledge_card_collection',
  'wisdom_card_collection',
  
  // SKP・ポイント関連テーブル
  'skp_transactions',
  
  // 新しく追加される可能性があるテーブル
  'categories',
  'subcategories', 
  'skill_levels',
  
  // 追加で存在する可能性があるテーブル
  'profiles',
  'sessions',
  'auth_users',
  'public_users',
  'content_items',
  'courses',
  'lessons',
  'achievements',
  'notifications',
  'analytics',
  'feedback',
  'cards',
  'question_categories',
  'learning_paths'
]

async function checkTableExists(tableName: string): Promise<{exists: boolean, accessible: boolean, error?: string}> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)
    
    if (error) {
      // テーブルが存在しない、またはアクセス権限がない
      if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === '42P01') {
        return { exists: false, accessible: false, error: 'テーブル存在しない' }
      } else if (error.message.includes('permission') || error.message.includes('RLS') || error.code === 'PGRST103') {
        return { exists: true, accessible: false, error: 'RLS制限またはアクセス権限なし' }
      } else {
        return { exists: true, accessible: false, error: error.message }
      }
    } else {
      return { exists: true, accessible: true }
    }
  } catch (e) {
    return { exists: false, accessible: false, error: 'Unknown error' }
  }
}

async function checkAllKnownTables() {
  console.log('🔍 既知・推測テーブルの存在確認を開始します...\n')

  const results: Array<{name: string, exists: boolean, accessible: boolean, error?: string}> = []

  // 各テーブルを順次確認
  for (const tableName of POSSIBLE_TABLES) {
    const result = await checkTableExists(tableName)
    results.push({ name: tableName, ...result })
    
    const status = result.exists 
      ? (result.accessible ? '✅ 存在・アクセス可能' : '🔒 存在・RLS制限あり') 
      : '❌ 存在しない'
    
    console.log(`${tableName.padEnd(30)} | ${status}`)
  }

  // 実際に存在するテーブルのみを抽出
  const existingTables = results.filter(r => r.exists).map(r => r.name)
  const accessibleTables = results.filter(r => r.exists && r.accessible).map(r => r.name)
  const restrictedTables = results.filter(r => r.exists && !r.accessible).map(r => r.name)

  console.log('\n📊 **テーブル存在状況サマリー**')
  console.log('=' .repeat(60))
  console.log(`✅ 存在するテーブル: ${existingTables.length}個`)
  console.log(`🔓 アクセス可能（RLS無効）: ${accessibleTables.length}個`)
  console.log(`🔒 アクセス制限（RLS有効）: ${restrictedTables.length}個`)

  console.log('\n📋 **PRODUCTION_CHECKLIST.md用 - 存在する全テーブル**')
  console.log('=' .repeat(60))
  console.log('```sql')
  console.log('-- 存在する全テーブルのRLSを有効化（本番前必須）')
  existingTables.forEach(tableName => {
    console.log(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`)
  })
  console.log('```\n')

  console.log('**RLS確認クエリ用テーブルリスト**：')
  console.log(`'${existingTables.join("', '")}'`)

  console.log('\n🔧 **RLS無効化方法（開発環境のみ）**')
  console.log('=' .repeat(60))
  console.log('```sql')
  console.log('-- ⚠️ 開発環境でのRLS無効化（本番環境では実行禁止）')
  existingTables.forEach(tableName => {
    console.log(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;`)
  })
  console.log('```\n')

  if (restrictedTables.length > 0) {
    console.log('🔒 **現在RLS制限があるテーブル**')
    console.log('=' .repeat(60))
    restrictedTables.forEach(table => {
      console.log(`- ${table}`)
    })
    console.log()
  }

  if (accessibleTables.length > 0) {
    console.log('🔓 **現在RLS無効なテーブル**')
    console.log('=' .repeat(60))
    accessibleTables.forEach(table => {
      console.log(`- ${table}`)
    })
    console.log()
  }

  // 各テーブルタイプ別のポリシー例
  console.log('📝 **推奨RLSポリシー（テーブルタイプ別）**')
  console.log('=' .repeat(60))

  const userDataTables = existingTables.filter(t => 
    t.includes('user') || t.includes('progress') || t.includes('settings') || 
    t.includes('collection') || t.includes('transactions') || t.includes('badges') ||
    t.includes('results') || t.includes('sessions')
  )

  const publicDataTables = existingTables.filter(t => 
    t.includes('questions') || t.includes('categories') || t.includes('skill_levels') ||
    t.includes('courses') || t.includes('lessons') || t.includes('content')
  )

  if (userDataTables.length > 0) {
    console.log('\n**ユーザー個人データ用ポリシー**：')
    userDataTables.forEach(table => {
      console.log(`CREATE POLICY "Users can manage own ${table}" ON ${table}`)
      console.log(`  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`)
      console.log()
    })
  }

  if (publicDataTables.length > 0) {
    console.log('**パブリックデータ用ポリシー**：')
    publicDataTables.forEach(table => {
      console.log(`CREATE POLICY "${table} are viewable by everyone" ON ${table}`)
      console.log(`  FOR SELECT USING (true);`)
      console.log()
    })
  }

  return { existingTables, accessibleTables, restrictedTables }
}

// 実行
checkAllKnownTables().then(({ existingTables }) => {
  console.log(`\n✅ テーブル確認完了 - ${existingTables.length}個のテーブルを発見`)
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})