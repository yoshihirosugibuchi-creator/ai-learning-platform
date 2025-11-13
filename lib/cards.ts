export interface WisdomCard {
  id: number
  author: string
  quote: string
  categoryId: string // 共通のカテゴリーID (e.g., 'communication_presentation')
  subcategoryId?: string // サブカテゴリーID (optional)
  rarity: 'コモン' | 'レア' | 'エピック' | 'レジェンダリー'
  context: string
  applicationArea: string
  obtained?: boolean
  count?: number
}

// Type adapter for DB-sourced data
import { WisdomCardMaster } from './database-types-official'

/**
 * WisdomCardMaster (DB) → WisdomCard (legacy interface) 変換
 * 既存コンポーネント互換性のため
 */
export function convertWisdomCardMasterToLegacy(dbCard: WisdomCardMaster): WisdomCard {
  return {
    id: dbCard.id,
    author: dbCard.author,
    quote: dbCard.quote,
    categoryId: dbCard.category_id,
    subcategoryId: dbCard.subcategory_id || undefined,
    rarity: dbCard.rarity as 'コモン' | 'レア' | 'エピック' | 'レジェンダリー',
    context: dbCard.context,
    applicationArea: dbCard.application_area,
    obtained: undefined, // User-specific data, handled separately
    count: undefined     // User-specific data, handled separately
  }
}

export const wisdomCards: WisdomCard[] = [
  {
    id: 1,
    author: "ピーター・ドラッカー",
    quote: "効果的であることと効率的であることは別物である",
    categoryId: "strategy_management",
    subcategoryId: "経営戦略・事業戦略",
    rarity: "レア",
    context: "現代経営学の父が説いた本質的な教え",
    applicationArea: "戦略思考・優先順位設定"
  },
  {
    id: 2,
    author: "スティーブ・ジョブズ",
    quote: "顧客が何を望んでいるかを知るのは顧客の仕事ではない",
    categoryId: "strategy_management",
    subcategoryId: "新事業開発・イノベーション",
    rarity: "エピック",
    context: "iPhone開発時の革新的思考を表した言葉",
    applicationArea: "プロダクト開発・市場創造"
  },
  {
    id: 3,
    author: "ウォーレン・バフェット",
    quote: "リスクは自分が何をやっているかよくわからない時に起こる",
    categoryId: "finance",
    subcategoryId: "財務分析・企業価値評価",
    rarity: "レア",
    context: "オマハの賢人による投資哲学の核心",
    applicationArea: "リスク分析・意思決定"
  },
  {
    id: 4,
    author: "ジャック・ウェルチ",
    quote: "変化に対応できない者は取り残される",
    categoryId: "leadership_hr",
    subcategoryId: "組織開発・変革リーダーシップ",
    rarity: "エピック",
    context: "GE社の大変革を指導した経験から",
    applicationArea: "組織変革・適応力"
  },
  {
    id: 5,
    author: "マイケル・ポーター",
    quote: "競争優位は差別化から生まれる",
    categoryId: "strategy_management",
    subcategoryId: "競争戦略・フレームワーク",
    rarity: "レジェンダリー",
    context: "競争戦略論の第一人者による核心的洞察",
    applicationArea: "戦略立案・競争分析"
  },
  {
    id: 6,
    author: "豊田佐吉",
    quote: "改善に終わりはない",
    categoryId: "business_process_analysis",
    subcategoryId: "プロセス設計・最適化",
    rarity: "コモン",
    context: "トヨタ生産システムの根幹思想",
    applicationArea: "継続改善・品質向上"
  },
  {
    id: 7,
    author: "イーロン・マスク",
    quote: "失敗はオプションであり、挑戦しないことはそうではない",
    categoryId: "strategy_management",
    subcategoryId: "新事業開発・イノベーション",
    rarity: "エピック",
    context: "TeslaとSpaceXで革新を起こした起業家の哲学",
    applicationArea: "リスクテイキング・起業家精神"
  },
  {
    id: 8,
    author: "シェリル・サンドバーグ",
    quote: "テーブルに着けないなら、自分でテーブルを作れ",
    categoryId: "leadership_hr",
    subcategoryId: "チームマネジメント・モチベーション",
    rarity: "レア",
    context: "Facebook COOとして女性のキャリアを切り開いたメッセージ",
    applicationArea: "キャリア開発・機会創造"
  },
  {
    id: 9,
    author: "稲盛和夫",
    quote: "心を高める、経営を伸ばす",
    categoryId: "leadership_hr",
    subcategoryId: "組織開発・変革リーダーシップ",
    rarity: "レジェンダリー",
    context: "京セラ創業者が掲げた人間性と事業成長の関係性",
    applicationArea: "リーダーシップ・人格形成"
  },
  {
    id: 10,
    author: "フィル・ナイト",
    quote: "ブランドとは顧客が企業について語る物語である",
    categoryId: "marketing_sales",
    subcategoryId: "ブランディング・ポジショニング",
    rarity: "エピック",
    context: "Nike創業者のブランド構築に対する本質的洞察",
    applicationArea: "ブランド戦略・顧客体験"
  },
  {
    id: 11,
    author: "レイ・ダリオ",
    quote: "原則を持つことで、何をすべきかが明確になる",
    categoryId: "logical_thinking_problem_solving",
    subcategoryId: "構造化思考（MECE・ロジックツリー）",
    rarity: "レア",
    context: "世界最大のヘッジファンド創設者の意思決定哲学",
    applicationArea: "投資判断・戦略立案"
  },
  {
    id: 12,
    author: "孫正義",
    quote: "登りたい山を決める、これで人生の半分が決まる",
    categoryId: "strategy_management",
    subcategoryId: "経営戦略・事業戦略",
    rarity: "エピック",
    context: "ソフトバンク創業者のビジョン経営論",
    applicationArea: "目標設定・戦略立案"
  }
]

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    // New subcategories
    '事業戦略・企画': '🎯',
    'オペレーション・業務改善': '⚙️',
    '市場分析・競合調査': '📊',
    'イノベーション手法': '💡',
    '新規事業開発': '🚀',
    'クリエイティブ思考': '🎨',
    'チーム運営・人材育成': '👥',
    'プロジェクトマネジメント': '📋',
    '組織開発・変革': '🔄',
    'プレゼンテーション': '🎤',
    'セールス・マーケティング': '📈',
    '交渉・調整': '🤝',
    '論理的思考・分析': '🧠',
    '財務・会計分析': '💰',
    'データ分析・解釈': '📊',
    'DX・IT戦略': '💻',
    'データ活用・AI': '🤖',
    'デジタルツール活用': '🔧',
    '危機管理・BCP': '🛡️',
    'リスクアセスメント': '⚖️',
    'コンプライアンス': '📋',
    // Fallback for old categories (backward compatibility)
    '経営戦略': '🎯',
    'イノベーション': '💡',
    '投資・リスク管理': '📈',
    '変革リーダーシップ': '🚀',
    '競争戦略': '⚔️',
    '品質管理': '⚙️',
    'リーダーシップ': '👑',
    '経営哲学': '🧠',
    'ブランディング': '✨',
    '意思決定': '⚖️',
    'ビジョン': '🔭'
  }
  return icons[category] || '📚'
}

export const getRarityConfig = (rarity: WisdomCard['rarity']) => {
  switch (rarity) {
    case 'レジェンダリー':
      return {
        color: 'from-yellow-400 via-orange-400 to-red-500',
        borderColor: 'border-yellow-400',
        textColor: 'text-yellow-600',
        bgColor: 'bg-gradient-to-br from-yellow-100 to-orange-100',
        glowColor: 'shadow-yellow-400/30',
        stars: '⭐⭐⭐⭐⭐',
        symbol: '👑'
      }
    case 'エピック':
      return {
        color: 'from-purple-400 via-pink-400 to-red-400',
        borderColor: 'border-purple-300',
        textColor: 'text-purple-600',
        bgColor: 'bg-gradient-to-br from-purple-100 to-pink-100',
        glowColor: 'shadow-purple-400/30',
        stars: '⭐⭐⭐⭐',
        symbol: '💎'
      }
    case 'レア':
      return {
        color: 'from-blue-400 via-cyan-400 to-teal-400',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-600',
        bgColor: 'bg-blue-200/80',
        glowColor: 'shadow-blue-400/30',
        stars: '⭐⭐⭐',
        symbol: '⭐'
      }
    case 'コモン':
      return {
        color: 'from-gray-300 to-gray-400',
        borderColor: 'border-gray-400',
        textColor: 'text-gray-600',
        bgColor: 'bg-gradient-to-br from-gray-100 to-gray-200',
        glowColor: 'shadow-gray-400/20',
        stars: '⭐⭐',
        symbol: '🎯'
      }
  }
}

export const getRandomWisdomCard = (percentage: number): WisdomCard => {
  let availableCards: WisdomCard[]
  
  if (percentage >= 90) {
    availableCards = wisdomCards.filter(card => 
      card.rarity === 'レジェンダリー' || card.rarity === 'エピック'
    )
  } else if (percentage >= 70) {
    availableCards = wisdomCards.filter(card => 
      card.rarity === 'エピック' || card.rarity === 'レア'
    )
  } else if (percentage >= 50) {
    availableCards = wisdomCards.filter(card => 
      card.rarity === 'レア' || card.rarity === 'コモン'
    )
  } else {
    availableCards = wisdomCards.filter(card => 
      card.rarity === 'コモン'
    )
  }
  
  if (availableCards.length === 0) {
    availableCards = wisdomCards
  }
  
  const randomIndex = Math.floor(Math.random() * availableCards.length)
  return availableCards[randomIndex]
}

/**
 * Convert category ID to display name
 */
export function getCategoryDisplayName(categoryId: string): string {
  const categoryDisplayNames: Record<string, string> = {
    'communication_presentation': 'コミュニケーション・プレゼンテーション',
    'logical_thinking_problem_solving': '論理的思考・問題解決',
    'strategy_management': '戦略・経営',
    'finance': '財務・ファイナンス',
    'marketing_sales': 'マーケティング・営業',
    'leadership_hr': 'リーダーシップ・人事',
    'ai_digital_utilization': 'AI・デジタル活用',
    'project_operations': 'プロジェクト・業務管理',
    'business_process_analysis': 'ビジネスプロセス・業務分析',
    'risk_crisis_management': 'リスク・危機管理'
  }
  return categoryDisplayNames[categoryId] || categoryId
}

/**
 * Convert subcategory ID to display name
 */
export function getSubcategoryDisplayName(subcategoryId: string): string {
  const subcategoryDisplayNames: Record<string, string> = {
    '結論ファースト・構造化思考': '結論ファースト・構造化思考',
    '資料作成・可視化技術': '資料作成・可視化技術',
    '会議運営・ファシリテーション': '会議運営・ファシリテーション',
    '交渉・説得技術': '交渉・説得技術',
    '構造化思考（MECE・ロジックツリー）': '構造化思考（MECE・ロジックツリー）',
    '仮説検証・本質追求': '仮説検証・本質追求',
    '定量分析・統計解析': '定量分析・統計解析',
    '行動経済学・意思決定理論': '行動経済学・意思決定理論',
    'ベンチマーキング・競合分析': 'ベンチマーキング・競合分析',
    '経営戦略・事業戦略': '経営戦略・事業戦略',
    '競争戦略・フレームワーク': '競争戦略・フレームワーク',
    '新事業開発・イノベーション': '新事業開発・イノベーション',
    'ESG・サステナビリティ経営': 'ESG・サステナビリティ経営',
    '財務分析・企業価値評価': '財務分析・企業価値評価',
    '投資判断・リスク管理': '投資判断・リスク管理',
    '事業計画・資金調達': '事業計画・資金調達',
    '管理会計・KPI設計': '管理会計・KPI設計',
    '顧客分析・セグメンテーション': '顧客分析・セグメンテーション',
    'ブランディング・ポジショニング': 'ブランディング・ポジショニング',
    'デジタルマーケティング': 'デジタルマーケティング',
    '営業戦略・CRM': '営業戦略・CRM',
    'チームマネジメント・モチベーション': 'チームマネジメント・モチベーション',
    'タレントマネジメント・育成': 'タレントマネジメント・育成',
    '組織開発・変革リーダーシップ': '組織開発・変革リーダーシップ',
    '人事戦略・働き方改革': '人事戦略・働き方改革',
    'AI基礎・業務活用': 'AI基礎・業務活用',
    'DX戦略・デジタル変革': 'DX戦略・デジタル変革',
    'データドリブン経営': 'データドリブン経営',
    'IoT・自動化技術': 'IoT・自動化技術',
    'プロジェクト設計・WBS': 'プロジェクト設計・WBS',
    'スケジュール・リソース管理': 'スケジュール・リソース管理',
    'ステークホルダー管理': 'ステークホルダー管理',
    '業務効率化・時間管理': '業務効率化・時間管理',
    '業務分析・要件定義': '業務分析・要件定義',
    'プロセス設計・最適化': 'プロセス設計・最適化',
    'サプライチェーン管理': 'サプライチェーン管理',
    '業務システム設計': '業務システム設計',
    'BPR・業務改革': 'BPR・業務改革',
    '企業リスク管理': '企業リスク管理',
    '危機管理・BCP': '危機管理・BCP',
    'コンプライアンス・内部統制': 'コンプライアンス・内部統制',
    '情報セキュリティ': '情報セキュリティ',
    'サステナビリティリスク': 'サステナビリティリスク'
  }
  return subcategoryDisplayNames[subcategoryId] || subcategoryId
}

// =============================================================================
// DB版 WISDOM CARD FUNCTIONS (Unified Interface)
// =============================================================================

import { getWisdomCardsWithFallback, getUserWisdomCards, WisdomCardCollection } from './supabase-cards'

/**
 * レアリティ重み付け設定取得
 * @param rarity - カードレアリティ
 * @param performance - ユーザーパフォーマンス (0-100)
 * @returns 重み値 (高いほど選ばれやすい)
 */
function getRarityWeight(rarity: string, performance: number): number {
  const weights: Record<string, Record<string, number>> = {
    high: { 'レジェンダリー': 40, 'エピック': 35, 'レア': 20, 'コモン': 5 },    // 90%+
    good: { 'レジェンダリー': 10, 'エピック': 40, 'レア': 40, 'コモン': 10 },   // 70-89%
    normal: { 'レジェンダリー': 5, 'エピック': 15, 'レア': 50, 'コモン': 30 }, // 50-69%
    low: { 'レジェンダリー': 1, 'エピック': 4, 'レア': 25, 'コモン': 70 }     // 50%未満
  }
  
  const tier = performance >= 90 ? 'high' : 
              performance >= 70 ? 'good' : 
              performance >= 50 ? 'normal' : 'low'
  
  return weights[tier][rarity] || 1
}

/**
 * ユーザーの獲得履歴を考慮した重み調整
 * @param card - カード情報
 * @param userCollection - ユーザーのカードコレクション
 * @returns 調整後の重み倍率 (1.0=標準, >1.0=優遇, <1.0=抑制)
 */
function getPersonalizationWeight(card: WisdomCard, userCollection: WisdomCardCollection[]): number {
  const ownedCard = userCollection.find(item => item.card_id === card.id)
  
  if (!ownedCard) {
    // 未獲得カードは2倍重み
    return 2.0
  }
  
  // 獲得回数に応じて重みを減らす（最低0.1倍）
  const count = ownedCard.count || 0
  if (count <= 1) return 1.0      // 1回: 標準重み
  if (count <= 3) return 0.7      // 2-3回: やや抑制
  if (count <= 5) return 0.4      // 4-5回: 抑制
  return 0.1                      // 6回以上: 大幅抑制
}

/**
 * 重み付きランダム選択
 * @param weightedCards - 重み付きカード配列
 * @returns 選択されたカード
 */
function selectWeightedRandom(weightedCards: Array<{card: WisdomCard, weight: number}>): WisdomCard {
  const totalWeight = weightedCards.reduce((sum, item) => sum + item.weight, 0)
  
  if (totalWeight <= 0) {
    // フォールバック: 単純ランダム
    return weightedCards[Math.floor(Math.random() * weightedCards.length)].card
  }
  
  let random = Math.random() * totalWeight
  
  for (const item of weightedCards) {
    random -= item.weight
    if (random <= 0) {
      return item.card
    }
  }
  
  // フォールバック: 最後のカード
  return weightedCards[weightedCards.length - 1].card
}

/**
 * DB版: ランダム格言カード取得（重み付き + パーソナライズ対応）
 * @param percentage - クイズ正答率 (0-100)
 * @param userId - ユーザーID（オプショナル）
 * @returns Promise<WisdomCard> - 既存インターフェース形式
 */
export const getRandomWisdomCardFromDB = async (percentage: number, userId?: string): Promise<WisdomCard> => {
  try {
    console.log(`🎯 Getting random wisdom card from DB (performance: ${percentage}%, userId: ${userId ? userId.substring(0, 8) + '...' : 'none'})`)
    
    // DB版: 全カード取得（フォールバック対応）
    const allDbCards = await getWisdomCardsWithFallback()
    const activeCards = allDbCards.filter(card => card.is_active !== false) // is_active考慮
    
    if (activeCards.length === 0) {
      console.warn('⚠️ No active cards available, falling back to static cards')
      return getRandomWisdomCard(percentage)
    }
    
    // ユーザーのカードコレクション取得（パーソナライズ用）
    let userCollection: WisdomCardCollection[] = []
    if (userId) {
      try {
        userCollection = await getUserWisdomCards(userId)
        console.log(`📊 User collection: ${userCollection.length} unique cards`)
      } catch (collectionError) {
        console.warn('⚠️ Failed to get user collection, proceeding without personalization:', collectionError)
      }
    }
    
    // 重み付きカードプール作成
    const weightedCards = activeCards.map(dbCard => {
      const card = convertWisdomCardMasterToLegacy(dbCard)
      const rarityWeight = getRarityWeight(card.rarity, percentage)
      const personalizationWeight = userId ? getPersonalizationWeight(card, userCollection) : 1.0
      const finalWeight = rarityWeight * personalizationWeight
      
      return {
        card,
        weight: finalWeight
      }
    }).filter(item => item.weight > 0) // 重み0以下のカードを除外
    
    if (weightedCards.length === 0) {
      console.warn('⚠️ No weighted cards available, falling back to static cards')
      return getRandomWisdomCard(percentage)
    }
    
    // 重み付きランダム選択
    const selectedCard = selectWeightedRandom(weightedCards)
    
    // デバッグ情報
    const selectedWeight = weightedCards.find(item => item.card.id === selectedCard.id)?.weight || 0
    const totalWeight = weightedCards.reduce((sum, item) => sum + item.weight, 0)
    console.log(`✅ Selected card: ${selectedCard.author} (${selectedCard.rarity}) - Weight: ${selectedWeight.toFixed(2)}/${totalWeight.toFixed(2)}`)
    
    return selectedCard
  } catch (error) {
    console.error('❌ Error getting random card from DB, falling back to static data:', error)
    // 完全フォールバック: 既存関数
    return getRandomWisdomCard(percentage)
  }
}


/**
 * DB版: 全格言カード取得（既存インターフェース互換）
 * @returns Promise<WisdomCard[]> - 既存インターフェース形式の配列
 */
export const getAllWisdomCardsFromDB = async (): Promise<WisdomCard[]> => {
  try {
    console.log('📚 Getting all wisdom cards from DB with legacy interface compatibility')
    
    const allDbCards = await getWisdomCardsWithFallback()
    const legacyCards = allDbCards.map(convertWisdomCardMasterToLegacy)
    
    console.log(`✅ Converted ${legacyCards.length} DB cards to legacy interface`)
    return legacyCards
  } catch (error) {
    console.error('❌ Error getting all cards from DB, falling back to static data:', error)
    // 完全フォールバック: 既存静的データ
    return wisdomCards
  }
}