-- システムアラート・監視テーブル作成
-- XP/SKP設定変更の監視とアラート管理用

-- 1. システムアラートテーブル
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL, -- 'xp_settings_error', 'fallback_activated', 'data_inconsistency'
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  context JSONB, -- 詳細情報・エラーデータ
  user_id UUID REFERENCES auth.users(id), -- 関連ユーザー（あれば）
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. システム設定監視テーブル
CREATE TABLE IF NOT EXISTS system_config_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type VARCHAR(50) NOT NULL, -- 'xp_settings', 'skp_settings', 'level_thresholds'
  setting_key VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  validated BOOLEAN DEFAULT FALSE,
  validation_errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. システムヘルスチェックログ
CREATE TABLE IF NOT EXISTS system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type VARCHAR(50) NOT NULL, -- 'xp_calculation', 'database_integrity', 'api_performance'
  status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'critical'
  metrics JSONB NOT NULL, -- 実際の測定値
  thresholds JSONB, -- 閾値設定
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_system_alerts_type_severity ON system_alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_config_monitoring_type_key ON system_config_monitoring(config_type, setting_key);
CREATE INDEX IF NOT EXISTS idx_config_monitoring_created_at ON system_config_monitoring(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_logs_type_status ON system_health_logs(check_type, status);
CREATE INDEX IF NOT EXISTS idx_health_logs_created_at ON system_health_logs(created_at DESC);

-- RLS設定
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Admin access for system_alerts" ON system_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' IN ('admin', 'system_admin')
    )
  );

CREATE POLICY "Admin access for system_config_monitoring" ON system_config_monitoring
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' IN ('admin', 'system_admin')
    )
  );

CREATE POLICY "Admin access for system_health_logs" ON system_health_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' IN ('admin', 'system_admin')
    )
  );

-- 初期アラート設定データ
INSERT INTO system_alerts (alert_type, severity, title, message, context) VALUES
('system_initialization', 'medium', 'システム監視開始', 'XP/SKPハードコード修正プロジェクト - 監視システム初期化完了', 
 '{"project": "xp_skp_hardcode_elimination", "phase": "1", "component": "monitoring_infrastructure"}');

-- コメント追加
COMMENT ON TABLE system_alerts IS 'システムアラート・通知管理テーブル';
COMMENT ON TABLE system_config_monitoring IS 'システム設定変更履歴・監視テーブル';
COMMENT ON TABLE system_health_logs IS 'システムヘルスチェック・パフォーマンス監視テーブル';