require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const userId = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'

  // そのユーザーのquiz_answersを確認
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('category_id, subcategory_id, earned_xp')
    .eq('user_id', userId)
    .eq('category_id', 'system_integration_industry')

  console.log('📊 ユーザーのSI業界回答 (quiz_answers):')
  const grouped = {}
  for (const a of (answers || [])) {
    if (!grouped[a.subcategory_id]) grouped[a.subcategory_id] = { count: 0, xp: 0 }
    grouped[a.subcategory_id].count++
    grouped[a.subcategory_id].xp += a.earned_xp || 0
  }
  for (const [sub, data] of Object.entries(grouped)) {
    console.log(`  ${sub}: ${data.count}件, ${data.xp} XP`)
  }

  // user_subcategory_xp_stats_v2でそのユーザーのレコード全体を確認
  const { data: stats } = await supabase
    .from('user_subcategory_xp_stats_v2')
    .select('category_id, subcategory_id, total_xp')
    .eq('user_id', userId)
    .order('total_xp', { ascending: false })
    .limit(15)

  console.log('')
  console.log('📊 user_subcategory_xp_stats_v2の上位15件:')
  for (const s of (stats || [])) {
    console.log(`  ${s.category_id} / ${s.subcategory_id}: ${s.total_xp} XP`)
  }

  // SI業界のみ
  const { data: siStats } = await supabase
    .from('user_subcategory_xp_stats_v2')
    .select('subcategory_id, total_xp')
    .eq('user_id', userId)
    .eq('category_id', 'system_integration_industry')

  console.log('')
  console.log('📊 SI業界のsubcategory_xp_stats:')
  for (const s of (siStats || [])) {
    console.log(`  ${s.subcategory_id}: ${s.total_xp} XP`)
  }
}

main()
