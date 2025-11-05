-- UnifiedQuizType統一 - データベース制約更新
-- 作成日: 2025-10-31
-- 目的: quiz_typeをUnifiedQuizType値に制限、quiz_modeカラムを削除

-- Step 1: 既存データのquiz_typeを正しい値に更新
-- 'main' → 'business-ai'
UPDATE quiz_sessions 
SET quiz_type = 'business-ai' 
WHERE quiz_type = 'main';

-- Step 2: quiz_typeにCHECK制約を追加（UnifiedQuizType値のみ許可）
ALTER TABLE quiz_sessions 
ADD CONSTRAINT quiz_sessions_quiz_type_check 
CHECK (quiz_type IN ('business-ai', 'self-personalized', 'category', 'review'));

-- Step 3: quiz_modeカラムを削除（非推奨化・混乱防止）
ALTER TABLE quiz_sessions DROP COLUMN IF EXISTS quiz_mode;

-- 確認用クエリ（実行後の検証）
-- SELECT DISTINCT quiz_type FROM quiz_sessions;
-- \d quiz_sessions