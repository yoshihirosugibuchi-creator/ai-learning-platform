import { supabase } from './supabase'

// Convert string card ID to consistent numeric ID for database storage
export function getCardNumericId(cardId: string | number): number {
  if (typeof cardId === 'number') return cardId
  
  // Generate consistent hash from string
  return Math.abs(cardId.split('').reduce((a, b) => a + b.charCodeAt(0), 0))
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
    const { data, error } = await supabase
      .from('wisdom_card_collection')
      .select('*')
      .eq('user_id', userId)
      .order('obtained_at', { ascending: false })

    if (error) {
      if (error.code === '406' || error.code === '42P01' || error.message?.includes('policy')) {
        console.warn('Wisdom card collection not accessible, returning empty array')
        return []
      }
      console.error('Error fetching wisdom cards:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.warn('Exception in getUserWisdomCards:', error)
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
        count: existing.count + 1,
        last_obtained_at: now
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating wisdom card:', error)
      return { count: existing.count, isNew: false }
    }

    return { count: data.count, isNew: false }
  } else {
    // Add new card
    const { data, error } = await supabase
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

// Knowledge Card Functions
export async function getUserKnowledgeCards(userId: string): Promise<KnowledgeCardCollection[]> {
  const { data, error } = await supabase
    .from('knowledge_card_collection')
    .select('*')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false })

  if (error) {
    console.error('Error fetching knowledge cards:', error)
    return []
  }

  return data || []
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
        count: existing.count + 1,
        last_obtained_at: now
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating knowledge card:', error)
      return { count: existing.count, isNew: false }
    }

    console.log('✅ CARD COUNT UPDATED:', { cardId, numericCardId, newCount: data.count })
    return { count: data.count, isNew: false }
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
      // 406エラー、テーブル不存在、RLSエラーなどの場合はfalseを返す
      if (error.code === '406' || error.code === '42P01' || error.message?.includes('policy')) {
        return false
      }
      if (error.code === 'PGRST116') { // No rows returned
        return false
      }
      console.warn('Wisdom card check error:', error.message)
      return false
    }

    return !!data
  } catch (error) {
    console.warn('Exception in hasWisdomCard:', error)
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
      if (error.code === '406' || error.code === '42P01' || error.message?.includes('policy') || error.code === 'PGRST116') {
        return 0
      }
      console.warn('Wisdom card count error:', error.message)
      return 0
    }

    return data?.count || 0
  } catch (error) {
    console.warn('Exception in getWisdomCardCount:', error)
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
        review_count: existingCard.review_count + 1,
        last_reviewed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('card_id', numericCardId)

    if (error) {
      console.error('Error updating knowledge card review:', error)
      return false
    }

    console.log(`📚 Knowledge card ${cardId} (${numericCardId}) reviewed by user ${userId}`)
    return true
  } catch (error) {
    console.error('Error reviewing knowledge card:', error)
    return false
  }
}