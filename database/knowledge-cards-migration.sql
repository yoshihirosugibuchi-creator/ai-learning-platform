-- ナレッジカードシステム マイグレーション SQL
-- 実行順序: Phase 1 → Phase 2 → Phase 3

-- =====================================
-- Phase 1: 新テーブル作成
-- =====================================

-- 1. ナレッジカードマスタテーブル作成
CREATE TABLE IF NOT EXISTS knowledge_cards (
  theme_id TEXT PRIMARY KEY,              -- 'so_what_why_so' (learning_themes.idと一致)
  title TEXT NOT NULL,                    -- '結論ファースト'
  summary TEXT,                           -- カード概要
  key_points JSONB,                       -- ["ポイント1", "ポイント2"]
  icon TEXT DEFAULT '🎯',                -- アイコン
  color TEXT DEFAULT '#3B82F6',          -- カラーコード
  category TEXT,                          -- '論理的思考・分析'
  difficulty TEXT DEFAULT 'basic',       -- 'basic' | 'intermediate' | 'advanced' | 'expert'
  display_order INTEGER DEFAULT 0,       -- 表示順序
  reward_xp INTEGER DEFAULT 0,           -- カード獲得時のボーナスXP
  is_active BOOLEAN DEFAULT true,        -- アクティブフラグ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 新ユーザーコレクションテーブル作成
CREATE TABLE IF NOT EXISTS user_knowledge_collection_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                 -- users.id
  theme_id TEXT NOT NULL,                -- knowledge_cards.theme_id
  count INTEGER DEFAULT 1,               -- 取得回数
  first_obtained_at TIMESTAMP DEFAULT NOW(),
  last_obtained_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_active ON knowledge_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_category ON knowledge_cards(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_difficulty ON knowledge_cards(difficulty);

CREATE INDEX IF NOT EXISTS idx_user_knowledge_collection_v2_user_id ON user_knowledge_collection_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_user_knowledge_collection_v2_theme_id ON user_knowledge_collection_v2(theme_id);
CREATE INDEX IF NOT EXISTS idx_user_knowledge_collection_v2_user_theme ON user_knowledge_collection_v2(user_id, theme_id);

-- 4. 複合ユニークキー（同じユーザー・テーマの組み合わせは1レコードのみ）
ALTER TABLE user_knowledge_collection_v2 
ADD CONSTRAINT IF NOT EXISTS uk_user_knowledge_collection_v2_user_theme 
UNIQUE (user_id, theme_id);

-- =====================================
-- Phase 2: マスタデータ投入
-- =====================================

INSERT INTO knowledge_cards (theme_id, title, summary, key_points, icon, color, category, difficulty, display_order, reward_xp) VALUES

('so_what_why_so', 'So What?/Why So?', 
 '情報の本質を見抜き、deeper insightを得るための質問技術',
 '["So What? - それで何が言えるのか？", "Why So? - なぜそうなるのか？", "論理の飛躍を防ぐ検証プロセス"]'::jsonb,
 '❓', '#F59E0B', '論理的思考・分析', 'intermediate', 10, 50),

('conclusion_first', '結論ファースト', 
 'まず結論、その後に根拠という情報構造でコミュニケーションの効率を上げる手法',
 '["PREP法（Point・Reason・Example・Point）の活用", "聞き手の理解負荷を軽減", "説得力のあるプレゼンテーション"]'::jsonb,
 '🎯', '#3B82F6', '論理的思考・分析', 'basic', 20, 30),

('mece_thinking', 'MECE思考', 
 '複雑な問題を「漏れなく重複なく」整理して全体像を把握する思考技術',
 '["Mutually Exclusive（重複なく）", "Collectively Exhaustive（漏れなく）", "問題の全体像把握と優先順位付け"]'::jsonb,
 '📊', '#10B981', '論理的思考・分析', 'basic', 30, 30),

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
 '🤖', '#6366F1', 'AI・デジタル活用', 'basic', 60, 35),

('hypothesis_thinking', '仮説思考', 
 '限られた情報から仮説を立て、効率的に検証を進める思考法',
 '["仮説の立て方", "検証方法の設計", "PDCAサイクルでの改善"]'::jsonb,
 '💡', '#F97316', '論理的思考・分析', 'intermediate', 70, 45),

('framework_thinking', 'フレームワーク思考', 
'既存の思考の枠組みを活用して問題解決を効率化する手法',
 '["代表的なビジネスフレームワーク", "適切なフレームワークの選択", "フレームワークの組み合わせ"]'::jsonb,
 '🏗️', '#84CC16', '論理的思考・分析', 'basic', 80, 35),

('design_thinking', 'デザイン思考', 
 'ユーザー中心の視点で創造的に問題解決を行う思考プロセス',
 '["共感・定義・発想・プロトタイプ・テスト", "ユーザー中心設計", "クリエイティブな問題解決"]'::jsonb,
 '🎨', '#8B5CF6', '創造的思考', 'intermediate', 90, 45),

('critical_thinking', '批判的思考', 
 '情報を客観的に分析し、論理的な判断を行う思考技術',
 '["論理的思考vs批判的思考", "バイアスの認識と回避", "情報の信頼性評価"]'::jsonb,
 '🔍', '#EF4444', '論理的思考・分析', 'advanced', 100, 50),

('expert_consulting', '経営コンサルティング手法', 
 'C-level向けの戦略コンサルティングで使用される高度な分析・提案技術',
 '["複合的な経営課題の構造化", "ステークホルダー分析とコンフリクト解決", "実行可能性を考慮した変革ロードマップ"]'::jsonb,
 '🎯', '#7C2D12', '戦略・分析', 'expert', 110, 100)

ON CONFLICT (theme_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  key_points = EXCLUDED.key_points,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  display_order = EXCLUDED.display_order,
  reward_xp = EXCLUDED.reward_xp,
  updated_at = NOW();

-- =====================================
-- Phase 3: 既存データ移行（後で実行）
-- =====================================

-- 既存のknowledge_card_collectionから新テーブルに移行
-- ハッシュIDからtheme_idに逆算（実際のハッシュ値を確認してから実行）

/*
INSERT INTO user_knowledge_collection_v2 (user_id, theme_id, count, first_obtained_at, last_obtained_at)
SELECT 
  user_id,
  CASE card_id
    WHEN 2143 THEN 'so_what_why_so'
    WHEN 2358 THEN 'conclusion_first'
    WHEN 1991 THEN 'mece_thinking'
    WHEN 1884 THEN 'logical_tree'
    WHEN 2233 THEN 'market_analysis'
    WHEN 2395 THEN 'ai_basic_concepts'
    -- 他のカードIDも調査後追加
    ELSE NULL
  END as theme_id,
  COALESCE(count, 1) as count,
  COALESCE(obtained_at, created_at, NOW()) as first_obtained_at,
  COALESCE(last_obtained_at, obtained_at, created_at, NOW()) as last_obtained_at
FROM knowledge_card_collection
WHERE card_id IN (2143, 2358, 1991, 1884, 2233, 2395)
  AND user_id IS NOT NULL;
*/

-- =====================================
-- Phase 4: 確認クエリ
-- =====================================

-- マスタデータ確認
SELECT 'knowledge_cards count' as table_name, COUNT(*) as count FROM knowledge_cards;

-- カテゴリー別集計
SELECT category, COUNT(*) as card_count, SUM(reward_xp) as total_reward_xp 
FROM knowledge_cards 
GROUP BY category 
ORDER BY card_count DESC;

-- 難易度別集計
SELECT difficulty, COUNT(*) as card_count, AVG(reward_xp) as avg_reward_xp 
FROM knowledge_cards 
GROUP BY difficulty 
ORDER BY CASE difficulty WHEN 'basic' THEN 1 WHEN 'intermediate' THEN 2 WHEN 'advanced' THEN 3 WHEN 'expert' THEN 4 END;