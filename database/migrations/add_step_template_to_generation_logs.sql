-- ============================================================
-- case_study_generation_logs に step_template カラム追加
-- generate/page.tsx がドラフト保存時に step_template を保存するため必要
-- ============================================================

ALTER TABLE case_study_generation_logs ADD COLUMN IF NOT EXISTS
  step_template VARCHAR(50) DEFAULT 'consulting';

COMMENT ON COLUMN case_study_generation_logs.step_template IS 'ステップテンプレート: consulting, code_review, incident_response, review_correction, prompt_design';
