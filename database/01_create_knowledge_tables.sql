-- ===============================================
-- ナレッジカードシステム テーブル作成スクリプト
-- 実行方法: Supabaseダッシュボード > SQL Editor でこのスクリプトをコピペして実行
-- ===============================================

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
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uk_user_knowledge_collection_v2_user_theme'
    ) THEN
        ALTER TABLE user_knowledge_collection_v2 
        ADD CONSTRAINT uk_user_knowledge_collection_v2_user_theme 
        UNIQUE (user_id, theme_id);
    END IF;
END $$;

-- 確認クエリ
SELECT 'テーブル作成完了' as status;