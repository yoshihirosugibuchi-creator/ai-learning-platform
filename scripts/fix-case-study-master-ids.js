/**
 * ケーススタディ問題のindustry/subcategory_idをマスターIDに修正
 *
 * 使用方法:
 *   node scripts/fix-case-study-master-ids.js --dry-run
 *   node scripts/fix-case-study-master-ids.js --execute
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const isDryRun = process.argv.includes('--dry-run')
const isExecute = process.argv.includes('--execute')

if (!isDryRun && !isExecute) {
  console.log('使用方法:')
  console.log('  node scripts/fix-case-study-master-ids.js --dry-run')
  console.log('  node scripts/fix-case-study-master-ids.js --execute')
  process.exit(0)
}

// Industry の修正マッピング
const INDUSTRY_MAPPING = {
  'IT': 'si_industry',
  '製造': 'manufacturing_industry',
  '小売': 'retail_consumer_industry',
  'SaaS・プロダクト業界': 'saas_product_industry',
  // 既に正しいものはそのまま
  'trading_company_industry': 'trading_company_industry',
}

// Subcategory の修正マッピング
const SUBCATEGORY_MAPPING = {
  'business_strategy_management': 'business_strategy',  // 正しいIDに修正
  'ai_digital_utilization': 'ai_ml_utilization',        // カテゴリーIDではなくサブカテゴリーIDに修正
}

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン（プレビューモード）' : '⚡ 実行モード')
  console.log('='.repeat(60))

  // Step 1: マスターデータを確認
  console.log('\n📋 Step 1: マスターデータ確認...')

  const { data: categories } = await supabase
    .from('categories')
    .select('category_id, name, type')

  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcategory_id, name')

  const industryMap = new Map()
  const mainCategoryMap = new Map()
  categories?.forEach(c => {
    if (c.type === 'industry') {
      industryMap.set(c.category_id, c.name)
    } else if (c.type === 'main') {
      mainCategoryMap.set(c.category_id, c.name)
    }
  })

  const subcategoryMap = new Map()
  subcategories?.forEach(s => {
    subcategoryMap.set(s.subcategory_id, s.name)
  })

  // マッピング先がマスターに存在するか確認
  console.log('\n📋 マッピング先の確認:')
  for (const [from, to] of Object.entries(INDUSTRY_MAPPING)) {
    const exists = industryMap.has(to)
    const name = industryMap.get(to)
    console.log(`  Industry: "${from}" → "${to}" ${exists ? `✅ (${name})` : '❌ 未登録'}`)
  }
  for (const [from, to] of Object.entries(SUBCATEGORY_MAPPING)) {
    const exists = subcategoryMap.has(to)
    const name = subcategoryMap.get(to)
    console.log(`  Subcategory: "${from}" → "${to}" ${exists ? `✅ (${name})` : '❌ 未登録'}`)
  }

  // Step 2: ケーススタディ問題を取得
  console.log('\n📋 Step 2: ケーススタディ問題取得...')

  const { data: problems, error } = await supabase
    .from('case_study_problems')
    .select('id, title, industry, primary_category_id, primary_subcategory_id')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`  取得: ${problems?.length || 0}件`)

  // Step 3: 修正対象を特定
  console.log('\n📋 Step 3: 修正対象を特定...')

  const updates = []

  for (const problem of (problems || [])) {
    const updateData = { id: problem.id }
    let needsUpdate = false

    // Industry チェック
    if (problem.industry && INDUSTRY_MAPPING[problem.industry] && INDUSTRY_MAPPING[problem.industry] !== problem.industry) {
      updateData.industry = INDUSTRY_MAPPING[problem.industry]
      updateData.old_industry = problem.industry
      needsUpdate = true
    }

    // Subcategory チェック
    if (problem.primary_subcategory_id && SUBCATEGORY_MAPPING[problem.primary_subcategory_id]) {
      updateData.primary_subcategory_id = SUBCATEGORY_MAPPING[problem.primary_subcategory_id]
      updateData.old_subcategory = problem.primary_subcategory_id
      needsUpdate = true
    }

    if (needsUpdate) {
      updateData.title = problem.title
      updates.push(updateData)
    }
  }

  console.log(`  修正対象: ${updates.length}件`)

  // Step 4: 修正内容のプレビュー
  console.log('\n📋 Step 4: 修正内容:')
  for (const update of updates) {
    console.log(`\n  📝 問題: ${update.title.substring(0, 40)}...`)
    console.log(`     ID: ${update.id}`)
    if (update.old_industry) {
      console.log(`     Industry: "${update.old_industry}" → "${update.industry}"`)
    }
    if (update.old_subcategory) {
      console.log(`     Subcategory: "${update.old_subcategory}" → "${update.primary_subcategory_id}"`)
    }
  }

  if (isDryRun) {
    console.log('\n' + '='.repeat(60))
    console.log('🔍 ドライランモード - 実行には --execute を使用')
    console.log('='.repeat(60))
    return
  }

  // Step 5: 更新実行
  console.log('\n📋 Step 5: 更新実行...')

  let successCount = 0
  let errorCount = 0

  for (const update of updates) {
    const updateFields = {}
    if (update.industry) updateFields.industry = update.industry
    if (update.primary_subcategory_id) updateFields.primary_subcategory_id = update.primary_subcategory_id

    const { error: updateError } = await supabase
      .from('case_study_problems')
      .update(updateFields)
      .eq('id', update.id)

    if (updateError) {
      console.error(`  ❌ Error updating ${update.id}:`, updateError.message)
      errorCount++
    } else {
      console.log(`  ✅ Updated: ${update.id}`)
      successCount++
    }
  }

  console.log(`\n✅ 更新完了: 成功 ${successCount}, エラー ${errorCount}`)

  // Step 6: 検証
  console.log('\n📋 Step 6: 検証...')

  const { data: verifyData } = await supabase
    .from('case_study_problems')
    .select('id, title, industry, primary_subcategory_id')

  console.log('\n更新後のデータ:')
  verifyData?.forEach(p => {
    console.log(`  ${p.title.substring(0, 30)}...`)
    console.log(`    industry: ${p.industry}`)
    console.log(`    subcategory: ${p.primary_subcategory_id}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('🎉 完了!')
  console.log('='.repeat(60))
}

main().catch(console.error)
