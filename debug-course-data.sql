-- 金融基礎コースのデータ存在確認クエリ

-- 1. learning_courses テーブルの確認
SELECT 'learning_courses' as table_name, id, title, status FROM learning_courses WHERE id = 'finance_basics_course';

-- 2. learning_genres テーブルの確認  
SELECT 'learning_genres' as table_name, id, course_id, title FROM learning_genres WHERE course_id = 'finance_basics_course';

-- 3. learning_themes テーブルの確認
SELECT 'learning_themes' as table_name, id, genre_id, title, display_order FROM learning_themes WHERE genre_id = 'finance_basics_genre' ORDER BY display_order;

-- 4. learning_sessions テーブルの確認
SELECT 'learning_sessions' as table_name, id, theme_id, title, session_type, display_order, estimated_minutes 
FROM learning_sessions 
WHERE theme_id IN (
  SELECT id FROM learning_themes WHERE genre_id = 'finance_basics_genre'
) 
ORDER BY theme_id, display_order;

-- 5. session_contents テーブルの確認
SELECT 'session_contents' as table_name, id, session_id, content_type, title, display_order
FROM session_contents 
WHERE session_id IN (
  SELECT id FROM learning_sessions WHERE theme_id IN (
    SELECT id FROM learning_themes WHERE genre_id = 'finance_basics_genre'
  )
)
ORDER BY session_id, display_order;

-- 6. session_quizzes テーブルの確認  
SELECT 'session_quizzes' as table_name, id, session_id, question, correct_answer
FROM session_quizzes 
WHERE session_id IN (
  SELECT id FROM learning_sessions WHERE theme_id IN (
    SELECT id FROM learning_themes WHERE genre_id = 'finance_basics_genre'
  )
)
ORDER BY session_id;

-- 7. 各テーブルのレコード数確認
SELECT 
  'learning_courses' as table_name,
  COUNT(*) as record_count
FROM learning_courses WHERE id = 'finance_basics_course'
UNION ALL
SELECT 
  'learning_genres' as table_name,
  COUNT(*) as record_count  
FROM learning_genres WHERE course_id = 'finance_basics_course'
UNION ALL
SELECT 
  'learning_themes' as table_name,
  COUNT(*) as record_count
FROM learning_themes WHERE genre_id = 'finance_basics_genre'
UNION ALL
SELECT 
  'learning_sessions' as table_name,
  COUNT(*) as record_count
FROM learning_sessions WHERE theme_id IN (
  SELECT id FROM learning_themes WHERE genre_id = 'finance_basics_genre'
)
UNION ALL
SELECT 
  'session_contents' as table_name,
  COUNT(*) as record_count
FROM session_contents WHERE session_id IN (
  SELECT id FROM learning_sessions WHERE theme_id IN (
    SELECT id FROM learning_themes WHERE genre_id = 'finance_basics_genre'
  )
)
UNION ALL
SELECT 
  'session_quizzes' as table_name,
  COUNT(*) as record_count
FROM session_quizzes WHERE session_id IN (
  SELECT id FROM learning_sessions WHERE theme_id IN (
    SELECT id FROM learning_themes WHERE genre_id = 'finance_basics_genre'
  )
);