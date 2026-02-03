-- ============================================================
-- quiz_sessions テーブルにクイズパック機能用の列を追加
-- quiz_packs テーブルが既に存在する場合に実行
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
