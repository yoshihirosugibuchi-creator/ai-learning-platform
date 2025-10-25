// デバッグ用スクリプト：ナレッジカード問題調査
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugKnowledgeCards() {
  console.log('🔍 Debugging knowledge cards system...')
  
  try {
    // 1. 最新のcourse_theme_completion確認
    console.log('\n📋 Recent course_theme_completion records:')
    const { data: themeCompletions, error: themeError } = await supabase
      .from('course_theme_completions')
      .select('*')
      .order('first_completion_time', { ascending: false })
      .limit(5)
    
    if (themeError) {
      console.error('❌ Theme completion error:', themeError)
    } else {
      console.log(`Found ${themeCompletions?.length || 0} recent theme completions:`)
      themeCompletions?.forEach(completion => {
        console.log(`  - User: ${completion.user_id?.substring(0, 8)}, Theme: ${completion.theme_id}, Time: ${completion.first_completion_time}`)
      })
    }
    
    // 2. user_knowledge_collection_v2の確認
    console.log('\n🎴 user_knowledge_collection_v2 records:')
    const { data: knowledgeCollections, error: knowledgeError } = await supabase
      .from('user_knowledge_collection_v2')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (knowledgeError) {
      console.error('❌ Knowledge collection error:', knowledgeError)
    } else {
      console.log(`Found ${knowledgeCollections?.length || 0} knowledge collection records:`)
      knowledgeCollections?.forEach(collection => {
        console.log(`  - User: ${collection.user_id?.substring(0, 8)}, Theme: ${collection.theme_id}, Count: ${collection.count}, First: ${collection.first_obtained_at}`)
      })
    }
    
    // 3. knowledge_cardsマスタ確認
    console.log('\n📚 knowledge_cards master data:')
    const { data: masterCards, error: masterError } = await supabase
      .from('knowledge_cards')
      .select('theme_id, title, is_active')
      .order('display_order')
    
    if (masterError) {
      console.error('❌ Master cards error:', masterError)
    } else {
      console.log(`Found ${masterCards?.length || 0} master cards:`)
      masterCards?.forEach(card => {
        console.log(`  - ${card.theme_id}: ${card.title} (active: ${card.is_active})`)
      })
    }
    
    // 4. 特定のテーマでのマッチング確認
    if (themeCompletions && themeCompletions.length > 0) {
      const latestTheme = themeCompletions[0].theme_id
      console.log(`\n🎯 Checking theme_id matching for: ${latestTheme}`)
      
      const { data: matchingCard, error: matchError } = await supabase
        .from('knowledge_cards')
        .select('*')
        .eq('theme_id', latestTheme)
        .eq('is_active', true)
        .single()
      
      if (matchError) {
        console.log(`❌ No matching card found for theme_id: ${latestTheme}`)
        console.log('Error:', matchError.message)
      } else {
        console.log(`✅ Found matching card: ${matchingCard.title}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugKnowledgeCards()