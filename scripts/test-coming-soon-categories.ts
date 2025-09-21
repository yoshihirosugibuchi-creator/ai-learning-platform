#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testComingSoonCategories() {
  console.log('🔍 Coming Soonカテゴリー表示テスト開始...\n')

  try {
    // 1. アクティブなカテゴリーを取得
    console.log('📊 **1. アクティブカテゴリー取得**')
    console.log('='.repeat(50))

    const { data: activeCategories, error: activeError } = await supabase
      .from('categories')
      .select('id, name, icon, is_active, type')
      .eq('is_visible', true)
      .eq('is_active', true)
      .order('type')
      .order('display_order')

    if (activeError) {
      throw activeError
    }

    console.log(`✅ アクティブカテゴリー: ${activeCategories.length}件`)
    activeCategories.forEach(cat => {
      console.log(`  - ${cat.icon} ${cat.name} (${cat.type})`)
    })

    // 2. 非アクティブなカテゴリーを取得
    console.log('\n📊 **2. 非アクティブカテゴリー取得**')
    console.log('='.repeat(50))

    const { data: inactiveCategories, error: inactiveError } = await supabase
      .from('categories')
      .select('id, name, icon, description, is_active, type')
      .eq('is_visible', true)
      .eq('is_active', false)
      .order('type')
      .order('display_order')

    if (inactiveError) {
      throw inactiveError
    }

    console.log(`🔜 非アクティブカテゴリー: ${inactiveCategories.length}件`)
    inactiveCategories.forEach(cat => {
      console.log(`  - ${cat.icon} ${cat.name} (${cat.type})`)
      if (cat.description) {
        console.log(`    説明: ${cat.description}`)
      }
    })

    // 3. カテゴリータイプ別集計
    console.log('\n📊 **3. カテゴリータイプ別集計**')
    console.log('='.repeat(50))

    const allCategories = [...activeCategories, ...inactiveCategories]
    const byType = allCategories.reduce((acc, cat) => {
      if (!acc[cat.type]) {
        acc[cat.type] = { active: 0, inactive: 0, total: 0 }
      }
      if (cat.is_active) {
        acc[cat.type].active++
      } else {
        acc[cat.type].inactive++
      }
      acc[cat.type].total++
      return acc
    }, {} as Record<string, { active: number, inactive: number, total: number }>)

    Object.entries(byType).forEach(([type, stats]) => {
      console.log(`${type}: 総計${stats.total}件 (アクティブ: ${stats.active}, 非アクティブ: ${stats.inactive})`)
    })

    // 4. Coming Soon表示候補の確認
    console.log('\n🔜 **4. Coming Soon表示候補**')
    console.log('='.repeat(50))

    if (inactiveCategories.length === 0) {
      console.log('⚠️ Coming Soon表示対象のカテゴリーがありません')
    } else {
      console.log(`✅ ${inactiveCategories.length}件のカテゴリーがComing Soon対象`)
      console.log('これらのカテゴリーはクイズページで「近日公開予定」として表示されます:')
      inactiveCategories.forEach(cat => {
        console.log(`  🔜 ${cat.icon} ${cat.name}`)
      })
    }

    // 5. 業界カテゴリーの状況確認
    console.log('\n🏢 **5. 業界カテゴリー状況確認**')
    console.log('='.repeat(50))

    const industryCategories = allCategories.filter(cat => cat.type === 'industry')
    const activeIndustry = industryCategories.filter(cat => cat.is_active)
    const inactiveIndustry = industryCategories.filter(cat => !cat.is_active)

    console.log(`業界カテゴリー総計: ${industryCategories.length}件`)
    console.log(`  - アクティブ: ${activeIndustry.length}件`)
    console.log(`  - 非アクティブ: ${inactiveIndustry.length}件`)

    if (inactiveIndustry.length > 0) {
      console.log('\n非アクティブ業界カテゴリー（Coming Soon対象）:')
      inactiveIndustry.forEach(cat => {
        console.log(`  🔜 ${cat.icon} ${cat.name}`)
      })
    }

    console.log('\n🎉 **Coming Soonカテゴリーテスト完了！**')
    console.log('✅ クイズページでComing Soonセクションが正しく表示されるはずです')

  } catch (error) {
    console.error('❌ テストエラー:', error)
    process.exit(1)
  }
}

testComingSoonCategories().then(() => {
  console.log('\n🔄 Coming Soonカテゴリーテスト完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test error:', error)
  process.exit(1)
})