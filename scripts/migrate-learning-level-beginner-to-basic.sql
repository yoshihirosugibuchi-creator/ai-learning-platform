-- =============================================================================
-- Learning Level Migration: beginner → basic 統一
-- =============================================================================
-- 目的: usersテーブルのlearning_levelフィールドでbeginnerをbasicに統一
-- 実行場所: Supabase Dashboard → SQL Editor
-- 作成日: 2025年10月1日
-- =============================================================================

-- 1. 現在のlearning_level分布を確認
SELECT 
    learning_level,
    COUNT(*) as count
FROM users 
WHERE learning_level IS NOT NULL
GROUP BY learning_level
ORDER BY learning_level;

-- 2. beginnerレコードの詳細確認（実行前確認）
SELECT 
    id,
    email,
    name,
    learning_level,
    created_at
FROM users 
WHERE learning_level = 'beginner'
ORDER BY created_at;

-- 3. beginnerをbasicに更新
UPDATE users 
SET learning_level = 'basic',
    updated_at = NOW()
WHERE learning_level = 'beginner';

-- 4. 更新結果確認
SELECT 
    'Updated Records' as status,
    COUNT(*) as count
FROM users 
WHERE learning_level = 'basic'
AND updated_at > NOW() - INTERVAL '1 minute';

-- 5. 更新後の分布確認
SELECT 
    learning_level,
    COUNT(*) as count
FROM users 
WHERE learning_level IS NOT NULL
GROUP BY learning_level
ORDER BY learning_level;

-- 6. beginnerが残っていないことを確認
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: No beginner records remaining'
        ELSE CONCAT('⚠️ WARNING: ', COUNT(*), ' beginner records still exist')
    END as migration_status
FROM users 
WHERE learning_level = 'beginner';

-- =============================================================================
-- 実行手順:
-- 1. 上記SQLを1つずつ実行
-- 2. 各ステップの結果を確認
-- 3. 最終的にbeginnerが0件になることを確認
-- =============================================================================