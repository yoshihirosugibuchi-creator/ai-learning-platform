// learning_themes.reward_card_dataの調査
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigateRewardCardData() {
  console.log('🔍 learning_themes.reward_card_data調査...')
  
  try {
    // 1. learning_themesの全フィールド確認
    const { data: themeStructure, error: structError } = await supabase
      .from('learning_themes')
      .select('*')
      .limit(1)
    
    if (!structError && themeStructure) {
      console.log('📋 learning_themesの全フィールド:')
      console.log(Object.keys(themeStructure[0]))
      console.log('')
    }
    
    // 2. reward_card_dataが設定されているテーマ確認
    console.log('🎯 reward_card_dataが設定されているテーマ:')
    const { data: themesWithReward, error: rewardError } = await supabase
      .from('learning_themes')
      .select('id, title, reward_card_data')
      .not('reward_card_data', 'is', null)
    
    if (!rewardError && themesWithReward) {
      console.log(`Found ${themesWithReward.length} themes with reward_card_data:`)
      themesWithReward.forEach(theme => {
        console.log(`\n- ${theme.id}: ${theme.title}`)
        console.log(`  reward_card_data:`, theme.reward_card_data)
      })
    } else {
      console.log('reward_card_dataが設定されているテーマなし')
    }
    
    // 3. learning_themesとlearning_genresの関係確認
    console.log('\n🔗 learning_themes → learning_genres関係:')
    const { data: themeGenreRelation, error: relationError } = await supabase
      .from('learning_themes')
      .select(`
        id,
        title,
        genre_id,
        learning_genres (
          id,
          title,
          course_id,
          category_id,
          subcategory_id,
          learning_courses (
            id,
            title,
            difficulty
          )
        )
      `)
      .limit(3)
    
    if (!relationError && themeGenreRelation) {
      themeGenreRelation.forEach(theme => {
        console.log(`\nテーマ: ${theme.id}`)
        console.log(`  ジャンル: ${theme.learning_genres?.title}`)
        console.log(`  コース: ${theme.learning_genres?.learning_courses?.title}`)
        console.log(`  コース難易度: ${theme.learning_genres?.learning_courses?.difficulty}`)
        console.log(`  category_id: ${theme.learning_genres?.category_id}`)
        console.log(`  subcategory_id: ${theme.learning_genres?.subcategory_id}`)
      })
    }
    
    // 4. XP設定の正確な構造確認
    console.log('\n💎 XP設定の詳細確認:')
    const { data: xpDetails, error: xpDetailError } = await supabase
      .from('xp_level_skp_settings')
      .select('*')
      .order('level')
      .limit(3)
    
    if (!xpDetailError && xpDetails) {
      console.log('XP設定詳細:')
      xpDetails.forEach(setting => {
        console.log(setting)
      })
    }
    
  } catch (error) {
    console.error('❌ 調査失敗:', error)
  }
}

investigateRewardCardData()