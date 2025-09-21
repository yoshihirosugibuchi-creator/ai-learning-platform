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

async function disableRLS() {
  console.log('🔧 カテゴリー関連テーブルのRLSを一時無効化中...')

  const tables = ['categories', 'subcategories', 'skill_levels']
  
  for (const table of tables) {
    try {
      // RLS状態を確認
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`⚠️ ${table}: RLS制限あり - 無効化が必要`)
      } else {
        console.log(`✅ ${table}: 既にアクセス可能`)
      }
    } catch (e) {
      console.log(`❓ ${table}: 確認不可`)
    }
  }

  console.log('\n📋 RLS無効化はSupabase SQL Editorで以下を実行してください:')
  console.log('=' .repeat(60))
  tables.forEach(table => {
    console.log(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`)
  })
  
  console.log('\n📋 データ移行完了後のRLS再有効化:')
  console.log('=' .repeat(60))
  tables.forEach(table => {
    console.log(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`)
  })
}

// 実行
disableRLS().then(() => {
  console.log('\n🔧 RLS状態確認完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})