-- ============================================================
-- AI採点プロバイダー設定
-- ============================================================

-- case_study_problems に採点AIプロバイダー個別設定カラムを追加
ALTER TABLE case_study_problems
ADD COLUMN IF NOT EXISTS scoring_ai_provider VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN case_study_problems.scoring_ai_provider IS 'この問題に使用する採点AIプロバイダー。NULLの場合はシステムデフォルトを使用';

-- ai_system_config にケーススタディ採点プロバイダーのデフォルト設定を追加
INSERT INTO ai_system_config (key, value, description, updated_at)
VALUES (
  'case_study_scoring_provider',
  '"huggingface"',
  'ケーススタディAI採点のデフォルトプロバイダー。huggingface / openai / anthropic / gemini',
  NOW()
)
ON CONFLICT (key) DO NOTHING;
