-- =================================================================
-- Remove question count constraint from precomputed_quiz_sets
-- 
-- Reason: Question count should be managed by application logic, not DB constraints
-- - Review quizzes: 1 question minimum, user-configured count
-- - Business-AI quizzes: 10 questions (enforced by logic)
-- - Self-personalized: flexible count (enforced by logic)
-- =================================================================

-- Remove the restrictive constraint
ALTER TABLE precomputed_quiz_sets 
DROP CONSTRAINT IF EXISTS precomputed_quiz_sets_valid_questions;

-- Add a minimal constraint to prevent empty arrays
ALTER TABLE precomputed_quiz_sets 
ADD CONSTRAINT precomputed_quiz_sets_min_questions 
CHECK (array_length(question_ids, 1) >= 1);

-- Verify the constraints (PostgreSQL 12+ compatible)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'precomputed_quiz_sets'::regclass 
AND contype = 'c';