/**
 * ナレッジカード（学習コンテンツ報酬カード）システム
 */

export interface KnowledgeCard {
  id: string
  title: string
  summary: string
  keyPoints: string[]
  icon: string
  color: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  source: {
    courseId: string
    genreId: string
    themeId: string
  }
  obtained?: boolean
  obtainedAt?: string
}

// カード獲得管理
export interface UserKnowledgeCardCollection {
  cardId: string
  obtainedAt: string
  reviewCount: number
  lastReviewedAt?: string
}

const KNOWLEDGE_CARD_COLLECTION_KEY = 'ale_knowledge_card_collection'

// ナレッジカードコレクション管理関数（ユーザー別対応）
export function getUserKnowledgeCardCollection(userId?: string): UserKnowledgeCardCollection[] {
  try {
    if (typeof window === 'undefined') return []
    
    // User-specific storage if userId provided
    const storageKey = userId ? `${KNOWLEDGE_CARD_COLLECTION_KEY}_${userId}` : KNOWLEDGE_CARD_COLLECTION_KEY
    const data = localStorage.getItem(storageKey)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load knowledge card collection:', error)
    return []
  }
}

export function saveUserKnowledgeCardCollection(collection: UserKnowledgeCardCollection[], userId?: string): void {
  try {
    if (typeof window === 'undefined') return
    
    // User-specific storage if userId provided
    const storageKey = userId ? `${KNOWLEDGE_CARD_COLLECTION_KEY}_${userId}` : KNOWLEDGE_CARD_COLLECTION_KEY
    localStorage.setItem(storageKey, JSON.stringify(collection))
  } catch (error) {
    console.error('Failed to save knowledge card collection:', error)
  }
}

export function addKnowledgeCardToCollection(cardId: string, userId?: string): { isNew: boolean } {
  const collection = getUserKnowledgeCardCollection(userId)
  const existingCard = collection.find(c => c.cardId === cardId)
  const now = new Date().toISOString()
  
  if (existingCard) {
    // 既に獲得済みの場合は何もしない（ナレッジカードは1回のみ獲得）
    console.log(`📚 Knowledge card ${cardId} already obtained by user ${userId || 'global'}`)
    return { isNew: false }
  } else {
    const newCard: UserKnowledgeCardCollection = {
      cardId,
      obtainedAt: now,
      reviewCount: 0
    }
    collection.push(newCard)
    saveUserKnowledgeCardCollection(collection, userId)
    console.log(`🎉 New knowledge card ${cardId} added to collection for user ${userId || 'global'}`)
    return { isNew: true }
  }
}

export function hasKnowledgeCard(cardId: string, userId?: string): boolean {
  const collection = getUserKnowledgeCardCollection(userId)
  return collection.some(c => c.cardId === cardId)
}

export function reviewKnowledgeCard(cardId: string, userId?: string): void {
  const collection = getUserKnowledgeCardCollection(userId)
  const card = collection.find(c => c.cardId === cardId)
  
  if (card) {
    card.reviewCount += 1
    card.lastReviewedAt = new Date().toISOString()
    saveUserKnowledgeCardCollection(collection, userId)
  }
}

export function getKnowledgeCardCollectionStats(userId?: string) {
  const collection = getUserKnowledgeCardCollection(userId)
  
  return {
    totalCards: collection.length,
    totalReviews: collection.reduce((sum, card) => sum + card.reviewCount, 0),
    recentCards: collection
      .sort((a, b) => new Date(b.obtainedAt).getTime() - new Date(a.obtainedAt).getTime())
      .slice(0, 5)
  }
}

// カテゴリー別アイコン
export const getKnowledgeCardIcon = (category: string): string => {
  const icons: Record<string, string> = {
    '論理的思考・分析': '🧠',
    '事業戦略・企画': '🎯',
    'フレームワーク活用': '📊',
    'コミュニケーション': '💬',
    'プレゼンテーション': '🎤',
    '問題解決': '🔧',
    'データ分析': '📈',
    'プロジェクトマネジメント': '📋',
    'チーム運営': '👥',
    'マーケティング': '📢'
  }
  return icons[category] || '📚'
}

// 難易度別カラー
export const getDifficultyColor = (difficulty: KnowledgeCard['difficulty']): string => {
  switch (difficulty) {
    case 'beginner':
      return '#10B981' // green
    case 'intermediate':
      return '#F59E0B' // amber
    case 'advanced':
      return '#EF4444' // red
    default:
      return '#6B7280' // gray
  }
}