/**
 * ケーススタディ問題のデータとマスターテーブルの整合性チェック
 *
 * 確認項目:
 * 1. industry が categories テーブル (type='industry') に存在するか
 * 2. primary_category_id が categories テーブル (type='main') に存在するか
 * 3. primary_subcategory_id が subcategories テーブルに存在するか
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('='.repeat(70))
  console.log('📊 ケーススタディ問題 マスターデータ整合性チェック')
  console.log('='.repeat(70))

  // Step 1: マスターデータを取得
  console.log('\n📋 Step 1: マスターデータ取得...')

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('category_id, name, type')

  if (catError) {
    console.error('Categories fetch error:', catError)
    return
  }

  const { data: subcategories, error: subError } = await supabase
    .from('subcategories')
    .select('subcategory_id, name, parent_category_id')

  if (subError) {
    console.error('Subcategories fetch error:', subError)
    return
  }

  // マスターデータをMapに変換
  const mainCategories = new Map()
  const industryCategories = new Map()
  categories?.forEach(c => {
    if (c.type === 'main') {
      mainCategories.set(c.category_id, c.name)
    } else if (c.type === 'industry') {
      industryCategories.set(c.category_id, c.name)
    }
  })

  const subcategoryMap = new Map()
  subcategories?.forEach(s => {
    subcategoryMap.set(s.subcategory_id, { name: s.name, parent: s.parent_category_id })
  })

  console.log(`  メインカテゴリー (type=main): ${mainCategories.size}件`)
  console.log(`  業界カテゴリー (type=industry): ${industryCategories.size}件`)
  console.log(`  サブカテゴリー: ${subcategoryMap.size}件`)

  // Step 2: ケーススタディ問題を取得
  console.log('\n📋 Step 2: ケーススタディ問題取得...')

  const { data: problems, error: probError } = await supabase
    .from('case_study_problems')
    .select('id, title, industry, primary_category_id, primary_subcategory_id')

  if (probError) {
    console.error('Problems fetch error:', probError)
    return
  }

  console.log(`  ケーススタディ問題: ${problems?.length || 0}件`)

  // Step 3: 整合性チェック
  console.log('\n' + '='.repeat(70))
  console.log('📊 Step 3: 整合性チェック')
  console.log('='.repeat(70))

  const industryIssues = []
  const categoryIssues = []
  const subcategoryIssues = []

  // 使用されている値を収集
  const usedIndustries = new Set()
  const usedCategories = new Set()
  const usedSubcategories = new Set()

  for (const problem of (problems || [])) {
    // Industry チェック
    if (problem.industry) {
      usedIndustries.add(problem.industry)
      if (!industryCategories.has(problem.industry)) {
        industryIssues.push({
          id: problem.id,
          title: problem.title,
          value: problem.industry,
          inMain: mainCategories.has(problem.industry)
        })
      }
    }

    // Category チェック
    if (problem.primary_category_id) {
      usedCategories.add(problem.primary_category_id)
      if (!mainCategories.has(problem.primary_category_id)) {
        categoryIssues.push({
          id: problem.id,
          title: problem.title,
          value: problem.primary_category_id,
          inIndustry: industryCategories.has(problem.primary_category_id)
        })
      }
    }

    // Subcategory チェック
    if (problem.primary_subcategory_id) {
      usedSubcategories.add(problem.primary_subcategory_id)
      if (!subcategoryMap.has(problem.primary_subcategory_id)) {
        subcategoryIssues.push({
          id: problem.id,
          title: problem.title,
          value: problem.primary_subcategory_id
        })
      }
    }
  }

  // === Industry レポート ===
  console.log('\n【1. Industry (業界) チェック】')
  console.log(`使用されているindustry値: ${usedIndustries.size}種類`)
  console.log('\n使用値一覧:')
  for (const ind of usedIndustries) {
    const inMaster = industryCategories.has(ind)
    const masterName = industryCategories.get(ind)
    const status = inMaster ? '✅' : '❌'
    console.log(`  ${status} "${ind}" ${inMaster ? `→ ${masterName}` : '(マスター未登録)'}`)
  }

  if (industryIssues.length > 0) {
    console.log(`\n⚠️ マスター(type=industry)に存在しない問題: ${industryIssues.length}件`)
    industryIssues.slice(0, 5).forEach(issue => {
      console.log(`  - ID ${issue.id}: "${issue.value}" ${issue.inMain ? '(※mainに存在)' : ''}`)
      console.log(`    問題: ${issue.title.substring(0, 40)}...`)
    })
    if (industryIssues.length > 5) {
      console.log(`  ... 他 ${industryIssues.length - 5}件`)
    }
  } else {
    console.log('\n✅ 全てのindustry値がマスター(type=industry)に存在します')
  }

  // === Category レポート ===
  console.log('\n【2. Primary Category チェック】')
  console.log(`使用されているcategory_id: ${usedCategories.size}種類`)
  console.log('\n使用値一覧:')
  for (const cat of usedCategories) {
    const inMaster = mainCategories.has(cat)
    const masterName = mainCategories.get(cat)
    const status = inMaster ? '✅' : '❌'
    console.log(`  ${status} "${cat}" ${inMaster ? `→ ${masterName}` : '(マスター未登録)'}`)
  }

  if (categoryIssues.length > 0) {
    console.log(`\n⚠️ マスター(type=main)に存在しない問題: ${categoryIssues.length}件`)
    categoryIssues.slice(0, 5).forEach(issue => {
      console.log(`  - ID ${issue.id}: "${issue.value}" ${issue.inIndustry ? '(※industryに存在)' : ''}`)
      console.log(`    問題: ${issue.title.substring(0, 40)}...`)
    })
    if (categoryIssues.length > 5) {
      console.log(`  ... 他 ${categoryIssues.length - 5}件`)
    }
  } else {
    console.log('\n✅ 全てのprimary_category_idがマスター(type=main)に存在します')
  }

  // === Subcategory レポート ===
  console.log('\n【3. Primary Subcategory チェック】')
  console.log(`使用されているsubcategory_id: ${usedSubcategories.size}種類`)
  console.log('\n使用値一覧:')
  for (const sub of usedSubcategories) {
    const master = subcategoryMap.get(sub)
    const status = master ? '✅' : '❌'
    console.log(`  ${status} "${sub}" ${master ? `→ ${master.name}` : '(マスター未登録)'}`)
  }

  if (subcategoryIssues.length > 0) {
    console.log(`\n⚠️ サブカテゴリーマスターに存在しない問題: ${subcategoryIssues.length}件`)
    subcategoryIssues.slice(0, 5).forEach(issue => {
      console.log(`  - ID ${issue.id}: "${issue.value}"`)
      console.log(`    問題: ${issue.title.substring(0, 40)}...`)
    })
    if (subcategoryIssues.length > 5) {
      console.log(`  ... 他 ${subcategoryIssues.length - 5}件`)
    }
  } else {
    console.log('\n✅ 全てのprimary_subcategory_idがサブカテゴリーマスターに存在します')
  }

  // === マスターデータ一覧（参考） ===
  console.log('\n' + '='.repeat(70))
  console.log('📚 マスターデータ一覧（参考）')
  console.log('='.repeat(70))

  console.log('\n【業界カテゴリー (type=industry)】')
  for (const [id, name] of industryCategories) {
    const used = usedIndustries.has(id) ? '★使用中' : ''
    console.log(`  ${id} → ${name} ${used}`)
  }

  console.log('\n【メインカテゴリー (type=main)】')
  for (const [id, name] of mainCategories) {
    const used = usedCategories.has(id) ? '★使用中' : ''
    console.log(`  ${id} → ${name} ${used}`)
  }

  // サマリー
  console.log('\n' + '='.repeat(70))
  console.log('📋 サマリー')
  console.log('='.repeat(70))
  console.log(`Industry不整合: ${industryIssues.length}件`)
  console.log(`Category不整合: ${categoryIssues.length}件`)
  console.log(`Subcategory不整合: ${subcategoryIssues.length}件`)

  if (industryIssues.length === 0 && categoryIssues.length === 0 && subcategoryIssues.length === 0) {
    console.log('\n✅ 全てのデータがマスターと整合しています')
  } else {
    console.log('\n⚠️ 不整合があります。データ修正が必要です。')
  }
}

main().catch(console.error)
