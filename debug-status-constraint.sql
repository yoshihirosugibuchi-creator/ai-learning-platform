-- learning_coursesテーブルのstatus制約を確認
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'learning_courses'::regclass 
AND contype = 'c'
AND conname LIKE '%status%';

-- 既存のlearning_coursesレコードのstatus値を確認（参考用）
SELECT id, title, status FROM learning_courses LIMIT 10;