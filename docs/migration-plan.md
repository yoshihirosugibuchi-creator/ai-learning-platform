# 📊 既存データマイグレーション計画書

## 現在のカテゴリーマッピング

### クイズカテゴリー → 新カテゴリー体系

| 既存カテゴリー | 新メインカテゴリー | 新サブカテゴリー | スキルレベル |
|---|---|---|---|
| 財務分析 | finance | financial_analysis | basic/intermediate |
| 戦略思考 | logical_thinking_problem_solving | structured_thinking | intermediate |
| マーケティング | marketing_sales | customer_analysis | intermediate |
| プロジェクト管理 | project_operations | project_design | intermediate |
| データ分析 | logical_thinking_problem_solving | quantitative_analysis | intermediate |
| リーダーシップ | leadership_hr | team_management | intermediate |
| イノベーション | strategy_management | innovation_development | advanced |
| デジタル変革 | ai_digital_utilization | dx_strategy | advanced |
| サステナビリティ | strategy_management | esg_sustainability | advanced |
| アジャイル経営 | project_operations | schedule_resource | advanced |
| デジタルトランスフォーメーション | ai_digital_utilization | dx_strategy | advanced |
| 行動経済学 | logical_thinking_problem_solving | behavioral_economics | advanced |
| サプライチェーン | business_process_analysis | supply_chain | intermediate |
| 人事戦略 | leadership_hr | hr_strategy | advanced |
| ファイナンス | finance | financial_analysis | intermediate |
| ネゴシエーション | communication_presentation | negotiation_persuasion | intermediate |
| 危機管理 | risk_crisis_management | crisis_bcp | advanced |

### 格言カードカテゴリー → 新カテゴリー体系

| 既存カテゴリー | 新メインカテゴリー | 新サブカテゴリー |
|---|---|---|
| 経営戦略 | strategy_management | business_strategy |
| イノベーション | strategy_management | innovation_development |
| 投資・リスク管理 | finance | investment_risk |
| 変革リーダーシップ | leadership_hr | organizational_development |
| 競争戦略 | strategy_management | competitive_strategy |
| 品質管理 | project_operations | schedule_resource |
| リーダーシップ | leadership_hr | team_management |
| 経営哲学 | strategy_management | business_strategy |
| ブランディング | marketing_sales | branding_positioning |
| 意思決定 | logical_thinking_problem_solving | behavioral_economics |
| ビジョン | leadership_hr | organizational_development |

## マイグレーション手順

### Phase 1: カテゴリーマスタ構築
1. **新カテゴリーテーブル作成**
   - categories テーブル作成
   - skill_levels テーブル作成
   - 初期データ投入

2. **content_categories テーブル作成**
   - 既存コンテンツとカテゴリーの関連テーブル

### Phase 2: クイズデータマイグレーション
```sql
-- 既存クイズを新カテゴリーにマッピング
INSERT INTO content_categories (content_id, content_type, category_id, skill_level_id)
SELECT 
  q.id,
  'quiz',
  CASE q.category
    WHEN '財務分析' THEN 'finance'
    WHEN '戦略思考' THEN 'logical_thinking_problem_solving'
    WHEN 'マーケティング' THEN 'marketing_sales'
    WHEN 'プロジェクト管理' THEN 'project_operations'
    WHEN 'データ分析' THEN 'logical_thinking_problem_solving'
    WHEN 'リーダーシップ' THEN 'leadership_hr'
    -- ... 他のマッピング
  END,
  CASE q.difficulty
    WHEN '基礎' THEN 'basic'
    WHEN '中級' THEN 'intermediate' 
    WHEN '上級' THEN 'advanced'
    ELSE 'intermediate'
  END
FROM questions q;
```

### Phase 3: 格言カードマイグレーション
```sql
-- 既存カードを新カテゴリーにマッピング
INSERT INTO content_categories (content_id, content_type, category_id, skill_level_id)
SELECT 
  c.id,
  'card',
  CASE c.category
    WHEN '経営戦略' THEN 'strategy_management'
    WHEN 'イノベーション' THEN 'strategy_management'
    WHEN '投資・リスク管理' THEN 'finance'
    -- ... 他のマッピング
  END,
  CASE c.rarity
    WHEN 'コモン' THEN 'basic'
    WHEN 'レア' THEN 'intermediate'
    WHEN 'エピック' THEN 'advanced'
    WHEN 'レジェンダリー' THEN 'expert'
  END
FROM cards c;
```

### Phase 4: 学習進捗データマイグレーション
```sql
-- ユーザーの既存進捗を新カテゴリーに統合
INSERT INTO user_learning_progress (
  user_id, category_id, skill_level_id, 
  total_quizzes, average_score, last_access_date
)
SELECT 
  user_id,
  category_mapping.new_category_id,
  'intermediate', -- デフォルト
  COUNT(*) as total_quizzes,
  AVG(score) as average_score,
  MAX(completed_at) as last_access_date
FROM user_quiz_results r
JOIN quiz_category_mapping m ON r.quiz_id = m.quiz_id
GROUP BY user_id, category_mapping.new_category_id;
```

### Phase 5: UIコンポーネント更新
1. **クイズページ更新**
   - 新カテゴリー表示
   - フィルタリング機能

2. **コレクションページ更新**
   - 新カテゴリー別表示
   - 統計情報更新

3. **統計ページ更新**
   - 新カテゴリー別分析
   - 学習進捗可視化

## ロールバック計画

### 緊急時対応
1. **データベースバックアップ**
   - マイグレーション前の完全バックアップ
   - ポイントインタイム復旧準備

2. **段階的ロールバック**
   - Phase 5: UI変更のみ → 即座に戻せる
   - Phase 4-3: データマイグレーション → バックアップから復旧
   - Phase 2-1: スキーマ変更 → DDL逆変換

### 検証項目
- [ ] 全クイズが適切なカテゴリーにマッピングされている
- [ ] 全格言カードが適切なカテゴリーにマッピングされている  
- [ ] ユーザー進捗データが正しく移行されている
- [ ] カテゴリー統計が正確に計算されている
- [ ] UI表示が正常に動作している

## スケジュール

| Phase | 作業内容 | 予想時間 |
|---|---|---|
| Phase 1 | カテゴリーマスタ構築 | 2時間 |
| Phase 2 | クイズデータマイグレーション | 3時間 |
| Phase 3 | 格言カードマイグレーション | 2時間 |
| Phase 4 | 学習進捗データマイグレーション | 3時間 |
| Phase 5 | UIコンポーネント更新 | 8時間 |
| **合計** |  | **18時間** |

## リスク評価

### 高リスク
- **データ損失**: 適切なバックアップで対応
- **マッピング誤り**: 事前検証とテストで対応

### 中リスク  
- **パフォーマンス低下**: インデックス設計で対応
- **UI表示崩れ**: 段階的デプロイで対応

### 低リスク
- **ユーザー混乱**: 変更通知とヘルプで対応