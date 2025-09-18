-- category_progressテーブルの重複レコードを統合して変換

-- 1. まず現在の重複状況を確認
SELECT 
    user_id,
    category_id,
    COUNT(*) as count,
    SUM(total_xp) as total_xp_sum,
    SUM(correct_answers) as total_correct,
    SUM(total_answers) as total_answers_sum
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
GROUP BY user_id, category_id
HAVING COUNT(*) > 1;

-- 2. 日本語カテゴリー名を英数字IDにマッピングしつつ重複を統合
-- 手順：
-- a) 一時的に新しいレコードを作成（統合値で）
-- b) 古いレコードを削除
-- c) 重複がない場合は単純UPDATE

-- 交渉・説得技術の統合処理
INSERT INTO category_progress (
    user_id, 
    category_id, 
    total_xp, 
    current_level, 
    correct_answers, 
    total_answers, 
    created_at, 
    updated_at
)
SELECT 
    user_id,
    'negotiation_persuasion' as category_id,
    SUM(total_xp) as total_xp,
    MAX(current_level) as current_level,
    SUM(correct_answers) as correct_answers,
    SUM(total_answers) as total_answers,
    MIN(created_at) as created_at,
    NOW() as updated_at
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = '交渉・説得技術'
GROUP BY user_id
ON CONFLICT (user_id, category_id) 
DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    correct_answers = EXCLUDED.correct_answers,
    total_answers = EXCLUDED.total_answers,
    updated_at = NOW();

-- 古い交渉・説得技術レコードを削除
DELETE FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = '交渉・説得技術';

-- 他の日本語カテゴリーも同様に処理（重複がない場合は単純UPDATE）

-- ケース面接・構造化思考
INSERT INTO category_progress (
    user_id, category_id, total_xp, current_level, correct_answers, total_answers, created_at, updated_at
)
SELECT 
    user_id, 'case_interview_structured_thinking', total_xp, current_level, correct_answers, total_answers, created_at, NOW()
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' AND category_id = 'ケース面接・構造化思考'
ON CONFLICT (user_id, category_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp, current_level = EXCLUDED.current_level,
    correct_answers = EXCLUDED.correct_answers, total_answers = EXCLUDED.total_answers, updated_at = NOW();

DELETE FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' AND category_id = 'ケース面接・構造化思考';

-- ブランディング・ポジショニング
INSERT INTO category_progress (
    user_id, category_id, total_xp, current_level, correct_answers, total_answers, created_at, updated_at
)
SELECT 
    user_id, 'branding_positioning', total_xp, current_level, correct_answers, total_answers, created_at, NOW()
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' AND category_id = 'ブランディング・ポジショニング'
ON CONFLICT (user_id, category_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp, current_level = EXCLUDED.current_level,
    correct_answers = EXCLUDED.correct_answers, total_answers = EXCLUDED.total_answers, updated_at = NOW();

DELETE FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' AND category_id = 'ブランディング・ポジショニング';

-- 顧客分析・セグメンテーション
INSERT INTO category_progress (
    user_id, category_id, total_xp, current_level, correct_answers, total_answers, created_at, updated_at
)
SELECT 
    user_id, 'customer_analysis_segmentation', total_xp, current_level, correct_answers, total_answers, created_at, NOW()
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' AND category_id = '顧客分析・セグメンテーション'
ON CONFLICT (user_id, category_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp, current_level = EXCLUDED.current_level,
    correct_answers = EXCLUDED.correct_answers, total_answers = EXCLUDED.total_answers, updated_at = NOW();

DELETE FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' AND category_id = '顧客分析・セグメンテーション';

-- 3. 結果確認
SELECT 
    category_id,
    total_xp,
    current_level,
    correct_answers,
    total_answers,
    updated_at
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
ORDER BY updated_at DESC;