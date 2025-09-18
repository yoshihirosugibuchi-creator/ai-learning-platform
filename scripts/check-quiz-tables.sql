-- クイズ関連テーブルでsubcategory_id対応が必要な箇所を確認

-- 1. quiz_resultsテーブル構造
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'quiz_results'
ORDER BY ordinal_position;

-- 2. category_progressテーブル構造  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'category_progress'
ORDER BY ordinal_position;

-- 3. 現在のquiz_resultsサンプルデータ
SELECT 
    id,
    category_id,
    subcategory_id,
    questions::text,
    answers::text
FROM quiz_results 
LIMIT 3;

-- 4. 現在のcategory_progressサンプルデータ
SELECT 
    id,
    category_id,
    total_xp,
    current_level,
    correct_answers,
    total_answers
FROM category_progress 
LIMIT 5;