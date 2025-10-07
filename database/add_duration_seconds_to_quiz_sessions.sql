-- quiz_sessionsテーブルにduration_secondsカラム追加
-- 実行日: 2025年10月7日
-- 目的: クイズセッション全体の実行時間記録

-- 1. duration_secondsカラム追加
ALTER TABLE quiz_sessions 
ADD COLUMN duration_seconds INTEGER;

-- 2. インデックス追加（分析クエリ最適化）
CREATE INDEX idx_quiz_sessions_duration ON quiz_sessions(duration_seconds) WHERE duration_seconds IS NOT NULL;
CREATE INDEX idx_quiz_sessions_user_duration ON quiz_sessions(user_id, duration_seconds);

-- 3. 既存データのduration_seconds計算・設定
-- session_start_time と session_end_time から計算
UPDATE quiz_sessions 
SET duration_seconds = EXTRACT(EPOCH FROM (session_end_time - session_start_time))::INTEGER
WHERE session_start_time IS NOT NULL 
AND session_end_time IS NOT NULL 
AND duration_seconds IS NULL;

-- 4. 更新結果確認
SELECT 
  COUNT(*) as total_sessions,
  COUNT(duration_seconds) as sessions_with_duration,
  COUNT(*) - COUNT(duration_seconds) as sessions_without_duration,
  AVG(duration_seconds) as avg_duration_seconds,
  MIN(duration_seconds) as min_duration_seconds,
  MAX(duration_seconds) as max_duration_seconds
FROM quiz_sessions;

-- 5. duration_secondsが設定できなかったセッションの確認
SELECT 
  id,
  session_start_time,
  session_end_time,
  status,
  created_at
FROM quiz_sessions 
WHERE duration_seconds IS NULL
ORDER BY created_at DESC
LIMIT 10;

COMMENT ON COLUMN quiz_sessions.duration_seconds IS 'クイズセッション実行時間（秒） - 開始から完了まで';