// 既存のknowledge_card_collectionテーブル構造と使用状況調査
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeExistingCollection() {
  console.log('🔍 既存knowledge_card_collectionテーブル詳細調査...')
  
  try {
    // 1. テーブル構造確認（1件のデータでフィールド確認）
    console.log('📋 knowledge_card_collectionテーブル構造:')
    const { data: structure, error: structError } = await supabase
      .from('knowledge_card_collection')
      .select('*')
      .limit(1)
    
    if (structError) {
      console.log('❌ テーブルが存在しないか、アクセスエラー:', structError.message)
    } else if (structure && structure.length > 0) {
      console.log('フィールド一覧:')
      console.log(Object.keys(structure[0]))
      console.log('\nサンプルデータ:')
      console.log(structure[0])
    } else {
      console.log('📭 テーブルは存在するがデータなし')
    }
    
    // 2. 全データの概要確認
    console.log('\n📊 データ概要:')
    const { data: allData, error: allError } = await supabase
      .from('knowledge_card_collection')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (!allError && allData) {
      console.log(`Total records: ${allData.length}`)
      console.log('\n最新10件:')
      allData.forEach((record, index) => {
        console.log(`${index + 1}. User: ${record.user_id?.substring(0, 8)}, Card ID: ${record.card_id}, Obtained: ${record.obtained_at}`)
      })
      
      // card_idの分布確認
      const cardIds = allData.map(r => r.card_id).filter(Boolean)
      const uniqueCardIds = [...new Set(cardIds)]
      console.log(`\nCard ID分布: ${uniqueCardIds.length}種類`)
      console.log('Card IDs:', uniqueCardIds.sort())
    }
    
    // 3. 新しいテーブル（user_knowledge_collection_v2）の確認
    console.log('\n🆕 user_knowledge_collection_v2テーブル確認:')
    const { data: newData, error: newError } = await supabase
      .from('user_knowledge_collection_v2')
      .select('*')
      .limit(5)
    
    if (newError) {
      console.log('❌ 新テーブルエラー:', newError.message)
    } else {
      console.log(`新テーブルレコード数: ${newData?.length || 0}`)
      if (newData && newData.length > 0) {
        console.log('新テーブルフィールド:')
        console.log(Object.keys(newData[0]))
        console.log('\nサンプル:')
        newData.forEach(record => {
          console.log(`- User: ${record.user_id?.substring(0, 8)}, Theme: ${record.theme_id}, Count: ${record.count}`)
        })
      }
    }
    
    // 4. learning_themes.reward_card_dataとのID比較
    console.log('\n🔗 reward_card_dataとの関係確認:')
    const { data: themes, error: themeError } = await supabase
      .from('learning_themes')
      .select('id, title, reward_card_data')
      .not('reward_card_data', 'is', null)
    
    if (!themeError && themes) {
      console.log(`\nReward card dataを持つテーマ: ${themes.length}個`)
      themes.forEach(theme => {
        const cardData = theme.reward_card_data
        console.log(`- Theme: ${theme.id} → Card ID: ${cardData?.id || 'N/A'} (${cardData?.title || 'N/A'})`)
      })
      
      // 既存card_idとの対応確認
      if (allData && allData.length > 0) {
        console.log('\n🔍 既存card_idと新theme_idの対応分析:')
        const existingCardIds = [...new Set(allData.map(r => r.card_id))].sort()
        const rewardCardIds = themes.map(t => t.reward_card_data?.id).filter(Boolean)
        
        console.log('既存card_id:', existingCardIds)
        console.log('reward_card_data.id:', rewardCardIds)
        
        // 重複チェック
        const overlap = existingCardIds.filter(id => rewardCardIds.includes(id))
        console.log('重複:', overlap)
      }
    }
    
  } catch (error) {
    console.error('❌ 調査失敗:', error)
  }
}

analyzeExistingCollection()