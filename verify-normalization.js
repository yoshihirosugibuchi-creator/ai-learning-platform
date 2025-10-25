// 正規化後の検証スクリプト
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyNormalization() {
  console.log('🔍 正規化後の検証中...')
  
  try {
    // 1. learning_themesとknowledge_cardsの完全マッチング確認
    const { data: themes, error: themeError } = await supabase
      .from('learning_themes')
      .select('id, title')
      .order('id')
    
    const { data: cards, error: cardError } = await supabase
      .from('knowledge_cards')
      .select('theme_id, title, is_active')
      .order('theme_id')
    
    if (themeError || cardError) {
      console.error('❌ Error:', themeError || cardError)
      return
    }
    
    console.log('📊 マッチング結果:')
    console.log(`学習テーマ: ${themes?.length || 0}個`)
    console.log(`カードマスタ: ${cards?.length || 0}個`)
    console.log('')
    
    // 完全マッチング確認
    let perfectMatch = true
    const missingCards = []
    const extraCards = []
    
    // 各テーマにカードがあるかチェック
    themes?.forEach(theme => {
      const hasCard = cards?.find(c => c.theme_id === theme.id && c.is_active)
      if (hasCard) {
        console.log(`✅ ${theme.id}: ${theme.title} → ${hasCard.title}`)
      } else {
        console.log(`❌ ${theme.id}: ${theme.title} → カードなし`)
        missingCards.push(theme.id)
        perfectMatch = false
      }
    })
    
    // 余分なカードがないかチェック
    cards?.forEach(card => {
      if (card.is_active) {
        const hasTheme = themes?.find(t => t.id === card.theme_id)
        if (!hasTheme) {
          console.log(`⚠️ 余分なカード: ${card.theme_id} (テーマが存在しない)`)
          extraCards.push(card.theme_id)
          perfectMatch = false
        }
      }
    })
    
    console.log('')
    if (perfectMatch) {
      console.log('🎉 ✅ 完全マッチング達成！')
      console.log('✅ 全ての学習テーマにナレッジカードが対応しています')
    } else {
      console.log('❌ マッチング不完全')
      if (missingCards.length > 0) {
        console.log(`不足カード: ${missingCards.join(', ')}`)
      }
      if (extraCards.length > 0) {
        console.log(`余分カード: ${extraCards.join(', ')}`)
      }
    }
    
    // 2. カテゴリー・難易度分布確認
    console.log('\n📈 カテゴリー・難易度分布:')
    const categoryCount = {}
    const difficultyCount = {}
    
    cards?.forEach(card => {
      if (card.is_active) {
        categoryCount[card.category] = (categoryCount[card.category] || 0) + 1
        difficultyCount[card.difficulty] = (difficultyCount[card.difficulty] || 0) + 1
      }
    })
    
    console.log('カテゴリー別:')
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}枚`)
    })
    
    console.log('難易度別:')
    Object.entries(difficultyCount).forEach(([diff, count]) => {
      console.log(`  - ${diff}: ${count}枚`)
    })
    
  } catch (error) {
    console.error('❌ 検証失敗:', error)
  }
}

verifyNormalization()