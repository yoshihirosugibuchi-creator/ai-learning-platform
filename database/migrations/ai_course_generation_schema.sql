-- =================================================================
-- AI生成コースシステム - データベーススキーマ
-- 作成日: 2025年11月28日
-- =================================================================

-- AI生成ワークフロー管理テーブル
CREATE TABLE ai_course_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  
  -- 基本情報
  title varchar(255) NOT NULL,
  description text,
  
  -- ワークフローステータス
  status text NOT NULL CHECK (status IN (
    'draft',                    -- 下書き作成中
    'source_analysis',          -- 参考資料解析中
    'outline_draft',            -- アウトライン生成中  
    'manual_input_required',    -- 手動AI入力待ち
    'outline_approved',         -- アウトライン承認済み
    'content_draft',            -- コンテンツ生成中
    'content_approved',         -- コンテンツ承認済み
    'published'                 -- 公開済み
  )) DEFAULT 'draft',
  
  -- 参考資料情報
  source_materials jsonb DEFAULT '[]'::jsonb,
  
  -- AI生成データ
  outline_data jsonb,
  content_data jsonb,
  category_mappings jsonb DEFAULT '[]'::jsonb,
  
  -- 現在の手動入力情報（手動モード用）
  current_prompt text,
  current_step text,
  prompt_id uuid,
  
  -- レビュー情報
  outline_review_notes text,
  content_review_notes text,
  
  -- AI生成設定
  generation_preferences jsonb DEFAULT '{
    "depth": "standard",
    "style": "practical", 
    "include_quizzes": true,
    "sections_count": null,
    "ai_mode": "manual"
  }'::jsonb,
  
  -- 生成されたコースID（公開後）
  published_course_id uuid,
  
  -- タイムスタンプ
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_ai_course_workflows_user_id ON ai_course_workflows(user_id);
CREATE INDEX idx_ai_course_workflows_status ON ai_course_workflows(status);
CREATE INDEX idx_ai_course_workflows_created_at ON ai_course_workflows(created_at DESC);

-- RLS (Row Level Security) 設定
ALTER TABLE ai_course_workflows ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のワークフローのみアクセス可能
CREATE POLICY "Users can only access their own workflows" 
  ON ai_course_workflows FOR ALL 
  USING (auth.uid() = user_id);

-- システム管理者は全てアクセス可能
CREATE POLICY "Admins can access all workflows" 
  ON ai_course_workflows FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'system_admin'
    )
  );

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_ai_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_workflow_timestamp
  BEFORE UPDATE ON ai_course_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_workflow_updated_at();

-- =================================================================
-- 手動AI入力履歴テーブル（デバッグ・監査用）
-- =================================================================

CREATE TABLE ai_manual_input_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES ai_course_workflows(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  
  -- プロンプト情報
  step_name text NOT NULL,
  prompt_text text NOT NULL,
  prompt_id uuid NOT NULL,
  
  -- 入力結果
  ai_result text NOT NULL,
  parsed_result jsonb,
  validation_success boolean DEFAULT false,
  validation_errors text[],
  
  -- メタデータ
  input_method text DEFAULT 'manual', -- 'manual' | 'api'
  processing_time_ms integer,
  
  created_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX idx_ai_manual_history_workflow ON ai_manual_input_history(workflow_id);
CREATE INDEX idx_ai_manual_history_user ON ai_manual_input_history(user_id);

-- RLS設定
ALTER TABLE ai_manual_input_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own input history" 
  ON ai_manual_input_history FOR ALL 
  USING (auth.uid() = user_id);

-- =================================================================
-- 便利な関数定義
-- =================================================================

-- ワークフロー統計取得関数
CREATE OR REPLACE FUNCTION get_user_workflow_stats(target_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'in_progress', COUNT(*) FILTER (WHERE status IN ('source_analysis', 'outline_draft', 'content_draft')),
    'manual_pending', COUNT(*) FILTER (WHERE status = 'manual_input_required'),
    'published', COUNT(*) FILTER (WHERE status = 'published'),
    'last_activity', MAX(updated_at)
  ) INTO stats
  FROM ai_course_workflows 
  WHERE user_id = target_user_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ワークフローステータス更新関数
CREATE OR REPLACE FUNCTION update_workflow_status(
  workflow_id uuid,
  new_status text,
  additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean AS $$
BEGIN
  UPDATE ai_course_workflows 
  SET 
    status = new_status,
    updated_at = now(),
    outline_data = CASE 
      WHEN additional_data ? 'outline_data' 
      THEN additional_data->>'outline_data'::jsonb 
      ELSE outline_data 
    END,
    content_data = CASE 
      WHEN additional_data ? 'content_data' 
      THEN additional_data->>'content_data'::jsonb 
      ELSE content_data 
    END
  WHERE id = workflow_id 
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- テーブル情報・統計ビュー
-- =================================================================

-- ワークフロー概要ビュー
CREATE VIEW ai_workflow_overview AS
SELECT 
  w.id,
  w.user_id,
  u.email as user_email,
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
FROM ai_course_workflows w
LEFT JOIN auth.users u ON w.user_id = u.id;

-- 統計ビュー（システム管理者用）
CREATE VIEW ai_system_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  status,
  COUNT(*) as workflow_count,
  COUNT(DISTINCT user_id) as unique_users
FROM ai_course_workflows 
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY date DESC;

-- =================================================================
-- 初期データ挿入（テスト用）
-- =================================================================

-- システム設定（将来の拡張用）
CREATE TABLE ai_system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO ai_system_config (key, value, description) VALUES 
('ai_generation_limits', '{"max_workflows_per_user": 10, "max_source_files_mb": 50}', 'AI生成機能の制限設定'),
('default_preferences', '{"depth": "standard", "style": "practical", "include_quizzes": true, "ai_mode": "manual"}', 'デフォルト生成設定'),
('prompt_templates', '{}', 'プロンプトテンプレート管理');

-- =================================================================
-- テストデータ（開発環境のみ）
-- =================================================================

-- 開発環境でのテスト用ワークフロー作成関数
CREATE OR REPLACE FUNCTION create_test_workflow(test_user_id uuid)
RETURNS uuid AS $$
DECLARE
  workflow_id uuid;
BEGIN
  INSERT INTO ai_course_workflows (
    user_id,
    title,
    description,
    status,
    source_materials,
    generation_preferences
  ) VALUES (
    test_user_id,
    'テスト用ワークフロー',
    'AI生成コース機能のテスト用サンプルワークフロー',
    'draft',
    '[{"type": "text", "content": "これはテスト用のサンプル資料です。", "priority": 1}]'::jsonb,
    '{"depth": "standard", "style": "practical", "include_quizzes": true, "ai_mode": "manual"}'::jsonb
  ) RETURNING id INTO workflow_id;
  
  RETURN workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- 完了
-- =================================================================

COMMENT ON TABLE ai_course_workflows IS 'AI生成コースのワークフロー管理テーブル';
COMMENT ON TABLE ai_manual_input_history IS '手動AI入力の履歴・監査ログ';
COMMENT ON VIEW ai_workflow_overview IS 'ワークフロー一覧表示用ビュー';
COMMENT ON VIEW ai_system_stats IS 'システム統計・分析用ビュー';

-- 権限確認
SELECT 
  'AI Course Generation Schema Created Successfully' as status,
  'Tables: ai_course_workflows, ai_manual_input_history' as tables_created,
  'Views: ai_workflow_overview, ai_system_stats' as views_created,
  'Functions: get_user_workflow_stats, update_workflow_status, create_test_workflow' as functions_created;