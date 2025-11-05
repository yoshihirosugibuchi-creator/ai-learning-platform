-- 緊急修正: quiz_sessions制約エラー解決
-- エラー: CHECK制約違反の修正

-- Step 1: 既存の制約を削除（安全のため）
ALTER TABLE quiz_sessions DROP CONSTRAINT IF EXISTS quiz_sessions_quiz_type_check;

-- Step 2: quiz_modeカラムが存在する場合は削除
ALTER TABLE quiz_sessions DROP COLUMN IF EXISTS quiz_mode;

-- Step 3: 既存データのquiz_typeを確認・修正
-- 'main' → 'business-ai'
UPDATE quiz_sessions 
SET quiz_type = 'business-ai' 
WHERE quiz_type = 'main' OR quiz_type IS NULL;

-- 不正な値をbusiness-aiに修正
UPDATE quiz_sessions 
SET quiz_type = 'business-ai' 
WHERE quiz_type NOT IN ('business-ai', 'self-personalized', 'category', 'review');

-- Step 4: 正しい制約を再度追加
ALTER TABLE quiz_sessions 
ADD CONSTRAINT quiz_sessions_quiz_type_check 
CHECK (quiz_type IN ('business-ai', 'self-personalized', 'category', 'review'));

-- 確認用
SELECT DISTINCT quiz_type FROM quiz_sessions;