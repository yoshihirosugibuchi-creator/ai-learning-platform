-- ============================================================
-- セキュリティリンターエラー修正マイグレーション
-- 対象: auth_users_exposed, security_definer_view, rls_disabled_in_public
-- 日付: 2026-02-25
-- ============================================================

-- ============================================================
-- 1. auth_users_exposed: ai_workflow_overview から auth.users 参照を除去
--    CREATE OR REPLACE ではカラム削除不可のため DROP → CREATE で再作成
-- ============================================================
DROP VIEW IF EXISTS ai_workflow_overview;

CREATE VIEW ai_workflow_overview AS
SELECT
  w.id,
  w.user_id,
  w.title,
  w.status,
  w.created_at,
  w.updated_at,
  COALESCE(jsonb_array_length(w.source_materials), 0) as source_count,
  CASE
    WHEN w.generation_preferences->>'ai_mode' = 'api' THEN 'API'
    ELSE '手動'
  END as ai_mode,
  CASE
    WHEN w.published_course_id IS NOT NULL THEN 'コース化済み'
    ELSE 'ワークフロー中'
  END as course_status
FROM ai_course_workflows w;

-- ============================================================
-- 2. security_definer_view: 全対象ビューを SECURITY INVOKER に変更
--    RLSポリシーがクエリ実行ユーザーの権限で適用されるようにする
-- ============================================================
ALTER VIEW ai_workflow_overview SET (security_invoker = on);
ALTER VIEW ai_system_stats SET (security_invoker = on);
ALTER VIEW category_stats SET (security_invoker = on);
ALTER VIEW case_study_problem_stats SET (security_invoker = on);

-- quiz_review系ビュー（存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'quiz_review_stats') THEN
    EXECUTE 'ALTER VIEW quiz_review_stats SET (security_invoker = on)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'quiz_review_pending') THEN
    EXECUTE 'ALTER VIEW quiz_review_pending SET (security_invoker = on)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'quiz_hints') THEN
    EXECUTE 'ALTER VIEW quiz_hints SET (security_invoker = on)';
  END IF;
END $$;

-- ============================================================
-- 3. rls_disabled_in_public: RLS有効化 + ポリシー設定
-- ============================================================

-- --- ai_system_config ---
-- システム設定テーブル: 読み取りは認証ユーザー全員、書き込みは管理者のみ
ALTER TABLE ai_system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_system_config_select_authenticated"
  ON ai_system_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ai_system_config_admin_all"
  ON ai_system_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- --- case_study_options ---
-- マスタデータテーブル: 読み取りは全員（anon含む）、書き込みは管理者のみ
ALTER TABLE case_study_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_study_options_select_all"
  ON case_study_options
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "case_study_options_admin_all"
  ON case_study_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );
