require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  // quiz_answersのカテゴリー別集計
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('category_id, subcategory_id, earned_xp')

  console.log('📊 quiz_answers カテゴリー別集計:')
  const cats = {}
  for (const a of (answers || [])) {
    if (!cats[a.category_id]) cats[a.category_id] = { count: 0, xp: 0 }
    cats[a.category_id].count++
    cats[a.category_id].xp += a.earned_xp || 0
  }
  const sorted = Object.entries(cats).sort((a, b) => b[1].xp - a[1].xp)
  for (const [cat, d] of sorted) {
    console.log(`  ${cat}: ${d.count}件, ${d.xp} XP`)
  }

  console.log('')
  console.log('📊 quiz_answers サブカテゴリー別集計 (general含む):')
  const subs = {}
  for (const a of (answers || [])) {
    if (!subs[a.subcategory_id]) subs[a.subcategory_id] = { count: 0, xp: 0 }
    subs[a.subcategory_id].count++
    subs[a.subcategory_id].xp += a.earned_xp || 0
  }
  const subSorted = Object.entries(subs).sort((a, b) => b[1].xp - a[1].xp).slice(0, 20)
  for (const [sub, d] of subSorted) {
    console.log(`  ${sub}: ${d.count}件, ${d.xp} XP`)
  }

  // 業界関連のcategory_idを探す
  console.log('')
  console.log('📊 業界関連のカテゴリー検索:')
  const industryRelated = Object.keys(cats).filter(c =>
    c.includes('industry') || c.includes('si') || c.includes('system')
  )
  console.log('  見つかったカテゴリー:', industryRelated.length > 0 ? industryRelated : 'なし')
}

main()
