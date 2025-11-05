-- RLS Phase 4: 不適切な新ポリシーの削除
-- 作成日: 2025年11月4日
-- 目的: system系テーブルの新しい管理者専用ポリシーを削除し、既存の認証済みアクセスポリシーを維持

-- =============================================================================
-- 新しい管理者専用ポリシーの削除
-- =============================================================================

-- system_alerts の新ポリシー削除（既存の認証済みアクセスポリシーを維持）
DROP POLICY IF EXISTS "system_alerts_admin_only" ON system_alerts;

-- system_config_monitoring の新ポリシー削除（既存の認証済みアクセスポリシーを維持）
DROP POLICY IF EXISTS "system_config_monitoring_admin_only" ON system_config_monitoring;

-- system_health_logs の新ポリシー削除（既存の認証済みアクセスポリシーを維持）
DROP POLICY IF EXISTS "system_health_logs_admin_only" ON system_health_logs;

-- =============================================================================
-- 確認クエリ
-- =============================================================================

-- 残存ポリシー確認（認証済みアクセスポリシーのみ残るはず）
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('system_alerts', 'system_config_monitoring', 'system_health_logs')
ORDER BY tablename, policyname;

-- 期待される結果:
-- system_alerts: "Allow authenticated access to system_alerts", "Admin access for system_alerts v2"
-- system_config_monitoring: "Allow authenticated access to system_config_monitoring", "Admin access for system_config_monitoring v2"  
-- system_health_logs: "Allow authenticated access to system_health_logs", "Admin access for system_health_logs v2"