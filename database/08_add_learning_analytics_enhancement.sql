-- 学習分析システム強化のためのデータベース拡張
-- 作成日: 2025-10-21
-- 目的: daily_xp_records テーブル拡張 + バッチ処理管理テーブル新規作成

-- =====================================================
-- 1. daily_xp_records テーブル拡張
-- =====================================================

-- hourly_efficiency_data JSONB フィールド追加
ALTER TABLE daily_xp_records 
ADD COLUMN IF NOT EXISTS hourly_efficiency_data JSONB DEFAULT '{}'::jsonb;

-- hourly_efficiency_data 用のインデックス作成（効率的なクエリのため）
CREATE INDEX IF NOT EXISTS idx_daily_xp_records_hourly_efficiency 
ON daily_xp_records USING gin (hourly_efficiency_data);

-- hourly_efficiency_data の構造確認用コメント
COMMENT ON COLUMN daily_xp_records.hourly_efficiency_data IS 
'時間帯別効率データ（JSON構造）: {
  "timezone": "Asia/Tokyo",
  "hourly_stats": {
    "00": {"quiz_time": 0, "xp_earned": 0, "efficiency": 0, "session_count": 0},
    ...
    "23": {"quiz_time": 180, "xp_earned": 45, "efficiency": 0.25, "session_count": 3}
  },
  "peak_hours": [20, 21, 19],
  "total_thinking_time": 1250,
  "daily_session_count": 8,
  "last_updated_jst": "2025-10-21T20:45:00+09:00"
}';

-- 既存フィールドのコメント更新（使用目的明確化）
COMMENT ON COLUMN daily_xp_records.study_time_minutes IS 
'実際の思考時間（分）: quiz_answers.time_spent の日次集計';

COMMENT ON COLUMN daily_xp_records.peak_study_hour IS 
'最高効率学習時間（0-23）: hourly_efficiency_data から算出される最も効率的な時間帯';

COMMENT ON COLUMN daily_xp_records.learning_quality_score IS 
'学習品質総合スコア（0-100）: 継続性・正確性・効率性・多様性・深度の加重平均';

-- =====================================================
-- 2. 日次分析バッチ処理管理テーブル新規作成
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_analytics_batch_log (
  id BIGSERIAL PRIMARY KEY,
  process_date DATE NOT NULL,                    -- 処理対象日（JST）
  process_type VARCHAR(50) NOT NULL,             -- 処理タイプ（quality_score, peak_hour等）
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  processed_users INTEGER DEFAULT 0,
  error_message TEXT,
  force_reprocess BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 同日同種処理の重複防止
  UNIQUE(process_date, process_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_batch_log_process_date 
ON daily_analytics_batch_log(process_date);

CREATE INDEX IF NOT EXISTS idx_batch_log_status 
ON daily_analytics_batch_log(status);

CREATE INDEX IF NOT EXISTS idx_batch_log_process_type 
ON daily_analytics_batch_log(process_type);

CREATE INDEX IF NOT EXISTS idx_batch_log_created_at 
ON daily_analytics_batch_log(created_at);

-- テーブルコメント
COMMENT ON TABLE daily_analytics_batch_log IS 
'日次分析バッチ処理の実行履歴とステータス管理';

COMMENT ON COLUMN daily_analytics_batch_log.process_date IS 
'処理対象日（日本時間ベース）';

COMMENT ON COLUMN daily_analytics_batch_log.process_type IS 
'処理種別: quality_score（学習品質スコア算出）, peak_hour（ピーク時間算出）等';

COMMENT ON COLUMN daily_analytics_batch_log.status IS 
'処理状況: running（実行中）, completed（完了）, failed（失敗）';

COMMENT ON COLUMN daily_analytics_batch_log.processed_users IS 
'処理対象ユーザー数（成功したユーザー数）';

COMMENT ON COLUMN daily_analytics_batch_log.force_reprocess IS 
'強制再処理フラグ（既存データがある場合でも強制実行）';

-- =====================================================
-- 3. 既存データの初期化（安全な設定）
-- =====================================================

-- hourly_efficiency_data の初期値設定（既存レコードが空の場合のみ）
UPDATE daily_xp_records 
SET hourly_efficiency_data = '{
  "timezone": "Asia/Tokyo",
  "hourly_stats": {},
  "peak_hours": [],
  "total_thinking_time": 0,
  "daily_session_count": 0,
  "last_updated_jst": null
}'::jsonb
WHERE hourly_efficiency_data = '{}'::jsonb 
   OR hourly_efficiency_data IS NULL;

-- =====================================================
-- 4. 権限設定（必要に応じて）
-- =====================================================

-- アプリケーションユーザーに対する権限付与
-- （実際の権限設定は環境に応じて調整）

-- daily_analytics_batch_log テーブルへの基本的な権限
-- GRANT SELECT, INSERT, UPDATE ON daily_analytics_batch_log TO [application_user];
-- GRANT USAGE, SELECT ON SEQUENCE daily_analytics_batch_log_id_seq TO [application_user];

-- =====================================================
-- 5. 検証用クエリ（動作確認用）
-- =====================================================

-- マイグレーション完了確認
DO $$
BEGIN
  -- hourly_efficiency_data カラム存在確認
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_xp_records' 
    AND column_name = 'hourly_efficiency_data'
  ) THEN
    RAISE NOTICE '✅ hourly_efficiency_data カラム追加完了';
  ELSE
    RAISE EXCEPTION '❌ hourly_efficiency_data カラム追加失敗';
  END IF;

  -- daily_analytics_batch_log テーブル存在確認
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'daily_analytics_batch_log'
  ) THEN
    RAISE NOTICE '✅ daily_analytics_batch_log テーブル作成完了';
  ELSE
    RAISE EXCEPTION '❌ daily_analytics_batch_log テーブル作成失敗';
  END IF;

  RAISE NOTICE '🎉 学習分析システム強化マイグレーション完了';
END $$;

-- 各テーブルの状況確認
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  typname as data_type
FROM pg_stats ps
JOIN pg_type pt ON ps.schemaname = 'public'
WHERE tablename IN ('daily_xp_records', 'daily_analytics_batch_log')
  AND attname IN ('hourly_efficiency_data', 'study_time_minutes', 'peak_study_hour', 'learning_quality_score')
ORDER BY tablename, attname;

-- インデックス確認
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('daily_xp_records', 'daily_analytics_batch_log')
  AND schemaname = 'public'
ORDER BY tablename, indexname;