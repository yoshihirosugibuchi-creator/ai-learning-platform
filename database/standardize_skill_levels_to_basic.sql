-- ===============================================
-- スキルレベル標準化スクリプト
-- 'beginner' を 'basic' に統一
-- ===============================================

-- 1. users テーブルの skill_level カラムのデフォルト値を 'basic' に変更
ALTER TABLE users 
ALTER COLUMN skill_level SET DEFAULT 'basic';

-- 2. users テーブルの experience_level カラムのデフォルト値を 'basic' に変更  
ALTER TABLE users 
ALTER COLUMN experience_level SET DEFAULT 'basic';

-- 3. existing users で 'beginner' になっているレコードを 'basic' に更新
UPDATE users 
SET skill_level = 'basic' 
WHERE skill_level = 'beginner';

UPDATE users 
SET experience_level = 'basic' 
WHERE experience_level = 'beginner';

-- 4. CHECK制約を更新（'beginner' を 'basic' に置き換え）
-- 現在の制約を削除
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_skill_level_check;

-- 新しい制約を追加
ALTER TABLE users ADD CONSTRAINT users_skill_level_check 
CHECK (skill_level IN ('basic', 'intermediate', 'advanced', 'expert'));

-- 5. 全ての difficulty カラムを持つテーブルで 'beginner' → 'basic' に統一

-- 5-1. quiz_questions テーブル
UPDATE quiz_questions 
SET difficulty = 'basic'
WHERE difficulty = 'beginner';

-- 5-2. quiz_answers テーブル
UPDATE quiz_answers 
SET difficulty = 'basic'
WHERE difficulty = 'beginner';

-- 5-3. quiz_questions_review テーブル（レビュー待ち問題）
UPDATE quiz_questions_review 
SET difficulty = 'basic'
WHERE difficulty = 'beginner';

-- 5-4. learning_courses テーブル（コース難易度）
UPDATE learning_courses 
SET difficulty = 'basic'
WHERE difficulty = 'beginner';

-- 5-5. user_badges テーブル（バッジ難易度）
UPDATE user_badges 
SET difficulty = 'basic'
WHERE difficulty = 'beginner';

-- 5-6. unified_learning_session_analytics テーブル（難易度レベル）
UPDATE unified_learning_session_analytics 
SET difficulty_level = 'basic'
WHERE difficulty_level = 'beginner';

-- 7. skill_levels テーブルのレコードを確認・統一
-- 'beginner' レコードがあれば 'basic' に変更
UPDATE skill_levels 
SET id = 'basic'
WHERE id = 'beginner';

-- 完了メッセージ
SELECT 'Skill level standardization completed: beginner -> basic' as status;

-- 結果確認クエリ（全テーブルの難易度分布確認）
SELECT 
    'users.skill_level' as table_column,
    skill_level as value,
    COUNT(*) as count
FROM users 
GROUP BY skill_level
UNION ALL
SELECT 
    'users.experience_level' as table_column,
    experience_level as value,
    COUNT(*) as count
FROM users 
GROUP BY experience_level
UNION ALL
SELECT 
    'quiz_questions.difficulty' as table_column,
    COALESCE(difficulty, 'NULL') as value,
    COUNT(*) as count
FROM quiz_questions 
GROUP BY difficulty
UNION ALL
SELECT 
    'quiz_answers.difficulty' as table_column,
    difficulty as value,
    COUNT(*) as count
FROM quiz_answers 
GROUP BY difficulty
UNION ALL
SELECT 
    'quiz_questions_review.difficulty' as table_column,
    difficulty as value,
    COUNT(*) as count
FROM quiz_questions_review 
GROUP BY difficulty
UNION ALL
SELECT 
    'learning_courses.difficulty' as table_column,
    difficulty as value,
    COUNT(*) as count
FROM learning_courses 
GROUP BY difficulty
UNION ALL
SELECT 
    'user_badges.difficulty' as table_column,
    difficulty as value,
    COUNT(*) as count
FROM user_badges 
GROUP BY difficulty
UNION ALL
SELECT 
    'unified_analytics.difficulty_level' as table_column,
    difficulty_level as value,
    COUNT(*) as count
FROM unified_learning_session_analytics 
GROUP BY difficulty_level
UNION ALL
SELECT 
    'skill_levels.id' as table_column,
    id as value,
    COUNT(*) as count
FROM skill_levels 
GROUP BY id
ORDER BY table_column, value;