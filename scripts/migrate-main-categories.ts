#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import { mainCategories } from '../lib/categories'

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

async function migrateMainCategories() {
  console.log('📋 メインカテゴリーデータの移行を開始します...\n')

  try {
    // 1. 既存データの確認
    console.log('🔍 既存のメインカテゴリーデータを確認中...')
    const { data: existingData, error: selectError } = await supabase
      .from('categories')
      .select('*')
      .eq('type', 'main')
      .order('display_order')

    if (selectError) {
      console.error('❌ Error checking existing data:', selectError)
      return
    }

    if (existingData && existingData.length > 0) {
      console.log(`✅ 既存メインカテゴリー発見: ${existingData.length}件`)
      existingData.forEach(cat => {
        console.log(`  - ${cat.category_id}: ${cat.name} (${cat.is_active ? '有効' : '無効'})`)
      })
      
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('\n既存のメインカテゴリーデータを削除して再移行しますか？ (y/N): ', resolve)
      })
      rl.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ 操作をキャンセルしました')
        return
      }
      
      // 既存データを削除
      console.log('\n🗑️ 既存メインカテゴリーデータを削除中...')
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('type', 'main')
      
      if (deleteError) {
        console.error('❌ Error deleting existing data:', deleteError)
        return
      }
      console.log('✅ 既存メインカテゴリー削除完了')
    }

    // 2. lib/categories.tsからメインカテゴリーデータを変換
    console.log('\n🔄 lib/categories.tsからデータを変換中...')
    
    const categoryData = mainCategories.map(category => ({
      category_id: category.id,
      name: category.name,
      description: category.description,
      type: 'main' as const,
      icon: category.icon,
      color: category.color,
      display_order: category.displayOrder,
      is_active: true,  // 既存カテゴリーは全て有効
      is_visible: true,
      activation_date: null
    }))

    console.log(`📋 変換対象: ${categoryData.length}件のメインカテゴリー`)
    categoryData.forEach(cat => {
      console.log(`  - ${cat.category_id}: ${cat.name} (${cat.icon})`)
    })

    // 3. Supabaseにデータを挿入
    console.log('\n📥 Supabaseにメインカテゴリーデータを挿入中...')
    
    const { data: insertedData, error: insertError } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()

    if (insertError) {
      console.error('❌ Error inserting main categories:', insertError)
      return
    }

    console.log('✅ メインカテゴリーデータ挿入完了')
    
    // 4. 挿入結果の確認
    console.log('\n📊 **挿入されたメインカテゴリーデータ**')
    console.log('=' .repeat(80))
    
    insertedData?.forEach(cat => {
      const status = cat.is_active ? '🟢 有効' : '🔴 無効'
      console.log(`${cat.category_id.padEnd(35)} | ${cat.name.padEnd(20)} | ${cat.icon} | ${status}`)
    })

    // 5. 各カテゴリーのサブカテゴリー数を表示
    console.log('\n📋 **各カテゴリーのサブカテゴリー数**')
    console.log('=' .repeat(80))
    
    mainCategories.forEach(category => {
      const subCount = category.subcategories?.length || 0
      console.log(`${category.name.padEnd(35)} | ${subCount}個のサブカテゴリー`)
    })

    // 6. 次のステップの案内
    console.log('\n📋 **次のステップ**')
    console.log('=' .repeat(80))
    console.log('1. ✅ スキルレベルマスターデータ初期化完了')
    console.log('2. ✅ メインカテゴリーデータ移行完了')
    console.log('3. 🔄 既存業界カテゴリーデータ移行 (Task 2.3)')
    console.log('4. 🔄 サブカテゴリーデータ移行 (Task 2.4)')
    console.log('5. 🔄 新業界カテゴリー先行登録 (Task 2.5)')
    console.log('6. 🔄 クイズデータdifficulty値正規化 (Task 2.6)')

    console.log('\n✅ メインカテゴリーデータの移行が完了しました！')

  } catch (error) {
    console.error('❌ Critical error:', error)
  }
}

// 実行
migrateMainCategories().then(() => {
  console.log('\n📋 メインカテゴリー移行完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})