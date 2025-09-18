-- quiz_resultsテーブルの構造を確認（修正版）

-- 1. カラム構造の確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'quiz_results'
ORDER BY ordinal_position;

-- 2. 制約情報の確認（修正版）
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'quiz_results' 
AND tc.table_schema = 'public';

-- 3. 外部キー制約の詳細確認
SELECT 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'quiz_results'
AND kcu.table_schema = 'public';