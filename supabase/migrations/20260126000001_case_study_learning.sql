-- ============================================================
-- ケーススタディ学習機能 マイグレーション
-- 作成日: 2026-01-26
-- 説明: ケーススタディ学習機能の新規テーブル作成、既存テーブル変更
-- ============================================================

-- ============================================================
-- 1. FK制約の削除（quiz_answers → quiz_sessions）
-- ============================================================
-- session_type カラムで論理的に区別するため、FK制約は不要
ALTER TABLE quiz_answers DROP CONSTRAINT IF EXISTS quiz_answers_quiz_session_id_fkey;

-- ============================================================
-- 2. 新規テーブル作成
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 case_study_problems（問題マスタ）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_study_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  title VARCHAR(200) NOT NULL,
  case_text TEXT NOT NULL,              -- ケース本文（Markdown形式）

  -- カテゴリー（検索・表示用。XP計上は各ステップで指定）
  primary_category_id VARCHAR(100) NOT NULL,
  primary_subcategory_id VARCHAR(100) NOT NULL,

  -- 難易度
  difficulty VARCHAR(20) NOT NULL DEFAULT 'intermediate'
    CHECK (difficulty IN ('basic', 'intermediate', 'advanced', 'expert')),

  -- メタデータ
  industry VARCHAR(100),                -- 業界
  scenario_type VARCHAR(50),            -- シナリオタイプ
  estimated_minutes INTEGER DEFAULT 30,
  step_count INTEGER NOT NULL DEFAULT 5
    CHECK (step_count >= 5 AND step_count <= 8),

  -- XP設定（上書き用）
  custom_base_xp_per_step INTEGER,      -- NULL=設定テーブルの値を使用

  -- AI生成情報
  is_ai_generated BOOLEAN DEFAULT FALSE,
  generation_prompt TEXT,
  generation_model VARCHAR(50),
  generation_parameters JSONB,

  -- ステータス管理
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'active', 'archived')),

  -- 監査情報
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_csp_category ON case_study_problems(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_csp_status ON case_study_problems(status);
CREATE INDEX IF NOT EXISTS idx_csp_difficulty ON case_study_problems(difficulty);

-- ------------------------------------------------------------
-- 2.2 case_study_steps（ステップ定義）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_study_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES case_study_problems(id) ON DELETE CASCADE,

  -- ステップ情報
  step_number INTEGER NOT NULL
    CHECK (step_number >= 1 AND step_number <= 8),
  step_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- このステップのカテゴリー（XP計上先）
  category_id VARCHAR(100) NOT NULL,
  subcategory_id VARCHAR(100) NOT NULL,

  -- 問題タイプ
  question_type VARCHAR(20) NOT NULL
    CHECK (question_type IN ('single', 'multiple', 'ordering', 'text', 'hybrid')),

  -- 選択肢（選択式・ハイブリッド式の場合）
  options JSONB,
  /*
    例:
    [
      {"id": "A", "text": "選択肢A", "is_correct": true, "partial_score": 1.0},
      {"id": "B", "text": "選択肢B", "is_correct": false, "partial_score": 0},
      {"id": "C", "text": "選択肢C", "is_correct": true, "partial_score": 0.5},
      {"id": "D", "text": "選択肢D", "is_correct": false, "partial_score": 0}
    ]
  */

  -- 模範解答・採点基準
  model_answer JSONB NOT NULL,
  /*
    例:
    {
      "ideal_choices": ["A", "C"],
      "acceptable_choices": ["A"],
      "essential_points": ["歩留まり", "原因特定", "データ分析"],
      "good_examples": ["優秀回答例1...", "優秀回答例2..."],
      "common_mistakes": ["よくある間違い1..."],
      "scoring_anchors": {
        "5": "すべての必須ポイントを網羅し、独自の視点も含む",
        "4": "必須ポイントを概ね網羅",
        "3": "必須ポイントの半数以上をカバー",
        "2": "一部のポイントのみ言及",
        "1": "ほとんど的外れ"
      }
    }
  */

  -- ヒント（ステップ単位で1つのみ）
  hint TEXT,

  -- 評価対象スキル軸（10軸から該当するものを指定）
  target_skills JSONB NOT NULL,
  -- 例: ["problem_setting", "structuring_logic"]

  -- 配点
  max_score INTEGER DEFAULT 10,

  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(problem_id, step_number)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_css_problem ON case_study_steps(problem_id);

-- ------------------------------------------------------------
-- 2.3 case_study_sessions（学習セッション）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  problem_id UUID NOT NULL REFERENCES case_study_problems(id),

  -- セッション状態
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_step INTEGER DEFAULT 1,

  -- 再学習フラグ
  is_retry BOOLEAN DEFAULT FALSE,

  -- 時間記録
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time_seconds INTEGER,

  -- ヒント使用（全ステップ合計）
  hint_count INTEGER DEFAULT 0,

  -- AI採点結果（完了時に格納）
  scoring_result JSONB,
  /*
    例:
    {
      "step_scores": [
        {"step": 1, "score": 8, "max": 10, "feedback": "..."},
        {"step": 2, "score": 7, "max": 10, "feedback": "..."}
      ],
      "skill_scores": {
        "problem_setting": 4,
        "structuring_logic": 3,
        "hypothesis_thinking": 4
      },
      "overall_feedback": "総合フィードバック..."
    }
  */

  total_score INTEGER,                  -- 合計スコア
  max_possible_score INTEGER,           -- 満点（step_count × 10）
  score_percentage NUMERIC(5,2),        -- スコア率（%）

  -- XP/SKP獲得結果
  xp_earned INTEGER DEFAULT 0,
  skp_earned INTEGER DEFAULT 0,
  bonus_details JSONB,
  -- 例: {"high_score": 30, "no_hint": 20}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_csess_user ON case_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_csess_problem ON case_study_sessions(problem_id);
CREATE INDEX IF NOT EXISTS idx_csess_status ON case_study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_csess_user_problem ON case_study_sessions(user_id, problem_id);

-- ------------------------------------------------------------
-- 2.4 case_study_step_details（回答詳細）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_study_step_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- quiz_answersとの1:1関連（アプリケーションレベルで管理）
  quiz_answer_id UUID NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES case_study_sessions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES case_study_steps(id),
  step_number INTEGER NOT NULL,

  -- 詳細回答データ
  selected_choices JSONB,               -- 複数選択: ["A", "C"]
  reasoning_text TEXT,                  -- 記述回答テキスト

  -- ステップ別AI採点結果
  step_scoring JSONB,
  /*
    例:
    {
      "score": 8,
      "max_score": 10,
      "skill_scores": {"problem_setting": 4, "structuring_logic": 4},
      "keyword_match": {"found": ["歩留まり", "原因"], "missing": ["データ"]},
      "feedback": "詳細フィードバック...",
      "improvement_points": ["改善点1", "改善点2"]
    }
  */

  -- 時間詳細
  step_started_at TIMESTAMPTZ,
  step_answered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cssd_session ON case_study_step_details(session_id);
CREATE INDEX IF NOT EXISTS idx_cssd_quiz_answer ON case_study_step_details(quiz_answer_id);

-- ------------------------------------------------------------
-- 2.5 case_study_thinking_logs（思考プロセスログ）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_study_thinking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES case_study_sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,

  -- 行動ログ
  action_type VARCHAR(50) NOT NULL,
  /*
    'choice_selected'   - 選択肢を選んだ
    'choice_changed'    - 選択肢を変更した
    'reasoning_typed'   - 記述を入力した
    'reasoning_edited'  - 記述を編集した
    'hint_requested'    - ヒントを表示した
    'step_submitted'    - ステップを提出した
  */

  action_data JSONB,
  /*
    choice_selected: {"choice": "A"}
    choice_changed: {"from": "A", "to": "B"}
    reasoning_typed: {"text_length": 150, "word_count": 25}
    hint_requested: {}
  */

  -- タイムスタンプ
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  time_since_step_start_ms INTEGER,     -- ミリ秒

  -- その時点での状態
  choices_at_action JSONB,              -- ["A", "C"]
  reasoning_length_at_action INTEGER
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cstl_session ON case_study_thinking_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_cstl_session_step ON case_study_thinking_logs(session_id, step_number);

-- ============================================================
-- 3. 既存テーブルへのカラム追加
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 daily_xp_records
-- ------------------------------------------------------------
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_sessions INTEGER DEFAULT 0;
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_xp_earned INTEGER DEFAULT 0;
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_time_seconds INTEGER DEFAULT 0;

-- ------------------------------------------------------------
-- 3.2 user_xp_stats_v2
-- ------------------------------------------------------------
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_xp INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_skp INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_sessions_completed INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_average_score NUMERIC(5,2) DEFAULT 0;

-- ============================================================
-- 4. xp_level_skp_settings への設定追加
-- ============================================================

-- ステップ単価XP設定
INSERT INTO xp_level_skp_settings (setting_category, setting_key, setting_value, setting_description)
VALUES
  ('xp_case_study_step', 'basic', 10, 'ケーススタディ基礎: 1ステップあたりXP'),
  ('xp_case_study_step', 'intermediate', 20, 'ケーススタディ中級: 1ステップあたりXP'),
  ('xp_case_study_step', 'advanced', 30, 'ケーススタディ上級: 1ステップあたりXP'),
  ('xp_case_study_step', 'expert', 40, 'ケーススタディエキスパート: 1ステップあたりXP')
ON CONFLICT (setting_category, setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      setting_description = EXCLUDED.setting_description;

-- ボーナスXP設定
INSERT INTO xp_level_skp_settings (setting_category, setting_key, setting_value, setting_description)
VALUES
  ('xp_bonus', 'case_study_high_score', 30, 'ケーススタディ高スコア（80%以上）ボーナスXP'),
  ('xp_bonus', 'case_study_no_hint', 20, 'ケーススタディヒント未使用ボーナスXP'),
  ('xp_bonus', 'case_study_quick', 15, 'ケーススタディ20分以内完了ボーナスXP')
ON CONFLICT (setting_category, setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      setting_description = EXCLUDED.setting_description;

-- SKP設定
INSERT INTO xp_level_skp_settings (setting_category, setting_key, setting_value, setting_description)
VALUES
  ('skp', 'case_study_base', 50, 'ケーススタディ基本SKP'),
  ('skp', 'case_study_high_score_bonus', 30, 'ケーススタディ高スコアSKPボーナス')
ON CONFLICT (setting_category, setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      setting_description = EXCLUDED.setting_description;

-- ============================================================
-- 5. RLSポリシー設定
-- ============================================================

-- case_study_problems: 誰でも閲覧可能（active）、作成・更新は管理者のみ
ALTER TABLE case_study_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_study_problems_select_active"
  ON case_study_problems FOR SELECT
  USING (status = 'active');

CREATE POLICY "case_study_problems_admin_all"
  ON case_study_problems FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- case_study_steps: 問題に紐づく（active問題のステップは閲覧可能）
ALTER TABLE case_study_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_study_steps_select"
  ON case_study_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM case_study_problems
      WHERE case_study_problems.id = case_study_steps.problem_id
      AND case_study_problems.status = 'active'
    )
  );

CREATE POLICY "case_study_steps_admin_all"
  ON case_study_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- case_study_sessions: 自分のセッションのみ
ALTER TABLE case_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_study_sessions_own"
  ON case_study_sessions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "case_study_sessions_admin_view"
  ON case_study_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- case_study_step_details: セッション所有者のみ
ALTER TABLE case_study_step_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_study_step_details_own"
  ON case_study_step_details FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM case_study_sessions
      WHERE case_study_sessions.id = case_study_step_details.session_id
      AND case_study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "case_study_step_details_admin_view"
  ON case_study_step_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- case_study_thinking_logs: セッション所有者のみ
ALTER TABLE case_study_thinking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_study_thinking_logs_own"
  ON case_study_thinking_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM case_study_sessions
      WHERE case_study_sessions.id = case_study_thinking_logs.session_id
      AND case_study_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "case_study_thinking_logs_admin_view"
  ON case_study_thinking_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- ============================================================
-- 6. 更新トリガー
-- ============================================================

-- case_study_problems の updated_at 自動更新
CREATE OR REPLACE FUNCTION update_case_study_problems_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_case_study_problems_updated_at
  BEFORE UPDATE ON case_study_problems
  FOR EACH ROW
  EXECUTE FUNCTION update_case_study_problems_updated_at();

-- case_study_sessions の updated_at 自動更新
CREATE OR REPLACE FUNCTION update_case_study_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_case_study_sessions_updated_at
  BEFORE UPDATE ON case_study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_case_study_sessions_updated_at();

-- ============================================================
-- マイグレーション完了
-- ============================================================
