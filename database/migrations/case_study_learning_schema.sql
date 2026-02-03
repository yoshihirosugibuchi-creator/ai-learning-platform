-- ケーススタディ学習機能 マイグレーション
-- Version: 1.0
-- Date: 2026-01-27
-- Based on: case-study-learning-specification-v2.md

-- ============================================================
-- SECTION 1: 新規テーブル作成
-- ============================================================

-- 1.1 case_study_problems（問題マスタ）
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
    CHECK (step_count >= 3 AND step_count <= 8),

  -- XP設定（上書き用）
  custom_base_xp_per_step INTEGER,      -- NULL=設定テーブルの値を使用

  -- AI生成情報
  is_ai_generated BOOLEAN DEFAULT FALSE,
  generation_prompt TEXT,
  generation_model VARCHAR(50),
  generation_parameters JSONB,

  -- 今日のおすすめ設定
  featured_date DATE,                   -- この日に「今日のおすすめ」として表示

  -- ステータス管理
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'active', 'archived')),

  -- 監査情報
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_csp_status ON case_study_problems(status);
CREATE INDEX IF NOT EXISTS idx_csp_category ON case_study_problems(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_csp_difficulty ON case_study_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_csp_featured ON case_study_problems(featured_date);
CREATE INDEX IF NOT EXISTS idx_csp_created_at ON case_study_problems(created_at);

-- 1.2 case_study_steps（ステップ定義）
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
  -- 構造: [{"id": "A", "text": "選択肢A", "is_correct": true, "partial_score": 5}, ...]
  options JSONB,

  -- 模範解答・採点基準
  -- 構造: {"ideal_choices": ["A", "C"], "essential_points": [...], "scoring_anchors": {...}}
  model_answer JSONB NOT NULL,

  -- ヒント（問題作成時にAI生成、ステップ単位で1つのみ）
  hint TEXT,

  -- 評価対象スキル軸（10軸から該当するものを指定）
  -- 構造: ["problem_setting", "structuring_logic", ...]
  target_skills JSONB NOT NULL,

  -- 配点（変更可能）
  max_score INTEGER DEFAULT 10,

  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(problem_id, step_number)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_css_problem ON case_study_steps(problem_id);
CREATE INDEX IF NOT EXISTS idx_css_category ON case_study_steps(category_id);

-- 1.3 case_study_sessions（学習セッション）
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
  -- 構造: {"step_scores": [...], "skill_scores": {...}, "overall_feedback": "..."}
  scoring_result JSONB,

  total_score INTEGER,                  -- 合計スコア
  max_possible_score INTEGER,           -- 満点（各ステップのmax_scoreの合計）
  score_percentage NUMERIC(5,2),        -- スコア率（%）

  -- XP/SKP獲得結果
  xp_earned INTEGER DEFAULT 0,
  skp_earned INTEGER DEFAULT 0,
  bonus_details JSONB,                  -- {"high_score": 30, "no_hint": 20, "quick": 15}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_csess_user ON case_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_csess_problem ON case_study_sessions(problem_id);
CREATE INDEX IF NOT EXISTS idx_csess_status ON case_study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_csess_user_problem ON case_study_sessions(user_id, problem_id);

-- 1.4 case_study_step_details（回答詳細）
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
  -- 構造: {"score": 8, "max_score": 10, "skill_scores": {...}, "feedback": "..."}
  step_scoring JSONB,

  -- 時間詳細
  step_started_at TIMESTAMPTZ,
  step_answered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cssd_session ON case_study_step_details(session_id);
CREATE INDEX IF NOT EXISTS idx_cssd_step ON case_study_step_details(step_id);
CREATE INDEX IF NOT EXISTS idx_cssd_quiz_answer ON case_study_step_details(quiz_answer_id);

-- 1.5 case_study_thinking_logs（思考プロセスログ）
CREATE TABLE IF NOT EXISTS case_study_thinking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES case_study_sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,

  -- 行動ログ
  -- action_type: 'choice_selected', 'choice_changed', 'reasoning_typed',
  --              'reasoning_edited', 'hint_requested', 'step_submitted'
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB,

  -- タイムスタンプ
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  time_since_step_start_ms INTEGER,

  -- その時点での状態
  choices_at_action JSONB,
  reasoning_length_at_action INTEGER
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cstl_session ON case_study_thinking_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_cstl_session_step ON case_study_thinking_logs(session_id, step_number);

-- 1.6 case_study_rubric_axes（ルーブリック軸定義）
CREATE TABLE IF NOT EXISTS case_study_rubric_axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 軸識別
  axis_code VARCHAR(50) NOT NULL UNIQUE,  -- 'problem_setting', 'structuring_logic', etc.
  axis_name VARCHAR(100) NOT NULL,        -- '問題設定力', 'ロジック構造化', etc.

  -- グループ分類
  rubric_group_code VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
  rubric_group_name VARCHAR(50) NOT NULL, -- '思考基盤', '価値創造', etc.

  -- 定義・説明
  definition TEXT NOT NULL,               -- 軸の定義（AIプロンプトに使用）
  evaluation_points TEXT[],               -- 評価ポイント（配列）

  -- 1-5スコアアンカー
  score_anchors JSONB NOT NULL,
  /*
    {
      "1": "○○ができていない",
      "2": "○○が不十分",
      "3": "○○が概ねできている",
      "4": "○○が十分にできている",
      "5": "○○が卓越している"
    }
  */

  -- 表示順
  display_order INTEGER NOT NULL,

  -- ステータス
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_csra_group ON case_study_rubric_axes(rubric_group_code);
CREATE INDEX IF NOT EXISTS idx_csra_active ON case_study_rubric_axes(is_active);

-- 1.7 case_study_course_links（コース連動）
CREATE TABLE IF NOT EXISTS case_study_course_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES case_study_problems(id) ON DELETE CASCADE,
  course_id VARCHAR(100) NOT NULL,      -- learning_sessions.id
  display_after_session INTEGER,        -- 何セッション目以降に表示するか（NULL=コース完了後）
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(problem_id, course_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cscl_course ON case_study_course_links(course_id);
CREATE INDEX IF NOT EXISTS idx_cscl_problem ON case_study_course_links(problem_id);

-- ============================================================
-- SECTION 2: 既存テーブルへのカラム追加
-- ============================================================

-- 2.1 daily_xp_records にケーススタディ用カラム追加
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_sessions INTEGER DEFAULT 0;
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_xp_earned INTEGER DEFAULT 0;
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_time_seconds INTEGER DEFAULT 0;

-- 2.2 user_xp_stats_v2 にケーススタディ用カラム追加
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_xp INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_skp INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_sessions_completed INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_average_score NUMERIC(5,2) DEFAULT 0;

-- ============================================================
-- SECTION 3: FK制約の調整
-- ============================================================

-- quiz_answers から quiz_session_id の FK制約を削除（存在する場合）
-- ケーススタディではセッションIDにcase_study_sessions.idを格納するため
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quiz_answers_quiz_session_id_fkey'
    AND table_name = 'quiz_answers'
  ) THEN
    ALTER TABLE quiz_answers DROP CONSTRAINT quiz_answers_quiz_session_id_fkey;
  END IF;
END $$;

-- ============================================================
-- SECTION 4: XP/SKP設定データの追加
-- ============================================================

-- ケーススタディ用XP設定
INSERT INTO xp_level_skp_settings (setting_category, setting_key, setting_value, description)
VALUES
  ('xp_case_study_step', 'basic', 10, 'ケーススタディ1ステップあたりXP（基礎）'),
  ('xp_case_study_step', 'intermediate', 20, 'ケーススタディ1ステップあたりXP（中級）'),
  ('xp_case_study_step', 'advanced', 30, 'ケーススタディ1ステップあたりXP（上級）'),
  ('xp_case_study_step', 'expert', 40, 'ケーススタディ1ステップあたりXP（エキスパート）'),
  ('xp_bonus', 'case_study_high_score', 30, 'ケーススタディ高スコア（80%以上）ボーナスXP'),
  ('xp_bonus', 'case_study_no_hint', 20, 'ケーススタディヒント未使用ボーナスXP'),
  ('xp_bonus', 'case_study_quick', 15, 'ケーススタディ20分以内完了ボーナスXP'),
  ('skp', 'case_study_base', 50, 'ケーススタディ基本SKP'),
  ('skp', 'case_study_high_score_bonus', 30, 'ケーススタディ高スコアSKPボーナス')
ON CONFLICT (setting_category, setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- ============================================================
-- SECTION 5: 初期ルーブリック軸データ
-- ============================================================

INSERT INTO case_study_rubric_axes (
  axis_code, axis_name, rubric_group_code, rubric_group_name,
  definition, evaluation_points, score_anchors, display_order
) VALUES
  -- グループA: 思考基盤
  (
    'problem_setting', '問題設定力', 'A', '思考基盤',
    '事象や課題の本質を見抜き、解くべき問いを適切に設定する力',
    ARRAY['表層的な現象と本質的な課題の区別', '因果関係の正確な把握', '優先順位の妥当性'],
    '{"1": "課題の認識が曖昧または的外れ", "2": "表層的な現象のみに着目し、本質を捉えていない", "3": "課題を認識しているが、本質への掘り下げが不足", "4": "本質的課題を概ね特定し、適切な問いを設定している", "5": "本質的課題を正確に特定し、独自の視点で問題を再定義している"}'::jsonb,
    1
  ),
  (
    'structuring_logic', 'ロジック構造化', 'A', '思考基盤',
    '情報や論点を整理し、論理的に構造化・展開する力',
    ARRAY['MECE（漏れなくダブりなく）の徹底', '論理の一貫性', '構造の明確さ'],
    '{"1": "構造化されておらず、論理が追えない", "2": "論理の飛躍や矛盾が目立つ", "3": "構造化を試みているが、一部に漏れや重複がある", "4": "論理的な構造化ができており、展開に一貫性がある", "5": "MECEかつ一貫した論理展開で、複雑な事象を明快に構造化"}'::jsonb,
    2
  ),
  -- グループB: 価値創造
  (
    'hypothesis_thinking', '仮説思考', 'B', '価値創造',
    '限られた情報から仮説を立て、検証・修正していく力',
    ARRAY['仮説の蓋然性', '検証可能性の考慮', '代替仮説の検討'],
    '{"1": "仮説を立てられていない、または非現実的", "2": "仮説が単純すぎる、または根拠が薄い", "3": "仮説を立てているが、根拠や検証方法が不明確", "4": "妥当な仮説を立て、検証アプローチを示している", "5": "蓋然性の高い仮説を複数立て、優先順位と検証方法を明示"}'::jsonb,
    3
  ),
  (
    'proposal_specificity', '提案具体性', 'B', '価値創造',
    '実行可能で具体的な提案・施策を策定する力',
    ARRAY['施策の具体性', '実行ステップの明確さ', 'リソース・期限の考慮'],
    '{"1": "提案が抽象的で実行イメージが湧かない", "2": "提案はあるが具体性に欠ける", "3": "概ね具体的だが、一部詳細が不明確", "4": "具体的で実行可能な提案ができている", "5": "詳細な実行計画とKPIまで含む具体的提案"}'::jsonb,
    4
  ),
  -- グループC: 分析・検証
  (
    'analysis_design', '分析設計', 'C', '分析・検証',
    '適切な分析フレームワークを選択し、データに基づく洞察を導く力',
    ARRAY['分析手法の適切さ', 'データの活用度', '洞察の深さ'],
    '{"1": "分析が行われていない、または的外れ", "2": "分析が表面的で洞察に乏しい", "3": "分析を試みているが、手法や深さが不十分", "4": "適切な分析により有意義な洞察を導いている", "5": "複数の分析手法を駆使し、深い洞察と示唆を提示"}'::jsonb,
    5
  ),
  (
    'feasibility', '実現可能性', 'C', '分析・検証',
    '提案の実現可能性を多角的に検証する力',
    ARRAY['制約条件の考慮', 'リスク評価', '実行障壁の特定'],
    '{"1": "実現可能性の検討がない", "2": "実現可能性への言及はあるが検証が甘い", "3": "主要な制約は考慮しているが、一部見落としがある", "4": "制約条件とリスクを適切に評価している", "5": "多角的な検証と具体的な対応策を提示"}'::jsonb,
    6
  ),
  -- グループD: 実務適用
  (
    'perspective_diversity', '視点の多様性', 'D', '実務適用',
    '複数のステークホルダーの視点から問題を捉える力',
    ARRAY['ステークホルダーの網羅', '各視点からの考察', '利害調整の視点'],
    '{"1": "単一視点のみで検討", "2": "複数視点への言及はあるが考察が浅い", "3": "主要な視点は押さえているが、一部不足", "4": "多様な視点からバランスよく考察している", "5": "網羅的かつ深い多視点分析で利害調整まで考慮"}'::jsonb,
    7
  ),
  (
    'impact', 'インパクト', 'D', '実務適用',
    '提案の影響度・効果を定量的・定性的に評価する力',
    ARRAY['効果の定量化', '波及効果の考慮', '長期的影響の評価'],
    '{"1": "インパクトへの言及がない", "2": "インパクトの記述が曖昧", "3": "定性的なインパクトは述べているが定量化が不足", "4": "定量・定性両面からインパクトを評価している", "5": "短期・長期の波及効果まで含む包括的なインパクト評価"}'::jsonb,
    8
  ),
  -- グループE: コミュニケーション
  (
    'expression', '表現力', 'E', 'コミュニケーション',
    '考えを明確かつ説得力のある形で表現する力',
    ARRAY['文章の明確さ', '説得力のある構成', '専門用語の適切な使用'],
    '{"1": "表現が曖昧で理解困難", "2": "表現に難があり、意図が伝わりにくい", "3": "概ね理解できるが、一部不明確な箇所がある", "4": "明確で分かりやすい表現ができている", "5": "卓越した表現力で、複雑な内容も明快に伝達"}'::jsonb,
    9
  ),
  (
    'originality', '独自性', 'E', 'コミュニケーション',
    '既存の枠にとらわれない独自の視点や発想を提示する力',
    ARRAY['発想の新規性', '既存概念の再解釈', '創造的なアプローチ'],
    '{"1": "独自性が見られない", "2": "一般的なアプローチにとどまる", "3": "部分的に独自の視点が見られる", "4": "独自の視点や発想が含まれている", "5": "革新的で示唆に富む独自のアプローチ"}'::jsonb,
    10
  )
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ============================================================
-- SECTION 6: RLS ポリシー設定
-- ============================================================

-- case_study_problems: 公開問題は誰でも読める、作成・編集は管理者のみ
ALTER TABLE case_study_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active problems are viewable by everyone" ON case_study_problems
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage all problems" ON case_study_problems
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'system_admin')
  );

-- case_study_steps: 関連する問題が公開されていれば誰でも読める
ALTER TABLE case_study_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Steps of active problems are viewable" ON case_study_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM case_study_problems
      WHERE id = case_study_steps.problem_id AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage all steps" ON case_study_steps
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'system_admin')
  );

-- case_study_sessions: ユーザーは自分のセッションのみ
ALTER TABLE case_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON case_study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON case_study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON case_study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON case_study_sessions
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'system_admin')
  );

-- case_study_step_details: ユーザーは自分のセッションに関連するもののみ
ALTER TABLE case_study_step_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own step details" ON case_study_step_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM case_study_sessions
      WHERE id = case_study_step_details.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own step details" ON case_study_step_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_study_sessions
      WHERE id = case_study_step_details.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all step details" ON case_study_step_details
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'system_admin')
  );

-- case_study_thinking_logs: ユーザーは自分のセッションに関連するもののみ
ALTER TABLE case_study_thinking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own thinking logs" ON case_study_thinking_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM case_study_sessions
      WHERE id = case_study_thinking_logs.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own thinking logs" ON case_study_thinking_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_study_sessions
      WHERE id = case_study_thinking_logs.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all thinking logs" ON case_study_thinking_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'system_admin')
  );

-- case_study_rubric_axes: 誰でも読める、編集は管理者のみ
ALTER TABLE case_study_rubric_axes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rubric axes are viewable by everyone" ON case_study_rubric_axes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage rubric axes" ON case_study_rubric_axes
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'system_admin')
  );

-- case_study_course_links: 誰でも読める、編集は管理者のみ
ALTER TABLE case_study_course_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course links are viewable by everyone" ON case_study_course_links
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage course links" ON case_study_course_links
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'system_admin')
  );

-- ============================================================
-- SECTION 7: トリガー設定
-- ============================================================

-- updated_at 自動更新トリガー関数（既存の場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- case_study_problems の updated_at トリガー
DROP TRIGGER IF EXISTS update_case_study_problems_updated_at ON case_study_problems;
CREATE TRIGGER update_case_study_problems_updated_at
  BEFORE UPDATE ON case_study_problems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- case_study_sessions の updated_at トリガー
DROP TRIGGER IF EXISTS update_case_study_sessions_updated_at ON case_study_sessions;
CREATE TRIGGER update_case_study_sessions_updated_at
  BEFORE UPDATE ON case_study_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- case_study_rubric_axes の updated_at トリガー
DROP TRIGGER IF EXISTS update_case_study_rubric_axes_updated_at ON case_study_rubric_axes;
CREATE TRIGGER update_case_study_rubric_axes_updated_at
  BEFORE UPDATE ON case_study_rubric_axes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION 8: ビュー（分析用）
-- ============================================================

-- ケーススタディ問題の統計ビュー
CREATE OR REPLACE VIEW case_study_problem_stats AS
SELECT
  p.id,
  p.title,
  p.primary_category_id,
  p.difficulty,
  p.status,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT s.user_id) AS unique_users,
  COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END) AS completed_sessions,
  ROUND(
    COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT s.id), 0) * 100,
    2
  ) AS completion_rate,
  ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.score_percentage END), 2) AS avg_score,
  ROUND(AVG(CASE WHEN s.status = 'completed' THEN s.total_time_seconds END), 0) AS avg_time_seconds
FROM case_study_problems p
LEFT JOIN case_study_sessions s ON p.id = s.problem_id
GROUP BY p.id, p.title, p.primary_category_id, p.difficulty, p.status;

-- 完了
SELECT 'Case Study Learning schema migration completed successfully' AS result;
