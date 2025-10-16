import { supabase } from './supabase'
import { WisdomCardMaster } from './database-types-official'

// Type definitions for fallback JSON structure
interface WisdomCardFallbackData {
  wisdom_cards: WisdomCardMaster[]
  metadata: {
    version: string
    total_cards: number
    last_updated: string
    source: string
    rarity_distribution: Record<string, number>
    categories: string[]
  }
}

// Convert string card ID to consistent numeric ID for database storage
export function getCardNumericId(cardId: string | number): number {
  if (typeof cardId === 'number') return cardId
  
  // Generate consistent hash from string
  const numericId = Math.abs(cardId.split('').reduce((a, b) => a + b.charCodeAt(0), 0))
  console.log(`🔢 Card ID conversion: "${cardId}" → ${numericId}`)
  return numericId
}

// Wisdom Card Collection Types
export interface WisdomCardCollection {
  id?: string
  user_id: string
  card_id: number
  count: number
  obtained_at: string
  last_obtained_at: string
  created_at?: string
}

export interface KnowledgeCardCollection {
  id?: string
  user_id: string
  card_id: number
  count: number
  obtained_at: string
  last_obtained_at: string
  created_at?: string
}

// =============================================================================
// WISDOM CARD FALLBACK FUNCTIONS (JSON)
// =============================================================================

/**
 * フォールバック: JSONファイルから格言カードデータを取得
 * @returns Promise<WisdomCardMaster[]>
 */
async function getWisdomCardsFromJSON(): Promise<WisdomCardMaster[]> {
  try {
    console.log('📁 Loading wisdom cards from JSON fallback...')
    const response = await fetch('/data/wisdom-cards-fallback.json')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data: WisdomCardFallbackData = await response.json()
    console.log(`✅ Successfully loaded ${data.wisdom_cards.length} cards from JSON fallback`)
    
    return data.wisdom_cards
  } catch (error) {
    console.error('❌ Error loading wisdom cards from JSON:', error)
    throw error
  }
}


// =============================================================================
// WISDOM CARD MASTER DATA FUNCTIONS (Unified with Fallback)
// =============================================================================

/**
 * 統合版: 格言カード取得（DB → JSON の2段階フォールバック）
 * @returns Promise<WisdomCardMaster[]>
 */
export async function getWisdomCardsWithFallback(): Promise<WisdomCardMaster[]> {
  try {
    // Primary: Database
    console.log('🎯 Attempting database access for wisdom cards...')
    return await getAllWisdomCardsFromDB()
  } catch (dbError) {
    console.warn('⚠️ Database access failed, using JSON fallback:', dbError)
    
    // Fallback: JSON (ネットワーク障害でも動作)
    return await getWisdomCardsFromJSON()
  }
}

/**
 * 統合版: IDで特定の格言カード取得（フォールバック対応）
 * @param cardId - カードID
 * @returns Promise<WisdomCardMaster | null>
 */
export async function getWisdomCardByIdWithFallback(cardId: number): Promise<WisdomCardMaster | null> {
  try {
    // Primary: Database
    return await getWisdomCardByIdFromDB(cardId)
  } catch (dbError) {
    console.warn('⚠️ Database access failed for card ID, using JSON fallback:', dbError)
    
    // Fallback: JSON
    const allCards = await getWisdomCardsFromJSON()
    return allCards.find(card => card.id === cardId) || null
  }
}

/**
 * 統合版: レアリティ別格言カード取得（フォールバック対応）
 * @param rarity - レアリティ
 * @returns Promise<WisdomCardMaster[]>
 */
export async function getWisdomCardsByRarityWithFallback(rarity: string): Promise<WisdomCardMaster[]> {
  try {
    // Primary: Database
    return await getWisdomCardsByRarityFromDB(rarity)
  } catch (dbError) {
    console.warn('⚠️ Database access failed for rarity filter, using JSON fallback:', dbError)
    
    // Fallback: JSON
    const allCards = await getWisdomCardsFromJSON()
    return allCards.filter(card => card.rarity === rarity)
  }
}

// =============================================================================
// WISDOM CARD MASTER DATA FUNCTIONS (DB Version - Raw)
// =============================================================================

/**
 * DB版: 全ての格言カードマスターデータを取得
 * @returns Promise<WisdomCardMaster[]> - アクティブなカードのみ、表示順序でソート
 */
export async function getAllWisdomCardsFromDB(): Promise<WisdomCardMaster[]> {
  try {
    console.log('🔍 Fetching wisdom cards from database...')
    const { data, error } = await supabase
      .from('wisdom_cards')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('❌ Error fetching wisdom cards from DB:', error)
      throw error
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} wisdom cards from DB`)
    return data || []
  } catch (error) {
    console.error('⚠️ Exception in getAllWisdomCardsFromDB:', error)
    throw error
  }
}

/**
 * DB版: IDで特定の格言カードマスターデータを取得
 * @param cardId - カードID
 * @returns Promise<WisdomCardMaster | null>
 */
export async function getWisdomCardByIdFromDB(cardId: number): Promise<WisdomCardMaster | null> {
  try {
    console.log(`🔍 Fetching wisdom card ID ${cardId} from database...`)
    const { data, error } = await supabase
      .from('wisdom_cards')
      .select('*')
      .eq('id', cardId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        console.log(`ℹ️ Wisdom card ID ${cardId} not found`)
        return null
      }
      console.error('❌ Error fetching wisdom card by ID:', error)
      throw error
    }

    console.log(`✅ Successfully fetched wisdom card ID ${cardId}`)
    return data
  } catch (error) {
    console.error('⚠️ Exception in getWisdomCardByIdFromDB:', error)
    throw error
  }
}

/**
 * DB版: レアリティ別格言カード取得
 * @param rarity - レアリティ ('コモン' | 'レア' | 'エピック' | 'レジェンダリー')
 * @returns Promise<WisdomCardMaster[]>
 */
export async function getWisdomCardsByRarityFromDB(rarity: string): Promise<WisdomCardMaster[]> {
  try {
    console.log(`🔍 Fetching wisdom cards with rarity: ${rarity}`)
    const { data, error } = await supabase
      .from('wisdom_cards')
      .select('*')
      .eq('rarity', rarity)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('❌ Error fetching wisdom cards by rarity:', error)
      throw error
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} ${rarity} wisdom cards`)
    return data || []
  } catch (error) {
    console.error('⚠️ Exception in getWisdomCardsByRarityFromDB:', error)
    throw error
  }
}

/**
 * DB版: カテゴリー別格言カード取得
 * @param categoryId - カテゴリーID
 * @returns Promise<WisdomCardMaster[]>
 */
export async function getWisdomCardsByCategoryFromDB(categoryId: string): Promise<WisdomCardMaster[]> {
  try {
    console.log(`🔍 Fetching wisdom cards for category: ${categoryId}`)
    const { data, error } = await supabase
      .from('wisdom_cards')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('❌ Error fetching wisdom cards by category:', error)
      throw error
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} wisdom cards for category ${categoryId}`)
    return data || []
  } catch (error) {
    console.error('⚠️ Exception in getWisdomCardsByCategoryFromDB:', error)
    throw error
  }
}

// =============================================================================
// WISDOM CARD COLLECTION FUNCTIONS (User Data)
// =============================================================================
export async function getUserWisdomCards(userId: string): Promise<WisdomCardCollection[]> {
  try {
    console.log('🔍 Attempting to fetch wisdom cards for user:', userId)
    const { data, error } = await supabase
      .from('wisdom_card_collection')
      .select('*')
      .eq('user_id', userId)
      .order('obtained_at', { ascending: false })

    if (error) {
      console.log('❌ Wisdom card fetch error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      if (error.code === '406' || error.code === '42P01' || error.message?.includes('policy') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('🚫 Wisdom card collection not accessible, returning empty array')
        return []
      }
      console.error('Error fetching wisdom cards:', error)
      return []
    }

    console.log('✅ Wisdom cards fetched successfully:', data?.length || 0)
    // DBデータをWisdomCardCollection形式に変換
    return (data || []).map(card => ({
      id: card.id,
      user_id: card.user_id,
      card_id: card.card_id,
      count: card.count || 0,
      obtained_at: card.obtained_at || new Date().toISOString(),
      last_obtained_at: card.last_obtained_at || new Date().toISOString(),
      created_at: card.created_at || undefined
    }))
  } catch (error) {
    console.warn('⚠️ Exception in getUserWisdomCards:', error)
    return []
  }
}

export async function addWisdomCardToCollection(userId: string, cardId: number): Promise<{ count: number; isNew: boolean }> {
  console.log('🔍 Starting addWisdomCardToCollection:', { userId: userId.substring(0, 8) + '...', cardId })
  
  // Check if card already exists
  const selectStartTime = performance.now()
  const { data: existing } = await supabase
    .from('wisdom_card_collection')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()
  const selectTime = performance.now() - selectStartTime
  console.log('⏱️ SELECT query time:', `${selectTime.toFixed(2)}ms`)

  const now = new Date().toISOString()

  if (existing) {
    // Update existing card count
    const updateStartTime = performance.now()
    const { data, error } = await supabase
      .from('wisdom_card_collection')
      .update({
        count: (existing.count || 0) + 1,
        last_obtained_at: now
      })
      .eq('id', existing.id)
      .select()
      .single()
    const updateTime = performance.now() - updateStartTime
    console.log('⏱️ UPDATE query time:', `${updateTime.toFixed(2)}ms`)

    if (error) {
      console.error('Error updating wisdom card:', error)
      return { count: existing.count || 0, isNew: false }
    }

    console.log('✅ Card updated successfully:', { newCount: data.count, totalTime: `${(selectTime + updateTime).toFixed(2)}ms` })
    return { count: data.count || 0, isNew: false }
  } else {
    // Add new card
    const insertStartTime = performance.now()
    const { data: _data, error } = await supabase
      .from('wisdom_card_collection')
      .insert([{
        user_id: userId,
        card_id: cardId,
        count: 1,
        obtained_at: now,
        last_obtained_at: now
      }])
      .select()
      .single()
    const insertTime = performance.now() - insertStartTime
    console.log('⏱️ INSERT query time:', `${insertTime.toFixed(2)}ms`)

    if (error) {
      console.error('Error adding wisdom card:', error)
      return { count: 0, isNew: false }
    }

    console.log('✅ New card added successfully:', { totalTime: `${(selectTime + insertTime).toFixed(2)}ms` })
    return { count: 1, isNew: true }
  }
}

export async function getWisdomCardStats(userId: string) {
  const cards = await getUserWisdomCards(userId)
  
  return {
    totalObtained: cards.length,
    totalCards: cards.reduce((sum, card) => sum + card.count, 0),
    uniqueCards: cards.length
  }
}

// Migrate old localStorage keys to new user ID
function migrateLocalStorageCards(oldUserId: string, newUserId: string) {
  if (typeof window === 'undefined' || !window.localStorage) return
  
  try {
    const oldKeys = Object.keys(localStorage).filter(key => 
      key.startsWith(`knowledge_card_${oldUserId}_`)
    )
    
    console.log(`🔄 Migrating ${oldKeys.length} localStorage cards from ${oldUserId} to ${newUserId}`)
    
    oldKeys.forEach(oldKey => {
      const cardData = localStorage.getItem(oldKey)
      if (cardData) {
        try {
          const parsed = JSON.parse(cardData)
          parsed.user_id = newUserId // Update user_id
          
          // Create new key with new user ID
          const cardId = oldKey.split('_').pop()
          const newKey = `knowledge_card_${newUserId}_${cardId}`
          
          localStorage.setItem(newKey, JSON.stringify(parsed))
          localStorage.removeItem(oldKey) // Remove old key
          
          console.log(`✅ Migrated card: ${oldKey} → ${newKey}`)
        } catch (error) {
          console.error(`❌ Failed to migrate card ${oldKey}:`, error)
        }
      }
    })
  } catch (error) {
    console.error('❌ Error during localStorage migration:', error)
  }
}

import { UserKnowledgeCollectionV2 } from './types/knowledge-cards-v2'

// Knowledge Card Functions - V2 System
export async function getUserKnowledgeCollection(userId: string): Promise<UserKnowledgeCollectionV2[]> {
  const { data, error } = await supabase
    .from('user_knowledge_collection_v2')
    .select('id, user_id, theme_id, obtained_at, created_at')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false })

  if (error) {
    console.error('Error fetching knowledge collection V2:', error)
    return []
  }

  return (data || []) as UserKnowledgeCollectionV2[]
}

// Legacy Knowledge Card Functions - V1 System (for backward compatibility)
export async function getUserKnowledgeCards(userId: string): Promise<KnowledgeCardCollection[]> {
  // Migrate old test-user-123 cards if they exist
  if (userId === '550e8400-e29b-41d4-a716-446655440000') {
    migrateLocalStorageCards('test-user-123', userId)
  }
  const { data, error } = await supabase
    .from('knowledge_card_collection')
    .select('*')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false })

  if (error) {
    console.error('Error fetching knowledge cards:', error)
    
    // Fallback to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const localCards: KnowledgeCardCollection[] = []
        // Also check for old test-user-123 keys for backward compatibility
        const localStorageKeys = Object.keys(localStorage).filter(key => 
          key.startsWith(`knowledge_card_${userId}_`) || 
          key.startsWith('knowledge_card_test-user-123_')
        )
        
        localStorageKeys.forEach(key => {
          try {
            const cardData = localStorage.getItem(key)
            if (cardData) {
              const parsedCard = JSON.parse(cardData)
              // Update user_id to current user for compatibility
              parsedCard.user_id = userId
              localCards.push(parsedCard)
            }
          } catch (parseError) {
            console.error('Error parsing localStorage card data:', parseError)
          }
        })
        
        console.log(`📱 Loaded ${localCards.length} knowledge cards from localStorage for user ${userId}`)
        return localCards
      } catch (localError) {
        console.error('Error loading from localStorage:', localError)
        return []
      }
    }
    
    return []
  }

  // DBデータをKnowledgeCardCollection形式に変換
  return (data || []).map(card => ({
    id: card.id,
    user_id: card.user_id || '',
    card_id: card.card_id,
    count: card.count || 0,
    obtained_at: card.obtained_at || new Date().toISOString(),
    last_obtained_at: card.last_obtained_at || new Date().toISOString(),
    created_at: card.created_at || undefined
  }))
}

// LEGACY: Use acquireKnowledgeCard from knowledge-cards-v2.ts instead
export async function addKnowledgeCardToCollection(userId: string, cardId: string | number): Promise<{ count: number; isNew: boolean }> {
  const numericCardId = getCardNumericId(cardId)
  
  console.log('🔍 CARD ACQUISITION ATTEMPT:', {
    originalCardId: cardId,
    numericCardId,
    userId
  })
  
  // Check if card already exists
  const { data: existing } = await supabase
    .from('knowledge_card_collection')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', numericCardId)
    .single()
    
  console.log('🔍 EXISTING CARD CHECK:', { existing, numericCardId, userId })

  const now = new Date().toISOString()

  if (existing) {
    // Update existing card count
    const { data, error } = await supabase
      .from('knowledge_card_collection')
      .update({
        count: (existing.count || 0) + 1,
        last_obtained_at: now
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating knowledge card:', error)
      return { count: existing.count || 0, isNew: false }
    }

    console.log('✅ CARD COUNT UPDATED:', { cardId, numericCardId, newCount: data.count })
    return { count: data.count || 0, isNew: false }
  } else {
    // Add new card
    const { data, error } = await supabase
      .from('knowledge_card_collection')
      .insert([{
        user_id: userId,
        card_id: numericCardId,
        count: 1,
        obtained_at: now,
        last_obtained_at: now
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Error adding knowledge card:', error)
      console.error('❌ Insert error details:', { error, cardId, numericCardId, userId })
      
      // Fallback to localStorage if database fails
      console.warn('⚠️ Database failed, using localStorage fallback for card acquisition')
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          // Check if card already exists in localStorage (including old test-user-123 keys)
          const existingKeys = Object.keys(localStorage).filter(key => 
            key.includes(`_${numericCardId}`) && 
            (key.startsWith(`knowledge_card_${userId}_`) || key.startsWith('knowledge_card_test-user-123_'))
          )
          
          if (existingKeys.length > 0) {
            console.log('📱 Card already exists in localStorage:', existingKeys[0])
            return { count: 1, isNew: false }
          }
          
          const localKey = `knowledge_card_${userId}_${numericCardId}`
          const cardData = {
            user_id: userId,
            card_id: numericCardId,
            count: 1,
            obtained_at: new Date().toISOString(),
            last_obtained_at: new Date().toISOString()
          }
          localStorage.setItem(localKey, JSON.stringify(cardData))
          console.log('💾 Knowledge card saved to localStorage:', { cardId, numericCardId, userId })
          return { count: 1, isNew: true }
        } catch (localError) {
          console.error('Failed to save card to localStorage:', localError)
        }
      }
      return { count: 0, isNew: false }
    }

    console.log('🎉 NEW CARD ADDED TO COLLECTION:', { cardId, numericCardId, userId, data })
    return { count: 1, isNew: true }
  }
}

export async function getKnowledgeCardStats(userId: string) {
  const cards = await getUserKnowledgeCards(userId)
  
  return {
    totalObtained: cards.length,
    totalCards: cards.reduce((sum, card) => sum + card.count, 0),
    uniqueCards: cards.length
  }
}

// Check if user has specific card
export async function hasWisdomCard(userId: string, cardId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('wisdom_card_collection')
      .select('id')
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .single()

    if (error) {
      // 詳細なエラー情報をログ出力（デバッグ用）
      if (error.code === '406') {
        console.log('🚫 406 Error in hasWisdomCard:', {
          code: error.code,
          message: error.message,
          details: error.details,
          userId,
          cardId
        })
      }
      
      // 406エラー、テーブル不存在、RLSエラーなどの場合はfalseを返す
      if (error.code === '406' || error.code === '42P01' || error.message?.includes('policy') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return false
      }
      if (error.code === 'PGRST116') { // No rows returned
        return false
      }
      // その他のエラーのみログ出力
      console.warn('Wisdom card check error:', error.message)
      return false
    }

    return !!data
  } catch (_error) {
    // ネットワークエラーやその他の例外は静かに処理
    return false
  }
}

export async function hasKnowledgeCard(userId: string, cardId: string | number): Promise<boolean> {
  // V2システム: themeIdベースで確認
  const themeId = typeof cardId === 'string' ? cardId : `theme_${cardId}`
  const { data } = await supabase
    .from('user_knowledge_collection_v2')
    .select('theme_id')
    .eq('user_id', userId)
    .eq('theme_id', themeId)
    .single()

  return !!data
}

// Get card count
export async function getWisdomCardCount(userId: string, cardId: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('wisdom_card_collection')
      .select('count')
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .single()

    if (error) {
      if (error.code === '406' || error.code === '42P01' || error.message?.includes('policy') || error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return 0
      }
      console.warn('Wisdom card count error:', error.message)
      return 0
    }

    return data?.count || 0
  } catch (_error) {
    // ネットワークエラーやその他の例外は静かに処理
    return 0
  }
}

export async function getKnowledgeCardCount(userId: string, cardId: string | number): Promise<number> {
  // V2システム: themeIdベースで検索
  const themeId = typeof cardId === 'string' ? cardId : `theme_${cardId}`
  const { data } = await supabase
    .from('user_knowledge_collection_v2')
    .select('*')
    .eq('user_id', userId)
    .eq('theme_id', themeId)
    .single()

  return data ? 1 : 0 // V2では獲得済み(1)か未獲得(0)
}

// Review knowledge card (update review timestamp in V2 system)
export async function reviewKnowledgeCard(userId: string, cardId: string | number): Promise<boolean> {
  try {
    // V2システム: themeIdベースで検索・更新
    const themeId = typeof cardId === 'string' ? cardId : `theme_${cardId}`
    
    const { data: existingCard } = await supabase
      .from('user_knowledge_collection_v2')
      .select('*')
      .eq('user_id', userId)
      .eq('theme_id', themeId)
      .single()

    if (!existingCard) {
      console.error('Knowledge card not found in V2 collection:', { userId, themeId })
      return false
    }

    // V2テーブルには obtained_at フィールドがあるので、それを更新
    const { error } = await supabase
      .from('user_knowledge_collection_v2')
      .update({
        obtained_at: new Date().toISOString() // V2では obtained_at フィールドを更新
      })
      .eq('user_id', userId)
      .eq('theme_id', themeId)

    if (error) {
      console.error('Error updating knowledge card review in V2:', {
        error,
        userId,
        cardId,
        themeId,
        existingCard
      })
      return false
    }

    console.log(`📚 Knowledge card ${cardId} (${themeId}) reviewed by user ${userId}`)
    return true
  } catch (error) {
    console.error('Error reviewing knowledge card:', error)
    return false
  }
}