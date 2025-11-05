-- クイズAI最適化機能 - データベーススキーマ変更
-- 作成日: 2025年10月30日
-- 目的: 復習機能強化・review_settings テーブル追加

-- =====================================================
-- 1. quiz_answers テーブル - reviewed_at カラム追加
-- =====================================================

-- reviewed_at カラム追加（復習実施日時記録用）
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- コメント追加
COMMENT ON COLUMN quiz_answers.reviewed_at IS '復習実施日時 - 復習クイズで問題に回答した日時';

-- =====================================================
-- 2. インデックス追加（復習問題取得の高速化）
-- =====================================================

-- 復習問題取得用インデックス
CREATE INDEX IF NOT EXISTS idx_quiz_answers_review_lookup 
  ON quiz_answers (user_id, review_needed, reviewed_at) 
  WHERE review_needed = true;

-- 復習統計用インデックス
CREATE INDEX IF NOT EXISTS idx_quiz_answers_review_stats
  ON quiz_answers (user_id, created_at, review_needed)
  WHERE review_needed = true;

-- =====================================================
-- 3. review_settings テーブル新規作成
-- =====================================================

-- 復習設定テーブル作成
CREATE TABLE IF NOT EXISTS review_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  review_questions_count INTEGER DEFAULT 10 
    CHECK (review_questions_count >= 1 AND review_questions_count <= 30),
  notification_enabled BOOLEAN DEFAULT true,
  notification_interval_days INTEGER DEFAULT 1 
    CHECK (notification_interval_days >= 1 AND notification_interval_days <= 7),
  streak_reminder_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- テーブルコメント
COMMENT ON TABLE review_settings IS 'ユーザー復習設定テーブル - 復習問題数・通知設定等を管理';

-- カラムコメント
COMMENT ON COLUMN review_settings.user_id IS 'ユーザーID（主キー）';
COMMENT ON COLUMN review_settings.review_questions_count IS '復習問題数（1-30問、デフォルト10問）';
COMMENT ON COLUMN review_settings.notification_enabled IS '復習通知有効フラグ';
COMMENT ON COLUMN review_settings.notification_interval_days IS '復習通知間隔（1-7日、デフォルト毎日）';
COMMENT ON COLUMN review_settings.streak_reminder_enabled IS '連続学習リマインダー有効フラグ';
COMMENT ON COLUMN review_settings.weekly_summary_enabled IS '週次サマリー有効フラグ';
COMMENT ON COLUMN review_settings.created_at IS '作成日時';
COMMENT ON COLUMN review_settings.updated_at IS '更新日時';

-- =====================================================
-- 4. RLS (Row Level Security) ポリシー設定
-- =====================================================

-- RLS有効化
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;

-- 自分の設定のみ参照可能
CREATE POLICY "Users can view own review settings" ON review_settings
  FOR SELECT USING (auth.uid() = user_id);

-- 自分の設定のみ更新可能
CREATE POLICY "Users can insert own review settings" ON review_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review settings" ON review_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own review settings" ON review_settings
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. 更新時間自動更新トリガー
-- =====================================================

-- 更新時間自動更新関数
CREATE OR REPLACE FUNCTION update_review_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_update_review_settings_updated_at ON review_settings;
CREATE TRIGGER trigger_update_review_settings_updated_at
  BEFORE UPDATE ON review_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_review_settings_updated_at();

-- =====================================================
-- 6. デフォルトデータ挿入（必要に応じて）
-- =====================================================

-- 既存ユーザーに対するデフォルト設定作成は手動またはアプリケーション側で実行
-- 理由: auth.users テーブルの構造・権限により直接INSERT困難な場合がある

-- =====================================================
-- 7. 確認クエリ（実行後の確認用）
-- =====================================================

-- quiz_answers テーブルの新カラム確認
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'quiz_answers' AND column_name = 'reviewed_at';

-- review_settings テーブル確認
-- SELECT table_name, column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'review_settings' 
-- ORDER BY ordinal_position;

-- インデックス確認
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('quiz_answers', 'review_settings');

-- RLSポリシー確認
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'review_settings';

-- =====================================================
-- 8. ロールバック用スクリプト（必要な場合）
-- =====================================================

/*
-- ロールバック用（必要な場合のみ実行）

-- review_settings テーブル削除
DROP TABLE IF EXISTS review_settings;

-- 関数削除
DROP FUNCTION IF EXISTS update_review_settings_updated_at();

-- インデックス削除
DROP INDEX IF EXISTS idx_quiz_answers_review_lookup;
DROP INDEX IF EXISTS idx_quiz_answers_review_stats;

-- reviewed_at カラム削除
ALTER TABLE quiz_answers DROP COLUMN IF EXISTS reviewed_at;
*/