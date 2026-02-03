-- ケーススタディ用オプションマスタテーブル
-- 職種、フェーズ、シナリオタイプ、情報明確さレベルを一元管理

CREATE TABLE IF NOT EXISTS case_study_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- オプション種別
  option_type VARCHAR(50) NOT NULL,
  -- 'job_role'        : 職種
  -- 'business_phase'  : フェーズ
  -- 'scenario_type'   : シナリオタイプ
  -- 'info_clarity'    : 情報明確さレベル

  -- 識別子・表示名
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,

  -- 表示制御
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(option_type, code)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cso_type_active ON case_study_options(option_type, is_active);
CREATE INDEX IF NOT EXISTS idx_cso_type_order ON case_study_options(option_type, display_order);

-- コメント
COMMENT ON TABLE case_study_options IS 'ケーススタディ問題生成用のオプションマスタ';
COMMENT ON COLUMN case_study_options.option_type IS 'オプション種別: job_role, business_phase, scenario_type, info_clarity';
COMMENT ON COLUMN case_study_options.code IS 'システム内部で使用する識別子';
COMMENT ON COLUMN case_study_options.name IS '日本語表示名';
COMMENT ON COLUMN case_study_options.name_en IS '英語表示名（AIプロンプト用）';

-- 職種 (job_role)
INSERT INTO case_study_options (option_type, code, name, name_en, description, display_order) VALUES
('job_role', 'management', '経営企画', 'Corporate Planning', '経営戦略の策定、中長期計画の立案', 1),
('job_role', 'sales', '営業', 'Sales', '顧客開拓、商談、契約締結', 2),
('job_role', 'marketing', 'マーケティング', 'Marketing', '市場調査、プロモーション、ブランディング', 3),
('job_role', 'hr', '人事', 'Human Resources', '採用、育成、評価、組織開発', 4),
('job_role', 'engineering', '技術・開発', 'Engineering', '製品開発、技術革新、品質管理', 5),
('job_role', 'operations', '業務・オペレーション', 'Operations', '業務プロセス改善、生産管理', 6),
('job_role', 'finance', '財務・経理', 'Finance', '予算管理、財務分析、資金調達', 7),
('job_role', 'consulting', 'コンサルティング', 'Consulting', '経営課題の分析と解決支援', 8),
('job_role', 'other', 'その他', 'Other', 'その他の職種', 99)
ON CONFLICT (option_type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- フェーズ (business_phase)
INSERT INTO case_study_options (option_type, code, name, name_en, description, display_order) VALUES
('business_phase', 'startup', '新規参入・立ち上げ', 'Startup', '市場参入、事業立ち上げ、初期投資フェーズ', 1),
('business_phase', 'growth', '成長期', 'Growth Stage', '売上拡大、市場シェア獲得、組織拡大フェーズ', 2),
('business_phase', 'mature', '成熟期', 'Mature Stage', '安定成長、効率化、収益最大化フェーズ', 3),
('business_phase', 'turnaround', '再生・転換期', 'Turnaround', '事業再構築、コスト削減、新規事業開拓フェーズ', 4)
ON CONFLICT (option_type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- シナリオタイプ (scenario_type)
INSERT INTO case_study_options (option_type, code, name, name_en, description, display_order) VALUES
('scenario_type', 'problem_solving', '問題解決', 'Problem Solving', '現状の課題を分析し、根本原因を特定して解決策を導出する', 1),
('scenario_type', 'decision_making', '意思決定', 'Decision Making', '複数の選択肢を評価し、最適な判断を下す', 2),
('scenario_type', 'strategy', '戦略立案', 'Strategy Planning', '中長期的な方針・計画を策定し、実行計画を立てる', 3)
ON CONFLICT (option_type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- 情報明確さレベル (info_clarity)
INSERT INTO case_study_options (option_type, code, name, name_en, description, display_order) VALUES
('info_clarity', 'level1', 'Level 1: 明確', 'Clear', '情報が整理済み、選択肢が明確、正解が比較的分かりやすい', 1),
('info_clarity', 'level2', 'Level 2: 曖昧', 'Ambiguous', '一部情報不足、曖昧な選択肢あり、複数の解釈が可能', 2),
('info_clarity', 'level3', 'Level 3: 複雑', 'Complex', '情報過多、ノイズあり、トレードオフ判断が必要、政治的要因も含む', 3)
ON CONFLICT (option_type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =====================================================
-- ステップフレームワーク用の拡張カラム追加
-- =====================================================

-- ステップフレームワーク用の追加カラム
ALTER TABLE case_study_options ADD COLUMN IF NOT EXISTS
  target_skills TEXT[];  -- このステップの主要評価軸

ALTER TABLE case_study_options ADD COLUMN IF NOT EXISTS
  is_extended BOOLEAN DEFAULT FALSE;  -- 拡張ステップかどうか

COMMENT ON COLUMN case_study_options.target_skills IS 'ステップフレームワーク用: 主要評価軸の配列';
COMMENT ON COLUMN case_study_options.is_extended IS 'ステップフレームワーク用: 拡張ステップ（6-8）かどうか';

-- ステップフレームワーク (step_framework) - 標準5ステップ
INSERT INTO case_study_options (option_type, code, name, name_en, description, target_skills, is_extended, display_order) VALUES
('step_framework', 'step_1', '状況把握', 'Situation Analysis', '与えられた情報から重要なポイントを抽出する', ARRAY['problem_setting', 'structuring_logic'], FALSE, 1),
('step_framework', 'step_2', '課題定義', 'Problem Definition', '本質的な課題を特定し、解くべき問いを設定する', ARRAY['problem_setting', 'perspective_diversity'], FALSE, 2),
('step_framework', 'step_3', '仮説立案', 'Hypothesis Building', '課題解決に向けた仮説を構築する', ARRAY['hypothesis_thinking', 'originality'], FALSE, 3),
('step_framework', 'step_4', '分析プラン', 'Analysis Planning', '仮説検証のための分析アプローチを設計する', ARRAY['analysis_design', 'feasibility'], FALSE, 4),
('step_framework', 'step_5', '提言策定', 'Recommendation', '具体的な施策と実行計画を提案する', ARRAY['proposal_specificity', 'impact', 'expression'], FALSE, 5)
ON CONFLICT (option_type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  target_skills = EXCLUDED.target_skills,
  is_extended = EXCLUDED.is_extended,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ステップフレームワーク (step_framework) - 拡張ステップ（6-8）
INSERT INTO case_study_options (option_type, code, name, name_en, description, target_skills, is_extended, display_order) VALUES
('step_framework', 'step_6', 'リスク評価', 'Risk Assessment', '施策実行時のリスクと対策を検討する', ARRAY['feasibility', 'perspective_diversity'], TRUE, 6),
('step_framework', 'step_7', '実行計画詳細', 'Detailed Execution Plan', 'タイムライン、マイルストーン、KPIを設定する', ARRAY['proposal_specificity', 'feasibility'], TRUE, 7),
('step_framework', 'step_8', 'モニタリング設計', 'Monitoring Design', '効果測定と改善サイクルの仕組みを設計する', ARRAY['analysis_design', 'impact'], TRUE, 8)
ON CONFLICT (option_type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  target_skills = EXCLUDED.target_skills,
  is_extended = EXCLUDED.is_extended,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
