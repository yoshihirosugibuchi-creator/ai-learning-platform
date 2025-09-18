-- テストユーザーをデータベースに作成

-- 1. 既存のテストユーザーを確認
SELECT id, email, name FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 2. テストユーザーを作成（存在しない場合）
INSERT INTO users (
    id,
    email,
    name,
    skill_level,
    learning_style,
    experience_level,
    total_xp,
    current_level,
    streak,
    last_active
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'test@example.com',
    'Test User',
    'beginner',
    'mixed',
    'beginner',
    0,
    1,
    0,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    last_active = NOW();

-- 3. 作成結果を確認
SELECT id, email, name, total_xp, current_level FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 4. テスト用クイズ結果を挿入テスト
INSERT INTO quiz_results (
    user_id,
    category_id,
    subcategory_id,
    questions,
    answers,
    score,
    total_questions,
    time_taken,
    completed_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'finance',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    100,
    10,
    60,
    NOW()
);

-- 5. 挿入結果を確認
SELECT id, user_id, category_id, score FROM quiz_results WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' ORDER BY created_at DESC LIMIT 1;

-- 6. テストデータをクリーンアップ
DELETE FROM quiz_results WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';