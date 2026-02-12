require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  // quiz_answersの全ユーザー
  const { data: users } = await supabase
    .from('quiz_answers')
    .select('user_id')

  const uniqueUsers = [...new Set((users || []).map(u => u.user_id))]
  console.log('quiz_answersのユーザー数:', uniqueUsers.length)
  for (const u of uniqueUsers) {
    console.log('  ', u)
  }

  // 特定ユーザーのデータ確認
  const testUserId = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
  const { data: testData, count } = await supabase
    .from('quiz_answers')
    .select('id', { count: 'exact' })
    .eq('user_id', testUserId)

  console.log('')
  console.log(`ユーザー ${testUserId.substring(0,8)} の回答数: ${count}`)

  // user_subcategory_xp_stats_v2の確認
  const { data: stats } = await supabase
    .from('user_subcategory_xp_stats_v2')
    .select('user_id, category_id, subcategory_id, total_xp')
    .eq('user_id', testUserId)
    .limit(10)

  console.log('')
  console.log('user_subcategory_xp_stats_v2:')
  for (const s of (stats || [])) {
    console.log(`  ${s.category_id}/${s.subcategory_id}: ${s.total_xp} XP`)
  }
}

main()
