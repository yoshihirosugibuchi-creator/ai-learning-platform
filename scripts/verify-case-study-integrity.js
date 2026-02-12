/**
 * ケーススタディ データ整合性検証スクリプト
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verify() {
  console.log('='.repeat(70))
  console.log('📊 修正後の整合性チェック')
  console.log('='.repeat(70))

  // サブカテゴリーマスタを取得
  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcategory_id, name')

  const subcatMap = new Map(subcategories?.map(s => [s.subcategory_id, s.name]) || [])

  // 古い不正ID
  const oldBadIds = [
    'quantitative_analysis', 'structured_thinking',
    'business_strategy_management', 'ai_digital_utilization', 'leadership_hr'
  ]

  // 1. case_study_steps の確認
  console.log('\n【1. case_study_steps】')
  const { data: steps } = await supabase
    .from('case_study_steps')
    .select('subcategory_id')

  const stepSubcats = [...new Set(steps?.map(s => s.subcategory_id).filter(Boolean) || [])]

  let stepsOk = true
  for (const id of stepSubcats) {
    const name = subcatMap.get(id)
    const status = name ? '✅' : '❌'
    console.log(`${status} ${id} ${name ? '→ ' + name : '(マスター未登録!)'}`)
    if (!name) stepsOk = false
  }
  console.log(stepsOk ? '✅ 全て整合' : '❌ 不整合あり')

  // 2. quiz_answers (case_study) の確認
  console.log('\n【2. quiz_answers (case_study)】')
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('subcategory_id')
    .eq('session_type', 'case_study')

  const answerSubcats = [...new Set(answers?.map(a => a.subcategory_id).filter(Boolean) || [])]
  console.log(`回答数: ${answers?.length || 0}件`)

  let answersOk = true
  for (const id of answerSubcats) {
    const name = subcatMap.get(id)
    const status = name ? '✅' : '❌'
    console.log(`${status} ${id} ${name ? '→ ' + name : '(マスター未登録!)'}`)
    if (!name) answersOk = false
  }
  console.log(answersOk ? '✅ 全て整合' : '❌ 不整合あり')

  // 3. XP統計テーブルの確認
  console.log('\n【3. user_category_xp_stats_v2 確認】')

  const { data: xpStats, error: xpError } = await supabase
    .from('user_category_xp_stats_v2')
    .select('subcategory_id, total_xp, total_questions')
    .limit(100)

  if (xpError) {
    console.log('エラー:', xpError.message)
  } else {
    console.log(`レコード数: ${xpStats?.length || 0}件`)

    const xpSubcats = [...new Set(xpStats?.map(x => x.subcategory_id).filter(Boolean) || [])]

    // 不正なサブカテゴリーがあるか確認
    const badInXp = xpSubcats.filter(id => oldBadIds.includes(id))
    if (badInXp.length > 0) {
      console.log('⚠️ 古い不正ID検出:', badInXp)
    } else {
      console.log('✅ 古い不正IDなし')
    }

    // サブカテゴリーがマスタにあるか確認
    let xpOk = true
    for (const id of xpSubcats) {
      const name = subcatMap.get(id)
      if (!name) {
        console.log(`❌ ${id} (マスター未登録!)`)
        xpOk = false
      }
    }
    if (xpOk && xpSubcats.length > 0) {
      console.log('✅ 全てマスタに存在')
    }
  }

  // 4. daily_xp_records の確認
  console.log('\n【4. daily_xp_records 確認】')

  const { data: dailyXp, error: dailyError } = await supabase
    .from('daily_xp_records')
    .select('category_breakdown')
    .not('category_breakdown', 'is', null)
    .limit(20)

  if (dailyError) {
    console.log('エラー:', dailyError.message)
  } else {
    console.log(`category_breakdown ありレコード: ${dailyXp?.length || 0}件`)

    // category_breakdown 内の subcategory_id を確認
    const breakdownSubcats = new Set()
    for (const record of dailyXp || []) {
      const breakdown = record.category_breakdown
      if (breakdown && typeof breakdown === 'object') {
        for (const catId of Object.keys(breakdown)) {
          const catData = breakdown[catId]
          if (catData && catData.subcategories) {
            for (const subId of Object.keys(catData.subcategories)) {
              breakdownSubcats.add(subId)
            }
          }
        }
      }
    }

    if (breakdownSubcats.size > 0) {
      const badInDaily = [...breakdownSubcats].filter(id => oldBadIds.includes(id))
      if (badInDaily.length > 0) {
        console.log('⚠️ 古い不正ID検出:', badInDaily)
      } else {
        console.log('✅ 古い不正IDなし')
      }
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log(stepsOk && answersOk ? '✅ 全てのデータが整合しています' : '⚠️ 要確認')
  console.log('='.repeat(70))
}

verify().catch(console.error)
