require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const userId = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'

  // SI業界 (si_industry) の回答
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('subcategory_id, earned_xp, is_correct')
    .eq('user_id', userId)
    .eq('category_id', 'si_industry')

  console.log('📊 ユーザーのSI業界回答 (quiz_answers, category_id=si_industry):')
  const grouped = {}
  for (const a of (answers || [])) {
    if (!grouped[a.subcategory_id]) grouped[a.subcategory_id] = { count: 0, xp: 0, correct: 0 }
    grouped[a.subcategory_id].count++
    grouped[a.subcategory_id].xp += a.earned_xp || 0
    grouped[a.subcategory_id].correct += a.is_correct ? 1 : 0
  }
  const sorted = Object.entries(grouped).sort((a, b) => b[1].xp - a[1].xp)
  for (const [sub, data] of sorted) {
    console.log(`  ${sub}: ${data.xp} XP (${data.count}問, ${data.correct}正解)`)
  }

  // 統計テーブル
  const { data: stats } = await supabase
    .from('user_subcategory_xp_stats_v2')
    .select('subcategory_id, total_xp, quiz_questions_answered, quiz_questions_correct')
    .eq('user_id', userId)
    .eq('category_id', 'si_industry')

  console.log('')
  console.log('📊 user_subcategory_xp_stats_v2 (category_id=si_industry):')
  for (const s of (stats || [])) {
    console.log(`  ${s.subcategory_id}: ${s.total_xp} XP (${s.quiz_questions_answered}問, ${s.quiz_questions_correct}正解)`)
  }

  // generalの残存確認
  const { data: generalAnswers } = await supabase
    .from('quiz_answers')
    .select('id')
    .eq('subcategory_id', 'general')

  console.log('')
  console.log(`📊 quiz_answersに残っている general: ${(generalAnswers || []).length} 件`)
}

main()
