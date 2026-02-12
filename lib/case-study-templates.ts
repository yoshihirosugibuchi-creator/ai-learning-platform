/**
 * ケーススタディ ステップ・評価テンプレート定義
 *
 * 5つのテンプレートを定義し、各テンプレートにステップ構成と評価軸マッピングを統合
 * si-learning-improvement-plan.md セクション3.4 に基づく
 */

import type { CaseStudySkillAxis } from './types/case-study'

// ============================================================
// テンプレート型定義
// ============================================================

export type CaseStudyStepTemplate =
  | 'consulting'
  | 'code_review'
  | 'incident_response'
  | 'review_correction'
  | 'prompt_design'

export interface TemplateStep {
  stepNumber: number
  stepName: string
  description: string
  targetSkills: CaseStudySkillAxis[]
  isExtended: boolean
}

export interface StepTemplateDefinition {
  id: CaseStudyStepTemplate
  name: string
  description: string
  defaultStepCount: number
  minStepCount: number
  maxStepCount: number
  steps: TemplateStep[]
  /** テンプレート固有の記述式・ハイブリッド回答ガイダンス（AIプロンプトに含める） */
  writingGuidance: string
  /** ケーステキストに含めるべき素材の指示 */
  caseTextGuidance: string
}

// ============================================================
// テンプレート定義
// ============================================================

export const STEP_TEMPLATES: Record<CaseStudyStepTemplate, StepTemplateDefinition> = {
  consulting: {
    id: 'consulting',
    name: 'コンサルティング型',
    description: '汎用的な問題解決フレームワーク（導入提案、戦略策定、見積もり等）',
    defaultStepCount: 5,
    minStepCount: 5,
    maxStepCount: 8,
    writingGuidance: '記述欄では、選択した理由や自身の分析・提案を論理的に説明させてください。根拠となる数値やフレームワーク（SWOT、3C等）への言及を求める設問が効果的です。',
    caseTextGuidance: 'ケーステキストには架空の企業名、売上・利益等の数値データ、組織体制、市場環境の情報を含めてください。',
    steps: [
      {
        stepNumber: 1,
        stepName: '状況把握',
        description: '与えられた情報から重要なポイントを抽出する',
        targetSkills: ['problem_setting', 'structuring_logic'],
        isExtended: false,
      },
      {
        stepNumber: 2,
        stepName: '課題定義',
        description: '本質的な課題を特定し、解くべき問いを設定する',
        targetSkills: ['problem_setting', 'perspective_diversity'],
        isExtended: false,
      },
      {
        stepNumber: 3,
        stepName: '仮説立案',
        description: '課題解決に向けた仮説を構築する',
        targetSkills: ['hypothesis_thinking', 'originality'],
        isExtended: false,
      },
      {
        stepNumber: 4,
        stepName: '分析プラン',
        description: '仮説検証のための分析アプローチを設計する',
        targetSkills: ['analysis_design', 'feasibility'],
        isExtended: false,
      },
      {
        stepNumber: 5,
        stepName: '提言策定',
        description: '具体的な施策と実行計画を提案する',
        targetSkills: ['proposal_specificity', 'impact', 'expression'],
        isExtended: false,
      },
      {
        stepNumber: 6,
        stepName: 'リスク評価',
        description: '施策実行時のリスクと対策を検討する',
        targetSkills: ['feasibility', 'perspective_diversity'],
        isExtended: true,
      },
      {
        stepNumber: 7,
        stepName: '実行計画詳細',
        description: 'タイムライン、マイルストーン、KPIを設定する',
        targetSkills: ['proposal_specificity', 'feasibility'],
        isExtended: true,
      },
      {
        stepNumber: 8,
        stepName: 'モニタリング設計',
        description: '効果測定と改善サイクルの仕組みを設計する',
        targetSkills: ['analysis_design', 'impact'],
        isExtended: true,
      },
    ],
  },

  code_review: {
    id: 'code_review',
    name: 'コードレビュー型',
    description: 'コードの問題点・脆弱性を特定し、修正提案を行う',
    defaultStepCount: 4,
    minStepCount: 4,
    maxStepCount: 5,
    writingGuidance: '記述欄では、コードの問題点の技術的な説明や修正コードの提示を求めてください。回答にはコードブロック（```言語名）の使用を推奨し、good_examplesにも具体的なコード修正例を含めてください。選択肢にもコードスニペットを含めることが効果的です。',
    caseTextGuidance: 'ケーステキストには実際のコード（```言語名で囲む）を含めてください。セキュリティ脆弱性、パフォーマンス問題、設計上の問題など、レビューすべき問題を複数埋め込んでください。',
    steps: [
      {
        stepNumber: 1,
        stepName: 'コード読解・全体把握',
        description: 'コードの構造と処理フローを理解し、全体像を把握する',
        targetSkills: ['structuring_logic', 'technical_accuracy', 'code_quality'],
        isExtended: false,
      },
      {
        stepNumber: 2,
        stepName: '問題点・脆弱性の特定',
        description: 'セキュリティ脆弱性やバグ、設計上の問題点を洗い出す',
        targetSkills: ['security_awareness', 'analysis_design', 'ai_output_validation'],
        isExtended: false,
      },
      {
        stepNumber: 3,
        stepName: '深刻度・影響範囲の評価',
        description: '各問題点の深刻度とシステムへの影響範囲を評価する',
        targetSkills: ['feasibility', 'impact'],
        isExtended: false,
      },
      {
        stepNumber: 4,
        stepName: '修正提案',
        description: '具体的なコード修正案と改善方針を提案する',
        targetSkills: ['proposal_specificity', 'technical_accuracy', 'code_quality'],
        isExtended: false,
      },
      {
        stepNumber: 5,
        stepName: 'レビューコメント作成',
        description: '開発者への建設的なレビューコメントを作成する',
        targetSkills: ['expression', 'perspective_diversity'],
        isExtended: true,
      },
    ],
  },

  incident_response: {
    id: 'incident_response',
    name: '障害対応型',
    description: '障害の検知から復旧、再発防止策までの対応フロー',
    defaultStepCount: 5,
    minStepCount: 5,
    maxStepCount: 6,
    writingGuidance: '記述欄では、障害の原因分析、影響範囲の評価、復旧手順の具体的な記述を求めてください。ログ出力やエラーメッセージの解釈、タイムライン形式での対応手順の記述が効果的です。good_examplesにはログ分析例や復旧コマンド例を含めてください。',
    caseTextGuidance: 'ケーステキストにはシステム構成図（Mermaid）、エラーログ（コードブロック）、監視アラートの内容、影響を受けているユーザー数や売上への影響など具体的な数値を含めてください。',
    steps: [
      {
        stepNumber: 1,
        stepName: '事象の把握',
        description: '障害の発生状況と影響を正確に把握する',
        targetSkills: ['problem_setting', 'structuring_logic'],
        isExtended: false,
      },
      {
        stepNumber: 2,
        stepName: '原因の特定',
        description: '障害の根本原因を技術的に分析・特定する',
        targetSkills: ['analysis_design', 'technical_accuracy'],
        isExtended: false,
      },
      {
        stepNumber: 3,
        stepName: '影響範囲の評価',
        description: 'システム全体への影響範囲とビジネスインパクトを評価する',
        targetSkills: ['perspective_diversity', 'impact'],
        isExtended: false,
      },
      {
        stepNumber: 4,
        stepName: '復旧対応策',
        description: 'サービス復旧のための具体的な対応手順を策定する',
        targetSkills: ['feasibility', 'proposal_specificity'],
        isExtended: false,
      },
      {
        stepNumber: 5,
        stepName: '再発防止策',
        description: '根本原因に基づく再発防止策を策定する',
        targetSkills: ['security_awareness', 'hypothesis_thinking'],
        isExtended: false,
      },
      {
        stepNumber: 6,
        stepName: '報告書作成',
        description: '関係者向けの障害報告書を作成する',
        targetSkills: ['expression', 'structuring_logic', 'documentation_quality'],
        isExtended: true,
      },
    ],
  },

  review_correction: {
    id: 'review_correction',
    name: 'レビュー・修正型',
    description: 'テストケースや成果物の品質をレビューし、修正を行う',
    defaultStepCount: 4,
    minStepCount: 4,
    maxStepCount: 5,
    writingGuidance: '記述欄では、テストケースの不足点や成果物の問題点の具体的な指摘と、修正案の記述を求めてください。テスト観点の整理（表形式）や修正後のテストケース記述が効果的です。good_examplesには具体的な修正後のテストケース例を含めてください。',
    caseTextGuidance: 'ケーステキストにはレビュー対象のテストケース一覧、仕様書の抜粋、テスト結果のサマリーなど具体的な成果物を含めてください。意図的に不足や誤りを含めてください。',
    steps: [
      {
        stepNumber: 1,
        stepName: '対象物の確認',
        description: 'レビュー対象の構造と目的を理解する',
        targetSkills: ['structuring_logic', 'problem_setting'],
        isExtended: false,
      },
      {
        stepNumber: 2,
        stepName: '妥当性の検証',
        description: '技術的な正確性とカバレッジの妥当性を検証する',
        targetSkills: ['analysis_design', 'technical_accuracy', 'test_coverage'],
        isExtended: false,
      },
      {
        stepNumber: 3,
        stepName: '問題点の特定・分類',
        description: '問題点を優先度・カテゴリ別に分類する',
        targetSkills: ['perspective_diversity', 'feasibility', 'ai_output_validation'],
        isExtended: false,
      },
      {
        stepNumber: 4,
        stepName: '修正の実施',
        description: '具体的な修正案を提示し、改善を行う',
        targetSkills: ['proposal_specificity', 'technical_accuracy'],
        isExtended: false,
      },
      {
        stepNumber: 5,
        stepName: '品質確認・検証',
        description: '修正後の品質を確認し、全体の整合性を検証する',
        targetSkills: ['impact', 'expression', 'test_coverage'],
        isExtended: true,
      },
    ],
  },

  prompt_design: {
    id: 'prompt_design',
    name: 'プロンプト設計型',
    description: 'AI活用のためのプロンプト設計と出力検証',
    defaultStepCount: 4,
    minStepCount: 4,
    maxStepCount: 5,
    writingGuidance: '記述欄では、実際のプロンプト文の記述や、AI出力の問題点の分析を求めてください。プロンプトはコードブロックで囲む形式を推奨します。good_examplesには具体的なプロンプト例（Few-shot、Chain-of-Thought等の技法を含む）を記載してください。',
    caseTextGuidance: 'ケーステキストにはAIに依頼したいタスクの背景、求める出力の要件、AI出力例（良い例・悪い例）を含めてください。プロンプト例はコードブロックで囲んでください。',
    steps: [
      {
        stepNumber: 1,
        stepName: '要件・コンテキスト分析',
        description: 'AIに求める出力の要件と背景情報を整理する',
        targetSkills: ['problem_setting', 'structuring_logic'],
        isExtended: false,
      },
      {
        stepNumber: 2,
        stepName: '情報整理・構造化',
        description: 'プロンプトに含める情報を整理・構造化する',
        targetSkills: ['structuring_logic', 'perspective_diversity'],
        isExtended: false,
      },
      {
        stepNumber: 3,
        stepName: 'プロンプト設計',
        description: '効果的なプロンプトを設計・記述する',
        targetSkills: ['prompt_effectiveness', 'originality'],
        isExtended: false,
      },
      {
        stepNumber: 4,
        stepName: '出力検証・改善',
        description: 'AI出力を検証し、プロンプトを改善する',
        targetSkills: ['analysis_design', 'ai_output_validation'],
        isExtended: false,
      },
      {
        stepNumber: 5,
        stepName: 'プロンプト戦略の文書化',
        description: 'プロンプト設計のナレッジを文書化する',
        targetSkills: ['expression', 'documentation_quality'],
        isExtended: true,
      },
    ],
  },
}

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * テンプレートIDからテンプレート定義を取得
 * 無効なIDの場合は consulting をフォールバック
 */
export function getStepTemplate(id: string | null | undefined): StepTemplateDefinition {
  if (id && id in STEP_TEMPLATES) {
    return STEP_TEMPLATES[id as CaseStudyStepTemplate]
  }
  return STEP_TEMPLATES.consulting
}

/**
 * テンプレートのステップフレームワークをプロンプトテキストに変換
 */
export function buildTemplateStepFrameworkText(template: StepTemplateDefinition): string {
  const standardSteps = template.steps.filter(s => !s.isExtended)
  const extendedSteps = template.steps.filter(s => s.isExtended)

  let text = `【${template.name}フレームワーク】\n`

  for (const step of standardSteps) {
    const skills = step.targetSkills.join(', ')
    text += `Step ${step.stepNumber}: ${step.stepName} - ${step.description}\n`
    text += `  → 主要評価軸: ${skills}\n`
  }

  if (extendedSteps.length > 0) {
    text += `\n【拡張ステップ（任意）】\n`
    for (const step of extendedSteps) {
      const skills = step.targetSkills.join(', ')
      text += `Step ${step.stepNumber}: ${step.stepName} - ${step.description}\n`
      text += `  → 主要評価軸: ${skills}\n`
    }
  }

  // テンプレート固有のガイダンス
  text += `\n【ケーステキスト作成指針】\n${template.caseTextGuidance}\n`
  text += `\n【記述式・ハイブリッド回答の設問設計指針】\n${template.writingGuidance}\n`

  return text
}

/**
 * テンプレートで使用される評価軸に絞ったルーブリックテキストを生成
 * dbAxes が空の場合は全軸のフォールバックラベルを使用
 */
export function buildTemplateRubricAxesText(
  template: StepTemplateDefinition,
  dbAxes: Array<{
    axis_code: string
    axis_name: string
    definition: string
    rubric_group_code: string
    rubric_group_name: string
  }>
): string {
  // テンプレートで使用される全軸を収集
  const usedAxes = new Set<string>()
  for (const step of template.steps) {
    for (const skill of step.targetSkills) {
      usedAxes.add(skill)
    }
  }

  // DBの軸データがある場合はそこからフィルタリング
  if (dbAxes.length > 0) {
    const filteredAxes = dbAxes.filter(a => usedAxes.has(a.axis_code))

    // グループ別に整理
    const groups: Record<string, { code: string; name: string; axes: typeof filteredAxes }> = {}
    for (const axis of filteredAxes) {
      if (!groups[axis.rubric_group_code]) {
        groups[axis.rubric_group_code] = {
          code: axis.rubric_group_code,
          name: axis.rubric_group_name,
          axes: [],
        }
      }
      groups[axis.rubric_group_code].axes.push(axis)
    }

    const sortedGroups = Object.values(groups).sort((a, b) => a.code.localeCompare(b.code))
    let text = `【ルーブリック評価システム（${usedAxes.size}軸）】\n`
    for (const group of sortedGroups) {
      text += `\nグループ${group.code}: ${group.name}\n`
      for (const axis of group.axes) {
        text += `  - ${axis.axis_code}（${axis.axis_name}）: ${axis.definition}\n`
      }
    }
    return text
  }

  // DBデータがない場合はフォールバック
  return `【ルーブリック評価システム（${usedAxes.size}軸）】\n使用軸: ${[...usedAxes].join(', ')}\n`
}

/**
 * テンプレート一覧を取得（UI表示用）
 */
export function getTemplateList(): Array<{ id: CaseStudyStepTemplate; name: string; description: string }> {
  return Object.values(STEP_TEMPLATES).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
  }))
}
