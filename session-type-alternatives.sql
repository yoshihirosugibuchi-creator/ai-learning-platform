-- learning_sessions.session_type の代替候補値
-- エラーが続く場合は以下の値を順番に試してください：

-- Option 1: 'learning'（修正済み）

-- Option 2: 'course'
-- Option 3: 'text' 
-- Option 4: 'video'
-- Option 5: 'quiz'
-- Option 6: 'content'

-- 一括修正用クエリ例：
UPDATE learning_sessions 
SET session_type = 'course' 
WHERE theme_id LIKE 'finance_%';

-- 制約確認クエリ
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'learning_sessions'::regclass 
AND contype = 'c'
AND conname LIKE '%session_type%';