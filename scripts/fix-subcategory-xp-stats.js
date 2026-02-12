/**
 * user_subcategory_xp_stats_v2 のサブカテゴリーID修正
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAPPING = {
  'quantitative_analysis': 'quantitative_analysis_statistics',
  'structured_thinking': 'structured_thinking_mece',
  'business_strategy_management': 'business_strategy',
}

async function fix() {
  console.log('【user_subcategory_xp_stats_v2 修正】\n')

  for (const [from, to] of Object.entries(MAPPING)) {
    // 対象レコード確認
    const { data: existing } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .select('id, user_id, subcategory_id, total_xp')
      .eq('subcategory_id', from)

    if (!existing || existing.length === 0) {
      console.log('スキップ:', from, '(レコードなし)')
      continue
    }

    console.log('対象:', from, '→', to, ':', existing.length, '件')

    // 更新実行
    const { error } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .update({ subcategory_id: to })
      .eq('subcategory_id', from)

    if (error) {
      console.log('  エラー:', error.message)
    } else {
      console.log('  ✅ 更新完了')
    }
  }

  console.log('\n完了')
}

fix().catch(console.error)
