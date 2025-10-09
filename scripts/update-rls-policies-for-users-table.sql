-- RLS政策をauth.usersからusersテーブルベースに更新
-- auth.users復元前に実行する安全対策

-- ステップ1: 既存のRLS政策を削除
DROP POLICY IF EXISTS "Admin access for system_alerts" ON system_alerts;
DROP POLICY IF EXISTS "Admin access for system_config_monitoring" ON system_config_monitoring;
DROP POLICY IF EXISTS "Admin access for system_health_logs" ON system_health_logs;

-- ステップ2: usersテーブルベースの新しいRLS政策を作成
CREATE POLICY "Admin access for system_alerts v2" ON system_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'system_admin')
    )
  );

CREATE POLICY "Admin access for system_config_monitoring v2" ON system_config_monitoring
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'system_admin')
    )
  );

CREATE POLICY "Admin access for system_health_logs v2" ON system_health_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- ステップ3: 政策変更のアラート記録
INSERT INTO system_alerts (
    alert_type, 
    severity, 
    title, 
    message, 
    context
) VALUES (
    'rls_policy_update',
    'medium',
    'RLS policies updated to use users table',
    'Updated system monitoring table RLS policies to reference users table instead of auth.users',
    jsonb_build_object(
        'action', 'update_rls_policies',
        'affected_tables', ARRAY['system_alerts', 'system_config_monitoring', 'system_health_logs'],
        'old_reference', 'auth.users.user_metadata.role',
        'new_reference', 'users.role',
        'timestamp', NOW()
    )
);

-- ステップ4: 確認クエリ
SELECT 
    schemaname,
    tablename,
    policyname,
    qual as policy_definition
FROM pg_policies 
WHERE tablename IN ('system_alerts', 'system_config_monitoring', 'system_health_logs')
ORDER BY tablename, policyname;