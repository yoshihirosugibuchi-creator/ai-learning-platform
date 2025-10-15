/**
 * 知識カードV2システムの型定義
 * user_knowledge_collection_v2テーブル用
 */

// データベーステーブル構造に基づく型定義（実際のスキーマ）
export interface UserKnowledgeCollectionV2 {
  id: string
  user_id: string
  theme_id: string
  obtained_at: string | null
  created_at: string | null
}

// card_dataフィールドのJSON構造
export interface KnowledgeCardData {
  title: string
  content: string
  category: string
  subcategory?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  source_theme_id: string
  acquisition_context: string
}

// コレクション表示用の型
export interface KnowledgeCardV2DisplayData {
  id: string
  theme_id: string
  title: string
  content: string
  category: string
  subcategory?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  obtained_at: string | null
  acquisition_context: string
}

// コレクション統計用の型
export interface KnowledgeCardV2Stats {
  totalCards: number
  totalAcquisitions: number
  categoryCounts: Record<string, number>
  subcategoryCounts: Record<string, number>
  difficultyCounts: Record<string, number>
  recentAcquisitions: number // 過去7日間
}

// コレクション状態管理用の型
export interface KnowledgeCollectionV2State {
  collection: UserKnowledgeCollectionV2[]
  displayCards: KnowledgeCardV2DisplayData[]
  stats: KnowledgeCardV2Stats
  loading: boolean
  error: string | null
}

// フィルター設定用の型
export interface KnowledgeCardV2Filters {
  category?: string
  subcategory?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
}

// 検索・ソート用の型
export interface KnowledgeCardV2SortOptions {
  field: 'obtained_at' | 'title' | 'category' | 'difficulty'
  order: 'asc' | 'desc'
}

// API レスポンス用の型
export interface KnowledgeCollectionV2Response {
  success: boolean
  data: UserKnowledgeCollectionV2[]
  stats: KnowledgeCardV2Stats
  total: number
  error?: string
}