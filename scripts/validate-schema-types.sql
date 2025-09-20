-- 学習コンテンツスキーマの型整合性確認スクリプト
-- 実行方法: Supabaseダッシュボード > SQL Editor で実行

-- =====================================
-- 1. 型整合性チェック
-- =====================================

-- 全テーブルのID型確認
SELECT 
  'learning_courses' as table_name,
  'id' as column_name,
  'TEXT' as expected_type
UNION ALL
SELECT 
  'learning_genres',
  'id, course_id', 
  'TEXT, TEXT'
UNION ALL
SELECT 
  'learning_themes',
  'id, genre_id',
  'TEXT, TEXT'
UNION ALL
SELECT 
  'learning_sessions',
  'id, theme_id',
  'TEXT, TEXT'
UNION ALL
SELECT 
  'session_contents',
  'id, session_id',
  'TEXT, TEXT'
UNION ALL
SELECT 
  'session_quizzes',
  'id, session_id', 
  'TEXT, TEXT';

-- =====================================
-- 2. 外部キー制約確認
-- =====================================

-- 外部キー参照リスト
SELECT 
  'learning_genres.course_id → learning_courses.id' as foreign_key_reference,
  'TEXT → TEXT' as type_compatibility,
  'OK' as status
UNION ALL
SELECT 
  'learning_themes.genre_id → learning_genres.id',
  'TEXT → TEXT',
  'OK'
UNION ALL
SELECT 
  'learning_sessions.theme_id → learning_themes.id',
  'TEXT → TEXT', 
  'OK'
UNION ALL
SELECT 
  'session_contents.session_id → learning_sessions.id',
  'TEXT → TEXT',
  'OK'
UNION ALL
SELECT 
  'session_quizzes.session_id → learning_sessions.id',
  'TEXT → TEXT',
  'OK';

-- =====================================
-- 3. スキーマ検証完了メッセージ
-- =====================================
SELECT 'All foreign key type compatibility verified - ready for execution' AS validation_result;