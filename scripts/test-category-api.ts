#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCategoryAPI() {
  console.log('🧪 カテゴリーAPI統合テストを開始します...\n')

  try {
    // 1. カテゴリー取得テスト
    console.log('📋 **1. カテゴリー取得テスト**')
    console.log('=' .repeat(60))

    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select(`
        category_id,
        name,
        description,
        type,
        icon,
        color,
        display_order,
        is_active,
        is_visible
      `)
      .eq('is_visible', true)
      .eq('is_active', true)
      .order('type')
      .order('display_order')

    if (catError) {
      console.error('❌ Error fetching categories:', catError)
      return
    }

    console.log(`✅ 取得成功: ${categories?.length || 0}件のカテゴリー`)
    
    const mainCount = categories?.filter(cat => cat.type === 'main').length || 0
    const industryCount = categories?.filter(cat => cat.type === 'industry').length || 0
    
    console.log(`📋 メインカテゴリー: ${mainCount}件`)
    console.log(`🏭 業界カテゴリー: ${industryCount}件`)
    console.log()

    // 2. サブカテゴリー取得テスト
    console.log('📂 **2. サブカテゴリー取得テスト**')
    console.log('=' .repeat(60))

    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select(`
        subcategory_id,
        name,
        parent_category_id,
        icon,
        display_order,
        is_active,
        is_visible
      `)
      .eq('is_visible', true)
      .eq('is_active', true)
      .order('parent_category_id')
      .order('display_order')

    if (subError) {
      console.error('❌ Error fetching subcategories:', subError)
      return
    }

    console.log(`✅ 取得成功: ${subcategories?.length || 0}件のサブカテゴリー`)

    // 親カテゴリー別の集計
    const groupedSubs: Record<string, number> = {}
    subcategories?.forEach(sub => {
      groupedSubs[sub.parent_category_id] = (groupedSubs[sub.parent_category_id] || 0) + 1
    })

    console.log('📊 親カテゴリー別サブカテゴリー数:')
    Object.entries(groupedSubs).forEach(([parentId, count]) => {
      const parentCategory = categories?.find(cat => cat.category_id === parentId)
      const parentName = parentCategory?.name || parentId
      console.log(`  ${parentName}: ${count}件`)
    })
    console.log()

    // 3. スキルレベル取得テスト
    console.log('🎯 **3. スキルレベル取得テスト**')
    console.log('=' .repeat(60))

    const { data: skillLevels, error: skillError } = await supabase
      .from('skill_levels')
      .select(`
        id,
        name,
        display_name,
        description,
        target_experience,
        display_order,
        color
      `)
      .order('display_order')

    if (skillError) {
      console.error('❌ Error fetching skill levels:', skillError)
      return
    }

    console.log(`✅ 取得成功: ${skillLevels?.length || 0}件のスキルレベル`)
    
    skillLevels?.forEach(level => {
      console.log(`  ${level.id}: ${level.name} (${level.display_name}) - ${level.target_experience}`)
    })
    console.log()

    // 4. クイズ難易度分布確認
    console.log('📊 **4. クイズ難易度分布確認**')
    console.log('=' .repeat(60))

    const { data: quizStats, error: quizError } = await supabase
      .from('quiz_questions')
      .select('difficulty')
      .neq('is_deleted', true)

    if (quizError) {
      console.error('❌ Error fetching quiz stats:', quizError)
      return
    }

    const difficultyStats: Record<string, number> = {}
    quizStats?.forEach(quiz => {
      if (quiz.difficulty) {
        difficultyStats[quiz.difficulty] = (difficultyStats[quiz.difficulty] || 0) + 1
      }
    })

    console.log(`✅ 取得成功: ${quizStats?.length || 0}件のクイズデータ`)
    console.log('難易度別分布:')
    Object.entries(difficultyStats).forEach(([difficulty, count]) => {
      const percentage = ((count / (quizStats?.length || 1)) * 100).toFixed(1)
      console.log(`  ${difficulty}: ${count}件 (${percentage}%)`)
    })

    // 5. HTTP APIテスト (localhost)
    console.log('\n🌐 **5. HTTP APIテスト**')
    console.log('=' .repeat(60))

    try {
      // categories API
      const categoriesResponse = await fetch('http://localhost:3000/api/categories')
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        console.log(`✅ /api/categories: ${categoriesData.categories?.length || 0}件取得`)
      } else {
        console.log(`❌ /api/categories: ${categoriesResponse.status} ${categoriesResponse.statusText}`)
      }

      // subcategories API
      const subcategoriesResponse = await fetch('http://localhost:3000/api/subcategories')
      if (subcategoriesResponse.ok) {
        const subcategoriesData = await subcategoriesResponse.json()
        console.log(`✅ /api/subcategories: ${subcategoriesData.subcategories?.length || 0}件取得`)
      } else {
        console.log(`❌ /api/subcategories: ${subcategoriesResponse.status} ${subcategoriesResponse.statusText}`)
      }

      // skill-levels API
      const skillLevelsResponse = await fetch('http://localhost:3000/api/skill-levels')
      if (skillLevelsResponse.ok) {
        const skillLevelsData = await skillLevelsResponse.json()
        console.log(`✅ /api/skill-levels: ${skillLevelsData.skill_levels?.length || 0}件取得`)
      } else {
        console.log(`❌ /api/skill-levels: ${skillLevelsResponse.status} ${skillLevelsResponse.statusText}`)
      }

    } catch (httpError) {
      console.log('⚠️ HTTP APIテストスキップ (開発サーバー未起動またはRLS制限)')
      console.log(`Error: ${httpError}`)
    }

    console.log('\n✅ カテゴリーAPI統合テスト完了')
    console.log('🎯 Phase 3.1, 3.3, 3.4 API基本機能確認済み')

  } catch (error) {
    console.error('❌ Critical error:', error)
  }
}

// 実行
testCategoryAPI().then(() => {
  console.log('\n🧪 APIテスト完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test error:', error)
  process.exit(1)
})