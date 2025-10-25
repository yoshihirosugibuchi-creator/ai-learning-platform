// learning_themesテーブルのデータ確認
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkThemes() {
  console.log('🔍 learning_themes データ確認中...')
  
  try {
    // 1. 全テーマデータ取得
    const { data: themes, error } = await supabase
      .from('learning_themes')
      .select(`
        id,
        title,
        description,
        learning_genres (
          title,
          learning_courses (
            title
          )
        )
      `)
      .order('id')
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`📚 Found ${themes?.length || 0} learning themes:`)
    console.log('---')
    
    themes?.forEach((theme, index) => {
      console.log(`${index + 1}. ID: ${theme.id}`)
      console.log(`   Title: ${theme.title}`)
      console.log(`   Genre: ${theme.learning_genres?.title || 'N/A'}`)
      console.log(`   Course: ${theme.learning_genres?.learning_courses?.title || 'N/A'}`)
      console.log(`   Description: ${theme.description?.substring(0, 80) || 'N/A'}...`)
      console.log('')
    })
    
    // 2. 現在のknowledge_cardsと比較
    console.log('🔍 現在のknowledge_cardsマスタとの比較:')
    const { data: currentCards, error: cardError } = await supabase
      .from('knowledge_cards')
      .select('theme_id, title')
      .order('theme_id')
    
    if (!cardError && currentCards) {
      console.log(`\n📋 現在のカードマスタ (${currentCards.length}枚):`)
      currentCards.forEach(card => {
        const matchingTheme = themes?.find(t => t.id === card.theme_id)
        const status = matchingTheme ? '✅' : '❌'
        console.log(`${status} ${card.theme_id}: ${card.title}`)
      })
      
      console.log(`\n🆕 カードマスタに不足しているテーマ:`)
      themes?.forEach(theme => {
        const hasCard = currentCards.find(c => c.theme_id === theme.id)
        if (!hasCard) {
          console.log(`❌ Missing: ${theme.id} - ${theme.title}`)
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkThemes()