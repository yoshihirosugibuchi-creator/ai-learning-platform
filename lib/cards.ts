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
 * @param categoryId - The category ID
 * @param categories - Optional categories array from database (recommended for dynamic lookup)
 * @returns The display name or categoryId if not found
 */
export function getCategoryDisplayName(categoryId: string, categories?: Array<{category_id: string, name: string}>): string {
  console.log(`🏷️ [getCategoryDisplayName] Input categoryId: "${categoryId}", dynamic lookup: ${!!categories}`)
  
  // Dynamic lookup from database (preferred method)
  if (categories && Array.isArray(categories)) {
    const category = categories.find(cat => cat.category_id === categoryId)
    if (category) {
      console.log(`🏷️ [getCategoryDisplayName] Dynamic lookup success: "${category.name}"`)
      return category.name
    }
  }
  
  // Fallback to static mapping for backward compatibility (to be deprecated)
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
  
  const result = categoryDisplayNames[categoryId] || categoryId
  console.log(`🏷️ [getCategoryDisplayName] Fallback result: "${result}" (found in dictionary: ${!!categoryDisplayNames[categoryId]})`)
  
  return result
}

/**
 * Convert subcategory ID to display name
 * @param subcategoryId - The subcategory ID
 * @param subcategories - Optional subcategories array from database (recommended for dynamic lookup)
 * @returns The display name or subcategoryId if not found
 */
export function getSubcategoryDisplayName(subcategoryId: string, subcategories?: Array<{subcategory_id: string, name: string}>): string {
  console.log(`🏷️ [getSubcategoryDisplayName] Input subcategoryId: "${subcategoryId}", dynamic lookup: ${!!subcategories}`)
  
  // Dynamic lookup from database (preferred method)
  if (subcategories && Array.isArray(subcategories)) {
    const subcategory = subcategories.find(sub => sub.subcategory_id === subcategoryId)
    if (subcategory) {
      console.log(`🏷️ [getSubcategoryDisplayName] Dynamic lookup success: "${subcategory.name}"`)
      return subcategory.name
    }
  }
  
  // Fallback to static mapping for backward compatibility (to be deprecated)
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
  
  const result = subcategoryDisplayNames[subcategoryId] || subcategoryId
  console.log(`🏷️ [getSubcategoryDisplayName] Fallback result: "${result}" (found in dictionary: ${!!subcategoryDisplayNames[subcategoryId]})`)
  
  return result
}

// =============================================================================
// DB版 WISDOM CARD FUNCTIONS (Unified Interface)
// =============================================================================

import { getWisdomCardsWithFallback, getUserWisdomCards, WisdomCardCollection } from './supabase-cards'

/**
 * パフォーマンス・未獲得状況別レアリティ重み付け取得
 * @param rarity - カードレアリティ
 * @param performance - ユーザーパフォーマンス (0-100)
 * @param userCollection - ユーザーのカードコレクション
 * @param allCards - 全カード情報（未獲得判定用）
 * @returns 重み値 (高いほど選ばれやすい)
 */
function getRarityWeight(rarity: string, performance: number, userCollection: WisdomCardCollection[], allCards: WisdomCard[]): number {
  console.log(`🎯 Calculating rarity weight for ${rarity} with ${performance}% performance`)
  
  // 各レアリティの未獲得カード数を計算
  const unacquiredCounts = {
    'レジェンダリー': 0,
    'エピック': 0,
    'レア': 0,
    'コモン': 0
  }
  
  allCards.forEach(card => {
    const isUnacquired = !userCollection.find(item => item.card_id === card.id)
    if (isUnacquired && unacquiredCounts.hasOwnProperty(card.rarity)) {
      unacquiredCounts[card.rarity as keyof typeof unacquiredCounts]++
    }
  })
  
  console.log(`📊 Unacquired counts:`, unacquiredCounts)
  
  // パフォーマンス別カード配布ロジック（未獲得優先）
  if (performance === 100) {
    // 100%: レジェンダリー→エピック→レア→コモンの順で未獲得を優先
    if (unacquiredCounts.レジェンダリー > 0) {
      const weights: Record<string, number> = { 'レジェンダリー': 80, 'エピック': 15, 'レア': 4, 'コモン': 1 }
      return weights[rarity] || 1
    } else if (unacquiredCounts.エピック > 0) {
      const weights: Record<string, number> = { 'レジェンダリー': 20, 'エピック': 60, 'レア': 15, 'コモン': 5 }
      return weights[rarity] || 1
    } else if (unacquiredCounts.レア > 0) {
      const weights: Record<string, number> = { 'レジェンダリー': 10, 'エピック': 30, 'レア': 50, 'コモン': 10 }
      return weights[rarity] || 1
    } else if (unacquiredCounts.コモン > 0) {
      const weights: Record<string, number> = { 'レジェンダリー': 5, 'エピック': 15, 'レア': 30, 'コモン': 50 }
      return weights[rarity] || 1
    } else {
      // 全カード獲得済み: 通常配布
      const weights: Record<string, number> = { 'レジェンダリー': 60, 'エピック': 25, 'レア': 10, 'コモン': 5 }
      return weights[rarity] || 1
    }
  } else if (performance >= 80) {
    // 80-99%: レア、エピック中心だが、コモンで未獲得があればそれも対象
    if (unacquiredCounts.レア > 0 || unacquiredCounts.エピック > 0) {
      const weights: Record<string, number> = { 'レジェンダリー': 3, 'エピック': 45, 'レア': 45, 'コモン': 7 }
      return weights[rarity] || 1
    } else if (unacquiredCounts.コモン > 0) {
      // エピック・レアがない場合、コモンを対象に
      const weights: Record<string, number> = { 'レジェンダリー': 5, 'エピック': 20, 'レア': 30, 'コモン': 45 }
      return weights[rarity] || 1
    } else {
      // 全カード獲得済み: 通常配布
      const weights: Record<string, number> = { 'レジェンダリー': 5, 'エピック': 45, 'レア': 45, 'コモン': 5 }
      return weights[rarity] || 1
    }
  } else if (performance >= 70) {
    // 70-79%: コモン、レア中心
    if (unacquiredCounts.コモン > 0 || unacquiredCounts.レア > 0) {
      const weights: Record<string, number> = { 'レジェンダリー': 1, 'エピック': 7, 'レア': 46, 'コモン': 46 }
      return weights[rarity] || 1
    } else {
      // コモン・レアがない場合、エピック以上も対象に
      const weights: Record<string, number> = { 'レジェンダリー': 3, 'エピック': 30, 'レア': 35, 'コモン': 32 }
      return weights[rarity] || 1
    }
  } else {
    // 70%未満: カード付与なし（この関数は呼ばれないはず）
    return 0
  }
}

/**
 * パフォーマンス別未獲得優先重み計算
 * @param card - カード情報
 * @param userCollection - ユーザーのカードコレクション
 * @param performance - ユーザーパフォーマンス (0-100)
 * @returns 調整後の重み倍率 (1.0=標準, >1.0=優遇, <1.0=抑制)
 */
function getPersonalizationWeight(card: WisdomCard, userCollection: WisdomCardCollection[], performance: number): number {
  const ownedCard = userCollection.find(item => item.card_id === card.id)
  const isUnacquired = !ownedCard
  
  console.log(`📊 Analyzing card ${card.id} (${card.rarity}): ${isUnacquired ? 'UNACQUIRED' : `owned ${ownedCard.count}x`}`)
  
  if (performance === 100) {
    // 100%: レジェンダリー→エピック→レア→コモンの順で未獲得を優先
    if (isUnacquired) {
      switch (card.rarity) {
        case 'レジェンダリー': return 10.0  // 最高優先度
        case 'エピック': return 8.0
        case 'レア': return 6.0
        case 'コモン': return 4.0
      }
    } else {
      // 獲得済みは大幅に抑制（レアリティ関係なし）
      const count = ownedCard.count || 0
      if (count <= 1) return 0.3
      if (count <= 3) return 0.1
      return 0.05
    }
  } else if (performance >= 80) {
    // 80-99%: レア、エピック中心だが、コモンで未獲得があればそれも対象
    if (isUnacquired) {
      switch (card.rarity) {
        case 'エピック': return 8.0      // 最高優先度
        case 'レア': return 8.0          // 同等優先度
        case 'コモン': return 4.0        // 未獲得なら対象
        case 'レジェンダリー': return 2.0 // 低めだが対象
      }
    } else {
      // 獲得済みは抑制
      const count = ownedCard.count || 0
      if (count <= 1) return 0.5
      if (count <= 3) return 0.2
      return 0.1
    }
  } else if (performance >= 70) {
    // 70-79%: コモン、レア中心
    if (isUnacquired) {
      switch (card.rarity) {
        case 'コモン': return 8.0        // 最高優先度
        case 'レア': return 8.0          // 同等優先度
        case 'エピック': return 3.0      // 低めだが対象
        case 'レジェンダリー': return 1.0 // 最低優先度
      }
    } else {
      // 獲得済みは抑制
      const count = ownedCard.count || 0
      if (count <= 1) return 0.7
      if (count <= 3) return 0.3
      return 0.1
    }
  }
  
  // 70%未満やその他のケース
  return isUnacquired ? 2.0 : 0.1
}

/**
 * 重み付きランダム選択
 * @param weightedCards - 重み付きカード配列
 * @returns 選択されたカード
 */
function selectWeightedRandom(weightedCards: Array<{card: WisdomCard, weight: number}>): WisdomCard {
  const totalWeight = weightedCards.reduce((sum, item) => sum + item.weight, 0)
  
  console.log(`🎲 Weighted selection pool (total weight: ${totalWeight.toFixed(2)}):`)
  weightedCards.forEach((item, index) => {
    const percentage = (item.weight / totalWeight * 100).toFixed(1)
    console.log(`  ${index + 1}. Card ${item.card.id} (${item.card.rarity}): weight=${item.weight.toFixed(2)} (${percentage}%)`)
  })
  
  if (totalWeight <= 0) {
    // フォールバック: 単純ランダム
    console.log('⚠️ Total weight is 0, using random fallback')
    return weightedCards[Math.floor(Math.random() * weightedCards.length)].card
  }
  
  let random = Math.random() * totalWeight
  console.log(`🎯 Random selection value: ${random.toFixed(2)} / ${totalWeight.toFixed(2)}`)
  
  for (const item of weightedCards) {
    random -= item.weight
    console.log(`🔄 Checking card ${item.card.id}: remaining=${random.toFixed(2)}`)
    if (random <= 0) {
      console.log(`✅ Selected card ${item.card.id} (${item.card.rarity}) via weighted selection`)
      return item.card
    }
  }
  
  // フォールバック: 最後のカード
  const fallbackCard = weightedCards[weightedCards.length - 1].card
  console.log(`🔄 Fallback to last card: ${fallbackCard.id} (${fallbackCard.rarity})`)
  return fallbackCard
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
    
    // カード配列を変換（未獲得分析用）
    const allCards = activeCards.map(convertWisdomCardMasterToLegacy)
    
    // 重み付きカードプール作成（新パフォーマンス・未獲得状況別ロジック）
    const weightedCards = activeCards.map(dbCard => {
      const card = convertWisdomCardMasterToLegacy(dbCard)
      const rarityWeight = getRarityWeight(card.rarity, percentage, userCollection, allCards)
      const personalizationWeight = userId ? getPersonalizationWeight(card, userCollection, percentage) : 1.0
      const finalWeight = rarityWeight * personalizationWeight
      
      const isUnacquired = !userCollection.find(item => item.card_id === card.id)
      console.log(`🎯 Card ${card.id} (${card.rarity}): ${isUnacquired ? 'UNACQUIRED' : 'owned'}, rarity=${rarityWeight}, personal=${personalizationWeight.toFixed(2)}, final=${finalWeight.toFixed(2)}`)
      
      return {
        card,
        weight: finalWeight
      }
    }).filter(item => {
      const kept = item.weight > 0
      if (!kept) {
        console.log(`❌ Filtered out card ${item.card.id} (${item.card.rarity}) with weight ${item.weight.toFixed(2)}`)
      }
      return kept
    }) // 重み0以下のカードを除外
    
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