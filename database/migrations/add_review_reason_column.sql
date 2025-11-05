-- Add review_reason column to quiz_answers table
-- Purpose: Store review reason at answer time for efficient retrieval

-- 1. Add review_reason column with constraint
ALTER TABLE quiz_answers 
ADD COLUMN review_reason TEXT 
CHECK (review_reason IN ('incorrect', 'hint_used', 'low_confidence', 'slow_response', 'repeat_mistakes'));

-- 2. Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_quiz_answers_review_reason 
ON quiz_answers(review_reason) 
WHERE review_reason IS NOT NULL;

-- 3. Add composite index for review queries
CREATE INDEX IF NOT EXISTS idx_quiz_answers_user_review 
ON quiz_answers(user_id, review_reason, created_at DESC) 
WHERE review_reason IS NOT NULL;

-- 4. Update existing incorrect answers (one-time migration)
UPDATE quiz_answers 
SET review_reason = 'incorrect' 
WHERE is_correct = false 
AND review_reason IS NULL;

-- 5. Verify migration
SELECT 
  review_reason,
  COUNT(*) as count
FROM quiz_answers 
GROUP BY review_reason
ORDER BY count DESC;