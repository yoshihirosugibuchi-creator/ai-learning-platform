-- 学習コーステーブルのスキルレベル制約エラー修正
-- 段階的アプローチで既存データと制約を安全に更新

-- 1. 現在のデータ状況確認
SELECT 
    id, 
    title, 
    difficulty, 
    status,
    CASE 
        WHEN difficulty = 'beginner' THEN 'basic'
        WHEN difficulty = 'intermediate' THEN 'intermediate'  
        WHEN difficulty = 'advanced' THEN 'advanced'
        WHEN difficulty = 'expert' THEN 'expert'
        ELSE 'UNKNOWN: ' || difficulty
    END as new_difficulty
FROM learning_courses 
ORDER BY display_order;

-- 2. 既存の制約を一時的に削除
ALTER TABLE learning_courses 
DROP CONSTRAINT IF EXISTS learning_courses_difficulty_check;

-- 3. データの正規化（beginner → basic）
UPDATE learning_courses 
SET 
    difficulty = CASE 
        WHEN difficulty = 'beginner' THEN 'basic'
        WHEN difficulty = 'intermediate' THEN 'intermediate'
        WHEN difficulty = 'advanced' THEN 'advanced'  
        WHEN difficulty = 'expert' THEN 'expert'
        ELSE 'basic'  -- 不明な値はbasicにデフォルト
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE difficulty NOT IN ('basic', 'intermediate', 'advanced', 'expert');

-- 4. 新しい制約を追加
ALTER TABLE learning_courses 
ADD CONSTRAINT learning_courses_difficulty_check 
CHECK (difficulty IN ('basic', 'intermediate', 'advanced', 'expert'));

-- 5. 更新結果確認
SELECT 
    'Updated courses:' as status,
    id, 
    title, 
    difficulty, 
    status,
    updated_at
FROM learning_courses 
ORDER BY display_order;