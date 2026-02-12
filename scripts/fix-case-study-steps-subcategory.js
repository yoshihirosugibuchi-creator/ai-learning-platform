/**
 * case_study_steps と quiz_answers のサブカテゴリーID修正スクリプト
 *
 * 使用方法:
 *   node scripts/fix-case-study-steps-subcategory.js --dry-run
 *   node scripts/fix-case-study-steps-subcategory.js --execute
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
  console.log('  node scripts/fix-case-study-steps-subcategory.js --dry-run')
  console.log('  node scripts/fix-case-study-steps-subcategory.js --execute')
  process.exit(0)
}

// 修正マッピング
const SUBCATEGORY_MAPPING = {
  'quantitative_analysis': 'quantitative_analysis_statistics',
  'structured_thinking': 'structured_thinking_mece',
  'business_strategy_management': 'business_strategy',
  'ai_digital_utilization': 'ai_ml_utilization',
  'leadership_hr': 'organizational_development_leadership',
}

async function main() {
  console.log('='.repeat(70))
  console.log(isDryRun ? '🔍 ドライラン（プレビュー）' : '⚡ 実行モード')
  console.log('='.repeat(70))

  // Step 1: マスターデータ確認
  console.log('\n📋 Step 1: マッピング先のマスターデータ確認...')

  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcategory_id, name')

  const subcatMap = new Map(subcategories?.map(s => [s.subcategory_id, s.name]) || [])

  let allValid = true
  for (const [from, to] of Object.entries(SUBCATEGORY_MAPPING)) {
    const name = subcatMap.get(to)
    const status = name ? '✅' : '❌'
    console.log(`  ${from} → ${to} ${status} ${name ? '(' + name + ')' : '未登録!'}`)
    if (!name) allValid = false
  }

  if (!allValid) {
    console.log('  ⚠️ マスターに存在しないIDがあります。中断します。')
    return
  }

  // Step 2: 対象ステップを取得
  console.log('\n📋 Step 2: 修正対象ステップを取得...')

  const { data: steps, error } = await supabase
    .from('case_study_steps')
    .select('id, step_number, step_name, subcategory_id, problem_id')
    .in('subcategory_id', Object.keys(SUBCATEGORY_MAPPING))

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`  対象ステップ: ${steps?.length || 0}件`)

  // Step 3: 修正内容プレビュー
  console.log('\n📋 Step 3: 修正内容（case_study_steps）:')

  for (const step of steps || []) {
    const newSubcat = SUBCATEGORY_MAPPING[step.subcategory_id]
    console.log(`  - ${step.step_name}`)
    console.log(`    "${step.subcategory_id}" → "${newSubcat}"`)
  }

  // quiz_answers の対象も確認
  console.log('\n📋 Step 4: quiz_answers (session_type=case_study) 確認...')

  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('id, subcategory_id')
    .eq('session_type', 'case_study')
    .in('subcategory_id', Object.keys(SUBCATEGORY_MAPPING))

  console.log(`  対象回答: ${answers?.length || 0}件`)

  if (answers && answers.length > 0) {
    const counts = {}
    answers.forEach(a => {
      counts[a.subcategory_id] = (counts[a.subcategory_id] || 0) + 1
    })
    for (const [id, count] of Object.entries(counts)) {
      console.log(`    ${id}: ${count}件 → ${SUBCATEGORY_MAPPING[id]}`)
    }
  }

  if (isDryRun) {
    console.log('\n' + '='.repeat(70))
    console.log('🔍 ドライラン完了 - 実行には --execute を使用')
    console.log('='.repeat(70))
    return
  }

  // Step 5: case_study_steps 更新実行
  console.log('\n📋 Step 5: case_study_steps 更新実行...')

  let stepsSuccess = 0
  let stepsError = 0

  for (const step of steps || []) {
    const newSubcat = SUBCATEGORY_MAPPING[step.subcategory_id]

    const { error: updateError } = await supabase
      .from('case_study_steps')
      .update({ subcategory_id: newSubcat })
      .eq('id', step.id)

    if (updateError) {
      console.error(`  ❌ Error: ${step.id}:`, updateError.message)
      stepsError++
    } else {
      console.log(`  ✅ ${step.step_name} → ${newSubcat}`)
      stepsSuccess++
    }
  }

  console.log(`  結果: 成功 ${stepsSuccess}, エラー ${stepsError}`)

  // Step 6: quiz_answers 更新実行
  console.log('\n📋 Step 6: quiz_answers 更新実行...')

  let answersSuccess = 0
  let answersError = 0

  for (const [from, to] of Object.entries(SUBCATEGORY_MAPPING)) {
    const { error: updateError, count } = await supabase
      .from('quiz_answers')
      .update({ subcategory_id: to })
      .eq('session_type', 'case_study')
      .eq('subcategory_id', from)

    if (updateError) {
      console.error(`  ❌ Error ${from}:`, updateError.message)
      answersError++
    } else {
      console.log(`  ✅ "${from}" → "${to}"`)
      answersSuccess++
    }
  }

  console.log(`  結果: 成功 ${answersSuccess}, エラー ${answersError}`)

  console.log('\n' + '='.repeat(70))
  console.log('🎉 完了!')
  console.log('='.repeat(70))
}

main().catch(console.error)
