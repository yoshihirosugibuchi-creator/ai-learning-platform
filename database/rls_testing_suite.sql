-- RLS Testing Suite - 48テーブル包括的テスト
-- 作成日: 2025年11月4日
-- 目的: 全RLS実装の段階的テストとアプリケーション影響確認

-- =============================================================================
-- テスト実行前の前提条件確認
-- =============================================================================

-- 1. 基盤関数の存在確認
SELECT 
  proname as function_name,
  CASE 
    WHEN proname IS NOT NULL THEN '✅ 存在'
    ELSE '❌ 不在'
  END as status
FROM (
  VALUES 
    ('is_admin'),
    ('is_system_admin'), 
    ('is_owner_or_admin'),
    ('is_authenticated'),
    ('test_rls_function')
) AS expected_functions(function_name)
LEFT JOIN pg_proc ON proname = function_name
ORDER BY function_name;

-- 2. 現在のユーザー権限確認
SELECT 
  auth.uid() as current_user_id,
  test_rls_function() as current_user_role,
  'テスト実行前の権限確認' as description;

-- =============================================================================
-- Phase 1: 基盤関数テスト
-- =============================================================================

-- 基盤関数の動作確認
SELECT 
  'Phase 1: Foundation Functions Test' as test_phase,
  is_admin() as admin_check,
  is_system_admin() as system_admin_check,
  is_authenticated() as auth_check,
  test_rls_function() as role_function_result;

-- =============================================================================
-- Phase 2: 最重要5テーブルテスト
-- =============================================================================

-- 最重要テーブルのRLS状況確認
SELECT 
  'Phase 2: Critical Tables' as test_phase,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'skp_transactions', 'user_xp_stats_v2', 'quiz_sessions', 'quiz_answers')
ORDER BY tablename;

-- ユーザー自身のデータアクセステスト（成功するはず）
/*
-- 以下は認証済みユーザーでテスト実行
SELECT 
  'users table access' as test,
  COUNT(*) as accessible_records 
FROM users 
WHERE id = auth.uid();

SELECT 
  'user_xp_stats_v2 access' as test,
  COUNT(*) as accessible_records 
FROM user_xp_stats_v2 
WHERE user_id = auth.uid();

SELECT 
  'quiz_sessions access' as test,
  COUNT(*) as accessible_records 
FROM quiz_sessions 
WHERE user_id = auth.uid();
*/

-- =============================================================================
-- Phase 3: ユーザーデータテーブル（21テーブル）テスト
-- =============================================================================

-- ユーザーデータテーブルのRLS状況確認
SELECT 
  'Phase 3: User Data Tables' as test_phase,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count,
  CASE 
    WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) > 0 
    THEN '✅ 設定完了'
    ELSE '❌ 未設定'
  END as setup_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_category_xp_stats_v2', 'user_subcategory_xp_stats_v2', 'user_knowledge_collection_v2',
    'course_completions', 'course_session_completions', 'course_theme_completions',
    'daily_xp_records', 'daily_analytics_batch_log', 'learning_analytics_summary',
    'learning_effectiveness_tracking', 'unified_learning_session_analytics', 'spaced_repetition_schedule',
    'user_settings', 'user_learning_profiles', 'user_badges', 'user_question_usage',
    'wisdom_card_collection', 'knowledge_card_collection',
    'learning_progress', 'learning_recommendations', 'precomputed_quiz_sets', 'review_settings'
  )
ORDER BY tablename;

-- =============================================================================
-- Phase 4: システム・管理テーブル（6テーブル）テスト
-- =============================================================================

-- システムテーブルのRLS状況確認
SELECT 
  'Phase 4: System Tables' as test_phase,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count,
  CASE 
    WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) > 0 
    THEN '✅ 設定完了'
    ELSE '❌ 未設定'
  END as setup_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'system_alerts', 'system_config_monitoring', 'system_health_logs',
    'quiz_questions_review', 'quiz_review_batches', 'quiz_review_history'
  )
ORDER BY tablename;

-- 管理者専用テーブルアクセステスト（管理者のみ成功するはず）
/*
-- 以下は管理者権限でテスト実行
SELECT 
  'system_alerts access' as test,
  COUNT(*) as accessible_records 
FROM system_alerts;

SELECT 
  'quiz_questions_review access' as test,
  COUNT(*) as accessible_records 
FROM quiz_questions_review;
*/

-- =============================================================================
-- Phase 5: マスタデータテーブル（15テーブル）テスト
-- =============================================================================

-- マスタデータテーブルのRLS状況確認
SELECT 
  'Phase 5: Master Data Tables' as test_phase,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count,
  CASE 
    WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) >= 2 
    THEN '✅ 設定完了（読み書き分離）'
    WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) > 0 
    THEN '⚠️ 一部設定'
    ELSE '❌ 未設定'
  END as setup_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'categories', 'subcategories', 'skill_levels', 'difficulty_distribution_settings',
    'learning_courses', 'learning_genres', 'learning_themes', 'learning_sessions', 
    'session_contents', 'session_quizzes',
    'quiz_questions', 'quiz_hints', 'wisdom_cards',
    'xp_level_skp_settings', 'industry_level_targets'
  )
ORDER BY tablename;

-- マスタデータ読み取りテスト（全ユーザーで成功するはず）
/*
-- 以下は一般ユーザーでテスト実行
SELECT 
  'categories read access' as test,
  COUNT(*) as accessible_records 
FROM categories;

SELECT 
  'quiz_questions read access' as test,
  COUNT(*) as accessible_records 
FROM quiz_questions;

SELECT 
  'skill_levels read access' as test,
  COUNT(*) as accessible_records 
FROM skill_levels;
*/

-- =============================================================================
-- 全体的なRLS実装状況サマリー
-- =============================================================================

-- 全テーブルのRLS設定状況
WITH rls_summary AS (
  SELECT 
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as rls_enabled_tables,
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as rls_disabled_tables,
    ROUND(
      (COUNT(CASE WHEN rowsecurity = true THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as rls_coverage_percentage
  FROM pg_tables 
  WHERE schemaname = 'public'
)
SELECT 
  'RLS Implementation Summary' as report_title,
  total_tables,
  rls_enabled_tables,
  rls_disabled_tables,
  rls_coverage_percentage || '%' as coverage
FROM rls_summary;

-- Phase別実装状況詳細
SELECT 
  phase_name,
  target_tables,
  implemented_tables,
  CASE 
    WHEN implemented_tables = target_tables THEN '✅ 完了'
    WHEN implemented_tables > 0 THEN '🔄 進行中'
    ELSE '❌ 未開始'
  END as status,
  ROUND((implemented_tables * 100.0 / target_tables), 1) || '%' as completion_rate
FROM (
  VALUES 
    ('Phase 1: Foundation', 5, 
     (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('is_admin', 'is_system_admin', 'is_owner_or_admin', 'is_authenticated', 'test_rls_function'))),
    ('Phase 2: Critical', 5, 
     (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
      AND tablename IN ('users', 'skp_transactions', 'user_xp_stats_v2', 'quiz_sessions', 'quiz_answers'))),
    ('Phase 3: User Data', 22, 
     (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
      AND tablename IN (
        'user_category_xp_stats_v2', 'user_subcategory_xp_stats_v2', 'user_knowledge_collection_v2',
        'course_completions', 'course_session_completions', 'course_theme_completions',
        'daily_xp_records', 'daily_analytics_batch_log', 'learning_analytics_summary',
        'learning_effectiveness_tracking', 'unified_learning_session_analytics', 'spaced_repetition_schedule',
        'user_settings', 'user_learning_profiles', 'user_badges', 'user_question_usage',
        'wisdom_card_collection', 'knowledge_card_collection',
        'learning_progress', 'learning_recommendations', 'precomputed_quiz_sets', 'review_settings'
      ))),
    ('Phase 4: System', 6, 
     (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
      AND tablename IN (
        'system_alerts', 'system_config_monitoring', 'system_health_logs',
        'quiz_questions_review', 'quiz_review_batches', 'quiz_review_history'
      ))),
    ('Phase 5: Master', 15, 
     (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true 
      AND tablename IN (
        'categories', 'subcategories', 'skill_levels', 'difficulty_distribution_settings',
        'learning_courses', 'learning_genres', 'learning_themes', 'learning_sessions', 
        'session_contents', 'session_quizzes',
        'quiz_questions', 'quiz_hints', 'wisdom_cards',
        'xp_level_skp_settings', 'industry_level_targets'
      )))
) AS phases(phase_name, target_tables, implemented_tables);

-- =============================================================================
-- アプリケーション機能影響分析
-- =============================================================================

-- クリティカルなアプリケーション機能のテーブル依存関係チェック
SELECT 
  'Application Impact Analysis' as analysis_type,
  feature_name,
  required_tables,
  rls_ready_status
FROM (
  VALUES 
    ('ユーザー登録・認証', 'users', 
     CASE WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'users') = true 
     THEN '✅ RLS対応済み' ELSE '❌ RLS未設定' END),
    ('クイズ機能', 'quiz_questions, quiz_sessions, quiz_answers', 
     CASE WHEN (SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('quiz_questions', 'quiz_sessions', 'quiz_answers') AND rowsecurity = true) = 3 
     THEN '✅ RLS対応済み' ELSE '❌ RLS未設定' END),
    ('XP/SKP計算', 'user_xp_stats_v2, skp_transactions', 
     CASE WHEN (SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('user_xp_stats_v2', 'skp_transactions') AND rowsecurity = true) = 2 
     THEN '✅ RLS対応済み' ELSE '❌ RLS未設定' END),
    ('カテゴリー表示', 'categories, subcategories', 
     CASE WHEN (SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('categories', 'subcategories') AND rowsecurity = true) = 2 
     THEN '✅ RLS対応済み' ELSE '❌ RLS未設定' END),
    ('学習コース', 'learning_courses, learning_themes, learning_sessions', 
     CASE WHEN (SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('learning_courses', 'learning_themes', 'learning_sessions') AND rowsecurity = true) = 3 
     THEN '✅ RLS対応済み' ELSE '❌ RLS未設定' END)
) AS app_features(feature_name, required_tables, rls_ready_status);

-- =============================================================================
-- RLS実装後の推奨テスト手順
-- =============================================================================

/*
RLS実装後のテスト手順:

1. 【管理者権限でのテスト】
   - 全テーブルへのアクセス確認
   - システムテーブルへの書き込み確認
   - マスタデータの変更確認

2. 【一般ユーザー権限でのテスト】
   - 自分のユーザーデータへのアクセス確認
   - 他ユーザーデータへのアクセス拒否確認
   - マスタデータの読み取り専用確認

3. 【アプリケーション機能テスト】
   - ログイン・ログアウト
   - クイズ実行（ランダム・カテゴリー指定）
   - XP/SKP獲得・統計更新
   - プロフィール表示
   - カテゴリー一覧表示

4. 【パフォーマンステスト】
   - RLS有効化前後のクエリ実行時間比較
   - 重要機能の応答時間確認
   - 大量データでの動作確認

テスト実行時の注意事項:
- 各Phaseを段階的に実装・テスト
- 問題が発生した場合は即座にロールバック
- 本番環境では必ずバックアップ取得後に実行
- アプリケーションの動作確認を並行実施
*/

-- =============================================================================
-- 緊急時ロールバック手順確認
-- =============================================================================

-- 現在設定されているポリシー数の確認（ロールバック用）
SELECT 
  'Rollback Preparation' as preparation_type,
  COUNT(*) as total_policies_to_rollback,
  'すべてのRLSポリシー数' as description
FROM pg_policies 
WHERE schemaname = 'public';

-- テーブル別ポリシー数詳細
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;