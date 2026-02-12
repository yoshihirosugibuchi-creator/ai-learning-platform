/**
 * user_subcategory_xp_stats_v2 の整合性確認
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  // 古い不正ID
  const oldBadIds = [
    'quantitative_analysis', 'structured_thinking',
    'business_strategy_management', 'ai_digital_utilization', 'leadership_hr'
  ]

  console.log('【user_subcategory_xp_stats_v2 確認】\n')

  const { data, error } = await supabase
    .from('user_subcategory_xp_stats_v2')
    .select('subcategory_id, total_xp, quiz_questions_answered, quiz_average_accuracy')
    .limit(500)

  if (error) {
    console.log('エラー:', error.message)
    return
  }

  console.log('レコード総数:', data?.length || 0, '件')

  // サブカテゴリー別に集計
  const subcatIds = [...new Set(data?.map(d => d.subcategory_id).filter(Boolean) || [])]
  console.log('サブカテゴリー種類:', subcatIds.length, '種類\n')

  // 不正IDがあるか確認
  const badFound = subcatIds.filter(id => oldBadIds.includes(id))

  if (badFound.length > 0) {
    console.log('⚠️ 古い不正ID検出:')
    for (const badId of badFound) {
      const records = data.filter(d => d.subcategory_id === badId)
      console.log('  ❌', badId, ':', records.length, '件')
      records.forEach(r => {
        console.log('     total_xp:', r.total_xp, 'questions:', r.total_questions, 'accuracy:', r.accuracy_rate)
      })
    }
  } else {
    console.log('✅ 古い不正IDなし')
  }

  // サブカテゴリーマスタと照合
  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcategory_id, name')
    .in('subcategory_id', subcatIds)

  const subcatMap = new Map(subcategories?.map(s => [s.subcategory_id, s.name]) || [])

  console.log('\n【マスタ照合】')
  let allOk = true
  const notFound = []
  for (const id of subcatIds) {
    const name = subcatMap.get(id)
    if (!name) {
      notFound.push(id)
      allOk = false
    }
  }

  if (notFound.length > 0) {
    console.log('❌ マスター未登録:')
    for (const id of notFound) {
      const records = data.filter(d => d.subcategory_id === id)
      console.log('  ', id, ':', records.length, '件')
    }
  }

  if (allOk) {
    console.log('✅ 全てのサブカテゴリーがマスタに存在')
  }
}

check().catch(console.error)
