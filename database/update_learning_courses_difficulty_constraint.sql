-- 学習コーステーブルのスキルレベル制約をDB統一スキルレベルに対応
-- beginner → basic への変更対応

-- 既存のCHECK制約を削除
ALTER TABLE learning_courses 
DROP CONSTRAINT IF EXISTS learning_courses_difficulty_check;

-- 新しいCHECK制約を追加（DB統一スキルレベルに対応）
ALTER TABLE learning_courses 
ADD CONSTRAINT learning_courses_difficulty_check 
CHECK (difficulty IN ('basic', 'intermediate', 'advanced', 'expert'));

-- 既存データの更新（beginner → basic）
UPDATE learning_courses 
SET difficulty = 'basic', updated_at = CURRENT_TIMESTAMP
WHERE difficulty = 'beginner';

-- 結果確認
SELECT id, title, difficulty, status 
FROM learning_courses 
ORDER BY display_order;