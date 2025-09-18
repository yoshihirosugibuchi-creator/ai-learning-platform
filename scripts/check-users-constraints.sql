-- usersテーブルの制約を詳しく確認

-- 1. usersテーブルの構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. usersテーブルの外部キー制約詳細
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users' 
AND tc.constraint_type = 'FOREIGN KEY';

-- 3. 現在のusersテーブルの内容確認
SELECT COUNT(*) as user_count FROM users;
SELECT id, email FROM users LIMIT 5;