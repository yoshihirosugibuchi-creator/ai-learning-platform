-- learning_progressテーブル作成スクリプト
-- 実行方法: Supabaseダッシュボード > SQL Editor で実行

-- learning_progressテーブル作成
CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  session_id TEXT,
  progress_data JSONB DEFAULT '{}',
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS無効化（開発用 - 本番では有効化必要）
ALTER TABLE learning_progress DISABLE ROW LEVEL SECURITY;

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_course_id ON learning_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_completion ON learning_progress(completion_percentage);

-- コメント追加
COMMENT ON TABLE learning_progress IS '学習進捗管理テーブル - コース/セッション別の進捗データを保存';
COMMENT ON COLUMN learning_progress.user_id IS 'ユーザーID（auth.usersテーブル参照）';
COMMENT ON COLUMN learning_progress.course_id IS 'コースID';
COMMENT ON COLUMN learning_progress.session_id IS 'セッションID（任意）';
COMMENT ON COLUMN learning_progress.progress_data IS '進捗詳細データ（JSONB形式）';
COMMENT ON COLUMN learning_progress.completion_percentage IS '完了率（0-100%）';
COMMENT ON COLUMN learning_progress.completed_at IS '完了日時';

-- テーブル作成確認
SELECT 'learning_progress テーブル作成完了' AS result;