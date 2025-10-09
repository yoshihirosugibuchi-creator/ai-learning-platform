-- XP/SKPハードコード修正プロジェクト - システム監視テーブル作成
-- Supabase Dashboard SQL Editor で実行してください
-- RLSポリシー修正版（user_metadataエラー対応）

-- 1. システムアラートテーブル
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  user_id UUID REFERENCES auth.users(id),
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
  config_type VARCHAR(50) NOT NULL,
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
  check_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  metrics JSONB NOT NULL,
  thresholds JSONB,
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

-- 簡略化されたポリシー（一旦全ユーザーアクセス可能、後で制限予定）
CREATE POLICY "Allow authenticated access to system_alerts" ON system_alerts
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated access to system_config_monitoring" ON system_config_monitoring
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated access to system_health_logs" ON system_health_logs
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 初期データ投入
INSERT INTO system_alerts (alert_type, severity, title, message, context) VALUES
('system_initialization', 'medium', 'システム監視開始', 'XP/SKPハードコード修正プロジェクト - 監視システム初期化完了', 
 '{"project": "xp_skp_hardcode_elimination", "phase": "1", "component": "monitoring_infrastructure"}');

-- テーブル作成確認
SELECT 'system_alerts table created' as status;
SELECT 'system_config_monitoring table created' as status;
SELECT 'system_health_logs table created' as status;
SELECT COUNT(*) as initial_alerts FROM system_alerts;