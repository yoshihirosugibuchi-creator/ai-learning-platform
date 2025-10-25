# 格言カードDB化移行計画・完全実装ガイド

**作成日**: 2025年10月16日  
**目的**: 格言カードシステムのDB化・ビジュアル強化による運用性・拡張性向上  
**対象**: 開発チーム・システム管理者  

---

## 📊 **現状分析結果**

### **実装済み状況**
- ✅ **マスターデータ**: `lib/cards.ts`に12枚の格言カード（ハードコード）
- ✅ **ユーザー獲得履歴**: `wisdom_card_collection`テーブル（21件のデータ存在）
- ✅ **API**: `/api/cards/wisdom` - カード配布・獲得処理
- ✅ **UI**: `WisdomCard.tsx` - 3Dフリップカード表示
- ✅ **コレクション**: `/collection/page.tsx` - 獲得カード一覧表示

### **現在のデータ構造**
```typescript
// マスターデータ（lib/cards.ts）
interface WisdomCard {
  id: number
  author: string  
  quote: string
  categoryId: string
  subcategoryId?: string
  rarity: 'コモン' | 'レア' | 'エピック' | 'レジェンダリー'
  context: string
  applicationArea: string
}

// ユーザー獲得履歴（wisdom_card_collection）
interface WisdomCardCollection {
  user_id: string
  card_id: number
  count: number
  obtained_at: string
  last_obtained_at: string
}
```

### **DB化・ビジュアル強化が必要な理由**
1. **データ管理の一元化**: コード変更不要でのカード追加・更新
2. **運用効率の向上**: 管理画面での格言追加・編集
3. **ビジュアル体験向上**: バッジシステム同様の魅力的なカード表現
4. **システム拡張性**: 条件付きカード配布・多言語対応
5. **データ分析の強化**: カード人気度・獲得率分析

---

## 🚀 **実装計画・6フェーズ構成**

### **Phase 1: DB化・移行（ビジュアル要素含む）**

#### **1-1. wisdom_cardsマスターテーブル作成**
```sql
CREATE TABLE wisdom_cards (
  id SERIAL PRIMARY KEY,
  author VARCHAR(100) NOT NULL,
  quote TEXT NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  subcategory_id VARCHAR(100),
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('コモン', 'レア', 'エピック', 'レジェンダリー')),
  context TEXT NOT NULL,
  application_area TEXT NOT NULL,
  
  -- ビジュアル要素（新規追加）
  card_image_url VARCHAR(500),           -- メインカード画像
  background_image_url VARCHAR(500),     -- 背景画像
  author_portrait_url VARCHAR(500),      -- 著者肖像画
  animation_url VARCHAR(500),            -- Lottieアニメーション等
  particle_effect_config JSONB,         -- パーティクルエフェクト設定
  category_icon_url VARCHAR(500),        -- カスタムカテゴリーアイコン
  rarity_frame_url VARCHAR(500),         -- レアリティ別フレーム画像
  special_badge_url VARCHAR(500),        -- 特別バッジ（期間限定等）
  
  -- 管理用フィールド
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_wisdom_cards_active ON wisdom_cards(is_active);
CREATE INDEX idx_wisdom_cards_rarity ON wisdom_cards(rarity);
CREATE INDEX idx_wisdom_cards_category ON wisdom_cards(category_id);
CREATE INDEX idx_wisdom_cards_display_order ON wisdom_cards(display_order);
```

#### **1-2. 既存データ移行（ビジュアル要素の初期設定含む）**
```sql
-- 12枚の格言カードをDBに移行（ビジュアル要素の基本設定含む）
INSERT INTO wisdom_cards (
  id, author, quote, category_id, subcategory_id, rarity, context, application_area,
  card_image_url, author_portrait_url, rarity_frame_url
) VALUES
(1, 'ピーター・ドラッカー', '効果的であることと効率的であることは別物である', 
 'strategy_management', '経営戦略・事業戦略', 'レア', 
 '現代経営学の父が説いた本質的な教え', '戦略思考・優先順位設定',
 '/images/wisdom-cards/backgrounds/rare/strategy-bg.jpg',
 '/images/wisdom-cards/portraits/drucker.jpg',
 '/images/wisdom-cards/frames/rare-frame.png'),

(2, 'スティーブ・ジョブズ', '顧客が何を望んでいるかを知るのは顧客の仕事ではない', 
 'strategy_management', '新事業開発・イノベーション', 'エピック', 
 'iPhone開発時の革新的思考を表した言葉', 'プロダクト開発・市場創造',
 '/images/wisdom-cards/backgrounds/epic/innovation-bg.jpg',
 '/images/wisdom-cards/portraits/jobs.jpg',
 '/images/wisdom-cards/frames/epic-frame.png'),

(3, 'ウォーレン・バフェット', 'リスクは自分が何をやっているかよくわからない時に起こる', 
 'finance', '財務分析・企業価値評価', 'レア', 
 'オマハの賢人による投資哲学の核心', 'リスク分析・意思決定',
 '/images/wisdom-cards/backgrounds/rare/finance-bg.jpg',
 '/images/wisdom-cards/portraits/buffett.jpg',
 '/images/wisdom-cards/frames/rare-frame.png'),

(4, 'ジャック・ウェルチ', '変化に対応できない者は取り残される', 
 'leadership_hr', '組織開発・変革リーダーシップ', 'エピック', 
 'GE社の大変革を指導した経験から', '組織変革・適応力',
 '/images/wisdom-cards/backgrounds/epic/leadership-bg.jpg',
 '/images/wisdom-cards/portraits/welch.jpg',
 '/images/wisdom-cards/frames/epic-frame.png'),

(5, 'マイケル・ポーター', '競争優位は差別化から生まれる', 
 'strategy_management', '競争戦略・フレームワーク', 'レジェンダリー', 
 '競争戦略論の第一人者による核心的洞察', '戦略立案・競争分析',
 '/images/wisdom-cards/backgrounds/legendary/strategy-supreme.jpg',
 '/images/wisdom-cards/portraits/porter.jpg',
 '/images/wisdom-cards/frames/legendary-frame.png'),

(6, '豊田佐吉', '改善に終わりはない', 
 'business_process_analysis', 'プロセス設計・最適化', 'コモン', 
 'トヨタ生産システムの根幹思想', '継続改善・品質向上',
 '/images/wisdom-cards/backgrounds/common/process-bg.jpg',
 '/images/wisdom-cards/portraits/toyota-sakichi.jpg',
 '/images/wisdom-cards/frames/common-frame.png'),

(7, 'イーロン・マスク', '失敗はオプションであり、挑戦しないことはそうではない', 
 'strategy_management', '新事業開発・イノベーション', 'エピック', 
 'TeslaとSpaceXで革新を起こした起業家の哲学', 'リスクテイキング・起業家精神',
 '/images/wisdom-cards/backgrounds/epic/innovation-future.jpg',
 '/images/wisdom-cards/portraits/musk.jpg',
 '/images/wisdom-cards/frames/epic-frame.png'),

(8, 'シェリル・サンドバーグ', 'テーブルに着けないなら、自分でテーブルを作れ', 
 'leadership_hr', 'チームマネジメント・モチベーション', 'レア', 
 'Facebook COOとして女性のキャリアを切り開いたメッセージ', 'キャリア開発・機会創造',
 '/images/wisdom-cards/backgrounds/rare/leadership-empowerment.jpg',
 '/images/wisdom-cards/portraits/sandberg.jpg',
 '/images/wisdom-cards/frames/rare-frame.png'),

(9, '稲盛和夫', '心を高める、経営を伸ばす', 
 'leadership_hr', '組織開発・変革リーダーシップ', 'レジェンダリー', 
 '京セラ創業者が掲げた人間性と事業成長の関係性', 'リーダーシップ・人格形成',
 '/images/wisdom-cards/backgrounds/legendary/philosophy-zen.jpg',
 '/images/wisdom-cards/portraits/inamori.jpg',
 '/images/wisdom-cards/frames/legendary-frame.png'),

(10, 'フィル・ナイト', 'ブランドとは顧客が企業について語る物語である', 
 'marketing_sales', 'ブランディング・ポジショニング', 'エピック', 
 'Nike創業者のブランド構築に対する本質的洞察', 'ブランド戦略・顧客体験',
 '/images/wisdom-cards/backgrounds/epic/branding-story.jpg',
 '/images/wisdom-cards/portraits/knight.jpg',
 '/images/wisdom-cards/frames/epic-frame.png'),

(11, 'レイ・ダリオ', '原則を持つことで、何をすべきかが明確になる', 
 'logical_thinking_problem_solving', '構造化思考（MECE・ロジックツリー）', 'レア', 
 '世界最大のヘッジファンド創設者の意思決定哲学', '投資判断・戦略立案',
 '/images/wisdom-cards/backgrounds/rare/analysis-principles.jpg',
 '/images/wisdom-cards/portraits/dalio.jpg',
 '/images/wisdom-cards/frames/rare-frame.png'),

(12, '孫正義', '登りたい山を決める、これで人生の半分が決まる', 
 'strategy_management', '経営戦略・事業戦略', 'エピック', 
 'ソフトバンク創業者のビジョン経営論', '目標設定・戦略立案',
 '/images/wisdom-cards/backgrounds/epic/vision-mountain.jpg',
 '/images/wisdom-cards/portraits/son-masayoshi.jpg',
 '/images/wisdom-cards/frames/epic-frame.png');
```

#### **1-3. ビジュアルリソース構成**
```
public/images/wisdom-cards/
├── backgrounds/              # 背景画像
│   ├── legendary/           # レジェンダリー専用背景
│   │   ├── strategy-supreme.jpg
│   │   └── philosophy-zen.jpg
│   ├── epic/                # エピック専用背景
│   │   ├── innovation-bg.jpg
│   │   ├── leadership-bg.jpg
│   │   ├── innovation-future.jpg
│   │   ├── branding-story.jpg
│   │   └── vision-mountain.jpg
│   ├── rare/                # レア専用背景
│   │   ├── strategy-bg.jpg
│   │   ├── finance-bg.jpg
│   │   ├── leadership-empowerment.jpg
│   │   └── analysis-principles.jpg
│   └── common/              # コモン専用背景
│       └── process-bg.jpg
├── portraits/               # 著者肖像画
│   ├── drucker.jpg
│   ├── jobs.jpg
│   ├── buffett.jpg
│   ├── welch.jpg
│   ├── porter.jpg
│   ├── toyota-sakichi.jpg
│   ├── musk.jpg
│   ├── sandberg.jpg
│   ├── inamori.jpg
│   ├── knight.jpg
│   ├── dalio.jpg
│   └── son-masayoshi.jpg
├── frames/                  # レアリティフレーム
│   ├── legendary-frame.png  # 金色・宝石装飾
│   ├── epic-frame.png       # 紫・装飾的ボーダー
│   ├── rare-frame.png       # 青・上質なボーダー
│   └── common-frame.png     # グレー・シンプル
├── animations/              # Lottieアニメーション
│   ├── legendary-divine-glow.json    # 神々しい光
│   ├── legendary-royal-particles.json # 王者の粒子
│   ├── epic-sparkle-magic.json       # 魔法の煌めき
│   ├── epic-energy-pulse.json        # エネルギー波動
│   ├── rare-star-shine.json          # 星の輝き
│   └── rare-elegant-glow.json        # 上品な光
└── icons/                   # カスタムアイコン
    ├── strategy-crown.svg
    ├── leadership-shield.svg
    ├── innovation-rocket.svg
    ├── finance-scales.svg
    └── process-gear.svg
```

#### **1-4. データベース型定義更新**
```typescript
// lib/database-types-official.ts に追加
export type WisdomCardMaster = Database['public']['Tables']['wisdom_cards']['Row']
export type WisdomCardMasterInsert = Database['public']['Tables']['wisdom_cards']['Insert']
export type WisdomCardMasterUpdate = Database['public']['Tables']['wisdom_cards']['Update']

// lib/types/wisdom-cards.ts（新規作成）
export interface WisdomCardVisuals {
  cardImageUrl?: string
  backgroundImageUrl?: string
  authorPortraitUrl?: string
  animationUrl?: string
  particleEffectConfig?: {
    type: 'stars' | 'particles' | 'glow' | 'divine' | 'magic'
    density: number
    color: string
    speed: number
    size: { min: number; max: number }
    opacity: { min: number; max: number }
  }
  categoryIconUrl?: string
  rarityFrameUrl?: string
  specialBadgeUrl?: string
}

export interface WisdomCardEnhanced extends WisdomCard, WisdomCardVisuals {
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}
```

---

### **Phase 2: カード獲得・コレクション表示ロジック修正（ビジュアル対応）**

#### **2-1. DB版カード取得関数作成**
```typescript
// lib/wisdom-cards-db.ts（新規作成）
export async function getWisdomCardsFromDB(): Promise<WisdomCardEnhanced[]> {
  const { data, error } = await supabase
    .from('wisdom_cards')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('DB格言カード取得エラー:', error)
    throw new Error(`格言カード取得失敗: ${error.message}`)
  }

  return (data || []).map(dbCard => ({
    id: dbCard.id,
    author: dbCard.author,
    quote: dbCard.quote,
    categoryId: dbCard.category_id,
    subcategoryId: dbCard.subcategory_id,
    rarity: dbCard.rarity as WisdomCard['rarity'],
    context: dbCard.context,
    applicationArea: dbCard.application_area,
    
    // ビジュアル要素
    cardImageUrl: dbCard.card_image_url,
    backgroundImageUrl: dbCard.background_image_url,
    authorPortraitUrl: dbCard.author_portrait_url,
    animationUrl: dbCard.animation_url,
    particleEffectConfig: dbCard.particle_effect_config,
    categoryIconUrl: dbCard.category_icon_url,
    rarityFrameUrl: dbCard.rarity_frame_url,
    specialBadgeUrl: dbCard.special_badge_url,
    
    // 管理用
    isActive: dbCard.is_active,
    displayOrder: dbCard.display_order,
    createdAt: dbCard.created_at,
    updatedAt: dbCard.updated_at
  }))
}

export async function getRandomWisdomCardFromDB(percentage: number): Promise<WisdomCardEnhanced> {
  const allCards = await getWisdomCardsFromDB()
  
  let availableCards: WisdomCardEnhanced[]
  
  if (percentage >= 90) {
    availableCards = allCards.filter(card => 
      card.rarity === 'レジェンダリー' || card.rarity === 'エピック'
    )
  } else if (percentage >= 70) {
    availableCards = allCards.filter(card => 
      card.rarity === 'エピック' || card.rarity === 'レア'
    )
  } else if (percentage >= 50) {
    availableCards = allCards.filter(card => 
      card.rarity === 'レア' || card.rarity === 'コモン'
    )
  } else {
    availableCards = allCards.filter(card => 
      card.rarity === 'コモン'
    )
  }
  
  if (availableCards.length === 0) {
    availableCards = allCards
  }
  
  const randomIndex = Math.floor(Math.random() * availableCards.length)
  return availableCards[randomIndex]
}
```

#### **2-2. ビジュアル強化カードコンポーネント**
```typescript
// components/cards/WisdomCard.tsx 大幅拡張
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WisdomCardEnhanced, getRarityConfig, getCategoryDisplayName, getSubcategoryDisplayName } from '@/lib/cards'
import { cn } from '@/lib/utils'
import { Lock, Sparkles } from 'lucide-react'
import LottieAnimation from '@/components/ui/LottieAnimation'
import ParticleEffect from '@/components/ui/ParticleEffect'

interface WisdomCardProps {
  card: WisdomCardEnhanced & { obtained?: boolean; count?: number }
  className?: string
  onClick?: () => void
  showDetails?: boolean
}

export default function WisdomCard({ 
  card, 
  className, 
  onClick, 
  showDetails = false 
}: WisdomCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [animationLoaded, setAnimationLoaded] = useState(false)
  
  const rarityConfig = getRarityConfig(card.rarity)
  const categoryDisplayName = getCategoryDisplayName(card.categoryId)
  const subcategoryDisplayName = card.subcategoryId ? getSubcategoryDisplayName(card.subcategoryId) : ''

  const handleCardClick = () => {
    if (card.obtained && showDetails) {
      setIsFlipped(!isFlipped)
    }
    onClick?.()
  }

  // レアリティ別アニメーション設定
  const getAnimationUrl = () => {
    if (card.animationUrl) return card.animationUrl
    
    switch (card.rarity) {
      case 'レジェンダリー':
        return '/images/wisdom-cards/animations/legendary-divine-glow.json'
      case 'エピック':
        return '/images/wisdom-cards/animations/epic-sparkle-magic.json'
      case 'レア':
        return '/images/wisdom-cards/animations/rare-star-shine.json'
      default:
        return null
    }
  }

  // レアリティ別パーティクル設定
  const getParticleConfig = () => {
    if (card.particleEffectConfig) return card.particleEffectConfig
    
    switch (card.rarity) {
      case 'レジェンダリー':
        return {
          type: 'divine' as const,
          density: 50,
          color: '#FFD700',
          speed: 0.5,
          size: { min: 2, max: 8 },
          opacity: { min: 0.3, max: 0.8 }
        }
      case 'エピック':
        return {
          type: 'magic' as const,
          density: 30,
          color: '#9C27B0',
          speed: 0.8,
          size: { min: 1, max: 6 },
          opacity: { min: 0.2, max: 0.7 }
        }
      case 'レア':
        return {
          type: 'stars' as const,
          density: 20,
          color: '#2196F3',
          speed: 1.0,
          size: { min: 1, max: 4 },
          opacity: { min: 0.1, max: 0.6 }
        }
      default:
        return null
    }
  }

  return (
    <div 
      className={cn(
        "group perspective-1000 cursor-pointer transition-all duration-500 hover:scale-105",
        className
      )}
      onClick={handleCardClick}
    >
      <div className={cn(
        "relative w-full h-96 transform-style-preserve-3d transition-transform duration-700",
        isFlipped && showDetails && "rotate-y-180"
      )}>
        {/* Front of Card */}
        <Card className={cn(
          "absolute inset-0 backface-hidden overflow-hidden",
          "border-2 transition-all duration-500",
          card.obtained ? [
            rarityConfig.borderColor,
            rarityConfig.bgColor,
            "shadow-lg hover:shadow-xl",
            rarityConfig.glowColor
          ] : [
            "border-gray-300 bg-gray-100",
            "shadow-sm"
          ]
        )}>
          <div className="relative h-full flex flex-col overflow-hidden">
            {/* 背景画像 */}
            {card.obtained && card.backgroundImageUrl && (
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-15 rounded-lg"
                style={{ backgroundImage: `url(${card.backgroundImageUrl})` }}
              />
            )}
            
            {/* レアリティフレーム */}
            {card.obtained && card.rarityFrameUrl && (
              <div 
                className="absolute inset-0 bg-contain bg-center bg-no-repeat pointer-events-none z-10"
                style={{ backgroundImage: `url(${card.rarityFrameUrl})` }}
              />
            )}
            
            {/* パーティクルエフェクト */}
            {card.obtained && getParticleConfig() && (
              <ParticleEffect 
                config={getParticleConfig()!} 
                className="absolute inset-0 pointer-events-none z-5"
              />
            )}
            
            {/* アニメーション */}
            {card.obtained && getAnimationUrl() && (
              <LottieAnimation
                src={getAnimationUrl()!}
                autoplay={true}
                loop={true}
                className="absolute inset-0 pointer-events-none z-5 opacity-60"
                onLoad={() => setAnimationLoaded(true)}
              />
            )}

            {/* Card Header */}
            <div className="relative p-4 pb-2 z-20">
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "font-semibold text-xs px-2 py-1 backdrop-blur-sm",
                    card.obtained ? rarityConfig.textColor : "text-gray-500"
                  )}
                >
                  <span className="mr-1">{card.obtained ? rarityConfig.symbol : '🔒'}</span>
                  {card.rarity}
                </Badge>
                {card.obtained && card.count && card.count > 1 && (
                  <Badge variant="outline" className="text-xs backdrop-blur-sm">
                    ×{card.count}
                  </Badge>
                )}
                
                {/* 特別バッジ */}
                {card.obtained && card.specialBadgeUrl && (
                  <div className="w-6 h-6">
                    <Image
                      src={card.specialBadgeUrl}
                      alt="特別バッジ"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
              
              {/* Category */}
              <div className="flex items-center space-x-2">
                {card.categoryIconUrl ? (
                  <div className="w-6 h-6">
                    <Image
                      src={card.categoryIconUrl}
                      alt={categoryDisplayName}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <span className="text-lg">
                    {/* カテゴリー別デフォルトアイコン */}
                    {card.categoryId.includes('strategy') ? '🎯' :
                     card.categoryId.includes('leadership') ? '👑' :
                     card.categoryId.includes('finance') ? '💰' :
                     card.categoryId.includes('marketing') ? '📈' :
                     card.categoryId.includes('logical') ? '🧠' : '📚'}
                  </span>
                )}
                
                <div className={cn(
                  "text-sm font-medium backdrop-blur-sm",
                  card.obtained ? "text-gray-700" : "text-gray-500"
                )}>
                  <div>{categoryDisplayName}</div>
                  {subcategoryDisplayName && (
                    <div className="text-xs text-gray-500 mt-1">{subcategoryDisplayName}</div>
                  )}
                </div>
              </div>
            </div>

            {/* メインカード画像エリア */}
            {card.obtained && card.cardImageUrl && (
              <div className="relative h-32 mx-4 mb-4 rounded-lg overflow-hidden z-20">
                <Image
                  src={card.cardImageUrl}
                  alt={`${card.author}の格言カード`}
                  fill
                  className={cn(
                    "object-cover transition-all duration-500",
                    "group-hover:scale-105",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                />
                
                {/* 著者肖像画 */}
                {card.authorPortraitUrl && (
                  <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg">
                    <Image
                      src={card.authorPortraitUrl}
                      alt={card.author}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                {/* グラデーションオーバーレイ */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}

            {/* Card Body */}
            <div className="flex-1 px-4 z-20">
              {card.obtained ? (
                <div className="h-full flex flex-col justify-center">
                  {/* Quote */}
                  <div className="relative backdrop-blur-sm bg-white/80 rounded-lg p-3 mb-3">
                    <div className="absolute -top-2 -left-1 text-3xl opacity-30 leading-none text-gray-400">
                      &ldquo;
                    </div>
                    <blockquote className={cn(
                      "text-center italic font-medium leading-tight pl-3 pr-3",
                      card.rarity === 'レジェンダリー' ? 'text-lg' : 'text-base',
                      "text-gray-800"
                    )}>
                      {card.quote}
                    </blockquote>
                    <div className="absolute -bottom-2 -right-1 text-3xl opacity-30 leading-none text-gray-400">
                      &rdquo;
                    </div>
                  </div>
                  
                  {/* Author */}
                  <div className="text-center backdrop-blur-sm bg-white/70 rounded-lg p-2">
                    <div className="text-sm font-bold text-gray-800 mb-1">
                      {card.author}
                    </div>
                    {card.rarity === 'レジェンダリー' && (
                      <div className="flex justify-center">
                        <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Lock className="h-12 w-12 mb-3 opacity-50" />
                  <div className="text-2xl font-bold mb-2">???</div>
                  <div className="text-sm text-center px-2">
                    クイズをクリアして<br />格言を獲得しよう
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer */}
            {card.obtained && (
              <div className="px-4 py-3 border-t border-gray-200/50 backdrop-blur-sm bg-white/80 z-20">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    {rarityConfig.stars}
                  </div>
                  {showDetails && (
                    <div className="text-xs text-gray-500">
                      クリックで詳細表示
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Back of Card (Details) - 既存実装 */}
        {showDetails && card.obtained && (
          <Card className={cn(
            "absolute inset-0 backface-hidden rotate-y-180 overflow-hidden",
            "border-2 transition-all duration-300",
            rarityConfig.borderColor,
            rarityConfig.bgColor,
            "shadow-lg"
          )}>
            <div className="h-full p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Badge 
                  variant="secondary" 
                  className={cn("font-semibold text-xs", rarityConfig.textColor)}
                >
                  詳細情報
                </Badge>
                <div className="text-xs text-gray-500">
                  クリックで戻る
                </div>
              </div>

              <div className="flex-1 space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">背景・文脈</h4>
                  <p className="text-gray-600 leading-relaxed">
                    {card.context}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">活用分野</h4>
                  <p className="text-gray-600">
                    {card.applicationArea}
                  </p>
                </div>

                <div className="border-t pt-3 mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      影響力: {rarityConfig.stars}
                    </div>
                    <div className="text-xs text-gray-500">
                      {subcategoryDisplayName || categoryDisplayName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
```

#### **2-3. 必要コンポーネント作成**
```typescript
// components/ui/LottieAnimation.tsx（新規作成）
'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface LottieAnimationProps {
  src: string
  autoplay?: boolean
  loop?: boolean
  className?: string
  onLoad?: () => void
}

export default function LottieAnimation({
  src,
  autoplay = true,
  loop = true,
  className,
  onLoad
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animation: any

    const loadLottie = async () => {
      try {
        const lottie = (await import('lottie-web')).default
        
        if (containerRef.current) {
          animation = lottie.loadAnimation({
            container: containerRef.current,
            renderer: 'svg',
            loop,
            autoplay,
            path: src
          })
          
          animation.addEventListener('DOMLoaded', () => {
            onLoad?.()
          })
        }
      } catch (error) {
        console.error('Lottie animation load failed:', error)
      }
    }

    loadLottie()

    return () => {
      if (animation) {
        animation.destroy()
      }
    }
  }, [src, autoplay, loop, onLoad])

  return (
    <div 
      ref={containerRef} 
      className={cn("w-full h-full", className)}
    />
  )
}

// components/ui/ParticleEffect.tsx（新規作成）
'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ParticleConfig {
  type: 'stars' | 'particles' | 'glow' | 'divine' | 'magic'
  density: number
  color: string
  speed: number
  size: { min: number; max: number }
  opacity: { min: number; max: number }
}

interface ParticleEffectProps {
  config: ParticleConfig
  className?: string
}

export default function ParticleEffect({ config, className }: ParticleEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: Array<{
      x: number
      y: number
      size: number
      opacity: number
      speedX: number
      speedY: number
      life: number
    }> = []

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    const createParticle = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: config.size.min + Math.random() * (config.size.max - config.size.min),
        opacity: config.opacity.min + Math.random() * (config.opacity.max - config.opacity.min),
        speedX: (Math.random() - 0.5) * config.speed,
        speedY: (Math.random() - 0.5) * config.speed,
        life: 1
      }
    }

    const initParticles = () => {
      particles.length = 0
      for (let i = 0; i < config.density; i++) {
        particles.push(createParticle())
      }
    }

    const updateParticles = () => {
      particles.forEach((particle, index) => {
        particle.x += particle.speedX
        particle.y += particle.speedY
        
        // 画面外に出たら反対側から再出現
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0
        
        // ライフサイクル管理
        particle.life -= 0.01
        if (particle.life <= 0) {
          particles[index] = createParticle()
        }
      })
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach(particle => {
        ctx.save()
        ctx.globalAlpha = particle.opacity * particle.life
        ctx.fillStyle = config.color
        
        switch (config.type) {
          case 'stars':
            // 星形描画
            drawStar(ctx, particle.x, particle.y, particle.size)
            break
          case 'divine':
            // 神々しい光
            drawDivineLight(ctx, particle.x, particle.y, particle.size)
            break
          case 'magic':
            // 魔法の煌めき
            drawMagicSparkle(ctx, particle.x, particle.y, particle.size)
            break
          default:
            // 基本円形
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
            ctx.fill()
        }
        
        ctx.restore()
      })
    }

    const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const spikes = 5
      const outerRadius = size
      const innerRadius = size * 0.4
      
      ctx.beginPath()
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const angle = (i * Math.PI) / spikes
        const xPos = x + Math.cos(angle) * radius
        const yPos = y + Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(xPos, yPos)
        else ctx.lineTo(xPos, yPos)
      }
      ctx.closePath()
      ctx.fill()
    }

    const drawDivineLight = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2)
      gradient.addColorStop(0, config.color)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, size * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawMagicSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      // プラス形状
      ctx.beginPath()
      ctx.moveTo(x - size, y)
      ctx.lineTo(x + size, y)
      ctx.moveTo(x, y - size)
      ctx.lineTo(x, y + size)
      ctx.strokeStyle = config.color
      ctx.lineWidth = size * 0.3
      ctx.stroke()
    }

    const animate = () => {
      updateParticles()
      drawParticles()
      requestAnimationFrame(animate)
    }

    resizeCanvas()
    initParticles()
    animate()

    window.addEventListener('resize', resizeCanvas)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [config])

  return (
    <canvas 
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", className)}
    />
  )
}
```

#### **2-4. API修正**
```typescript
// app/api/cards/wisdom/route.ts 修正
import { getRandomWisdomCardFromDB } from '@/lib/wisdom-cards-db'

export async function POST(request: Request): Promise<NextResponse> {
  // ... 認証処理等

  try {
    const cardSelectStartTime = performance.now()
    const randomCard = await getRandomWisdomCardFromDB(accuracy_rate) // DB版に変更
    const cardSelectTime = performance.now() - cardSelectStartTime
    console.log('⏱️ Card selection time:', `${cardSelectTime.toFixed(2)}ms`)
    
    // ビジュアル要素も含めてレスポンス
    return NextResponse.json({
      success: true,
      awarded_card: {
        ...randomCard,
        // ビジュアル要素を含む完全なカード情報
      },
      is_new_card: cardResult.isNew,
      card_count: cardResult.count,
      message: 'Wisdom card awarded successfully'
    })
    
  } catch (error) {
    // ... エラーハンドリング
  }
}
```

---

### **Phase 3: カード管理画面作成（ビジュアル管理含む）**

#### **3-1. 管理画面ページ作成**
```typescript
// app/admin/wisdom-cards/page.tsx（新規作成）
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Save, X, Upload, Eye, Palette } from 'lucide-react'
import { WisdomCardEnhanced } from '@/lib/types/wisdom-cards'
import WisdomCard from '@/components/cards/WisdomCard'
import ImageUploader from '@/components/admin/ImageUploader'
import AnimationUploader from '@/components/admin/AnimationUploader'
import ParticleConfigEditor from '@/components/admin/ParticleConfigEditor'

export default function WisdomCardAdminPage() {
  const [cards, setCards] = useState<WisdomCardEnhanced[]>([])
  const [editingCard, setEditingCard] = useState<WisdomCardEnhanced | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)

  // カード一覧取得
  const fetchCards = async () => {
    try {
      const response = await fetch('/api/admin/wisdom-cards')
      const data = await response.json()
      setCards(data.cards)
    } catch (error) {
      console.error('カード取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // カード保存
  const handleSaveCard = async (card: WisdomCardEnhanced) => {
    try {
      const response = await fetch('/api/admin/wisdom-cards', {
        method: card.id ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify(card)
      })
      
      if (response.ok) {
        await fetchCards()
        setEditingCard(null)
        setIsCreating(false)
      }
    } catch (error) {
      console.error('カード保存エラー:', error)
    }
  }

  // カード削除
  const handleDeleteCard = async (cardId: number) => {
    if (!confirm('このカードを削除しますか？')) return
    
    try {
      const response = await fetch(`/api/admin/wisdom-cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        }
      })
      
      if (response.ok) {
        await fetchCards()
      }
    } catch (error) {
      console.error('カード削除エラー:', error)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [])

  if (loading) {
    return <div className="flex justify-center p-8">読み込み中...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">格言カード管理</h1>
        <div className="flex space-x-4">
          <Button
            variant={previewMode ? 'default' : 'outline'}
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'プレビューON' : 'プレビューOFF'}
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      {/* カード一覧 */}
      <div className={cn(
        "grid gap-4",
        previewMode 
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}>
        {cards.map((card) => (
          <div key={card.id} className="relative">
            {previewMode ? (
              <WisdomCard 
                card={{...card, obtained: true}} 
                showDetails={true}
              />
            ) : (
              <Card className="relative h-48">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex space-x-2">
                      <Badge variant={card.isActive ? 'default' : 'secondary'}>
                        {card.rarity}
                      </Badge>
                      {card.cardImageUrl && (
                        <Badge variant="outline" className="text-xs">
                          <Palette className="h-3 w-3 mr-1" />
                          ビジュアル
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCard(card)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <h3 className="font-semibold text-sm">{card.author}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    "{card.quote}"
                  </p>
                  
                  {/* ビジュアル要素プレビュー */}
                  {card.cardImageUrl && (
                    <div className="flex space-x-2 mt-2">
                      <div className="w-8 h-8 rounded overflow-hidden border">
                        <Image
                          src={card.cardImageUrl}
                          alt="カード画像"
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      </div>
                      {card.authorPortraitUrl && (
                        <div className="w-8 h-8 rounded-full overflow-hidden border">
                          <Image
                            src={card.authorPortraitUrl}
                            alt="著者"
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    <div>カテゴリー: {card.categoryId}</div>
                    <div>表示順: {card.displayOrder}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>

      {/* 編集・作成モーダル */}
      {(editingCard || isCreating) && (
        <WisdomCardEditModal
          card={editingCard}
          onSave={handleSaveCard}
          onCancel={() => {
            setEditingCard(null)
            setIsCreating(false)
          }}
        />
      )}
    </div>
  )
}

// 編集モーダルコンポーネント
function WisdomCardEditModal({ 
  card, 
  onSave, 
  onCancel 
}: {
  card: WisdomCardEnhanced | null
  onSave: (card: WisdomCardEnhanced) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<WisdomCardEnhanced>(
    card || {
      id: 0,
      author: '',
      quote: '',
      categoryId: '',
      subcategoryId: '',
      rarity: 'コモン',
      context: '',
      applicationArea: '',
      isActive: true,
      displayOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  )
  const [activeTab, setActiveTab] = useState('basic')

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {card ? 'カード編集' : '新規作成'}
          </h2>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="visual">ビジュアル</TabsTrigger>
            <TabsTrigger value="preview">プレビュー</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">著者</label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({...formData, author: e.target.value})}
                  placeholder="著者名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">レアリティ</label>
                <Select 
                  value={formData.rarity} 
                  onValueChange={(value) => setFormData({...formData, rarity: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="コモン">コモン</SelectItem>
                    <SelectItem value="レア">レア</SelectItem>
                    <SelectItem value="エピック">エピック</SelectItem>
                    <SelectItem value="レジェンダリー">レジェンダリー</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">格言</label>
              <Textarea
                value={formData.quote}
                onChange={(e) => setFormData({...formData, quote: e.target.value})}
                placeholder="格言内容"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">カテゴリーID</label>
                <Input
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  placeholder="strategy_management"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">サブカテゴリーID</label>
                <Input
                  value={formData.subcategoryId || ''}
                  onChange={(e) => setFormData({...formData, subcategoryId: e.target.value})}
                  placeholder="経営戦略・事業戦略"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">背景・文脈</label>
              <Textarea
                value={formData.context}
                onChange={(e) => setFormData({...formData, context: e.target.value})}
                placeholder="格言の背景や文脈"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">活用分野</label>
              <Textarea
                value={formData.applicationArea}
                onChange={(e) => setFormData({...formData, applicationArea: e.target.value})}
                placeholder="活用できる分野"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">表示順</label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value)})}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                />
                <label className="text-sm font-medium">アクティブ</label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visual" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">メインカード画像</label>
                <ImageUploader
                  value={formData.cardImageUrl}
                  onChange={(url) => setFormData({...formData, cardImageUrl: url})}
                  aspectRatio="3:4"
                  description="推奨サイズ: 300x400px"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">背景画像</label>
                <ImageUploader
                  value={formData.backgroundImageUrl}
                  onChange={(url) => setFormData({...formData, backgroundImageUrl: url})}
                  aspectRatio="16:9"
                  description="推奨サイズ: 800x450px"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">著者肖像画</label>
                <ImageUploader
                  value={formData.authorPortraitUrl}
                  onChange={(url) => setFormData({...formData, authorPortraitUrl: url})}
                  aspectRatio="1:1"
                  circular={true}
                  description="推奨サイズ: 200x200px"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">レアリティフレーム</label>
                <ImageUploader
                  value={formData.rarityFrameUrl}
                  onChange={(url) => setFormData({...formData, rarityFrameUrl: url})}
                  aspectRatio="3:4"
                  description="推奨サイズ: 300x400px（透明PNG）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">カスタムアイコン</label>
                <ImageUploader
                  value={formData.categoryIconUrl}
                  onChange={(url) => setFormData({...formData, categoryIconUrl: url})}
                  aspectRatio="1:1"
                  description="推奨サイズ: 64x64px（SVG推奨）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">特別バッジ</label>
                <ImageUploader
                  value={formData.specialBadgeUrl}
                  onChange={(url) => setFormData({...formData, specialBadgeUrl: url})}
                  aspectRatio="1:1"
                  description="期間限定・特別イベント用"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">アニメーション（Lottie JSON）</label>
              <AnimationUploader
                value={formData.animationUrl}
                onChange={(url) => setFormData({...formData, animationUrl: url})}
                preview={true}
                description="Lottie形式のJSONファイル"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">パーティクル効果</label>
              <ParticleConfigEditor
                config={formData.particleEffectConfig}
                onChange={(config) => setFormData({...formData, particleEffectConfig: config})}
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="flex justify-center">
              <div className="w-80">
                <WisdomCard 
                  card={{...formData, obtained: true}} 
                  showDetails={true}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4 mt-6">
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
        </div>
      </div>
    </div>
  )
}
```

#### **3-2. 管理用API作成（ビジュアル対応）**
```typescript
// app/api/admin/wisdom-cards/route.ts（新規作成）
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isSystemAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // 認証・権限チェック
    const { user, hasPermission } = await authenticateSystemAdmin(request)
    if (!hasPermission) {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    const { data: cards, error } = await supabaseAdmin
      .from('wisdom_cards')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      cards: cards || []
    })
  } catch (error) {
    console.error('格言カード取得エラー:', error)
    return NextResponse.json(
      { success: false, error: 'カード取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証・権限チェック
    const { user, hasPermission } = await authenticateSystemAdmin(request)
    if (!hasPermission) {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    const cardData = await request.json()
    
    const { data, error } = await supabaseAdmin
      .from('wisdom_cards')
      .insert([{
        author: cardData.author,
        quote: cardData.quote,
        category_id: cardData.categoryId,
        subcategory_id: cardData.subcategoryId,
        rarity: cardData.rarity,
        context: cardData.context,
        application_area: cardData.applicationArea,
        
        // ビジュアル要素
        card_image_url: cardData.cardImageUrl,
        background_image_url: cardData.backgroundImageUrl,
        author_portrait_url: cardData.authorPortraitUrl,
        animation_url: cardData.animationUrl,
        particle_effect_config: cardData.particleEffectConfig,
        category_icon_url: cardData.categoryIconUrl,
        rarity_frame_url: cardData.rarityFrameUrl,
        special_badge_url: cardData.specialBadgeUrl,
        
        // 管理用
        is_active: cardData.isActive ?? true,
        display_order: cardData.displayOrder ?? 0
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: '格言カードが作成されました',
      card: data
    })
  } catch (error) {
    console.error('格言カード作成エラー:', error)
    return NextResponse.json(
      { success: false, error: 'カード作成に失敗しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 認証・権限チェック
    const { user, hasPermission } = await authenticateSystemAdmin(request)
    if (!hasPermission) {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    const cardData = await request.json()
    
    const { data, error } = await supabaseAdmin
      .from('wisdom_cards')
      .update({
        author: cardData.author,
        quote: cardData.quote,
        category_id: cardData.categoryId,
        subcategory_id: cardData.subcategoryId,
        rarity: cardData.rarity,
        context: cardData.context,
        application_area: cardData.applicationArea,
        
        // ビジュアル要素
        card_image_url: cardData.cardImageUrl,
        background_image_url: cardData.backgroundImageUrl,
        author_portrait_url: cardData.authorPortraitUrl,
        animation_url: cardData.animationUrl,
        particle_effect_config: cardData.particleEffectConfig,
        category_icon_url: cardData.categoryIconUrl,
        rarity_frame_url: cardData.rarityFrameUrl,
        special_badge_url: cardData.specialBadgeUrl,
        
        // 管理用
        is_active: cardData.isActive,
        display_order: cardData.displayOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardData.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: '格言カードが更新されました',
      card: data
    })
  } catch (error) {
    console.error('格言カード更新エラー:', error)
    return NextResponse.json(
      { success: false, error: 'カード更新に失敗しました' },
      { status: 500 }
    )
  }
}

async function authenticateSystemAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, hasPermission: false }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  
  if (authError || !user) {
    return { user: null, hasPermission: false }
  }

  const hasPermission = await isSystemAdmin(user.id)
  return { user, hasPermission }
}
```

---

### **Phase 4: フォールバック用追加**

#### **4-1. 既存フォールバック同期システムに統合**
```typescript
// scripts/sync-all-fallback-data.ts に追加
async function syncWisdomCards(): Promise<SyncResult> {
  const dataType = '格言カード'
  const timestamp = new Date().toISOString()
  
  try {
    console.log('🔄 格言カード同期中...')
    
    const { data: cards, error } = await supabaseAdmin
      .from('wisdom_cards')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    if (!cards || cards.length === 0) throw new Error('格言カードが見つかりません')
    
    // JSON形式で保存（ビジュアル要素含む）
    const fallbackData = {
      metadata: {
        generatedAt: timestamp,
        recordCount: cards.length,
        dataType: 'wisdom_cards',
        hasVisualElements: cards.some(c => c.card_image_url || c.animation_url)
      },
      cards: cards.map(card => ({
        id: card.id,
        author: card.author,
        quote: card.quote,
        categoryId: card.category_id,
        subcategoryId: card.subcategory_id,
        rarity: card.rarity,
        context: card.context,
        applicationArea: card.application_area,
        
        // ビジュアル要素
        cardImageUrl: card.card_image_url,
        backgroundImageUrl: card.background_image_url,
        authorPortraitUrl: card.author_portrait_url,
        animationUrl: card.animation_url,
        particleEffectConfig: card.particle_effect_config,
        categoryIconUrl: card.category_icon_url,
        rarityFrameUrl: card.rarity_frame_url,
        specialBadgeUrl: card.special_badge_url,
        
        // 管理用
        isActive: card.is_active,
        displayOrder: card.display_order
      }))
    }
    
    const filePath = join(process.cwd(), 'public', 'data', 'wisdom-cards-fallback.json')
    writeFileSync(filePath, JSON.stringify(fallbackData, null, 2))
    
    console.log(`✅ 格言カード同期完了: ${cards.length}件`)
    
    return {
      success: true,
      dataType,
      recordCount: cards.length,
      filePath: 'public/data/wisdom-cards-fallback.json',
      timestamp,
      breakdown: {
        コモン: cards.filter(c => c.rarity === 'コモン').length,
        レア: cards.filter(c => c.rarity === 'レア').length,
        エピック: cards.filter(c => c.rarity === 'エピック').length,
        レジェンダリー: cards.filter(c => c.rarity === 'レジェンダリー').length,
        ビジュアル付き: cards.filter(c => c.card_image_url || c.animation_url).length
      }
    }
  } catch (error) {
    console.error('❌ 格言カード同期エラー:', error)
    return {
      success: false,
      dataType,
      recordCount: 0,
      filePath: '',
      timestamp,
      error: error instanceof Error ? error.message : JSON.stringify(error)
    }
  }
}

// syncAllFallbackData関数にも追加
export async function syncAllFallbackData(): Promise<SyncSummary> {
  const startTime = performance.now()
  
  const syncFunctions = [
    syncXPSettings,
    syncQuizQuestions,
    syncLearningCourses,
    syncStaticData,
    syncWisdomCards  // 追加
  ]
  
  // ... 既存の処理
}
```

#### **4-2. フォールバック読み込み機能（ビジュアル対応）**
```typescript
// lib/wisdom-cards-fallback.ts（新規作成）
import { WisdomCardEnhanced } from '@/lib/types/wisdom-cards'

let cachedWisdomCards: WisdomCardEnhanced[] | null = null
let lastCacheUpdate = 0
const CACHE_TTL = 30 * 60 * 1000 // 30分

async function loadWisdomCardsFallback(): Promise<WisdomCardEnhanced[]> {
  try {
    const response = await fetch('/data/wisdom-cards-fallback.json')
    if (!response.ok) throw new Error('Fallback file not found')
    
    const data = await response.json()
    return data.cards || []
  } catch (error) {
    console.error('🚨 Wisdom cards fallback load failed:', error)
    throw error
  }
}

export async function getRandomWisdomCardWithFallback(percentage: number): Promise<WisdomCardEnhanced> {
  try {
    // 1. キャッシュ確認
    if (cachedWisdomCards && Date.now() - lastCacheUpdate < CACHE_TTL) {
      return selectRandomFromCache(cachedWisdomCards, percentage)
    }
    
    // 2. DB取得 + キャッシュ更新
    const dbCards = await getWisdomCardsFromDB()
    cachedWisdomCards = dbCards
    lastCacheUpdate = Date.now()
    return selectRandomCardByRarity(dbCards, percentage)
    
  } catch (dbError) {
    console.error('🚨 DB access failed:', dbError)
    
    // 3. 古いキャッシュがあれば使用
    if (cachedWisdomCards && cachedWisdomCards.length > 0) {
      console.warn('⚠️ Using stale cache for wisdom cards')
      return selectRandomFromCache(cachedWisdomCards, percentage)
    }
    
    // 4. 静的バックアップファイル読み込み
    try {
      const backupCards = await loadWisdomCardsFallback()
      console.warn('⚠️ Using fallback file for wisdom cards')
      return selectRandomCardByRarity(backupCards, percentage)
    } catch (backupError) {
      console.error('🚨 Static backup failed:', backupError)
      throw new Error('Wisdom card system unavailable')
    }
  }
}

function selectRandomFromCache(cards: WisdomCardEnhanced[], percentage: number): WisdomCardEnhanced {
  return selectRandomCardByRarity(cards, percentage)
}

function selectRandomCardByRarity(cards: WisdomCardEnhanced[], percentage: number): WisdomCardEnhanced {
  let availableCards: WisdomCardEnhanced[]
  
  if (percentage >= 90) {
    availableCards = cards.filter(card => 
      card.rarity === 'レジェンダリー' || card.rarity === 'エピック'
    )
  } else if (percentage >= 70) {
    availableCards = cards.filter(card => 
      card.rarity === 'エピック' || card.rarity === 'レア'
    )
  } else if (percentage >= 50) {
    availableCards = cards.filter(card => 
      card.rarity === 'レア' || card.rarity === 'コモン'
    )
  } else {
    availableCards = cards.filter(card => 
      card.rarity === 'コモン'
    )
  }
  
  if (availableCards.length === 0) {
    availableCards = cards
  }
  
  const randomIndex = Math.floor(Math.random() * availableCards.length)
  return availableCards[randomIndex]
}
```

#### **4-3. 管理画面API統合**
```typescript
// app/api/admin/fallback-sync/route.ts 修正
switch (syncType) {
  case 'wisdom':
    result = await syncWisdomCards()
    break
  case 'all':
  default:
    result = await syncAllFallbackData() // syncWisdomCards()も含める
    break
}

// フォールバック状況確認にも追加
const fallbackFiles = [
  // 既存ファイル...
  { 
    name: '格言カード', 
    path: 'public/data/wisdom-cards-fallback.json',
    type: 'json' 
  }
]
```

---

### **Phase 5: 高度機能拡張**

#### **5-1. 条件付きカード配布**
```sql
-- 拡張テーブル作成
CREATE TABLE wisdom_card_conditions (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES wisdom_cards(id),
  condition_type VARCHAR(50) NOT NULL, -- 'date_range', 'user_level', 'achievement'
  condition_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 使用例
INSERT INTO wisdom_card_conditions (card_id, condition_type, condition_data) VALUES
(13, 'date_range', '{"start_date": "2025-12-01", "end_date": "2025-12-31", "event": "年末特別カード"}'),
(14, 'user_level', '{"min_level": 10, "description": "レベル10達成者限定"}'),
(15, 'achievement', '{"quiz_accuracy": 95, "consecutive_days": 7, "description": "7日連続95%以上達成者限定"}');
```

#### **5-2. 多言語対応**
```sql
CREATE TABLE wisdom_card_translations (
  id SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES wisdom_cards(id),
  language_code VARCHAR(5) NOT NULL, -- 'ja', 'en', 'zh', etc.
  author VARCHAR(100),
  quote TEXT NOT NULL,
  context TEXT,
  application_area TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **5-3. カードコレクション機能拡張**
```sql
CREATE TABLE wisdom_card_sets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  card_ids INTEGER[] NOT NULL,
  completion_reward JSONB, -- XP, SKP, バッジ等
  is_active BOOLEAN DEFAULT true
);
```

---

### **Phase 6: 分析・統計拡張**

#### **6-1. 基本分析ビュー作成**
```sql
-- 配布統計ビュー
CREATE VIEW wisdom_card_distribution_stats AS
SELECT 
  wc.id,
  wc.author,
  wc.rarity,
  wc.category_id,
  wc.card_image_url IS NOT NULL as has_visual,
  COUNT(wcc.id) as total_distributed,
  COUNT(DISTINCT wcc.user_id) as unique_recipients,
  AVG(CASE WHEN qs.accuracy_rate IS NOT NULL THEN qs.accuracy_rate END) as avg_accuracy_when_earned,
  MIN(wcc.obtained_at) as first_distribution,
  MAX(wcc.obtained_at) as latest_distribution
FROM wisdom_cards wc
LEFT JOIN wisdom_card_collection wcc ON wc.id = wcc.card_id
LEFT JOIN quiz_sessions qs ON qs.user_id = wcc.user_id 
  AND DATE(qs.created_at) = DATE(wcc.obtained_at)
WHERE wc.is_active = true
GROUP BY wc.id, wc.author, wc.rarity, wc.category_id, wc.card_image_url;

-- ユーザー別コレクション進捗ビュー
CREATE VIEW user_wisdom_collection_progress AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT wcc.card_id) as cards_collected,
  COUNT(DISTINCT CASE WHEN wc.rarity = 'コモン' THEN wcc.card_id END) as common_cards,
  COUNT(DISTINCT CASE WHEN wc.rarity = 'レア' THEN wcc.card_id END) as rare_cards,
  COUNT(DISTINCT CASE WHEN wc.rarity = 'エピック' THEN wcc.card_id END) as epic_cards,
  COUNT(DISTINCT CASE WHEN wc.rarity = 'レジェンダリー' THEN wcc.card_id END) as legendary_cards,
  COUNT(DISTINCT CASE WHEN wc.card_image_url IS NOT NULL THEN wcc.card_id END) as visual_cards,
  ROUND(COUNT(DISTINCT wcc.card_id) * 100.0 / (SELECT COUNT(*) FROM wisdom_cards WHERE is_active = true), 2) as completion_percentage
FROM users u
LEFT JOIN wisdom_card_collection wcc ON u.id = wcc.user_id
LEFT JOIN wisdom_cards wc ON wcc.card_id = wc.id AND wc.is_active = true
GROUP BY u.id, u.email;
```

#### **6-2. 分析API作成**
```typescript
// app/api/analytics/wisdom-cards/route.ts（新規作成）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const analysisType = searchParams.get('type')
  
  try {
    switch (analysisType) {
      case 'distribution':
        return getDistributionAnalytics()
      case 'engagement':
        return getEngagementAnalytics()
      case 'visual-impact':
        return getVisualImpactAnalytics()
      case 'trends':
        return getTrendAnalytics()
      case 'user-insights':
        return getUserInsights()
      default:
        return getBasicAnalytics()
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '分析データ取得に失敗しました' },
      { status: 500 }
    )
  }
}

async function getDistributionAnalytics() {
  const { data } = await supabaseAdmin
    .from('wisdom_card_distribution_stats')
    .select('*')
    .order('total_distributed', { ascending: false })

  return NextResponse.json({
    success: true,
    data: {
      cardPopularity: data,
      rarityDistribution: calculateRarityDistribution(data),
      categoryStats: calculateCategoryStats(data),
      visualImpact: calculateVisualImpact(data)
    }
  })
}

async function getVisualImpactAnalytics() {
  const { data } = await supabaseAdmin.rpc('analyze_visual_impact')
  
  return NextResponse.json({
    success: true,
    data: {
      visualCardPerformance: data.visual_performance,
      engagementComparison: data.engagement_comparison,
      popularVisualElements: data.popular_elements
    }
  })
}
```

#### **6-3. 分析ダッシュボード（ビジュアル分析含む）**
```typescript
// components/analytics/WisdomCardDashboard.tsx（新規作成）
export default function WisdomCardDashboard() {
  const [analytics, setAnalytics] = useState(null)
  
  useEffect(() => {
    fetchAnalytics()
  }, [])
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="総配布数" value={analytics?.totalDistributed} icon="📊" />
        <StatsCard title="アクティブユーザー" value={analytics?.activeUsers} icon="👥" />
        <StatsCard title="完成率平均" value={analytics?.avgCompletion} icon="🎯" />
        <StatsCard title="ビジュアルカード率" value={analytics?.visualCardPercentage} icon="🎨" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>レアリティ別配布状況</CardTitle>
          </CardHeader>
          <CardContent>
            <RarityDistributionChart data={analytics?.rarityData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>ビジュアル要素の効果</CardTitle>
          </CardHeader>
          <CardContent>
            <VisualImpactChart data={analytics?.visualImpactData} />
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>カテゴリー別人気度</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPopularityChart data={analytics?.categoryData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>時系列トレンド</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart data={analytics?.trendsData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>ユーザーエンゲージメント</CardTitle>
          </CardHeader>
          <CardContent>
            <EngagementChart data={analytics?.engagementData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## 🎯 **実装スケジュール**

### **Week 1-2: 基盤構築（ビジュアル対応）**
- [ ] wisdom_cardsテーブル作成（ビジュアルフィールド含む）
- [ ] 既存12枚データ移行（基本ビジュアル要素設定）
- [ ] 型定義更新（ビジュアル要素含む）
- [ ] ビジュアルリソース準備（基本画像・フレーム）

### **Week 3-4: ロジック修正・ビジュアル対応**
- [ ] DB版カード取得関数作成
- [ ] カードコンポーネント大幅拡張（ビジュアル対応）
- [ ] LottieAnimation・ParticleEffectコンポーネント作成
- [ ] API修正（DB版に切り替え）
- [ ] 既存機能テスト・デバッグ

### **Week 5-6: 管理機能（ビジュアル管理含む）**
- [ ] 管理画面UI作成（ビジュアル管理タブ含む）
- [ ] ImageUploader・AnimationUploaderコンポーネント
- [ ] ParticleConfigEditorコンポーネント
- [ ] 管理用API作成（ビジュアル要素対応）
- [ ] CRUD機能テスト・プレビュー機能

### **Week 7: フォールバック統合**
- [ ] フォールバック同期機能追加（ビジュアル要素含む）
- [ ] フォールバック読み込み機能
- [ ] エラーハンドリング強化
- [ ] 管理画面での同期状況確認

### **Week 8-9: 高度機能**
- [ ] 条件付きカード配布システム
- [ ] カードセット機能
- [ ] 多言語対応基盤
- [ ] 特別イベントカード機能

### **Week 10-12: 分析機能（ビジュアル効果分析含む）**
- [ ] 分析ビュー作成（ビジュアル効果分析含む）
- [ ] 分析API作成
- [ ] ダッシュボード実装（ビジュアル分析チャート）
- [ ] A/Bテスト機能（ビジュアル有無での効果測定）

---

## ✅ **品質管理・テスト計画**

### **テスト項目**
1. **データ移行テスト**: 既存12枚カードの完全移行確認（ビジュアル要素含む）
2. **機能継続性テスト**: 既存のカード配布・表示機能正常動作
3. **ビジュアル表示テスト**: 画像読み込み・アニメーション・パーティクル表示確認
4. **管理機能テスト**: CRUD操作・権限管理・ビジュアル管理確認
5. **フォールバックテスト**: DB障害時の代替動作確認（ビジュアル要素含む）
6. **パフォーマンステスト**: ビジュアル要素込みでの応答時間測定
7. **レスポンシブテスト**: 各デバイスでのビジュアル表示確認

### **品質基準**
- TypeScriptエラー: 0個
- ESLintエラー: 0個
- テストスイート: 全てPASS
- API応答時間: 5秒以内（ビジュアル要素込み）
- 画像読み込み時間: 3秒以内
- アニメーション性能: 60FPS維持
- フォールバック動作: 100%成功

---

## 🚨 **リスク管理・対策**

### **主要リスク**
1. **データ移行失敗**: 既存データの破損・不整合
2. **ビジュアルパフォーマンス劣化**: 画像・アニメーション負荷
3. **機能停止**: 移行時の予期しないエラー
4. **権限設定ミス**: 不正なカード操作の許可
5. **ビジュアルリソース管理**: 大容量ファイルの管理・配信

### **対策**
1. **段階的移行**: 本番影響を最小限に制御
2. **完全バックアップ**: 全データの事前保存
3. **フォールバック準備**: DB障害時の代替手段
4. **権限テスト**: システム管理者権限の厳密確認
5. **CDN導入**: 画像・アニメーションファイルの高速配信
6. **遅延読み込み**: 必要時のみリソース読み込み
7. **画像最適化**: WebP形式・圧縮での配信

### **ビジュアル要素特有の対策**
- **ファイルサイズ制限**: 画像2MB、アニメーション1MB以下
- **フォーマット制約**: 画像（JPG/PNG/WebP）、アニメーション（Lottie JSON）
- **フォールバック表示**: ビジュアル要素読み込み失敗時のデフォルト表示
- **キャッシュ戦略**: ブラウザキャッシュ・CDNキャッシュの活用

---

*このドキュメントは格言カードシステムのDB化・ビジュアル強化による運用性・拡張性・ユーザー体験向上を目的として作成されました。実装進捗に合わせて継続的に更新してください。*

**最終更新**: 2025年10月16日  
**作成者**: Claude Code AI Assistant  
**承認**: [プロジェクトマネージャー承認予定]