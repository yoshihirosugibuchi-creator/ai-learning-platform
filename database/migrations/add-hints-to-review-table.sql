-- ヒント機能対応: quiz_questions_reviewテーブルにヒントフィールド追加
-- 実行日: 2025-11-06

-- Level 1 ヒント追加
ALTER TABLE quiz_questions_review ADD COLUMN IF NOT EXISTS level1_hint TEXT DEFAULT NULL;

-- Level 2 ヒント追加  
ALTER TABLE quiz_questions_review ADD COLUMN IF NOT EXISTS level2_hint TEXT DEFAULT NULL;

-- Level 3 ヒント追加
ALTER TABLE quiz_questions_review ADD COLUMN IF NOT EXISTS level3_hint TEXT DEFAULT NULL;

-- コメント追加
COMMENT ON COLUMN quiz_questions_review.level1_hint IS 'レベル1ヒント（初級向け）';
COMMENT ON COLUMN quiz_questions_review.level2_hint IS 'レベル2ヒント（中級向け）';
COMMENT ON COLUMN quiz_questions_review.level3_hint IS 'レベル3ヒント（上級向け）';

-- 実行確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'quiz_questions_review' 
AND column_name LIKE '%hint%'
ORDER BY column_name;