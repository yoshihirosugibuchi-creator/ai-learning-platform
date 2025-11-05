-- RLS Phase 5: マスタデータテーブル（16テーブル）のRLS設定
-- 作成日: 2025年11月4日
-- 対象: 全ユーザー読み取り可、管理者のみ更新可能

-- 前提: Phase 1,2,3,4が実行済みであること

-- =============================================================================
-- カテゴリー・分類系テーブル（4テーブル）
-- =============================================================================

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read_all" ON categories
  FOR SELECT USING (true);
CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "categories_read_all" ON categories IS 'カテゴリーは全ユーザー読み取り可能';
COMMENT ON POLICY "categories_insert_admin" ON categories IS 'カテゴリーの作成は管理者のみ';
COMMENT ON POLICY "categories_update_admin" ON categories IS 'カテゴリーの更新は管理者のみ';
COMMENT ON POLICY "categories_delete_admin" ON categories IS 'カテゴリーの削除は管理者のみ';

-- subcategories
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subcategories_read_all" ON subcategories
  FOR SELECT USING (true);
CREATE POLICY "subcategories_insert_admin" ON subcategories
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "subcategories_update_admin" ON subcategories
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "subcategories_delete_admin" ON subcategories
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "subcategories_read_all" ON subcategories IS 'サブカテゴリーは全ユーザー読み取り可能';
COMMENT ON POLICY "subcategories_insert_admin" ON subcategories IS 'サブカテゴリーの作成は管理者のみ';
COMMENT ON POLICY "subcategories_update_admin" ON subcategories IS 'サブカテゴリーの更新は管理者のみ';
COMMENT ON POLICY "subcategories_delete_admin" ON subcategories IS 'サブカテゴリーの削除は管理者のみ';

-- skill_levels
ALTER TABLE skill_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_levels_read_all" ON skill_levels
  FOR SELECT USING (true);
CREATE POLICY "skill_levels_insert_admin" ON skill_levels
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "skill_levels_update_admin" ON skill_levels
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "skill_levels_delete_admin" ON skill_levels
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "skill_levels_read_all" ON skill_levels IS 'スキルレベルは全ユーザー読み取り可能';
COMMENT ON POLICY "skill_levels_insert_admin" ON skill_levels IS 'スキルレベルの作成は管理者のみ';
COMMENT ON POLICY "skill_levels_update_admin" ON skill_levels IS 'スキルレベルの更新は管理者のみ';
COMMENT ON POLICY "skill_levels_delete_admin" ON skill_levels IS 'スキルレベルの削除は管理者のみ';

-- difficulty_distribution_settings
ALTER TABLE difficulty_distribution_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "difficulty_distribution_settings_read_all" ON difficulty_distribution_settings
  FOR SELECT USING (true);
CREATE POLICY "difficulty_distribution_settings_insert_admin" ON difficulty_distribution_settings
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "difficulty_distribution_settings_update_admin" ON difficulty_distribution_settings
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "difficulty_distribution_settings_delete_admin" ON difficulty_distribution_settings
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "difficulty_distribution_settings_read_all" ON difficulty_distribution_settings IS '難易度設定は全ユーザー読み取り可能';
COMMENT ON POLICY "difficulty_distribution_settings_insert_admin" ON difficulty_distribution_settings IS '難易度設定の作成は管理者のみ';
COMMENT ON POLICY "difficulty_distribution_settings_update_admin" ON difficulty_distribution_settings IS '難易度設定の更新は管理者のみ';
COMMENT ON POLICY "difficulty_distribution_settings_delete_admin" ON difficulty_distribution_settings IS '難易度設定の削除は管理者のみ';

-- =============================================================================
-- 学習コンテンツ系テーブル（6テーブル）
-- =============================================================================

-- learning_courses
ALTER TABLE learning_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_courses_read_all" ON learning_courses
  FOR SELECT USING (true);
CREATE POLICY "learning_courses_insert_admin" ON learning_courses
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "learning_courses_update_admin" ON learning_courses
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "learning_courses_delete_admin" ON learning_courses
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "learning_courses_read_all" ON learning_courses IS '学習コースは全ユーザー読み取り可能';
COMMENT ON POLICY "learning_courses_insert_admin" ON learning_courses IS '学習コースの作成は管理者のみ';
COMMENT ON POLICY "learning_courses_update_admin" ON learning_courses IS '学習コースの更新は管理者のみ';
COMMENT ON POLICY "learning_courses_delete_admin" ON learning_courses IS '学習コースの削除は管理者のみ';

-- learning_genres
ALTER TABLE learning_genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_genres_read_all" ON learning_genres
  FOR SELECT USING (true);
CREATE POLICY "learning_genres_insert_admin" ON learning_genres
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "learning_genres_update_admin" ON learning_genres
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "learning_genres_delete_admin" ON learning_genres
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "learning_genres_read_all" ON learning_genres IS '学習ジャンルは全ユーザー読み取り可能';
COMMENT ON POLICY "learning_genres_insert_admin" ON learning_genres IS '学習ジャンルの作成は管理者のみ';
COMMENT ON POLICY "learning_genres_update_admin" ON learning_genres IS '学習ジャンルの更新は管理者のみ';
COMMENT ON POLICY "learning_genres_delete_admin" ON learning_genres IS '学習ジャンルの削除は管理者のみ';

-- learning_themes
ALTER TABLE learning_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_themes_read_all" ON learning_themes
  FOR SELECT USING (true);
CREATE POLICY "learning_themes_insert_admin" ON learning_themes
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "learning_themes_update_admin" ON learning_themes
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "learning_themes_delete_admin" ON learning_themes
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "learning_themes_read_all" ON learning_themes IS '学習テーマは全ユーザー読み取り可能';
COMMENT ON POLICY "learning_themes_insert_admin" ON learning_themes IS '学習テーマの作成は管理者のみ';
COMMENT ON POLICY "learning_themes_update_admin" ON learning_themes IS '学習テーマの更新は管理者のみ';
COMMENT ON POLICY "learning_themes_delete_admin" ON learning_themes IS '学習テーマの削除は管理者のみ';

-- learning_sessions
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_sessions_read_all" ON learning_sessions
  FOR SELECT USING (true);
CREATE POLICY "learning_sessions_insert_admin" ON learning_sessions
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "learning_sessions_update_admin" ON learning_sessions
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "learning_sessions_delete_admin" ON learning_sessions
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "learning_sessions_read_all" ON learning_sessions IS '学習セッションは全ユーザー読み取り可能';
COMMENT ON POLICY "learning_sessions_insert_admin" ON learning_sessions IS '学習セッションの作成は管理者のみ';
COMMENT ON POLICY "learning_sessions_update_admin" ON learning_sessions IS '学習セッションの更新は管理者のみ';
COMMENT ON POLICY "learning_sessions_delete_admin" ON learning_sessions IS '学習セッションの削除は管理者のみ';

-- session_contents
ALTER TABLE session_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_contents_read_all" ON session_contents
  FOR SELECT USING (true);
CREATE POLICY "session_contents_insert_admin" ON session_contents
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "session_contents_update_admin" ON session_contents
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "session_contents_delete_admin" ON session_contents
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "session_contents_read_all" ON session_contents IS 'セッションコンテンツは全ユーザー読み取り可能';
COMMENT ON POLICY "session_contents_insert_admin" ON session_contents IS 'セッションコンテンツの作成は管理者のみ';
COMMENT ON POLICY "session_contents_update_admin" ON session_contents IS 'セッションコンテンツの更新は管理者のみ';
COMMENT ON POLICY "session_contents_delete_admin" ON session_contents IS 'セッションコンテンツの削除は管理者のみ';

-- session_quizzes
ALTER TABLE session_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_quizzes_read_all" ON session_quizzes
  FOR SELECT USING (true);
CREATE POLICY "session_quizzes_insert_admin" ON session_quizzes
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "session_quizzes_update_admin" ON session_quizzes
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "session_quizzes_delete_admin" ON session_quizzes
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "session_quizzes_read_all" ON session_quizzes IS 'セッションクイズは全ユーザー読み取り可能';
COMMENT ON POLICY "session_quizzes_insert_admin" ON session_quizzes IS 'セッションクイズの作成は管理者のみ';
COMMENT ON POLICY "session_quizzes_update_admin" ON session_quizzes IS 'セッションクイズの更新は管理者のみ';
COMMENT ON POLICY "session_quizzes_delete_admin" ON session_quizzes IS 'セッションクイズの削除は管理者のみ';

-- =============================================================================
-- クイズ・問題系テーブル（3テーブル）
-- =============================================================================

-- quiz_questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_questions_read_all" ON quiz_questions
  FOR SELECT USING (true);
CREATE POLICY "quiz_questions_insert_admin" ON quiz_questions
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "quiz_questions_update_admin" ON quiz_questions
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "quiz_questions_delete_admin" ON quiz_questions
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "quiz_questions_read_all" ON quiz_questions IS 'クイズ問題は全ユーザー読み取り可能';
COMMENT ON POLICY "quiz_questions_insert_admin" ON quiz_questions IS 'クイズ問題の作成は管理者のみ';
COMMENT ON POLICY "quiz_questions_update_admin" ON quiz_questions IS 'クイズ問題の更新は管理者のみ';
COMMENT ON POLICY "quiz_questions_delete_admin" ON quiz_questions IS 'クイズ問題の削除は管理者のみ';

-- quiz_hints
ALTER TABLE quiz_hints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_hints_read_all" ON quiz_hints
  FOR SELECT USING (true);
CREATE POLICY "quiz_hints_insert_admin" ON quiz_hints
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "quiz_hints_update_admin" ON quiz_hints
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "quiz_hints_delete_admin" ON quiz_hints
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "quiz_hints_read_all" ON quiz_hints IS 'クイズヒントは全ユーザー読み取り可能';
COMMENT ON POLICY "quiz_hints_insert_admin" ON quiz_hints IS 'クイズヒントの作成は管理者のみ';
COMMENT ON POLICY "quiz_hints_update_admin" ON quiz_hints IS 'クイズヒントの更新は管理者のみ';
COMMENT ON POLICY "quiz_hints_delete_admin" ON quiz_hints IS 'クイズヒントの削除は管理者のみ';

-- wisdom_cards
ALTER TABLE wisdom_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wisdom_cards_read_all" ON wisdom_cards
  FOR SELECT USING (true);
CREATE POLICY "wisdom_cards_insert_admin" ON wisdom_cards
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "wisdom_cards_update_admin" ON wisdom_cards
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "wisdom_cards_delete_admin" ON wisdom_cards
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "wisdom_cards_read_all" ON wisdom_cards IS '格言カードは全ユーザー読み取り可能';
COMMENT ON POLICY "wisdom_cards_insert_admin" ON wisdom_cards IS '格言カードの作成は管理者のみ';
COMMENT ON POLICY "wisdom_cards_update_admin" ON wisdom_cards IS '格言カードの更新は管理者のみ';
COMMENT ON POLICY "wisdom_cards_delete_admin" ON wisdom_cards IS '格言カードの削除は管理者のみ';

-- =============================================================================
-- 設定・レベル系テーブル（3テーブル）
-- =============================================================================

-- xp_level_skp_settings
ALTER TABLE xp_level_skp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_level_skp_settings_read_all" ON xp_level_skp_settings
  FOR SELECT USING (true);
CREATE POLICY "xp_level_skp_settings_insert_admin" ON xp_level_skp_settings
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "xp_level_skp_settings_update_admin" ON xp_level_skp_settings
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "xp_level_skp_settings_delete_admin" ON xp_level_skp_settings
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "xp_level_skp_settings_read_all" ON xp_level_skp_settings IS 'XP/SKP設定は全ユーザー読み取り可能';
COMMENT ON POLICY "xp_level_skp_settings_insert_admin" ON xp_level_skp_settings IS 'XP/SKP設定の作成は管理者のみ';
COMMENT ON POLICY "xp_level_skp_settings_update_admin" ON xp_level_skp_settings IS 'XP/SKP設定の更新は管理者のみ';
COMMENT ON POLICY "xp_level_skp_settings_delete_admin" ON xp_level_skp_settings IS 'XP/SKP設定の削除は管理者のみ';

-- industry_level_targets
ALTER TABLE industry_level_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "industry_level_targets_read_all" ON industry_level_targets
  FOR SELECT USING (true);
CREATE POLICY "industry_level_targets_insert_admin" ON industry_level_targets
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "industry_level_targets_update_admin" ON industry_level_targets
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "industry_level_targets_delete_admin" ON industry_level_targets
  FOR DELETE USING (is_admin());
COMMENT ON POLICY "industry_level_targets_read_all" ON industry_level_targets IS '業界レベル目標は全ユーザー読み取り可能';
COMMENT ON POLICY "industry_level_targets_insert_admin" ON industry_level_targets IS '業界レベル目標の作成は管理者のみ';
COMMENT ON POLICY "industry_level_targets_update_admin" ON industry_level_targets IS '業界レベル目標の更新は管理者のみ';
COMMENT ON POLICY "industry_level_targets_delete_admin" ON industry_level_targets IS '業界レベル目標の削除は管理者のみ';

-- =============================================================================
-- Phase 5 実行確認
-- =============================================================================

-- Phase 5対象テーブルのRLS有効化状況確認
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN tablename IN ('categories', 'subcategories', 'skill_levels', 'difficulty_distribution_settings') THEN 'カテゴリー・分類系'
    WHEN tablename IN ('learning_courses', 'learning_genres', 'learning_themes', 'learning_sessions', 'session_contents', 'session_quizzes') THEN '学習コンテンツ系'
    WHEN tablename IN ('quiz_questions', 'quiz_hints', 'wisdom_cards') THEN 'クイズ・問題系'
    WHEN tablename IN ('xp_level_skp_settings', 'industry_level_targets') THEN '設定・レベル系'
    ELSE 'その他'
  END as table_category
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'categories', 'subcategories', 'skill_levels', 'difficulty_distribution_settings',
    'learning_courses', 'learning_genres', 'learning_themes', 'learning_sessions', 
    'session_contents', 'session_quizzes',
    'quiz_questions', 'quiz_hints', 'wisdom_cards',
    'xp_level_skp_settings', 'industry_level_targets'
  )
ORDER BY table_category, tablename;

-- ポリシー作成状況確認（読み取り・変更ポリシーの確認）
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN policyname LIKE '%read_all%' THEN '読み取り（全ユーザー）'
    WHEN policyname LIKE '%modify_admin%' THEN '変更（管理者のみ）'
    ELSE 'その他'
  END as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'categories', 'subcategories', 'skill_levels', 'difficulty_distribution_settings',
    'learning_courses', 'learning_genres', 'learning_themes', 'learning_sessions', 
    'session_contents', 'session_quizzes',
    'quiz_questions', 'quiz_hints', 'wisdom_cards',
    'xp_level_skp_settings', 'industry_level_targets'
  )
ORDER BY tablename, policy_type;

-- マスタデータテーブルの総数確認
SELECT 
  COUNT(*) as master_tables_with_rls,
  'Phase 5 master data tables with RLS enabled' as description
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename IN (
    'categories', 'subcategories', 'skill_levels', 'difficulty_distribution_settings',
    'learning_courses', 'learning_genres', 'learning_themes', 'learning_sessions', 
    'session_contents', 'session_quizzes',
    'quiz_questions', 'quiz_hints', 'wisdom_cards',
    'xp_level_skp_settings', 'industry_level_targets'
  );

-- 権限テスト用クエリ（一般ユーザーでテスト実行）
/*
-- 以下のクエリは一般ユーザー権限でテスト実行してください

-- カテゴリー読み取りテスト（成功するはず）
SELECT COUNT(*) as categories_count FROM categories;
SELECT COUNT(*) as subcategories_count FROM subcategories;
SELECT COUNT(*) as skill_levels_count FROM skill_levels;

-- 学習コンテンツ読み取りテスト（成功するはず）
SELECT COUNT(*) as learning_courses_count FROM learning_courses;
SELECT COUNT(*) as learning_themes_count FROM learning_themes;
SELECT COUNT(*) as quiz_questions_count FROM quiz_questions;

-- 変更テスト（一般ユーザーは失敗するはず）
-- INSERT INTO categories (name, description) VALUES ('test', 'test');
-- UPDATE categories SET name = 'modified' WHERE id = 1;
-- DELETE FROM categories WHERE name = 'test';

-- 現在のユーザー権限確認
SELECT test_rls_function() as current_user_role;
*/

-- =============================================================================
-- 全48テーブルのRLS設定状況確認
-- =============================================================================

-- 全テーブルのRLS有効化状況
SELECT 
  COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls,
  COUNT(*) as total_public_tables,
  ROUND(
    (COUNT(CASE WHEN rowsecurity = true THEN 1 END) * 100.0 / COUNT(*)), 2
  ) as rls_coverage_percentage
FROM pg_tables 
WHERE schemaname = 'public';

-- Phase別の設定状況詳細
SELECT 
  'Phase 1: Foundation' as phase,
  '基盤関数' as description,
  (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('is_admin', 'is_system_admin', 'is_owner_or_admin', 'is_authenticated', 'test_rls_function')) as implemented_count,
  5 as target_count;

SELECT 
  'Phase 2: Critical' as phase,
  '最重要5テーブル' as description,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
   AND tablename IN ('users', 'skp_transactions', 'user_xp_stats_v2', 'quiz_sessions', 'quiz_answers')) as implemented_count,
  5 as target_count;

SELECT 
  'Phase 3: User Data' as phase,
  'ユーザーデータ21テーブル' as description,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
   AND tablename IN (
     'user_category_xp_stats_v2', 'user_subcategory_xp_stats_v2', 'user_knowledge_collection_v2',
     'course_completions', 'course_session_completions', 'course_theme_completions',
     'daily_xp_records', 'daily_analytics_batch_log', 'learning_analytics_summary',
     'learning_effectiveness_tracking', 'unified_learning_session_analytics', 'spaced_repetition_schedule',
     'user_settings', 'user_learning_profiles', 'user_badges', 'user_question_usage',
     'wisdom_card_collection', 'knowledge_card_collection',
     'learning_progress', 'learning_recommendations', 'precomputed_quiz_sets', 'review_settings'
   )) as implemented_count,
  22 as target_count;

SELECT 
  'Phase 4: System' as phase,
  'システム・管理6テーブル' as description,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
   AND tablename IN (
     'system_alerts', 'system_config_monitoring', 'system_health_logs',
     'quiz_questions_review', 'quiz_review_batches', 'quiz_review_history'
   )) as implemented_count,
  6 as target_count;

SELECT 
  'Phase 5: Master' as phase,
  'マスタデータ15テーブル' as description,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
   AND tablename IN (
     'categories', 'subcategories', 'skill_levels', 'difficulty_distribution_settings',
     'learning_courses', 'learning_genres', 'learning_themes', 'learning_sessions', 
     'session_contents', 'session_quizzes',
     'quiz_questions', 'quiz_hints', 'wisdom_cards',
     'xp_level_skp_settings', 'industry_level_targets'
   )) as implemented_count,
  15 as target_count;

-- =============================================================================
-- ロールバック用SQL（緊急時のみ使用）
-- =============================================================================

/*
-- 緊急時ロールバック（コメントアウト状態で保管）

-- RLS無効化
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories DISABLE ROW LEVEL SECURITY;
ALTER TABLE skill_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE difficulty_distribution_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_genres DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_themes DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_hints DISABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE xp_level_skp_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE industry_level_targets DISABLE ROW LEVEL SECURITY;

-- ポリシー削除
DROP POLICY IF EXISTS "categories_read_all" ON categories;
DROP POLICY IF EXISTS "categories_insert_admin" ON categories;
DROP POLICY IF EXISTS "categories_update_admin" ON categories;
DROP POLICY IF EXISTS "categories_delete_admin" ON categories;
DROP POLICY IF EXISTS "subcategories_read_all" ON subcategories;
DROP POLICY IF EXISTS "subcategories_insert_admin" ON subcategories;
DROP POLICY IF EXISTS "subcategories_update_admin" ON subcategories;
DROP POLICY IF EXISTS "subcategories_delete_admin" ON subcategories;
DROP POLICY IF EXISTS "skill_levels_read_all" ON skill_levels;
DROP POLICY IF EXISTS "skill_levels_insert_admin" ON skill_levels;
DROP POLICY IF EXISTS "skill_levels_update_admin" ON skill_levels;
DROP POLICY IF EXISTS "skill_levels_delete_admin" ON skill_levels;
DROP POLICY IF EXISTS "difficulty_distribution_settings_read_all" ON difficulty_distribution_settings;
DROP POLICY IF EXISTS "difficulty_distribution_settings_insert_admin" ON difficulty_distribution_settings;
DROP POLICY IF EXISTS "difficulty_distribution_settings_update_admin" ON difficulty_distribution_settings;
DROP POLICY IF EXISTS "difficulty_distribution_settings_delete_admin" ON difficulty_distribution_settings;
DROP POLICY IF EXISTS "learning_courses_read_all" ON learning_courses;
DROP POLICY IF EXISTS "learning_courses_insert_admin" ON learning_courses;
DROP POLICY IF EXISTS "learning_courses_update_admin" ON learning_courses;
DROP POLICY IF EXISTS "learning_courses_delete_admin" ON learning_courses;
DROP POLICY IF EXISTS "learning_genres_read_all" ON learning_genres;
DROP POLICY IF EXISTS "learning_genres_insert_admin" ON learning_genres;
DROP POLICY IF EXISTS "learning_genres_update_admin" ON learning_genres;
DROP POLICY IF EXISTS "learning_genres_delete_admin" ON learning_genres;
DROP POLICY IF EXISTS "learning_themes_read_all" ON learning_themes;
DROP POLICY IF EXISTS "learning_themes_insert_admin" ON learning_themes;
DROP POLICY IF EXISTS "learning_themes_update_admin" ON learning_themes;
DROP POLICY IF EXISTS "learning_themes_delete_admin" ON learning_themes;
DROP POLICY IF EXISTS "learning_sessions_read_all" ON learning_sessions;
DROP POLICY IF EXISTS "learning_sessions_insert_admin" ON learning_sessions;
DROP POLICY IF EXISTS "learning_sessions_update_admin" ON learning_sessions;
DROP POLICY IF EXISTS "learning_sessions_delete_admin" ON learning_sessions;
DROP POLICY IF EXISTS "session_contents_read_all" ON session_contents;
DROP POLICY IF EXISTS "session_contents_insert_admin" ON session_contents;
DROP POLICY IF EXISTS "session_contents_update_admin" ON session_contents;
DROP POLICY IF EXISTS "session_contents_delete_admin" ON session_contents;
DROP POLICY IF EXISTS "session_quizzes_read_all" ON session_quizzes;
DROP POLICY IF EXISTS "session_quizzes_insert_admin" ON session_quizzes;
DROP POLICY IF EXISTS "session_quizzes_update_admin" ON session_quizzes;
DROP POLICY IF EXISTS "session_quizzes_delete_admin" ON session_quizzes;
DROP POLICY IF EXISTS "quiz_questions_read_all" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_insert_admin" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_update_admin" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_delete_admin" ON quiz_questions;
DROP POLICY IF EXISTS "quiz_hints_read_all" ON quiz_hints;
DROP POLICY IF EXISTS "quiz_hints_insert_admin" ON quiz_hints;
DROP POLICY IF EXISTS "quiz_hints_update_admin" ON quiz_hints;
DROP POLICY IF EXISTS "quiz_hints_delete_admin" ON quiz_hints;
DROP POLICY IF EXISTS "wisdom_cards_read_all" ON wisdom_cards;
DROP POLICY IF EXISTS "wisdom_cards_insert_admin" ON wisdom_cards;
DROP POLICY IF EXISTS "wisdom_cards_update_admin" ON wisdom_cards;
DROP POLICY IF EXISTS "wisdom_cards_delete_admin" ON wisdom_cards;
DROP POLICY IF EXISTS "xp_level_skp_settings_read_all" ON xp_level_skp_settings;
DROP POLICY IF EXISTS "xp_level_skp_settings_insert_admin" ON xp_level_skp_settings;
DROP POLICY IF EXISTS "xp_level_skp_settings_update_admin" ON xp_level_skp_settings;
DROP POLICY IF EXISTS "xp_level_skp_settings_delete_admin" ON xp_level_skp_settings;
DROP POLICY IF EXISTS "industry_level_targets_read_all" ON industry_level_targets;
DROP POLICY IF EXISTS "industry_level_targets_insert_admin" ON industry_level_targets;
DROP POLICY IF EXISTS "industry_level_targets_update_admin" ON industry_level_targets;
DROP POLICY IF EXISTS "industry_level_targets_delete_admin" ON industry_level_targets;

*/