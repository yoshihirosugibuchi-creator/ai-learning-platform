import { supabase } from './supabase'

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

// Wisdom Card Functions
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
  // Check if card already exists
  const { data: existing } = await supabase
    .from('wisdom_card_collection')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()

  const now = new Date().toISOString()

  if (existing) {
    // Update existing card count
    const { data, error } = await supabase
      .from('wisdom_card_collection')
      .update({
        count: (existing.count || 0) + 1,
        last_obtained_at: now
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating wisdom card:', error)
      return { count: existing.count || 0, isNew: false }
    }

    return { count: data.count || 0, isNew: false }
  } else {
    // Add new card
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

    if (error) {
      console.error('Error adding wisdom card:', error)
      return { count: 0, isNew: false }
    }

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

// Knowledge Card Functions
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
  const numericCardId = getCardNumericId(cardId)
  const { data } = await supabase
    .from('knowledge_card_collection')
    .select('id')
    .eq('user_id', userId)
    .eq('card_id', numericCardId)
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
  const numericCardId = getCardNumericId(cardId)
  const { data } = await supabase
    .from('knowledge_card_collection')
    .select('count')
    .eq('user_id', userId)
    .eq('card_id', numericCardId)
    .single()

  return data?.count || 0
}

// Review knowledge card (increment review count and update timestamp)
export async function reviewKnowledgeCard(userId: string, cardId: string | number): Promise<boolean> {
  try {
    const numericCardId = getCardNumericId(cardId)
    const { data: existingCard } = await supabase
      .from('knowledge_card_collection')
      .select('*')
      .eq('user_id', userId)
      .eq('card_id', numericCardId)
      .single()

    if (!existingCard) {
      console.error('Knowledge card not found in collection')
      return false
    }

    const { error } = await supabase
      .from('knowledge_card_collection')
      .update({
        last_obtained_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('card_id', numericCardId)

    if (error) {
      console.error('Error updating knowledge card review:', {
        error,
        userId,
        cardId,
        numericCardId,
        existingCard
      })
      return false
    }

    console.log(`📚 Knowledge card ${cardId} (${numericCardId}) reviewed by user ${userId}`)
    return true
  } catch (error) {
    console.error('Error reviewing knowledge card:', error)
    return false
  }
}