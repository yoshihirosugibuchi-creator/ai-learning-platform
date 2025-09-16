import { supabase } from './supabase'

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
  const { data, error } = await supabase
    .from('wisdom_card_collection')
    .select('*')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false })

  if (error) {
    console.error('Error fetching wisdom cards:', error)
    return []
  }

  return data || []
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

export async function addKnowledgeCardToCollection(userId: string, cardId: number): Promise<{ count: number; isNew: boolean }> {
  // Check if card already exists
  const { data: existing } = await supabase
    .from('knowledge_card_collection')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()

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
      console.error('Error updating knowledge card:', error)
      return { count: existing.count, isNew: false }
    }

    return { count: data.count, isNew: false }
  } else {
    // Add new card
    const { data, error } = await supabase
      .from('knowledge_card_collection')
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
      console.error('Error adding knowledge card:', error)
      return { count: 0, isNew: false }
    }

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
  const { data } = await supabase
    .from('wisdom_card_collection')
    .select('id')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()

  return !!data
}

export async function hasKnowledgeCard(userId: string, cardId: number): Promise<boolean> {
  const { data } = await supabase
    .from('knowledge_card_collection')
    .select('id')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()

  return !!data
}

// Get card count
export async function getWisdomCardCount(userId: string, cardId: number): Promise<number> {
  const { data } = await supabase
    .from('wisdom_card_collection')
    .select('count')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()

  return data?.count || 0
}

export async function getKnowledgeCardCount(userId: string, cardId: number): Promise<number> {
  const { data } = await supabase
    .from('knowledge_card_collection')
    .select('count')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single()

  return data?.count || 0
}