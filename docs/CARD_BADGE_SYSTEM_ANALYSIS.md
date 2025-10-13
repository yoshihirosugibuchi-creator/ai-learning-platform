# ナレッジカード・バッジシステム調査結果・課題整理

**作成日**: 2025年10月12日  
**調査目的**: コース学習システム再設計における報酬システム（カード・バッジ）の実装方針決定  
**調査対象**: knowledge_card_collection, wisdom_card_collection, user_badges関連

---

## 🔍 **1. 現状データ構造分析**

### **1.1 ナレッジカード関連テーブル**

#### **knowledge_card_collection**
```typescript
{
  user_id: string
  card_id: number          // 🚨 重要：数値型のカードID
  count: number | null
  obtained_at: string | null
  last_obtained_at: string | null
}
```
- **用途**: ユーザーが獲得したナレッジカードのコレクション記録
- **現在のデータ**: `knowledge_cards_total: 0`（未使用状態）

#### **wisdom_card_collection**
```typescript
{
  user_id: string
  card_id: number          // 🚨 重要：数値型のカードID
  count: number | null
  obtained_at: string | null
  last_obtained_at: string | null
}
```
- **用途**: ユーザーが獲得したウィズダムカードのコレクション記録
- **現在のデータ**: `wisdom_cards_total: 1`（使用中）

### **1.2 バッジ・修了証関連テーブル**

#### **user_badges**
```typescript
{
  user_id: string
  badge_id: string         // 🚨 重要：文字列型のバッジID
  badge_title: string
  badge_description: string | null
  badge_color: string | null
  badge_image_url: string | null
  course_id: string
  course_name: string
  difficulty: string
  earned_at: string
  expires_at: string | null
  validity_period_months: number | null
}
```
- **用途**: ユーザーが獲得したバッジ・修了証記録
- **現在のデータ**: `badges_total: 0`（未使用状態）

### **1.3 統計カウンター**

#### **user_xp_stats_v2 統計フィールド**
- `knowledge_cards_total: number` - ナレッジカード総数
- `wisdom_cards_total: number` - ウィズダムカード総数
- `badges_total: number` - バッジ総数

#### **現在の実データ例**
```json
{
  "wisdom_cards_total": 1,
  "knowledge_cards_total": 0,
  "badges_total": 0
}
```

---

## 🚨 **2. 重要な問題・課題**

### **2.1 マスターデータの不在・不明確**

#### **A. カードマスターテーブルが存在しない**
- ❌ `knowledge_cards`テーブル: 見つからない
- ❌ `wisdom_cards`テーブル: 見つからない
- ❌ カード情報（タイトル、説明、画像等）の管理方法不明
- ❌ `theme_id` → `card_id`のマッピング情報不明

#### **B. バッジマスターデータが不明確**
- ⚠️ `learning_courses.badge_data: Json | null`にバッジ情報がある可能性
- ❌ バッジIDの命名規則・体系不明
- ❌ バッジテンプレート（色、画像、説明）の管理方法不明

### **2.2 データ整合性の問題**

#### **A. IDの型不整合**
- ナレッジ/ウィズダムカード: `card_id: number`（数値型）
- バッジ: `badge_id: string`（文字列型）
- 一貫性のない設計

#### **B. 関連付けロジックの不明確**
- テーマ完了 → ナレッジカード付与のロジック不明
- コース完了 → バッジ付与のロジック不明
- カードID決定方法不明

### **2.3 現在の実装状況**

#### **A. 動作中の機能**
- ✅ ウィズダムカード: 1件獲得済み（クイズ系？）
- ✅ 統計カウンター: 正常に更新中

#### **B. 未実装・停止中の機能**
- ❌ ナレッジカード獲得: 0件（停止中）
- ❌ バッジ獲得: 0件（停止中）
- ❌ コース学習からの報酬付与: 未実装

---

## 📋 **3. 実装方針・段階的アプローチ**

### **Phase 3A: コース学習完成（ダミー実装）**

#### **目標**: コア機能を完成させ、報酬は最小限のダミー実装

#### **ナレッジカード実装**
```typescript
// ダミー実装：テーマIDベースのカードID生成
const dummyCardId = parseInt(themeId.replace(/[^0-9]/g, '')) || 1

await supabase
  .from('knowledge_card_collection')
  .insert({
    user_id: userId,
    card_id: dummyCardId,
    obtained_at: new Date().toISOString()
  })
```

#### **バッジ実装**
```typescript
// ダミー実装：コースIDベースのバッジID生成
const dummyBadgeId = `course_completion_${courseId}`

await supabase
  .from('user_badges')
  .insert({
    user_id: userId,
    badge_id: dummyBadgeId,
    badge_title: `${courseTitle} 修了証`,
    course_id: courseId,
    course_name: courseTitle,
    difficulty: courseDifficulty,
    earned_at: new Date().toISOString()
  })
```

#### **統計カウンター更新**
```typescript
// 統計カウンターは正しく更新
knowledge_cards_total += 1
badges_total += 1
```

### **Phase 3B: マスター構造化設計・変更**

#### **目標**: 正式なマスターデータ体系の確立

#### **1. カードマスターテーブル設計**
```sql
-- ナレッジカードマスター
CREATE TABLE knowledge_cards (
  id SERIAL PRIMARY KEY,
  theme_id UUID REFERENCES learning_themes(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  rarity VARCHAR(50) DEFAULT 'common',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ウィズダムカードマスター  
CREATE TABLE wisdom_cards (
  id SERIAL PRIMARY KEY,
  trigger_type VARCHAR(100) NOT NULL, -- 'quiz_perfect', 'streak_7', etc
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  rarity VARCHAR(50) DEFAULT 'common',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **2. バッジマスターテーブル設計**
```sql
-- バッジマスター
CREATE TABLE badge_templates (
  id VARCHAR(100) PRIMARY KEY,
  badge_type VARCHAR(50) NOT NULL, -- 'course_completion', 'achievement', etc
  title_template VARCHAR(255) NOT NULL, -- '{course_name} 修了証'
  description_template TEXT,
  image_url TEXT,
  badge_color VARCHAR(7), -- hex color
  validity_period_months INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **3. マッピングテーブル設計**
```sql
-- テーマ→カードマッピング
CREATE TABLE theme_card_mapping (
  theme_id UUID REFERENCES learning_themes(id),
  knowledge_card_id INTEGER REFERENCES knowledge_cards(id),
  PRIMARY KEY (theme_id, knowledge_card_id)
);

-- コース→バッジマッピング
CREATE TABLE course_badge_mapping (
  course_id UUID REFERENCES learning_courses(id),
  badge_template_id VARCHAR(100) REFERENCES badge_templates(id),
  PRIMARY KEY (course_id, badge_template_id)
);
```

### **Phase 3C: 影響範囲洗い出し・修正**

#### **対象ファイル**
1. **API修正**
   - `app/api/xp-save/course/route.ts` - マスターテーブル参照に変更
   - `app/api/xp-save/quiz/route.ts` - ウィズダムカード付与ロジック確認

2. **フロントエンド修正**
   - コース完了画面 - バッジ表示ロジック
   - プロフィール画面 - カード・バッジ一覧表示
   - 統計画面 - カウンター表示

3. **統計システム修正**
   - 各種XP統計更新処理
   - カウンター更新ロジック

---

## ⚠️ **4. 留意事項・制約**

### **4.1 データ移行の必要性**
- 既存のウィズダムカード1件の移行対応
- 統計カウンターの再計算
- 既存ユーザーへの影響最小化

### **4.2 パフォーマンス考慮**
- カード・バッジ付与時のマスターテーブルJOIN負荷
- 大量データでの統計更新負荷
- キャッシュ戦略の検討

### **4.3 UX・デザイン影響**
- カード・バッジ表示UI実装
- 獲得演出・通知システム
- コレクション画面の実装

---

## 📅 **5. 実装スケジュール**

| Phase | 作業内容 | 期間 | 依存関係 |
|-------|----------|------|----------|
| **3A** | ダミー実装でコース学習完成 | 0.5日 | - |
| **3B** | マスター構造設計・DB変更 | 1日 | 3A完了 |
| **3C** | 影響箇所修正・本実装 | 1.5日 | 3B完了 |

---

## 🎯 **6. 次のアクション**

### **immediate（今すぐ）**
1. **Phase 3A**: コース学習APIをダミー実装で完成
2. **動作テスト**: ダミーカード・バッジが正常に付与されることを確認

### **Phase 3A完了後**
1. **Phase 3B**: マスター構造設計の詳細検討
2. **既存データ調査**: `learning_courses.badge_data`の内容確認
3. **Phase 3C**: 実装計画の詳細化

---

*このドキュメントはコース学習システム再設計の一環として作成されました。*  
*Phase 3Aの完成を最優先とし、段階的に報酬システムを整備していきます。*