// ナレッジカードシステム V2: reward_card_dataベース・初回完了のみ
import { supabase } from './supabase'
// import { Json } from './database-types-official' // 不要なので削除

// reward_card_dataの型定義
export interface RewardCardData {
  id: string
  title: string
  summary: string
  keyPoints: string[]
  icon?: string
  color?: string
}

// ユーザーカード獲得記録
export interface UserKnowledgeCard {
  id: string
  user_id: string
  theme_id: string
  obtained_at: string | null
  created_at?: string | null
  // カード詳細は learning_themes.reward_card_data から取得
  card_data?: RewardCardData
  // ナビゲーション用の追加情報
  course_id?: string
  genre_id?: string
  theme_title?: string
  first_session_id?: string
  // フィルター用の追加プロパティ
  obtained?: boolean
}

// カード獲得結果
export interface KnowledgeCardAcquisitionResult {
  success: boolean
  isNew: boolean
  card?: RewardCardData
  message: string
}

// isFirstThemeCompletion関数は削除 - クライアント側判定に移行

// 🎴 ナレッジカード獲得処理（クライアント側完了判定ベース）
export async function acquireKnowledgeCard(userId: string, themeId: string, isFirstCompletion: boolean = true): Promise<KnowledgeCardAcquisitionResult> {
  try {
    console.log(`🎴 Attempting to acquire knowledge card: ${themeId} for user ${userId.substring(0, 8)}... (isFirst: ${isFirstCompletion})`)
    
    // 1. クライアント側完了判定結果を確認
    if (!isFirstCompletion) {
      return {
        success: false,
        isNew: false,
        message: 'カードは既に獲得済みです（復習時は報酬なし）'
      }
    }
    
    // 2. learning_themesからreward_card_data取得
    const { data: theme, error: themeError } = await supabase
      .from('learning_themes')
      .select('id, title, reward_card_data')
      .eq('id', themeId)
      .single()
    
    if (themeError || !theme) {
      console.warn(`⚠️ Theme not found: ${themeId}`, themeError)
      return {
        success: false,
        isNew: false,
        message: `テーマが見つかりません: ${themeId}`
      }
    }
    
    const cardData = theme.reward_card_data as unknown as RewardCardData
    if (!cardData) {
      console.warn(`⚠️ No reward card data for theme: ${themeId}`)
      return {
        success: false,
        isNew: false,
        message: `このテーマにはナレッジカードが設定されていません: ${themeId}`
      }
    }
    
    console.log(`📋 Found reward card: ${cardData.title}`)
    
    // 3. カード獲得記録を保存（重複時は無視）
    const { error: insertError } = await supabase
      .from('user_knowledge_collection_v2')
      .insert({
        user_id: userId,
        theme_id: themeId
      })
    
    if (insertError) {
      // 重複制約エラーの場合は既に獲得済み
      if (insertError.code === '23505') {
        console.log(`📚 Card already exists for theme: ${themeId} (duplicate insert)`)
        return {
          success: false,
          isNew: false,
          message: 'カードは既に獲得済みです'
        }
      }
      console.error('❌ Error saving card acquisition:', insertError)
      return {
        success: false,
        isNew: false,
        message: `カード獲得の記録に失敗: ${insertError.message}`
      }
    }
    
    // 4. user_xp_stats_v2のknowledge_cards_total統計を更新
    try {
      // 現在の統計を取得
      const { data: currentStats } = await supabase
        .from('user_xp_stats_v2')
        .select('knowledge_cards_total')
        .eq('user_id', userId)
        .single()
      
      // 統計を更新（+1増加）
      const { error: statsError } = await supabase
        .from('user_xp_stats_v2')
        .update({
          knowledge_cards_total: (currentStats?.knowledge_cards_total || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      
      if (statsError) {
        console.warn('⚠️ Failed to update knowledge_cards_total stats:', statsError)
        // 統計更新エラーでもカード獲得は成功とする
      } else {
        console.log(`📊 Updated knowledge_cards_total: ${(currentStats?.knowledge_cards_total || 0) + 1} for user ${userId}`)
      }
    } catch (statsError) {
      console.warn('⚠️ Exception updating knowledge_cards_total stats:', statsError)
    }
    
    console.log(`🎉 Knowledge card acquired: ${cardData.title}`)
    return {
      success: true,
      isNew: true,
      card: cardData,
      message: `新しいナレッジカードを獲得: ${cardData.title}`
    }
    
  } catch (error) {
    console.error('❌ Failed to acquire knowledge card:', error)
    return {
      success: false,
      isNew: false,
      message: `カード獲得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// 🗂️ ユーザーカードコレクション取得
export async function getUserKnowledgeCollection(userId: string): Promise<UserKnowledgeCard[]> {
  try {
    console.log(`🔍 Loading knowledge collection for user: ${userId.substring(0, 8)}...`)
    
    // user_knowledge_collection_v2とlearning_themesを手動でJOIN
    const { data, error } = await supabase
      .from('user_knowledge_collection_v2')
      .select('*')
      .eq('user_id', userId)
      .order('obtained_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error loading knowledge collection:', error)
      throw error
    }
    
    if (!data) {
      console.log('✅ No knowledge cards found')
      return []
    }

    // 各テーマの詳細を個別に取得
    const result: UserKnowledgeCard[] = []
    for (const item of data) {
      // テーマ詳細を取得
      const { data: themeData } = await supabase
        .from('learning_themes')
        .select('reward_card_data')
        .eq('id', item.theme_id)
        .single()
      
      result.push({
        id: item.id,
        user_id: item.user_id,
        theme_id: item.theme_id,
        obtained_at: item.obtained_at,
        created_at: item.created_at || null,
        card_data: themeData?.reward_card_data as unknown as RewardCardData
      })
    }
    
    console.log(`✅ Loaded ${result.length} knowledge cards`)
    return result
    
  } catch (error) {
    console.error('❌ Failed to get user knowledge collection:', error)
    return []
  }
}

// 📊 カードコレクション統計
export async function getKnowledgeCardStats(userId: string): Promise<{
  totalCards: number
  totalThemes: number
  completionRate: number
}> {
  try {
    // ユーザーの獲得カード数
    const { data: userCards, error: userError } = await supabase
      .from('user_knowledge_collection_v2')
      .select('theme_id')
      .eq('user_id', userId)
    
    // 全テーマ数（カードが設定されているもの）
    const { data: allThemes, error: themeError } = await supabase
      .from('learning_themes')
      .select('id')
      .not('reward_card_data', 'is', null)
    
    if (userError || themeError) {
      console.error('❌ Error getting card stats:', userError || themeError)
      return { totalCards: 0, totalThemes: 0, completionRate: 0 }
    }
    
    const totalCards = userCards?.length || 0
    const totalThemes = allThemes?.length || 0
    const completionRate = totalThemes > 0 ? Math.round((totalCards / totalThemes) * 100) : 0
    
    return { totalCards, totalThemes, completionRate }
    
  } catch (error) {
    console.error('❌ Failed to get knowledge card stats:', error)
    return { totalCards: 0, totalThemes: 0, completionRate: 0 }
  }
}

// 🎯 特定テーマのカード情報取得
export async function getThemeRewardCard(themeId: string): Promise<RewardCardData | null> {
  try {
    const { data: theme, error } = await supabase
      .from('learning_themes')
      .select('reward_card_data')
      .eq('id', themeId)
      .single()
    
    if (error || !theme) {
      console.warn(`⚠️ Theme not found: ${themeId}`)
      return null
    }
    
    return theme.reward_card_data as unknown as RewardCardData
    
  } catch (error) {
    console.error('❌ Failed to get theme reward card:', error)
    return null
  }
}