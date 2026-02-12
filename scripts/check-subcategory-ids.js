require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  // wisdom_cardsの全subcategory_idを取得
  const { data: cards } = await supabase
    .from('wisdom_cards')
    .select('subcategory_id')

  const uniqueIds = [...new Set(cards?.map(c => c.subcategory_id).filter(Boolean))]
  console.log('=== wisdom_cards内のユニークなsubcategory_id ===')
  console.log(`合計: ${uniqueIds.length}種類\n`)
  uniqueIds.sort().forEach(id => console.log(`  '${id}'`))

  // subcategoriesマスターを取得
  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcategory_id, name')

  console.log('\n=== subcategoriesマスター（英語ID→日本語名） ===')
  subcategories?.forEach(s => {
    console.log(`  '${s.subcategory_id}': '${s.name}',`)
  })
}

check().catch(console.error)
