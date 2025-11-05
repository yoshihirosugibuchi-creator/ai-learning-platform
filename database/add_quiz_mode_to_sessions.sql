-- Add quiz_mode field to quiz_sessions table for review mode support
-- 復習モード対応: quiz_sessionsテーブルにquiz_modeフィールド追加

ALTER TABLE quiz_sessions 
ADD COLUMN quiz_mode VARCHAR(20) NOT NULL DEFAULT 'normal'
CHECK (quiz_mode IN ('normal', 'review'));

-- Add comment for documentation
COMMENT ON COLUMN quiz_sessions.quiz_mode IS '復習モード識別: normal(通常クイズ) | review(復習クイズ)';

-- Index for performance (optional, if we need to query by quiz_mode frequently)
CREATE INDEX idx_quiz_sessions_quiz_mode ON quiz_sessions(quiz_mode);
CREATE INDEX idx_quiz_sessions_user_quiz_mode ON quiz_sessions(user_id, quiz_mode);