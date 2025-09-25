#!/usr/bin/env tsx

/**
 * シンプルキャッシュシステムのテストスクリプト
 */

import { 
  getCategoryDisplayNameSync, 
  getSubcategoryDisplayNameSync,
  getCategoryDisplayNameAsync,
  getSubcategoryDisplayNameAsync,
  getCacheStats 
} from '@/lib/category-cache-simple'

import { getCategoryInfoForGenre } from '@/lib/learning/category-integration'

async function testSimpleCache() {
  console.log('🧪 シンプルキャッシュシステムテスト開始...\n')

  // 初期状態
  console.log('1. 初期キャッシュ状態:')
  console.log(getCacheStats())

  // 同期版テスト（初回はフォールバック）
  console.log('\n2. 同期版テスト（初回はフォールバック）:')
  const testSubcategoryIds = [
    'ai_ml_utilization',
    'dx_strategy_transformation',
    'digital_marketing',
    'structured_thinking_mece'
  ]

  for (const id of testSubcategoryIds) {
    const name = getSubcategoryDisplayNameSync(id)
    console.log(`  "${id}" → "${name}"`)
  }

  // 少し待ってから状態確認
  console.log('\n3. 3秒後のキャッシュ状態:')
  await new Promise(resolve => setTimeout(resolve, 3000))
  console.log(getCacheStats())

  // 同期版テスト（キャッシュ済み）
  console.log('\n4. 同期版テスト（キャッシュ済み）:')
  for (const id of testSubcategoryIds) {
    const name = getSubcategoryDisplayNameSync(id)
    console.log(`  "${id}" → "${name}"`)
  }

  // 非同期版テスト
  console.log('\n5. 非同期版テスト:')
  for (const id of testSubcategoryIds) {
    const name = await getSubcategoryDisplayNameAsync(id)
    console.log(`  "${id}" → "${name}"`)
  }

  // 統合関数テスト
  console.log('\n6. 統合関数テスト:')
  const testGenres = [
    { categoryId: 'ai_digital_utilization', subcategoryId: 'ai_ml_utilization' },
    { categoryId: 'marketing_sales', subcategoryId: 'digital_marketing' },
    { categoryId: 'strategy_management', subcategoryId: 'competitive_strategy_frameworks' }
  ]

  for (const genre of testGenres) {
    const result = getCategoryInfoForGenre(genre)
    console.log(`  カテゴリー: ${result.mainCategory?.name || 'Unknown'}`)
    console.log(`  サブカテゴリー: "${genre.subcategoryId}" → "${result.subcategory}"`)
  }

  // パフォーマンステスト
  console.log('\n7. パフォーマンステスト (100回同期実行):')
  const start = Date.now()
  
  for (let i = 0; i < 100; i++) {
    getSubcategoryDisplayNameSync('ai_ml_utilization')
  }
  
  const elapsed = Date.now() - start
  console.log(`  100回実行時間: ${elapsed}ms (平均 ${elapsed/100}ms/回)`)

  // 最終状態
  console.log('\n8. 最終キャッシュ状態:')
  console.log(getCacheStats())

  console.log('\n✅ テスト完了')
}

testSimpleCache().catch(console.error)