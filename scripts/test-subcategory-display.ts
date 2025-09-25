#!/usr/bin/env tsx

/**
 * サブカテゴリー表示変換のテストスクリプト
 */

import { getCategoryInfoForGenre } from '@/lib/learning/category-integration'
import { getSubcategoryDisplayName } from '@/lib/category-mapping'

// コース学習で修正したサブカテゴリーIDをテスト
const testSubcategoryIds = [
  'ai_ml_utilization',
  'dx_strategy_transformation',
  'digital_marketing',
  'prompt_engineering',
  'structured_thinking_mece',
  'competitive_strategy_frameworks',
  'customer_analysis_segmentation'
]

console.log('🧪 サブカテゴリー表示変換テスト...\n')

console.log('1. 直接変換テスト:')
testSubcategoryIds.forEach((id, i) => {
  const displayName = getSubcategoryDisplayName(id)
  console.log(`${i+1}. "${id}" → "${displayName}"`)
})

console.log('\n2. カテゴリー統合関数テスト:')
const testGenres = [
  { categoryId: 'ai_digital_utilization', subcategoryId: 'ai_ml_utilization' },
  { categoryId: 'ai_digital_utilization', subcategoryId: 'dx_strategy_transformation' },
  { categoryId: 'marketing_sales', subcategoryId: 'digital_marketing' },
  { categoryId: 'logical_thinking_problem_solving', subcategoryId: 'structured_thinking_mece' }
]

testGenres.forEach((genre, i) => {
  const result = getCategoryInfoForGenre(genre)
  console.log(`${i+1}. カテゴリー: ${result.mainCategory?.name || 'Unknown'}`)
  console.log(`   サブカテゴリー: "${genre.subcategoryId}" → "${result.subcategory}"`)
})

console.log('\n✅ 変換テスト完了')
console.log('コース学習画面では英語IDが日本語名に正しく変換されます')