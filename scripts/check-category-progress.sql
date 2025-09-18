-- category_progressテーブルの内容を確認

-- 1. テーブル構造確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'category_progress'
ORDER BY ordinal_position;

-- 2. 現在のデータ確認
SELECT 
    user_id,
    category_id,
    total_xp,
    current_level,
    correct_answers,
    total_answers,
    created_at,
    updated_at
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
ORDER BY updated_at DESC;

-- 3. カテゴリー別のXP合計
SELECT 
    category_id,
    COUNT(*) as record_count,
    SUM(total_xp) as total_xp,
    MAX(current_level) as max_level,
    SUM(correct_answers) as total_correct,
    SUM(total_answers) as total_answers
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
GROUP BY category_id
ORDER BY total_xp DESC;