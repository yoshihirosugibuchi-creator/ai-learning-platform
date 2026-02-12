# SI学習パッケージ対応 - 改善計画書

## 概要
SI若手エンジニア向け学習パッケージ実装のための事前修正項目を整理

---

## 1. コース学習の改善

### 1.1 カテゴリー・サブカテゴリーの階層変更（必須）

**現状**
```
learning_genres: category_id, subcategory_id あり
learning_themes: カテゴリー情報なし
```

**変更後のルール**

| テーブル | フィールド | 設定ルール |
|---------|-----------|-----------|
| learning_genres | category_id | **必須** |
| learning_genres | subcategory_id | **任意**（設定してもしなくてもOK） |
| learning_themes | subcategory_id | 下記参照 |

**テーマのsubcategory_id設定ルール**
| ジャンルの状態 | テーマでの動作 |
|---------------|---------------|
| ジャンルにsubcategory_idあり | テーマに**自動継承**（編集可能） |
| ジャンルにsubcategory_idなし | テーマで**必須選択**（ジャンルのcategory_id配下から選択） |

**理由**
SI基礎のような構造に対応するため：
```
コース: SI基礎コース
└── ジャンル: SI基礎_技術基盤 (category_id: si_basic_tech_foundation, subcategory_id: null)
    ├── テーマ: A0 システムの全体像 (subcategory_id: si_basic_system_overview) ← 必須選択
    ├── テーマ: A1 プログラミング (subcategory_id: si_basic_programming) ← 必須選択
    └── テーマ: A2 データベース・SQL (subcategory_id: si_basic_database) ← 必須選択
```

**必要な作業**
- [x] `learning_themes` テーブルに `subcategory_id` カラム追加 ✅
- [x] 関連する型定義の更新（`lib/types/learning.ts`）✅
- [x] データ取得ロジックの更新（`lib/learning/supabase-data.ts`）✅
- [x] テーマ編集UI: ジャンルのsubcategory_id有無で動作切り替え ✅
- [x] カテゴリー表示ロジックの更新（テーマのsubcategory_idを優先表示）✅
- [x] AIコース生成のプロンプト・出力形式の更新 ✅

### 1.2 コード表示対応（推奨）

**現状**: セッションコンテンツはテキストのみ

**改善案**
- セッションコンテンツでMarkdownコードブロックを正しく表示
- シンタックスハイライト対応

**必要な作業**
- [x] セッション表示コンポーネントでのMarkdown/コードブロック対応確認 ✅ `LearningSession.tsx`で`MarkdownContent`使用済み
- [x] 必要に応じてコードハイライトライブラリ追加 ✅ `react-syntax-highlighter` + Prism導入済み

---

## 2. クイズの改善

### 2.1 コード表示対応（高優先度）

**現状**: 問題文・選択肢はプレーンテキスト

**改善案**
- 問題文でMarkdownコードブロックを表示可能に
- 選択肢でもコード表示可能に

**対応するクイズパターン**
- コードレビュー型（脆弱性発見など）
- コード出力結果を選ぶ問題
- プロンプト改善型（Before/Afterの比較）

**必要な作業**
- [x] クイズ表示コンポーネント（`QuizCard.tsx`）でMarkdown対応 ✅ 問題文・選択肢・解説に`MarkdownContent`使用済み
- [x] 選択肢のコード表示対応 ✅ `MarkdownContent compact`で対応済み
- [x] AIクイズ生成でコードブロック付き問題を生成可能に ✅ Claude/ChatGPT/Gemini全プロンプトに指示済み

### 2.2 クイズの問題タイプについて（参考情報）

**現状**
- `quiz_questions` テーブルには `question_type` カラムが**存在しない**
- 固定4選択肢構造（option1, option2, option3, option4）
- 全問題が単一選択（single）として動作

**将来の拡張（必要に応じて検討）**
- multiple（複数選択）、ordering（並べ替え）、text（記述式）はクイズには未実装
- 拡張する場合は `quiz_questions` テーブル構造の変更が必要

---

## 3. ケーススタディの改善

### 3.1 ステップ素材（Step Materials）の追加 → **後回し（分岐型ケーススタディと併せて検討）**

**現状**: `case_text`（1つのテキスト）のみ。ただし `case_text` にMarkdown（コードブロック、テーブル、Mermaid図）を含められるため、現状でも同等のコンテンツ表現は可能。

**改善案**: ステップごとに複数素材を添付可能

```sql
-- 新規テーブル案
CREATE TABLE case_study_step_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES case_study_steps(id),
  material_type TEXT CHECK (material_type IN ('code', 'document', 'table', 'image', 'requirements')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,  -- 'python', 'javascript', etc.
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**対応するケース**
- CS3-1（コードレビュー）: `material_type: 'code'` で脆弱性コードを添付
- CS5-1（テストケース）: `material_type: 'table'` でテストケース一覧を添付

**⏳ 後回し理由・併せて検討する機能**

ステップ素材を導入する際に、**分岐型ケーススタディ（ロールプレイ型）** も併せて設計したい。

分岐型ケーススタディ構想:
- 学習者の回答（選択肢や記述内容）に応じて、次のステップの情報や問題が動的に変化する
- 例: Step1で「障害の原因をDBと判断」→ Step2でDB関連の調査タスクが提示される
- 例: Step2で誤った対応を選択 → Step3で障害が拡大した状況が提示される
- ロールプレイ的な没入感のある学習体験を実現

ステップ素材と分岐型は密接に関連する（ステップごとに異なる素材を出し分ける＝分岐の一形態）。
別々に設計すると後からの統合が難しくなるため、まとめて設計・実装することが望ましい。

検討すべき設計ポイント:
- 分岐条件の定義方法（選択肢ID、スコア閾値、キーワード検出等）
- 分岐先ステップのデータ構造（ツリー型 vs フラット＋条件付き表示）
- AI問題生成プロンプトでの分岐シナリオ生成
- AI採点での分岐パス考慮
- 管理画面での分岐フロー編集UI

### 3.2 回答テンプレート（Answer Template）の追加（中優先度）

**現状**: 自由記述のみ

**改善案**: 構造化された回答フォーマットを指定可能

```typescript
interface AnswerTemplate {
  template_type: 'free_text' | 'structured_document' | 'review_comments' | 'table'
  sections?: Array<{
    section_name: string
    description: string
    required: boolean
  }>
}
```

**対応するケース**
- CS1-1（導入提案書）: 背景/課題/提案内容/コスト/リスク
- CS3-2（障害報告書）: 発生事象/原因/対応/再発防止
- CS4-2（見積書）: 前提条件/工数内訳/根拠

### 3.3 コード表示対応（高優先度）

**必要な作業**
- [x] ケーススタディ表示でMarkdown/コードブロック対応 ✅ case_text/description/options全て`MarkdownContent`使用済み
- [ ] ステップ素材のコード表示（シンタックスハイライト） ← 3.1のステップ素材テーブル実装後に対応

### 3.4 ステップ・評価テンプレート方式（高優先度）

**現状の問題**

現在のケーススタディは以下の固定フレームワークを使用：
```
必須5ステップ（コンサルティング型）:
  Step 1: 状況把握 → Step 2: 課題定義 → Step 3: 仮説立案 → Step 4: 分析プラン → Step 5: 提言策定
拡張ステップ（任意）:
  Step 6: リスク評価 → Step 7: 実行計画詳細 → Step 8: モニタリング設計

DB制約: step_count 5-8, step_number 1-8
プロンプト: lib/case-study-prompt-generators.ts にハードコード（DEFAULT_STEP_FRAMEWORK）
評価軸: 固定10軸（problem_setting, structuring_logic, ... originality）が全問題共通
```

**問題点1: ステップ構成の不適合**

汎用フレームワークがSI学習パッケージの技術実務型ケースに合わない：

| CS | 内容 | 現フレームワークの問題 |
|----|------|----------------------|
| CS3-1 | AI生成コードのセキュリティレビュー | 「仮説立案」ステップが不自然。コードレビューに仮説は不要 |
| CS3-2 | AI起因の本番障害→障害報告書 | 障害対応フロー（検知→切り分け→復旧→報告）と不一致 |
| CS5-1 | AI生成テストケースの品質レビュー | レビュー・修正型に「提言策定」は過剰 |
| CS5-2 | AI活用デバッグ＋品質レポート | デバッグプロセスと分析フレームワークが噛み合わない |

**問題点2: 評価軸の不適合（ステップと不可分）**

ステップ構成と評価軸は「どのステップで何を評価するか」の一体セット。
ステップ構成だけ変えても、評価軸が追従しなければ適切な採点ができない：
- コードレビューに必要な `technical_accuracy`（技術的正確性）が存在しない
- セキュリティ評価に必要な `security_awareness`（セキュリティ考慮）が存在しない
- 現在の `originality`（独自性）はコードレビューの文脈では意味が薄い

#### 改善案：テンプレート = ステップ構成 + 評価軸マッピングの統合定義

#### 新設する評価軸（詳細定義）

既存の `case_study_rubric_axes` テーブルにINSERTで追加（スキーマ変更不要）。
既存10軸と同じ定義精度で設計：

**technical_accuracy（技術的正確性）** - グループF: 技術実務（新設）
```
axis_code:        'technical_accuracy'
axis_name:        '技術的正確性'
rubric_group_code: 'F'
rubric_group_name: '技術実務'
definition:       'コード・設計・技術的判断の正しさを見極め、適切な技術的根拠に基づいて評価・指摘する力'
evaluation_points:
  - コードの動作・構文の正確な理解
  - 設計パターン・ベストプラクティスとの整合性
  - 技術的根拠の明確さと妥当性
score_anchors:
  1: 技術的な理解が誤っており、指摘が的外れ
  2: 部分的に正しいが、重要な技術的誤解がある
  3: 基本的な技術理解はあるが、細部の正確性に課題
  4: 技術的に正確な理解と指摘ができている
  5: 深い技術的洞察に基づき、根本原因まで正確に特定
display_order: 11
```

**security_awareness（セキュリティ考慮）** - グループF: 技術実務（新設）
```
axis_code:        'security_awareness'
axis_name:        'セキュリティ考慮'
rubric_group_code: 'F'
rubric_group_name: '技術実務'
definition:       'セキュリティリスクを認識し、脆弱性の発見・対策の提案を適切に行う力'
evaluation_points:
  - 脆弱性パターン（OWASP Top 10等）の認識
  - リスクの深刻度と影響範囲の適切な評価
  - 実効性のある対策の提案
score_anchors:
  1: セキュリティリスクへの認識がない
  2: セキュリティへの言及はあるが、具体的な脆弱性を特定できていない
  3: 主要な脆弱性は認識しているが、対策の具体性が不足
  4: 脆弱性を適切に特定し、実効性のある対策を提案している
  5: 多層的なセキュリティ分析で潜在的リスクまで発見し、包括的な対策を提示
display_order: 12
```

**test_coverage（テスト網羅性）** - グループF: 技術実務（新設）
```
axis_code:        'test_coverage'
axis_name:        'テスト網羅性'
rubric_group_code: 'F'
rubric_group_name: '技術実務'
definition:       'テストケースの網羅性を設計し、境界値・異常系・回帰テストを含む包括的なテスト戦略を構築する力'
evaluation_points:
  - 正常系・異常系・境界値の網羅的なカバレッジ
  - テスト観点（機能/非機能/セキュリティ）の多面性
  - テストケース間の独立性と再現可能性
score_anchors:
  1: テストケースが著しく不足し、主要な動作パスすらカバーできていない
  2: 正常系の基本パスはカバーしているが、異常系・境界値への考慮がない
  3: 主要な正常系・異常系はカバーしているが、境界値や非機能要件の考慮が不足
  4: 正常系・異常系・境界値を適切にカバーし、テスト観点が明確
  5: 多角的なテスト観点から網羅的にカバーし、回帰テストや性能テストまで考慮
display_order: 13
```

**code_quality（コード品質）** - グループF: 技術実務（新設）
```
axis_code:        'code_quality'
axis_name:        'コード品質'
rubric_group_code: 'F'
rubric_group_name: '技術実務'
definition:       'コードの可読性・保守性・拡張性を評価し、品質向上のための具体的な改善提案を行う力'
evaluation_points:
  - 命名規則・コードスタイルの一貫性の評価
  - 関数分割・モジュール構成の適切さの判断
  - 技術的負債の認識と改善提案
score_anchors:
  1: コード品質への認識がなく、評価観点が欠如している
  2: 表面的な品質問題（命名等）は認識するが、構造的な問題を見落としている
  3: 基本的な品質基準で評価できるが、改善提案の具体性が不足
  4: 可読性・保守性の両面から適切に評価し、具体的な改善提案ができている
  5: アーキテクチャレベルの品質分析を行い、長期的な保守性を考慮した改善提案を提示
display_order: 14
```

**documentation_quality（ドキュメント品質）** - グループG: ビジネススキル（新設）
```
axis_code:        'documentation_quality'
axis_name:        'ドキュメント品質'
rubric_group_code: 'G'
rubric_group_name: 'ビジネススキル'
definition:       '技術文書・報告書の構成力と、読者に応じた適切な情報の粒度・表現を選択する力'
evaluation_points:
  - 文書構成の論理的な一貫性と読みやすさ
  - 対象読者（技術者/非技術者/経営層）に応じた表現の適切さ
  - 必要十分な情報量と根拠の明確さ
score_anchors:
  1: 文書構成が不明確で、必要な情報が欠落している
  2: 基本的な情報は含むが、構成が不十分で読者への配慮が欠けている
  3: 標準的な文書構成はできるが、対象読者への最適化が不足
  4: 論理的に構成され、対象読者に適切な粒度で情報を伝えている
  5: 優れた構成力で複雑な情報を明確に伝え、読者の意思決定を効果的に支援
display_order: 15
```

**cost_estimation（見積もり妥当性）** - グループG: ビジネススキル（新設）
```
axis_code:        'cost_estimation'
axis_name:        '見積もり妥当性'
rubric_group_code: 'G'
rubric_group_name: 'ビジネススキル'
definition:       '工数・コストの見積もりにおいて、適切な根拠に基づき妥当な数値を導出し、前提条件とリスクを明示する力'
evaluation_points:
  - 見積もり根拠の論理性と透明性
  - 前提条件・制約事項の明確な記載
  - バッファ・リスク要因の適切な考慮
score_anchors:
  1: 見積もりに根拠がなく、数値の妥当性を説明できない
  2: 大まかな根拠はあるが、前提条件が不明確で精度が低い
  3: 基本的な根拠と前提条件を示しているが、リスク要因の考慮が不足
  4: 論理的な根拠に基づき、前提条件とリスクを考慮した妥当な見積もりを提示
  5: 多角的な分析に基づく精度の高い見積もりで、感度分析やシナリオ別試算を含む
display_order: 16
```

**prompt_effectiveness（プロンプト設計力）** - グループH: AI活用スキル（新設）
```
axis_code:        'prompt_effectiveness'
axis_name:        'プロンプト設計力'
rubric_group_code: 'H'
rubric_group_name: 'AI活用スキル'
definition:       'AI（LLM）から望ましい出力を得るためのプロンプトを設計し、反復的に改善する力'
evaluation_points:
  - 目的に応じたプロンプト構造（指示・文脈・制約・出力形式）の設計
  - Few-shot/Chain-of-Thought等のプロンプト技法の適切な活用
  - 出力品質に基づく反復的な改善プロセス
score_anchors:
  1: プロンプト設計の基本概念が理解できておらず、曖昧な指示のみ
  2: 基本的な指示は書けるが、文脈・制約の設定が不十分
  3: 標準的なプロンプト構造を使えるが、高度な技法や最適化が不足
  4: 目的に適したプロンプト技法を選択し、効果的なプロンプトを設計できている
  5: 高度な技法を駆使し、出力品質を最大化する洗練されたプロンプト戦略を構築
display_order: 17
```

**ai_output_validation（AI出力の検証力）** - グループH: AI活用スキル（新設）
```
axis_code:        'ai_output_validation'
axis_name:        'AI出力の検証力'
rubric_group_code: 'H'
rubric_group_name: 'AI活用スキル'
definition:       'AIが生成した出力（コード・文書・分析結果）の正確性・妥当性を批判的に検証し、問題点を特定する力'
evaluation_points:
  - AI出力に対する批判的思考（ハルシネーション・バイアスの検出）
  - 技術的正確性の独立した検証
  - AI出力の限界の認識と人間による補完の判断
score_anchors:
  1: AI出力を無批判に受け入れ、検証の視点がない
  2: AI出力への疑問はあるが、具体的な検証方法を実行できない
  3: 基本的な検証は行えるが、微妙なエラーやバイアスの検出が不足
  4: AI出力を体系的に検証し、問題点を具体的に特定・修正できている
  5: AI出力の限界を深く理解し、人間とAIの最適な役割分担を設計できる
display_order: 18
```

#### テンプレート定義一覧（ステップ + 評価軸の統合）

**consulting（現行・デフォルト）** - 対象: CS1-1, CS4-1, CS4-2

| Step | ステップ名 | 評価軸 |
|------|----------|-------|
| 1 | 状況把握 | problem_setting, structuring_logic |
| 2 | 課題定義 | problem_setting, perspective_diversity |
| 3 | 仮説立案 | hypothesis_thinking, originality |
| 4 | 分析プラン | analysis_design, feasibility |
| 5 | 提言策定 | proposal_specificity, impact, expression |
| 6（任意） | リスク評価 | feasibility, perspective_diversity |
| 7（任意） | 実行計画詳細 | proposal_specificity, feasibility |
| 8（任意） | モニタリング設計 | analysis_design, impact |

**code_review** - 対象: CS3-1

| Step | ステップ名 | 評価軸 |
|------|----------|-------|
| 1 | コード読解・全体把握 | structuring_logic, **technical_accuracy**, **code_quality** |
| 2 | 問題点・脆弱性の特定 | **security_awareness**, analysis_design, **ai_output_validation** |
| 3 | 深刻度・影響範囲の評価 | feasibility, impact |
| 4 | 修正提案 | proposal_specificity, **technical_accuracy**, **code_quality** |
| 5（任意） | レビューコメント作成 | expression, perspective_diversity |

**incident_response** - 対象: CS3-2, CS5-2

| Step | ステップ名 | 評価軸 |
|------|----------|-------|
| 1 | 事象の把握 | problem_setting, structuring_logic |
| 2 | 原因の特定 | analysis_design, **technical_accuracy** |
| 3 | 影響範囲の評価 | perspective_diversity, impact |
| 4 | 復旧対応策 | feasibility, proposal_specificity |
| 5 | 再発防止策 | **security_awareness**, hypothesis_thinking |
| 6（任意） | 報告書作成 | expression, structuring_logic, **documentation_quality** |

**review_correction** - 対象: CS5-1

| Step | ステップ名 | 評価軸 |
|------|----------|-------|
| 1 | 対象物の確認 | structuring_logic, problem_setting |
| 2 | 妥当性の検証 | analysis_design, **technical_accuracy**, **test_coverage** |
| 3 | 問題点の特定・分類 | perspective_diversity, feasibility, **ai_output_validation** |
| 4 | 修正の実施 | proposal_specificity, **technical_accuracy** |
| 5（任意） | 品質確認・検証 | impact, expression, **test_coverage** |

**prompt_design** - 対象: CS2-1, CS2-2

| Step | ステップ名 | 評価軸 |
|------|----------|-------|
| 1 | 要件・コンテキスト分析 | problem_setting, structuring_logic |
| 2 | 情報整理・構造化 | structuring_logic, perspective_diversity |
| 3 | プロンプト設計 | **prompt_effectiveness**, originality |
| 4 | 出力検証・改善 | analysis_design, **ai_output_validation** |
| 5（任意） | プロンプト戦略の文書化 | expression, **documentation_quality** |

#### 必要な変更

| 箇所 | 変更内容 |
|------|----------|
| DB | `case_study_rubric_axes` に新設8軸をINSERT: グループF（technical_accuracy, security_awareness, test_coverage, code_quality）、グループG（documentation_quality, cost_estimation）、グループH（prompt_effectiveness, ai_output_validation） |
| DB | `step_count` CHECK制約を `3-8` に緩和（supabase migration側） |
| DB | `case_study_problems` に `step_template` カラム追加（テンプレート種別） |
| 型定義 | `CaseStudySkillAxis` に新設8軸を追加 |
| 型定義 | `CaseStudyStepTemplate` 型を新設 |
| プロンプト | `DEFAULT_STEP_FRAMEWORK` → テンプレート別定義に置き換え |
| プロンプト | 各テンプレートのステップ名・評価軸マッピングをセットで定義 |
| プロンプト | テンプレート固有のコンテンツ生成ガイダンス（`writingGuidance` / `caseTextGuidance`）をプロンプトに注入 |
| 採点プロンプト | テンプレートの評価軸を動的にプロンプトへ注入 |
| 管理画面 | 問題作成時にテンプレート選択 → ステップ構成と評価軸が連動表示 |

#### テンプレート固有プロンプトガイダンス（実装済み）

テンプレートごとに問題生成AIへの指示を最適化するため、各テンプレートに以下2種類のガイダンスを定義。
`lib/case-study-templates.ts` の `StepTemplateDefinition` に `writingGuidance` / `caseTextGuidance` として実装済み。
`buildTemplateStepFrameworkText()` がプロンプトに `【ケーステキスト作成指針】` `【記述式・ハイブリッド回答の設問設計指針】` として注入。

| テンプレート | ケーステキスト指針（caseTextGuidance） | 記述・設問設計指針（writingGuidance） |
|------------|---------------------------------------|--------------------------------------|
| consulting | 架空企業名、売上・利益等数値、組織体制、市場環境 | SWOT・3C等フレームワーク、数値根拠の言及を求める |
| code_review | コードブロック、セキュリティ脆弱性・パフォーマンス問題を埋め込み | 技術的説明・修正コード提示、選択肢にコードスニペット |
| incident_response | システム構成図（Mermaid）、エラーログ、監視アラート、影響数値 | ログ解釈、タイムライン形式の対応手順、復旧コマンド例 |
| review_correction | テストケース一覧、仕様書抜粋、テスト結果サマリー（意図的欠陥含む） | テスト観点の表形式整理、修正後テストケース例 |
| prompt_design | タスク背景、出力要件、AI出力例（良/悪）をコードブロックで | プロンプト文記述、Few-shot/CoT技法の具体例 |

#### 後方互換性
- 既存ケーススタディ: `step_template = 'consulting'` をデフォルト設定。動作変更なし
- 既存10軸: そのまま維持。新設8軸（グループF/G/H）は追加のみ
- 新規ケーススタディ: テンプレート選択可能。未選択時は `consulting` がデフォルト

### 3.5 問題タイプの整理と並べ替え（ordering）実装

**現状のcase_study_steps.question_type**
| タイプ | 説明 | 現在の件数 | 状態 |
|--------|------|-----------|------|
| single | 単一選択（4択から1つ） | 使用中 | 実装済み |
| multiple | 複数選択（4択から1〜4つ） | 使用中 | 実装済み |
| hybrid | 複数選択＋記述 | 使用中 | 実装済み |
| text | 自由記述のみ | 0件 | 実装済み（UIあり） |
| ordering | 並べ替え問題 | 0件 | ✅ 実装済み（2026-02-12）|

**計画変更: 以下の問題タイプは追加しない**
| 当初計画 | 判断 | 理由 |
|----------|------|------|
| `code_review` | 追加しない | `code_review` テンプレート＋ `text` / `hybrid` で同等の体験が実現可能。テンプレート側の `writingGuidance` でコードブロック使用を指示済み |
| `output_prediction` | 追加しない | `single`（出力を4択から選ぶ）または `hybrid`（選択＋なぜその出力になるか説明）で代替可能 |

#### ordering（並べ替え）実装仕様

**ユースケース**
- コードの行を正しい動作順に並べ替える
- プロジェクト工程を適切な順序に並べる
- 障害対応手順を優先度順に並べる
- ビジネスプロセスのフローを論理的に構成する

**データ構造**
- `options` 配列: 各項目の `id` と `text`。配列のインデックス順が正解順序
- `model_answer.ideal_order`: 正解のID順序配列（例: `["a", "c", "b", "d"]`）
- ユーザー回答: `selectedChoices` を順序付き配列として使用（並べた順にIDを格納）

**UI実装**
- `@dnd-kit/sortable` によるドラッグ＆ドロップ
- モバイル対応（タッチドラッグ）
- 上下ボタンによる移動も併設（アクセシビリティ）

**採点ロジック**
- 位置一致方式: 各項目が正解位置にあるかをチェック、一致数/全体数で部分点
- `max_score` × (一致数 / 全体数) でスコア算出
- AI採点プロンプトでは順序の論理性も評価対象

**AI問題生成プロンプト対応**
- `ordering` 用のステップJSON例を `buildStepJsonExampleClaude` に追加
- `model_answer` に `ideal_order` フィールドを含む形式
- `scoring_anchors` は順序一致度ベース

**必要な作業**
- [x] DB: `ordering` はCHECK制約に既に含まれている
- [x] パッケージ: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` インストール済み
- [x] UI: `CaseStudySession.tsx` に ordering 用ドラッグ＆ドロップ回答フォーム追加 ✅
- [x] 結果表示: `CaseStudyResult.tsx` に正解順序 vs ユーザー順序の比較表示 ✅
- [x] AI問題生成プロンプト: ordering 用JSON例追加（Claude/ChatGPT/Gemini全対応）✅
- [x] AI採点プロンプト: ordering 回答の評価指示追加 ✅
- [x] StepEditor: ordering 選択時のUI調整（全選択肢is_correct:true自動設定、ヘルプテキスト）✅

### 3.6 問題個別の評価軸カスタマイズ（低優先度）

**前提**: 3.4で導入するテンプレート方式により、テンプレート選択時に適切な評価軸が自動設定される。
本項目は、テンプレートのデフォルト軸を**問題単位で上書き・追加**する上位機能。

**ユースケース**
- テンプレートの標準軸では不足する特殊なケース（例: consulting テンプレートの CS4-2 に `cost_estimation` を追加）
- 同じテンプレートでも問題の重点が異なる場合（例: code_review だがセキュリティより品質重視 → `security_awareness` を外して `code_quality` を強化）
- 将来の新規軸追加時に、テンプレート変更なしで個別問題に適用

**実装案**
```sql
-- ステップ単位での評価軸上書き（NULLならテンプレートのデフォルト軸を使用）
ALTER TABLE case_study_steps
ADD COLUMN custom_target_skills JSONB;
-- 例: ["technical_accuracy", "code_quality", "security_awareness"]
-- NULLの場合: テンプレートで定義されたそのステップのデフォルト軸を使用
```

**変更箇所**
| 箇所 | 変更内容 |
|------|----------|
| DB | `case_study_steps` に `custom_target_skills` カラム追加（JSONB, NULL許可） |
| 管理画面 | ステップ編集時にテンプレートデフォルト軸を表示、個別上書き可能に |
| プロンプト | `custom_target_skills` があればそちらを優先、なければテンプレートデフォルトを使用 |
| 評価結果表示 | 実際に使用された軸名で表示（テンプレートデフォルト or カスタム） |

**注**: 評価軸のマスターデータは `case_study_rubric_axes` テーブルに統一（3.4参照）。
別途 `evaluation_criteria_master` テーブルは不要

---

## 4. AIコース生成の改善

### 4.1 テーマ単位のサブカテゴリー対応

**重要**: カテゴリー/サブカテゴリーはAIが提案するのではなく、**カテゴリーマッピング画面（Step 3）でユーザーがDBのリストから手動選択**する。

**フロー**
```
1. AIアウトライン生成 → コース構造（ジャンル、テーマ、セッション）のみ生成
2. カテゴリーマッピング画面 → DBからカテゴリー/サブカテゴリー取得 → ユーザーが選択
3. コース保存 → 選択された値をDBに保存
```

**変更内容**
- ジャンル: カテゴリー（必須）、サブカテゴリー（任意）を選択
- テーマ: ジャンルにサブカテゴリーがない場合、テーマごとにサブカテゴリーを選択（必須）

**必要な作業**
- [x] テーマにsubcategory_idフィールド追加（型定義）✅
- [x] カテゴリーマッピングUIにテーマ単位の選択機能追加 ✅
- [x] 保存ロジックの更新（course-publisher.ts）✅

### 4.2 コード例を含むオプション → **実質対応済み（UIオプションのみ未実装）**

**現状**: `content-prompt-builder.ts` にコードブロック・シンタックスハイライトの指示が**常時含まれている**。
AIは技術系コンテンツで自動的にコード例を生成する。「含めない」選択ができないだけ。

**必要な作業**
- [x] プロンプトにコードブロック生成指示を含める ✅ `content-prompt-builder.ts`に常時含まれている
- [ ] 生成設定UIに「コード例を含める」チェックボックス追加（`CourseSetupStep.tsx`）← 優先度低
- [ ] `generation_preferences`型に`include_code`フィールド追加（`types.ts`）← 上記と同時
- [ ] プロンプトの条件分岐（`include_code: false`時にコード指示を除外）← 上記と同時

**備考**: デフォルトでコード例が含まれる現状で実用上の問題はない。
「コード例を含めたくない」ケースが実際に発生した場合に対応すればよい。

---

## 5. 実装優先順位

### Phase 1（コンテンツ制作前に必須）✅ 完了
| 項目 | 対象 | 状態 |
|------|------|------|
| テーマにsubcategory_id追加 | コース学習 | ✅ 完了 |
| 関連する型定義・ロジック更新 | コース学習 | ✅ 完了 |
| カテゴリーマッピングUIのテーマ単位対応 | AIコース生成 | ✅ 完了 |

### Phase 2（コンテンツ制作と並行可能）
| 項目 | 対象 | 状態 |
|------|------|------|
| Markdownコードブロック表示 | コース学習・クイズ・ケーススタディ | ✅ 完了 |
| ステップ・評価テンプレート方式（8軸追加含む） | ケーススタディ | ✅ 完了 |
| ステップ素材テーブル追加 | ケーススタディ | ⏳ 後回し（分岐型ケーススタディと併せて検討）|
| ケーススタディ問題タイプ拡張（ordering） | ケーススタディ | ✅ 完了 |

### Phase 3（後から追加可能）
| 項目 | 対象 | 工数 |
|------|------|------|
| ステップ素材 + 分岐型ケーススタディ（ロールプレイ型） | ケーススタディ | 大 |
| 回答テンプレート機能 | ケーススタディ | 中 |
| 問題個別の評価軸カスタマイズ | ケーススタディ | 中 |
| 学習パス機能 | コース学習 | 大 |

---

## 6. 既存データへの影響

### learning_themes への subcategory_id 追加
- 既存データ: NULL許可で追加、影響なし
- 新規データ: ジャンルのsubcategory_id有無に応じて設定

### learning_genres の subcategory_id
- 既存データ: そのまま維持（後方互換性）
- 新規データ: 任意設定（設定しない場合はテーマで必須）
- 表示ロジック: テーマのsubcategory_idを優先、なければジャンルを参照

---

## 次のステップ

### Phase 1 ✅ 完了（2026-02-12）
1. ✅ `learning_themes` テーブルに `subcategory_id` カラム追加（DBマイグレーション）
2. ✅ 型定義の更新（`lib/types/learning.ts`, `lib/ai-course-generation/types.ts`）
3. ✅ データ取得ロジックの更新（`lib/learning/supabase-data.ts`）
4. ✅ テーマ編集UI更新（`CategoryMappingStep.tsx` - ジャンルにサブカテゴリーがない場合、テーマ単位で選択）
5. ✅ カテゴリー表示ロジックの更新（`lib/learning/category-integration.ts`）
6. ✅ 保存ロジックの更新（`course-publisher.ts`, `publish-outline/route.ts`）

### Phase 2 ✅ 完了（2026-02-12）
1. ~~Markdownコードブロック表示（コース学習・クイズ・ケーススタディ）~~ ✅ 完了
   - `MarkdownContent`コンポーネント + `react-syntax-highlighter` + Prism で全コンテンツ対応済み
2. ~~ステップ・評価テンプレート方式導入（ケーススタディ）~~ ✅ 完了
   - DB: `case_study_rubric_axes` に新設8軸INSERT済み（グループF/G/H）
   - DB: `step_count` CHECK制約を 3-8 に緩和済み
   - DB: `case_study_problems` に `step_template` カラム追加済み
   - 型定義: `CaseStudySkillAxis` に8軸追加済み
   - プロンプト: テンプレート別ステップフレームワーク定義済み（`lib/case-study-templates.ts`）
   - テンプレート種別: consulting / code_review / incident_response / review_correction / prompt_design
   - 管理画面: テンプレート選択UI、StepEditorの自動入力対応済み
3. ~~ステップ素材テーブル追加（ケーススタディ）~~ ⏳ Phase 3へ移動（分岐型ケーススタディと併せて検討）
4. ~~ケーススタディ問題タイプ拡張（ordering）~~ ✅ 完了（2026-02-12）
   - dnd-kit ドラッグ＆ドロップUI、結果表示、管理画面、AI採点/生成プロンプト対応
5. ~~コード例を含むオプション（AIコース生成）~~ ✅ 実質完了
   - プロンプトにコードブロック指示が常時含まれており実用上問題なし
   - 「含めない」UIオプションは必要時にPhase 3で対応

### Phase 3 残タスク一覧
| # | 項目 | セクション | 優先度 | 規模 | 備考 |
|---|------|-----------|--------|------|------|
| 1 | ステップ素材 + 分岐型ケーススタディ（ロールプレイ型） | 3.1 | 中 | 大 | 回答に応じた動的分岐。ステップ素材とセットで設計 |
| 2 | 回答テンプレート機能 | 3.2 | 低 | 中 | 構造化回答フォーム（提案書、障害報告書等） |
| 3 | 問題個別の評価軸カスタマイズ | 3.6 | 低 | 中 | テンプレートのデフォルト軸を問題単位で上書き |
| 4 | 学習パス機能 | - | 低 | 大 | コース間の推奨学習順序 |
| 5 | コード例UIオプション（含める/含めない切替） | 4.2 | 低 | 小 | 現状常時ON。除外したいケースが出たら対応 |
