-- course_session_completionsテーブルにduration_secondsカラム追加
-- 実行日: 2025年10月12日
-- 目的: コース学習セッション実行時間記録（コース学習システム再設計対応）

-- 1. duration_secondsカラム追加
ALTER TABLE course_session_completions 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- 2. インデックス追加（分析クエリ最適化）
CREATE INDEX IF NOT EXISTS idx_course_session_completions_duration 
ON course_session_completions(duration_seconds) WHERE duration_seconds IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_session_completions_user_course_first 
ON course_session_completions(user_id, course_id, is_first_completion);

-- 3. 既存データのduration_seconds計算・設定（可能な場合）
-- session_start_time と session_end_time から計算
UPDATE course_session_completions 
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
FROM course_session_completions;

-- 5. duration_secondsが設定できなかったセッションの確認
SELECT 
  id,
  session_start_time,
  session_end_time,
  created_at,
  course_id,
  theme_id
FROM course_session_completions 
WHERE duration_seconds IS NULL
ORDER BY created_at DESC
LIMIT 10;

COMMENT ON COLUMN course_session_completions.duration_seconds IS 'コース学習セッション実行時間（秒） - 開始から完了まで';