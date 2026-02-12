-- ============================================================
-- ケーススタディ学習機能 v2追加マイグレーション
-- 作成日: 2026-01-27
-- 説明: v2仕様書で追加されたテーブル・カラム・データ
-- ============================================================

-- ============================================================
-- 1. case_study_problems への featured_date カラム追加
-- ============================================================
ALTER TABLE case_study_problems ADD COLUMN IF NOT EXISTS
  featured_date DATE;  -- この日に「今日のおすすめ」として表示

CREATE INDEX IF NOT EXISTS idx_csp_featured ON case_study_problems(featured_date);
CREATE INDEX IF NOT EXISTS idx_csp_created_at ON case_study_problems(created_at);

-- ============================================================
-- 2. case_study_rubric_axes テーブル作成（ルーブリック軸管理）
-- ============================================================
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

  -- 表示順
  display_order INTEGER NOT NULL,

  -- ステータス
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csra_group ON case_study_rubric_axes(rubric_group_code);
CREATE INDEX IF NOT EXISTS idx_csra_active ON case_study_rubric_axes(is_active);

-- ============================================================
-- 3. case_study_course_links テーブル作成（コース連動）
-- ============================================================
CREATE TABLE IF NOT EXISTS case_study_course_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES case_study_problems(id) ON DELETE CASCADE,
  course_id VARCHAR(100) NOT NULL,      -- learning_sessions.id
  display_after_session INTEGER,        -- 何セッション目以降に表示するか（NULL=コース完了後）
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(problem_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_cscl_course ON case_study_course_links(course_id);
CREATE INDEX IF NOT EXISTS idx_cscl_problem ON case_study_course_links(problem_id);

-- ============================================================
-- 4. ルーブリック軸の初期データ（10軸）
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
-- 5. RLSポリシー設定（新規テーブル用）
-- ============================================================

-- case_study_rubric_axes: 誰でも読める、編集は管理者のみ
ALTER TABLE case_study_rubric_axes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rubric_axes_select_active" ON case_study_rubric_axes;
CREATE POLICY "rubric_axes_select_active" ON case_study_rubric_axes
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "rubric_axes_admin_all" ON case_study_rubric_axes;
CREATE POLICY "rubric_axes_admin_all" ON case_study_rubric_axes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- case_study_course_links: 誰でも読める、編集は管理者のみ
ALTER TABLE case_study_course_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_links_select_all" ON case_study_course_links;
CREATE POLICY "course_links_select_all" ON case_study_course_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "course_links_admin_all" ON case_study_course_links;
CREATE POLICY "course_links_admin_all" ON case_study_course_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- ============================================================
-- 6. case_study_rubric_axes の updated_at トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_case_study_rubric_axes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_case_study_rubric_axes_updated_at ON case_study_rubric_axes;
CREATE TRIGGER trigger_update_case_study_rubric_axes_updated_at
  BEFORE UPDATE ON case_study_rubric_axes
  FOR EACH ROW
  EXECUTE FUNCTION update_case_study_rubric_axes_updated_at();

-- ============================================================
-- 7. 統計ビュー作成
-- ============================================================
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

-- ============================================================
-- マイグレーション完了
-- ============================================================
SELECT 'Case Study v2 additions migration completed successfully' AS result;
