# 🎴 ナレッジカードシステム完全設計書

**分析日**: 2025年10月14日  
**目的**: ハードコード問題とID体系の混乱を根本解決  
**設計方針**: シンプル・一貫性・拡張性  

---

## 🚨 **現在の問題点分析**

### **1. ハードコード問題**
**場所**: `app/collection/page.tsx` (220-400行)
```typescript
// ❌ 問題: 100行以上のカード定義がハードコード
const knowledgeCards: KnowledgeCardType[] = [
  {
    id: 'conclusion_first_card',
    title: '結論ファースト',
    summary: 'まず結論、その後に根拠という情報構造で...',
    keyPoints: ['PREP法の活用', '聞き手の理解負荷を軽減', ...],
    icon: '🎯',
    color: '#3B82F6',
    // ... 大量の固定データ
  },
  // さらに10以上のカード定義...
]
```

### **2. ID体系の混乱**
- **生成時**: `theme_${themeId}` → ハッシュで数値ID (2143, 2358...)
- **保存**: `knowledge_card_collection.card_id` (int4)
- **表示**: ハードコード配列から検索

### **3. データ不整合リスク**
- テーマ完了時: `theme_id`ベースで処理
- コレクション表示: `card_id`ベースで処理  
- 同じテーマで複数カードがあると混乱

---

## 💡 **最適化設計案: theme_id中心の統一システム**

### **核心コンセプト**
1. **Single Source of Truth**: `theme_id`を主キーとした統一管理
2. **データベース中心**: ハードコード完全排除
3. **シンプルなID体系**: 意味のある文字列ID

---

## 🗄️ **新データベース設計**

### **1. ナレッジカードマスタテーブル**
```sql
-- knowledge_cards (マスタテーブル)
CREATE TABLE knowledge_cards (
  theme_id TEXT PRIMARY KEY,              -- 'so_what_why_so' (learning_themes.idと一致)
  title TEXT NOT NULL,                    -- '結論ファースト'
  summary TEXT,                           -- カード概要
  key_points JSONB,                       -- ["ポイント1", "ポイント2"]
  icon TEXT DEFAULT '🎯',                -- アイコン
  color TEXT DEFAULT '#3B82F6',          -- カラーコード
  category TEXT,                          -- '論理的思考・分析'
  difficulty TEXT DEFAULT 'beginner',    -- 'beginner' | 'intermediate' | 'advanced'
  display_order INTEGER DEFAULT 0,       -- 表示順序
  reward_xp INTEGER DEFAULT 0,           -- カード獲得時のボーナスXP
  is_active BOOLEAN DEFAULT true,        -- アクティブフラグ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 外部キー制約
  CONSTRAINT fk_knowledge_cards_theme_id 
    FOREIGN KEY (theme_id) REFERENCES learning_themes(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_knowledge_cards_active ON knowledge_cards(is_active);
CREATE INDEX idx_knowledge_cards_category ON knowledge_cards(category);
CREATE INDEX idx_knowledge_cards_difficulty ON knowledge_cards(difficulty);
```

### **2. ユーザーコレクションテーブル（刷新）**
```sql
-- user_knowledge_collection (コレクションテーブル - 完全刷新)
CREATE TABLE user_knowledge_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                 -- users.id
  theme_id TEXT NOT NULL,                -- knowledge_cards.theme_id
  count INTEGER DEFAULT 1,               -- 取得回数
  first_obtained_at TIMESTAMP DEFAULT NOW(),
  last_obtained_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 複合ユニークキー（同じユーザー・テーマの組み合わせは1レコードのみ）
  CONSTRAINT uk_user_knowledge_collection_user_theme 
    UNIQUE (user_id, theme_id),
    
  -- 外部キー制約
  CONSTRAINT fk_user_knowledge_collection_user_id 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_knowledge_collection_theme_id 
    FOREIGN KEY (theme_id) REFERENCES knowledge_cards(theme_id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_user_knowledge_collection_user_id ON user_knowledge_collection(user_id);
CREATE INDEX idx_user_knowledge_collection_obtained ON user_knowledge_collection(first_obtained_at);
```

### **3. マスタデータ投入**
```sql
INSERT INTO knowledge_cards (theme_id, title, summary, key_points, icon, color, category, difficulty, display_order, reward_xp) VALUES

('so_what_why_so', 'So What?/Why So?', 
 '情報の本質を見抜き、deeper insightを得るための質問技術',
 '["So What? - それで何が言えるのか？", "Why So? - なぜそうなるのか？", "論理の飛躍を防ぐ検証プロセス"]'::jsonb,
 '❓', '#F59E0B', '論理的思考・分析', 'intermediate', 10, 50),

('conclusion_first', '結論ファースト', 
 'まず結論、その後に根拠という情報構造でコミュニケーションの効率を上げる手法',
 '["PREP法（Point・Reason・Example・Point）の活用", "聞き手の理解負荷を軽減", "説得力のあるプレゼンテーション"]'::jsonb,
 '🎯', '#3B82F6', '論理的思考・分析', 'beginner', 20, 30),

('mece_thinking', 'MECE思考', 
 '複雑な問題を「漏れなく重複なく」整理して全体像を把握する思考技術',
 '["Mutually Exclusive（重複なく）", "Collectively Exhaustive（漏れなく）", "問題の全体像把握と優先順位付け"]'::jsonb,
 '📊', '#10B981', '論理的思考・分析', 'beginner', 30, 30),

('logical_tree', 'ロジックツリー', 
 '問題を階層的に分解し、根本原因を特定する構造化思考ツール',
 '["イシューツリーとソリューションツリーの使い分け", "Why型とHow型の論理展開", "原因分析と対策立案の体系化"]'::jsonb,
 '🌳', '#8B5CF6', '論理的思考・分析', 'intermediate', 40, 40),

('market_analysis', '3C分析', 
 '市場分析の基本フレームワークで競合優位性を見つける手法',
 '["Customer（市場・顧客）", "Competitor（競合）", "Company（自社）", "戦略的ポジショニング"]'::jsonb,
 '📈', '#EC4899', '戦略・分析', 'intermediate', 50, 40),

('ai_basic_concepts', 'AI基本概念', 
 'ビジネスで活用するAIの基本知識と実践ポイント',
 '["機械学習とディープラーニング", "ビジネス適用の考え方", "AI導入の成功要因"]'::jsonb,
 '🤖', '#6366F1', 'AI・デジタル活用', 'beginner', 60, 35);
```

---

## 🔧 **統一APIライブラリ**

### **lib/knowledge-cards.ts (完全刷新)**
```typescript
import { supabase } from './supabase'

// 型定義
export interface KnowledgeCard {
  theme_id: string              // 'so_what_why_so'
  title: string                 // 'So What?/Why So?'
  summary: string               // カード概要
  key_points: string[]          // キーポイント配列
  icon: string                  // '❓'
  color: string                 // '#F59E0B'
  category: string              // '論理的思考・分析'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  display_order: number        // 表示順序
  reward_xp: number             // カード獲得ボーナスXP
  is_active: boolean            // アクティブフラグ
}

export interface UserKnowledgeCard extends KnowledgeCard {
  collection_id: string        // user_knowledge_collection.id
  user_id: string              // ユーザーID
  count: number                // 取得回数
  first_obtained_at: string    // 初回取得日時
  last_obtained_at: string     // 最終取得日時
}

// 🎯 カード獲得処理（テーマ完了時）
export async function acquireKnowledgeCard(userId: string, themeId: string): Promise<{
  success: boolean
  card?: KnowledgeCard
  isNew: boolean
  bonusXP: number
}> {
  try {
    // 1. カードマスタ確認
    const { data: cardMaster } = await supabase
      .from('knowledge_cards')
      .select('*')
      .eq('theme_id', themeId)
      .eq('is_active', true)
      .single()
    
    if (!cardMaster) {
      console.warn(`No knowledge card found for theme: ${themeId}`)
      return { success: false, isNew: false, bonusXP: 0 }
    }
    
    // 2. 既存取得確認・更新またはインサート
    const { data: existing } = await supabase
      .from('user_knowledge_collection')
      .select('*')
      .eq('user_id', userId)
      .eq('theme_id', themeId)
      .single()
    
    if (existing) {
      // 既存カード - カウント更新
      const { error } = await supabase
        .from('user_knowledge_collection')
        .update({
          count: existing.count + 1,
          last_obtained_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (error) throw error
      
      console.log(`📚 Knowledge card re-acquired: ${themeId} (count: ${existing.count + 1})`)
      return { success: true, card: cardMaster, isNew: false, bonusXP: 0 }
      
    } else {
      // 新規カード - インサート
      const { error } = await supabase
        .from('user_knowledge_collection')
        .insert({
          user_id: userId,
          theme_id: themeId,
          count: 1
        })
      
      if (error) throw error
      
      console.log(`🎉 New knowledge card acquired: ${themeId} (+${cardMaster.reward_xp} XP)`)
      return { 
        success: true, 
        card: cardMaster, 
        isNew: true, 
        bonusXP: cardMaster.reward_xp 
      }
    }
    
  } catch (error) {
    console.error('Failed to acquire knowledge card:', error)
    return { success: false, isNew: false, bonusXP: 0 }
  }
}

// 🗂️ ユーザーコレクション取得（コレクション画面用）
export async function getUserKnowledgeCollection(userId: string): Promise<UserKnowledgeCard[]> {
  try {
    const { data, error } = await supabase
      .from('user_knowledge_collection')
      .select(`
        id as collection_id,
        user_id,
        count,
        first_obtained_at,
        last_obtained_at,
        knowledge_cards!inner (
          theme_id,
          title,
          summary,
          key_points,
          icon,
          color,
          category,
          difficulty,
          display_order,
          reward_xp,
          is_active
        )
      `)
      .eq('user_id', userId)
      .eq('knowledge_cards.is_active', true)
      .order('first_obtained_at', { ascending: false })
    
    if (error) throw error
    
    // フラット化
    return data.map(item => ({
      collection_id: item.collection_id,
      user_id: item.user_id,
      count: item.count,
      first_obtained_at: item.first_obtained_at,
      last_obtained_at: item.last_obtained_at,
      theme_id: item.knowledge_cards.theme_id,
      title: item.knowledge_cards.title,
      summary: item.knowledge_cards.summary || '',
      key_points: item.knowledge_cards.key_points || [],
      icon: item.knowledge_cards.icon,
      color: item.knowledge_cards.color,
      category: item.knowledge_cards.category || '',
      difficulty: item.knowledge_cards.difficulty,
      display_order: item.knowledge_cards.display_order,
      reward_xp: item.knowledge_cards.reward_xp,
      is_active: item.knowledge_cards.is_active
    }))
    
  } catch (error) {
    console.error('Failed to get user knowledge collection:', error)
    return []
  }
}

// 📊 カード統計取得
export async function getKnowledgeCardStats(userId: string): Promise<{
  totalCards: number
  totalAcquisitions: number
  categoryCounts: Record<string, number>
}> {
  try {
    const { data } = await supabase
      .from('user_knowledge_collection')
      .select(`
        count,
        knowledge_cards!inner (category)
      `)
      .eq('user_id', userId)
      .eq('knowledge_cards.is_active', true)
    
    const totalCards = data?.length || 0
    const totalAcquisitions = data?.reduce((sum, item) => sum + item.count, 0) || 0
    const categoryCounts: Record<string, number> = {}
    
    data?.forEach(item => {
      const category = item.knowledge_cards.category || 'その他'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })
    
    return { totalCards, totalAcquisitions, categoryCounts }
    
  } catch (error) {
    console.error('Failed to get knowledge card stats:', error)
    return { totalCards: 0, totalAcquisitions: 0, categoryCounts: {} }
  }
}

// 🔍 カードマスタ一覧取得（管理用）
export async function getAllKnowledgeCards(): Promise<KnowledgeCard[]> {
  const { data, error } = await supabase
    .from('knowledge_cards')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  
  if (error) {
    console.error('Failed to get all knowledge cards:', error)
    return []
  }
  
  return data
}
```

---

## 🔄 **コード修正箇所**

### **1. カード獲得処理修正**
**components/learning/LearningSession.tsx** (434-441行)
```typescript
// ❌ 旧コード
try {
  const cardId = Math.abs(`theme_${themeId}`.split('').reduce((a, b) => a + b.charCodeAt(0), 0))
  await addKnowledgeCardToCollection(user.id, cardId)
  console.log('🎊 Knowledge card immediately added to collection')
} catch (cardError) {
  console.warn('⚠️ Failed to add knowledge card immediately:', cardError)
}

// ✅ 新コード
try {
  const result = await acquireKnowledgeCard(user.id, themeId)
  if (result.success) {
    if (result.isNew) {
      console.log(`🎉 New knowledge card: ${result.card?.title} (+${result.bonusXP} XP)`)
      // ボーナスXPがあれば統計に加算
      if (result.bonusXP > 0) {
        setEarnedXP(prev => prev + result.bonusXP)
      }
    } else {
      console.log(`📚 Card re-acquired: ${result.card?.title}`)
    }
  }
} catch (cardError) {
  console.warn('⚠️ Failed to acquire knowledge card:', cardError)
}
```

### **2. コレクション画面修正**
**app/collection/page.tsx** (全面刷新)
```typescript
// ❌ 旧コード: 100行以上のハードコード
const knowledgeCards: KnowledgeCardType[] = [/* 大量のハードコード */]

// ✅ 新コード: シンプルなデータベース取得
'use client'

import { useState, useEffect } from 'react'
import { getUserKnowledgeCollection, getKnowledgeCardStats, type UserKnowledgeCard } from '@/lib/knowledge-cards'
import { useAuth } from '@/components/auth/AuthProvider'

export default function CollectionPage() {
  const { user } = useAuth()
  const [knowledgeCards, setKnowledgeCards] = useState<UserKnowledgeCard[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadCollection = async () => {
      if (!user?.id) return
      
      try {
        const cards = await getUserKnowledgeCollection(user.id)
        const stats = await getKnowledgeCardStats(user.id)
        
        setKnowledgeCards(cards)
        console.log('📊 Collection loaded:', { 
          cards: cards.length, 
          stats 
        })
      } catch (error) {
        console.error('Failed to load knowledge collection:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadCollection()
  }, [user?.id])

  // 以下、既存のUI表示ロジック（cardsをknowledgeCardsとして使用）
}
```

---

## 📊 **マイグレーション計画**

### **Phase 1: 新テーブル作成**
```sql
-- 新しいテーブル構造作成
CREATE TABLE knowledge_cards (/* 上記定義 */);
CREATE TABLE user_knowledge_collection (/* 上記定義 */);

-- マスタデータ投入
INSERT INTO knowledge_cards VALUES (/* 上記データ */);
```

### **Phase 2: データ移行**
```sql
-- 既存のknowledge_card_collectionから新テーブルに移行
-- ハッシュIDからtheme_idに逆算
INSERT INTO user_knowledge_collection (user_id, theme_id, count, first_obtained_at, last_obtained_at)
SELECT 
  user_id,
  CASE card_id
    WHEN 2143 THEN 'so_what_why_so'
    WHEN 2358 THEN 'conclusion_first'
    WHEN 1991 THEN 'mece_thinking'
    WHEN 1884 THEN 'logical_tree'
    -- 他のカードIDも追加
  END as theme_id,
  count,
  obtained_at,
  last_obtained_at
FROM knowledge_card_collection
WHERE card_id IN (2143, 2358, 1991, 1884 /* 他のハッシュID */);
```

### **Phase 3: コード切り替え**
1. 新ライブラリ `lib/knowledge-cards.ts` 実装
2. `LearningSession.tsx` 修正
3. `collection/page.tsx` 全面刷新
4. 旧コード・テーブル削除

---

## ✅ **最適化後の利点**

### **1. シンプリティ**
- **Single ID System**: `theme_id`のみで統一
- **直感的**: `'so_what_why_so'` でカード内容が推測可能
- **型安全**: 一貫したTypeScript型定義

### **2. メンテナビリティ**
- **ハードコード0**: 全データはデータベース管理
- **カード追加**: SQL INSERTのみ
- **カード修正**: SQL UPDATEのみ

### **3. 拡張性**
- **新カードタイプ**: カテゴリー・難易度で分類
- **ボーナスXP**: カード獲得時の報酬設定可能
- **統計機能**: カテゴリー別取得状況など

### **4. データ整合性**
- **外部キー制約**: テーマとカードの関連性保証
- **ユニーク制約**: 同一ユーザー・テーマで1レコードのみ
- **カスケード削除**: テーマ削除時にカードも削除

この設計により、ハードコード問題と複雑なID体系を完全に解決し、シンプルで拡張性の高いナレッジカードシステムを実現できます。