-- RLS Phase 4: システム・管理テーブル（6テーブル）のRLS設定
-- 作成日: 2025年11月4日
-- 対象: システムテーブル(3) + 管理・履歴テーブル(3)

-- 前提: Phase 1,2,3が実行済みであること

-- =============================================================================
-- システムテーブル（3テーブル）- 管理者のみアクセス
-- =============================================================================

-- system_alerts
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_alerts_admin_only" ON system_alerts
  FOR ALL USING (is_admin());
COMMENT ON POLICY "system_alerts_admin_only" ON system_alerts IS 'システムアラートは管理者のみアクセス可能';

-- system_config_monitoring
ALTER TABLE system_config_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_config_monitoring_admin_only" ON system_config_monitoring
  FOR ALL USING (is_admin());
COMMENT ON POLICY "system_config_monitoring_admin_only" ON system_config_monitoring IS 'システム設定監視は管理者のみアクセス可能';

-- system_health_logs
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_health_logs_admin_only" ON system_health_logs
  FOR ALL USING (is_admin());
COMMENT ON POLICY "system_health_logs_admin_only" ON system_health_logs IS 'システムヘルスログは管理者のみアクセス可能';

-- =============================================================================
-- 管理・履歴テーブル（3テーブル）- 管理者のみアクセス
-- =============================================================================

-- quiz_questions_review
ALTER TABLE quiz_questions_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_questions_review_admin_only" ON quiz_questions_review
  FOR ALL USING (is_admin());
COMMENT ON POLICY "quiz_questions_review_admin_only" ON quiz_questions_review IS 'クイズ問題レビューは管理者のみアクセス可能';

-- quiz_review_batches
ALTER TABLE quiz_review_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_review_batches_admin_only" ON quiz_review_batches
  FOR ALL USING (is_admin());
COMMENT ON POLICY "quiz_review_batches_admin_only" ON quiz_review_batches IS 'クイズレビューバッチは管理者のみアクセス可能';

-- quiz_review_history
ALTER TABLE quiz_review_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_review_history_admin_only" ON quiz_review_history
  FOR ALL USING (is_admin());
COMMENT ON POLICY "quiz_review_history_admin_only" ON quiz_review_history IS 'クイズレビュー履歴は管理者のみアクセス可能';

-- =============================================================================
-- Phase 4 実行確認
-- =============================================================================

-- Phase 4対象テーブルのRLS有効化状況確認
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN tablename IN ('system_alerts', 'system_config_monitoring', 'system_health_logs') THEN 'システムテーブル'
    WHEN tablename IN ('quiz_questions_review', 'quiz_review_batches', 'quiz_review_history') THEN '管理・履歴テーブル'
    ELSE 'その他'
  END as table_category
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'system_alerts', 'system_config_monitoring', 'system_health_logs',
    'quiz_questions_review', 'quiz_review_batches', 'quiz_review_history'
  )
ORDER BY table_category, tablename;

-- ポリシー作成状況確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'system_alerts', 'system_config_monitoring', 'system_health_logs',
    'quiz_questions_review', 'quiz_review_batches', 'quiz_review_history'
  )
ORDER BY tablename, policyname;

-- 権限テスト用クエリ（管理者でテスト実行）
/*
-- 以下のクエリは管理者権限でテスト実行してください

-- システムテーブルアクセステスト
SELECT COUNT(*) as system_alerts_count FROM system_alerts;
SELECT COUNT(*) as system_config_monitoring_count FROM system_config_monitoring;
SELECT COUNT(*) as system_health_logs_count FROM system_health_logs;

-- 管理・履歴テーブルアクセステスト
SELECT COUNT(*) as quiz_questions_review_count FROM quiz_questions_review;
SELECT COUNT(*) as quiz_review_batches_count FROM quiz_review_batches;
SELECT COUNT(*) as quiz_review_history_count FROM quiz_review_history;

-- 現在のユーザー権限確認
SELECT test_rls_function() as current_user_role;
*/

-- =============================================================================
-- ロールバック用SQL（緊急時のみ使用）
-- =============================================================================

/*
-- 緊急時ロールバック（コメントアウト状態で保管）

-- RLS無効化
ALTER TABLE system_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_config_monitoring DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions_review DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_review_batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_review_history DISABLE ROW LEVEL SECURITY;

-- ポリシー削除
DROP POLICY IF EXISTS "system_alerts_admin_only" ON system_alerts;
DROP POLICY IF EXISTS "system_config_monitoring_admin_only" ON system_config_monitoring;
DROP POLICY IF EXISTS "system_health_logs_admin_only" ON system_health_logs;
DROP POLICY IF EXISTS "quiz_questions_review_admin_only" ON quiz_questions_review;
DROP POLICY IF EXISTS "quiz_review_batches_admin_only" ON quiz_review_batches;
DROP POLICY IF EXISTS "quiz_review_history_admin_only" ON quiz_review_history;

*/