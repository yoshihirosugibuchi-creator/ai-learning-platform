-- ==============================================
-- 学習時間記録システム: データベーススキーマ拡張
-- 実行場所: Supabase SQLエディタ
-- ==============================================

-- 1. learning_progress テーブル拡張
-- コース学習セッションの開始・終了・継続時間を記録
ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS
  session_start_time TIMESTAMPTZ;

ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS  
  session_end_time TIMESTAMPTZ;

ALTER TABLE learning_progress ADD COLUMN IF NOT EXISTS
  duration_seconds INTEGER DEFAULT 0;

-- 2. user_xp_stats_v2 テーブル拡張
-- ユーザーごとの累計学習時間を記録
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  total_learning_time_seconds BIGINT DEFAULT 0;

ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  quiz_learning_time_seconds BIGINT DEFAULT 0;

ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  course_learning_time_seconds BIGINT DEFAULT 0;

-- 3. daily_xp_records テーブル拡張  
-- 日次学習時間統計を記録
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  quiz_time_seconds INTEGER DEFAULT 0;

ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  course_time_seconds INTEGER DEFAULT 0;

ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  total_time_seconds INTEGER DEFAULT 0;

-- 4. パフォーマンス向上用インデックス作成
-- クイズ回答時間集計の高速化
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_time 
ON quiz_answers(quiz_session_id, time_spent);

-- コース学習進捗の高速化
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_time
ON learning_progress(user_id, session_start_time);

-- 日次記録の高速化
CREATE INDEX IF NOT EXISTS idx_daily_xp_records_user_date
ON daily_xp_records(user_id, date);

-- ==============================================
-- 実行完了後の確認
-- ==============================================

-- 確認用クエリ（実行後にコメントアウト解除して確認可能）
/*
-- テーブル構造確認
\d learning_progress
\d user_xp_stats_v2  
\d daily_xp_records

-- インデックス確認
\di idx_quiz_answers_session_time
\di idx_learning_progress_user_time
\di idx_daily_xp_records_user_date
*/