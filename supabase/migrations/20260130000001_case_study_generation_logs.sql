-- ケーススタディ生成ログテーブル
-- 生成パラメータ、プロンプト、AI応答を保存し、最終問題との紐付けも行う

CREATE TABLE IF NOT EXISTS case_study_generation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 生成パラメータ
  category_id VARCHAR(100),
  subcategory_id VARCHAR(100),
  difficulty VARCHAR(50),
  industry_id VARCHAR(100),
  job_role_code VARCHAR(50),
  business_phase_code VARCHAR(50),
  scenario_type_code VARCHAR(50),
  info_clarity_code VARCHAR(50),
  step_count INTEGER,
  question_type VARCHAR(50),  -- multiple_choice / descriptive / hybrid
  custom_prompt TEXT,
  ai_model VARCHAR(50),  -- claude / chatgpt / gemini

  -- 進捗状態 (1: パラメータ設定, 2: プロンプト生成, 3: AI応答貼付, 4: レビュー完了)
  current_step INTEGER DEFAULT 1,

  -- 生成内容
  generated_prompt TEXT,
  ai_response_text TEXT,
  parsed_data JSONB,

  -- メタ情報
  draft_title VARCHAR(500),  -- 自動生成タイトル（例：「IT業界×中級×問題解決」）
  status VARCHAR(50) DEFAULT 'draft',  -- draft / imported / abandoned

  -- 最終問題との紐付け
  problem_id UUID REFERENCES case_study_problems(id) ON DELETE SET NULL,

  -- 監査
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_case_study_generation_logs_status ON case_study_generation_logs(status);
CREATE INDEX idx_case_study_generation_logs_created_by ON case_study_generation_logs(created_by);
CREATE INDEX idx_case_study_generation_logs_problem_id ON case_study_generation_logs(problem_id);
CREATE INDEX idx_case_study_generation_logs_ai_model ON case_study_generation_logs(ai_model);
CREATE INDEX idx_case_study_generation_logs_created_at ON case_study_generation_logs(created_at DESC);

-- RLS
ALTER TABLE case_study_generation_logs ENABLE ROW LEVEL SECURITY;

-- 管理者は全件アクセス可能
CREATE POLICY "Admins can manage generation logs" ON case_study_generation_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- コメント
COMMENT ON TABLE case_study_generation_logs IS 'ケーススタディ問題のAI生成ログ。パラメータ、プロンプト、応答を保存し、効果分析に活用';
COMMENT ON COLUMN case_study_generation_logs.current_step IS '生成ウィザードの進捗 (1:パラメータ, 2:プロンプト, 3:AI応答, 4:レビュー)';
COMMENT ON COLUMN case_study_generation_logs.status IS 'draft=作業中, imported=問題として取込済, abandoned=破棄';
COMMENT ON COLUMN case_study_generation_logs.problem_id IS '取込後の問題ID（分析用紐付け）';
