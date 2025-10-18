#!/usr/bin/env node

/**
 * カード集計の不整合を修正するスクリプト
 * user_xp_stats_v2のwisdom_cards_totalとknowledge_cards_totalを
 * 実際のコレクションテーブルの件数に合わせて修正
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixCardCounts() {
  try {
    console.log('📊 カード集計修正スクリプト開始...\n')
    
    // 全ユーザーのXP統計を取得
    const { data: users, error: usersError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, wisdom_cards_total, knowledge_cards_total')
    
    if (usersError) {
      console.error('❌ ユーザー統計取得エラー:', usersError)
      return
    }
    
    console.log(`📋 ${users.length}人のユーザーの統計を確認中...\n`)
    
    let fixedCount = 0
    
    for (const user of users) {
      // wisdom_card_collectionの実際の件数を取得
      const { count: actualWisdomCount } = await supabase
        .from('wisdom_card_collection')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
      
      // knowledge_card_collectionの実際の件数を取得
      const { count: actualKnowledgeCount } = await supabase
        .from('knowledge_card_collection')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
      
      const needsFix = 
        user.wisdom_cards_total !== actualWisdomCount ||
        user.knowledge_cards_total !== actualKnowledgeCount
      
      if (needsFix) {
        console.log(`🔧 ユーザー ${user.user_id.substring(0, 8)}... の統計を修正:`)
        console.log(`  Wisdom Cards: ${user.wisdom_cards_total} → ${actualWisdomCount}`)
        console.log(`  Knowledge Cards: ${user.knowledge_cards_total} → ${actualKnowledgeCount}`)
        
        // user_xp_stats_v2を更新
        const { error: updateError } = await supabase
          .from('user_xp_stats_v2')
          .update({
            wisdom_cards_total: actualWisdomCount || 0,
            knowledge_cards_total: actualKnowledgeCount || 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id)
        
        if (updateError) {
          console.error(`  ❌ 更新エラー:`, updateError.message)
        } else {
          console.log(`  ✅ 修正完了\n`)
          fixedCount++
        }
      }
    }
    
    console.log('=====================================')
    console.log(`📊 修正結果:`)
    console.log(`  総ユーザー数: ${users.length}`)
    console.log(`  修正が必要だった件数: ${fixedCount}`)
    console.log(`  修正不要だった件数: ${users.length - fixedCount}`)
    console.log('=====================================')
    
    // 特定ユーザーの最終確認（例：指定されたユーザー）
    const targetUserId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
    const { data: finalStats } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, wisdom_cards_total, knowledge_cards_total')
      .eq('user_id', targetUserId)
      .single()
    
    const { count: finalWisdomCount } = await supabase
      .from('wisdom_card_collection')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
    
    const { count: finalKnowledgeCount } = await supabase
      .from('knowledge_card_collection')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
    
    console.log(`\n🎯 特定ユーザー (${targetUserId.substring(0, 8)}...) の最終確認:`)
    console.log(`  Wisdom Cards - 統計: ${finalStats?.wisdom_cards_total}, 実際: ${finalWisdomCount}`)
    console.log(`  Knowledge Cards - 統計: ${finalStats?.knowledge_cards_total}, 実際: ${finalKnowledgeCount}`)
    
    if (finalStats?.wisdom_cards_total === finalWisdomCount && 
        finalStats?.knowledge_cards_total === finalKnowledgeCount) {
      console.log('  ✅ 整合性OK')
    } else {
      console.log('  ⚠️ まだ不整合があります')
    }
    
    console.log('\n✅ カード集計修正スクリプト完了')
    
  } catch (error) {
    console.error('❌ スクリプトエラー:', error)
  }
}

// スクリプト実行
fixCardCounts()