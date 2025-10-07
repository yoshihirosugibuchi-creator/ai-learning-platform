/**
 * 実際に使用されているサブカテゴリーIDと静的データのマッピングを確認
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

// 型エイリアス
type QuizAnswer = Database['public']['Tables']['quiz_answers']['Row']
type UserSubcategoryStats = Database['public']['Tables']['user_subcategory_xp_stats_v2']['Row']

async function checkSubcategoryIds() {
  console.log('🔍 実際に使用されているサブカテゴリーIDを確認中...')
  
  // 1. user_subcategory_xp_stats_v2 から実際のサブカテゴリーIDを取得
  const { data: subcategoryStats } = await supabaseAdmin
    .from('user_subcategory_xp_stats_v2')
    .select('subcategory_id, category_id, total_xp')
    .order('total_xp', { ascending: false })
  
  if (!subcategoryStats) {
    console.log('❌ サブカテゴリー統計が取得できませんでした')
    return
  }
  
  const typedSubcategoryStats = subcategoryStats as UserSubcategoryStats[]
  console.log(`📊 合計 ${typedSubcategoryStats.length} 件のサブカテゴリー統計レコード`)
  
  // ユニークなサブカテゴリーIDを取得
  const uniqueSubcategories = [...new Set(typedSubcategoryStats.map(s => s.subcategory_id))]
  console.log(`📝 ユニークなサブカテゴリーID: ${uniqueSubcategories.length} 個`)
  
  // カテゴリー別にグループ化
  const byCategory = new Map<string, Set<string>>()
  typedSubcategoryStats.forEach(stat => {
    if (!byCategory.has(stat.category_id)) {
      byCategory.set(stat.category_id, new Set())
    }
    byCategory.get(stat.category_id)!.add(stat.subcategory_id)
  })
  
  console.log('\n📂 カテゴリー別サブカテゴリーID:')
  Array.from(byCategory.entries()).forEach(([categoryId, subcategoryIds]) => {
    console.log(`\n🏷️ ${categoryId}:`)
    Array.from(subcategoryIds).forEach(subcatId => {
      console.log(`  - ${subcatId}`)
    })
  })
  
  // 2. 疑わしいID（英語のまま）を特定
  console.log('\n🔍 英語IDのままの可能性があるサブカテゴリー:')
  const englishLikeIds = uniqueSubcategories.filter(id => 
    id.includes('_') && 
    id.match(/^[a-z_]+$/) && 
    id !== 'category_level'
  )
  
  englishLikeIds.forEach(id => {
    const stats = subcategoryStats.filter(s => s.subcategory_id === id)
    const categories = [...new Set(stats.map(s => s.category_id))]
    console.log(`  ❓ ${id} (カテゴリー: ${categories.join(', ')})`)
  })
  
  // 3. category_level の確認
  const categoryLevelCount = subcategoryStats.filter(s => s.subcategory_id === 'category_level').length
  console.log(`\n📊 category_level レコード数: ${categoryLevelCount}`)
  
  // 4. 各カテゴリーの実際のサブカテゴリー数
  console.log('\n📈 カテゴリー別サブカテゴリー数:')
  Array.from(byCategory.entries()).forEach(([categoryId, subcategoryIds]) => {
    console.log(`  ${categoryId}: ${subcategoryIds.size}個`)
  })
}

// スクリプト実行
if (require.main === module) {
  checkSubcategoryIds()
    .then(() => {
      console.log('\n✅ サブカテゴリーID確認完了')
    })
    .catch(error => {
      console.error('❌ 確認エラー:', error)
      process.exit(1)
    })
}