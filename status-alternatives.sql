-- learning_courses.status の代替候補値
-- エラーが続く場合は以下の値を順番に試してください：

-- Option 1: 'published'（修正済み）
UPDATE learning_courses SET status = 'published' WHERE id = 'finance_basics_course';

-- Option 2: 'draft'
UPDATE learning_courses SET status = 'draft' WHERE id = 'finance_basics_course';

-- Option 3: 'available' 
UPDATE learning_courses SET status = 'available' WHERE id = 'finance_basics_course';

-- Option 4: statusフィールドを削除してINSERT（デフォルト値使用）
-- INSERTのstatus部分を削除して再実行

-- 制約確認クエリ（参考）
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'learning_courses'::regclass;