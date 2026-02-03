-- ============================================================
-- クイズパック機能のスキーマ
-- 管理者が条件を設定してクイズパックを作成
-- 学習者はパックを選択して既存クイズシステムで実行
-- ============================================================

-- クイズパックテーブル（条件セットの定義のみ）
CREATE TABLE IF NOT EXISTS quiz_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- クイズ設定
  question_count INTEGER NOT NULL DEFAULT 10 CHECK (question_count >= 10),

  -- 対象条件
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,      -- カテゴリーID配列
  subcategories JSONB DEFAULT NULL,                   -- サブカテゴリーID配列（null=カテゴリー配下全て）
  difficulties JSONB NOT NULL DEFAULT '[]'::jsonb,    -- 難易度配列 ['beginner', 'intermediate', 'advanced', 'expert']

  -- 公開設定
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- 装飾
  icon_emoji VARCHAR(10) DEFAULT '📝',
  color_theme VARCHAR(20) DEFAULT 'primary',

  -- 統計情報（定期更新用キャッシュ）
  total_attempts INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL(5, 2),

  -- 監査情報
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_quiz_packs_published ON quiz_packs(is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_quiz_packs_categories ON quiz_packs USING GIN (categories);

-- RLSポリシー
ALTER TABLE quiz_packs ENABLE ROW LEVEL SECURITY;

-- 公開パックは全員が閲覧可能
CREATE POLICY "quiz_packs_select_published" ON quiz_packs
  FOR SELECT
  USING (is_published = true);

-- 管理者は全操作可能
CREATE POLICY "quiz_packs_admin_all" ON quiz_packs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_quiz_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quiz_packs_updated_at ON quiz_packs;
CREATE TRIGGER quiz_packs_updated_at
  BEFORE UPDATE ON quiz_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_packs_updated_at();

-- ============================================================
-- 既存 quiz_sessions テーブルに必要な列を追加
-- ============================================================

-- パック参照列
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS pack_id UUID REFERENCES quiz_packs(id) ON DELETE SET NULL;

-- カテゴリー・サブカテゴリー参照（パッククイズ用）
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS category_id VARCHAR(50);

ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS subcategory_id VARCHAR(50);

-- セッション内の問題ID配列（順序保持）
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS question_ids JSONB DEFAULT '[]'::jsonb;

-- 現在の問題インデックス（進捗管理）
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_pack ON quiz_sessions(pack_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_category ON quiz_sessions(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status_user ON quiz_sessions(user_id, status);

-- ============================================================
-- パック統計更新用関数
-- ============================================================
CREATE OR REPLACE FUNCTION update_quiz_pack_stats(p_pack_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quiz_packs
  SET
    total_attempts = (
      SELECT COUNT(*) FROM quiz_sessions
      WHERE pack_id = p_pack_id AND status = 'completed'
    ),
    average_score = (
      SELECT AVG(
        CASE WHEN total_questions > 0
        THEN (correct_answers::DECIMAL / total_questions * 100)
        ELSE 0 END
      ) FROM quiz_sessions
      WHERE pack_id = p_pack_id AND status = 'completed'
    )
  WHERE id = p_pack_id;
END;
$$ LANGUAGE plpgsql;
