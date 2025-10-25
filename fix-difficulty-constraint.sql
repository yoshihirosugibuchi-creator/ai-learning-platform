-- user_badges テーブルのdifficulty制約を修正
-- 現在の制約を削除
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_difficulty_check;

-- 新しい制約を追加（basic, intermediate, advanced, expertを許可）
ALTER TABLE user_badges ADD CONSTRAINT user_badges_difficulty_check 
CHECK (difficulty IN ('basic', 'intermediate', 'advanced', 'expert'));

-- 制約確認（PostgreSQL 12+対応）
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_badges'::regclass 
AND conname = 'user_badges_difficulty_check';