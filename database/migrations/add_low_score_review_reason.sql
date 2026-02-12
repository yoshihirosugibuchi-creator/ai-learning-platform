-- Add 'low_score' to review_reason CHECK constraint for case study support
-- ケーススタディでは低スコアによる復習フラグが必要

-- 既存の制約を削除
ALTER TABLE quiz_answers
DROP CONSTRAINT IF EXISTS quiz_answers_review_reason_check;

-- 新しい制約を追加（low_scoreを含む）
ALTER TABLE quiz_answers
ADD CONSTRAINT quiz_answers_review_reason_check
CHECK (review_reason IN ('incorrect', 'hint_used', 'low_confidence', 'slow_response', 'repeat_mistakes', 'low_score'));

-- 確認
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'quiz_answers'::regclass
AND conname = 'quiz_answers_review_reason_check';
