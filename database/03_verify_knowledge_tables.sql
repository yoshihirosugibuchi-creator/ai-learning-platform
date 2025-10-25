-- ===============================================
-- ナレッジカードシステム検証クエリ
-- 実行方法: テーブル作成・データ投入後にこのスクリプトで検証
-- ===============================================

-- 1. テーブル構造確認
SELECT 
    'knowledge_cards' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'knowledge_cards' 
ORDER BY ordinal_position;

-- 2. マスタデータ確認
SELECT 'knowledge_cards count' as table_name, COUNT(*) as count FROM knowledge_cards;

-- 3. カテゴリー別集計
SELECT 
    category, 
    COUNT(*) as card_count, 
    SUM(reward_xp) as total_reward_xp 
FROM knowledge_cards 
GROUP BY category 
ORDER BY card_count DESC;

-- 4. 難易度別集計（skill_levelsと同じ順序）
SELECT 
    difficulty, 
    COUNT(*) as card_count, 
    AVG(reward_xp) as avg_reward_xp 
FROM knowledge_cards 
GROUP BY difficulty 
ORDER BY CASE difficulty 
    WHEN 'basic' THEN 1 
    WHEN 'intermediate' THEN 2 
    WHEN 'advanced' THEN 3 
    WHEN 'expert' THEN 4 
    END;

-- 5. カード一覧（表示順序）
SELECT 
    theme_id,
    title,
    category,
    difficulty,
    reward_xp,
    display_order
FROM knowledge_cards 
ORDER BY display_order;

-- 6. インデックス確認
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('knowledge_cards', 'user_knowledge_collection_v2')
ORDER BY tablename, indexname;

-- 7. 制約確認
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_knowledge_collection_v2'::regclass;

-- 8. サンプルJSONB検証
SELECT 
    theme_id,
    title,
    jsonb_array_length(key_points) as key_points_count,
    key_points
FROM knowledge_cards 
WHERE key_points IS NOT NULL
LIMIT 3;