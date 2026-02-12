-- ============================================================
-- ケーススタディ ステップ・評価テンプレート方式
-- Phase 2: 8軸追加 + step_template カラム + step_count制約緩和
-- ============================================================

-- A) 新設8軸を case_study_rubric_axes にINSERT
-- ON CONFLICT パターンで冪等性確保

-- グループF: 技術実務
INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'technical_accuracy',
  '技術的正確性',
  'F',
  '技術実務',
  'コード・設計・技術的判断の正しさを見極め、適切な技術的根拠に基づいて評価・指摘する力',
  ARRAY['コードの動作・構文の正確な理解', '設計パターン・ベストプラクティスとの整合性', '技術的根拠の明確さと妥当性'],
  '{"1": "技術的な理解が誤っており、指摘が的外れ", "2": "部分的に正しいが、重要な技術的誤解がある", "3": "基本的な技術理解はあるが、細部の正確性に課題", "4": "技術的に正確な理解と指摘ができている", "5": "深い技術的洞察に基づき、根本原因まで正確に特定"}'::jsonb,
  11,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'security_awareness',
  'セキュリティ考慮',
  'F',
  '技術実務',
  'セキュリティリスクを認識し、脆弱性の発見・対策の提案を適切に行う力',
  ARRAY['脆弱性パターン（OWASP Top 10等）の認識', 'リスクの深刻度と影響範囲の適切な評価', '実効性のある対策の提案'],
  '{"1": "セキュリティリスクへの認識がない", "2": "セキュリティへの言及はあるが、具体的な脆弱性を特定できていない", "3": "主要な脆弱性は認識しているが、対策の具体性が不足", "4": "脆弱性を適切に特定し、実効性のある対策を提案している", "5": "多層的なセキュリティ分析で潜在的リスクまで発見し、包括的な対策を提示"}'::jsonb,
  12,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'test_coverage',
  'テスト網羅性',
  'F',
  '技術実務',
  'テストケースの網羅性を設計し、境界値・異常系・回帰テストを含む包括的なテスト戦略を構築する力',
  ARRAY['正常系・異常系・境界値の網羅的なカバレッジ', 'テスト観点（機能/非機能/セキュリティ）の多面性', 'テストケース間の独立性と再現可能性'],
  '{"1": "テストケースが著しく不足し、主要な動作パスすらカバーできていない", "2": "正常系の基本パスはカバーしているが、異常系・境界値への考慮がない", "3": "主要な正常系・異常系はカバーしているが、境界値や非機能要件の考慮が不足", "4": "正常系・異常系・境界値を適切にカバーし、テスト観点が明確", "5": "多角的なテスト観点から網羅的にカバーし、回帰テストや性能テストまで考慮"}'::jsonb,
  13,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'code_quality',
  'コード品質',
  'F',
  '技術実務',
  'コードの可読性・保守性・拡張性を評価し、品質向上のための具体的な改善提案を行う力',
  ARRAY['命名規則・コードスタイルの一貫性の評価', '関数分割・モジュール構成の適切さの判断', '技術的負債の認識と改善提案'],
  '{"1": "コード品質への認識がなく、評価観点が欠如している", "2": "表面的な品質問題（命名等）は認識するが、構造的な問題を見落としている", "3": "基本的な品質基準で評価できるが、改善提案の具体性が不足", "4": "可読性・保守性の両面から適切に評価し、具体的な改善提案ができている", "5": "アーキテクチャレベルの品質分析を行い、長期的な保守性を考慮した改善提案を提示"}'::jsonb,
  14,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- グループG: ビジネススキル
INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'documentation_quality',
  'ドキュメント品質',
  'G',
  'ビジネススキル',
  '技術文書・報告書の構成力と、読者に応じた適切な情報の粒度・表現を選択する力',
  ARRAY['文書構成の論理的な一貫性と読みやすさ', '対象読者（技術者/非技術者/経営層）に応じた表現の適切さ', '必要十分な情報量と根拠の明確さ'],
  '{"1": "文書構成が不明確で、必要な情報が欠落している", "2": "基本的な情報は含むが、構成が不十分で読者への配慮が欠けている", "3": "標準的な文書構成はできるが、対象読者への最適化が不足", "4": "論理的に構成され、対象読者に適切な粒度で情報を伝えている", "5": "優れた構成力で複雑な情報を明確に伝え、読者の意思決定を効果的に支援"}'::jsonb,
  15,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'cost_estimation',
  '見積もり妥当性',
  'G',
  'ビジネススキル',
  '工数・コストの見積もりにおいて、適切な根拠に基づき妥当な数値を導出し、前提条件とリスクを明示する力',
  ARRAY['見積もり根拠の論理性と透明性', '前提条件・制約事項の明確な記載', 'バッファ・リスク要因の適切な考慮'],
  '{"1": "見積もりに根拠がなく、数値の妥当性を説明できない", "2": "大まかな根拠はあるが、前提条件が不明確で精度が低い", "3": "基本的な根拠と前提条件を示しているが、リスク要因の考慮が不足", "4": "論理的な根拠に基づき、前提条件とリスクを考慮した妥当な見積もりを提示", "5": "多角的な分析に基づく精度の高い見積もりで、感度分析やシナリオ別試算を含む"}'::jsonb,
  16,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- グループH: AI活用スキル
INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'prompt_effectiveness',
  'プロンプト設計力',
  'H',
  'AI活用スキル',
  'AI（LLM）から望ましい出力を得るためのプロンプトを設計し、反復的に改善する力',
  ARRAY['目的に応じたプロンプト構造（指示・文脈・制約・出力形式）の設計', 'Few-shot/Chain-of-Thought等のプロンプト技法の適切な活用', '出力品質に基づく反復的な改善プロセス'],
  '{"1": "プロンプト設計の基本概念が理解できておらず、曖昧な指示のみ", "2": "基本的な指示は書けるが、文脈・制約の設定が不十分", "3": "標準的なプロンプト構造を使えるが、高度な技法や最適化が不足", "4": "目的に適したプロンプト技法を選択し、効果的なプロンプトを設計できている", "5": "高度な技法を駆使し、出力品質を最大化する洗練されたプロンプト戦略を構築"}'::jsonb,
  17,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

INSERT INTO case_study_rubric_axes (axis_code, axis_name, rubric_group_code, rubric_group_name, definition, evaluation_points, score_anchors, display_order, is_active)
VALUES (
  'ai_output_validation',
  'AI出力の検証力',
  'H',
  'AI活用スキル',
  'AIが生成した出力（コード・文書・分析結果）の正確性・妥当性を批判的に検証し、問題点を特定する力',
  ARRAY['AI出力に対する批判的思考（ハルシネーション・バイアスの検出）', '技術的正確性の独立した検証', 'AI出力の限界の認識と人間による補完の判断'],
  '{"1": "AI出力を無批判に受け入れ、検証の視点がない", "2": "AI出力への疑問はあるが、具体的な検証方法を実行できない", "3": "基本的な検証は行えるが、微妙なエラーやバイアスの検出が不足", "4": "AI出力を体系的に検証し、問題点を具体的に特定・修正できている", "5": "AI出力の限界を深く理解し、人間とAIの最適な役割分担を設計できる"}'::jsonb,
  18,
  true
)
ON CONFLICT (axis_code) DO UPDATE SET
  axis_name = EXCLUDED.axis_name,
  rubric_group_code = EXCLUDED.rubric_group_code,
  rubric_group_name = EXCLUDED.rubric_group_name,
  definition = EXCLUDED.definition,
  evaluation_points = EXCLUDED.evaluation_points,
  score_anchors = EXCLUDED.score_anchors,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- B) step_count CHECK制約緩和: 5-8 → 3-8
ALTER TABLE case_study_problems DROP CONSTRAINT IF EXISTS case_study_problems_step_count_check;
ALTER TABLE case_study_problems ADD CONSTRAINT case_study_problems_step_count_check
  CHECK (step_count >= 3 AND step_count <= 8);

-- C) step_template カラム追加
ALTER TABLE case_study_problems ADD COLUMN IF NOT EXISTS
  step_template VARCHAR(50) DEFAULT 'consulting';
