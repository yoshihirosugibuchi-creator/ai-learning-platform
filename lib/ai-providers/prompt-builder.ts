/**
 * AI採点プロンプト構築
 *
 * ルーブリック軸＋回答情報からスコアリングプロンプトを生成
 *
 * v2: question_type に応じた適切な採点プロンプト生成
 *     - single: 単一選択のみ（選択結果のみ評価）
 *     - multiple: 複数選択のみ（選択結果のみ評価）
 *     - text: 記述式のみ（記述内容のみ評価）
 *     - hybrid: 複数選択＋記述（両方を評価）
 */

import type { AIScoringRequest, QuestionType } from './types'

/** システムプロンプトを構築 */
export function buildSystemPrompt(): string {
  return `あなたは一流のビジネスコンサルタント教育の専門家です。学習者のケーススタディ回答をルーブリック軸で客観的に評価します。

出力ルール：
1. 必ずJSON形式で出力してください
2. 各ステップの採点と、スキル軸別スコア(1-5点)を返してください
3. フィードバックは具体的に、回答内の記述に言及しながら述べてください
4. 書いていないことを加点しないでください
5. JSON以外の文を絶対に出力しないでください

重要：各ステップの問題形式（question_type）に応じて適切に評価してください。
- single（単一選択）: 選択結果のみで評価。記述は求められていません。
- multiple（複数選択）: 選択結果のみで評価。記述は求められていません。
- text（記述式）: 記述内容のみで評価。選択肢はありません。
- ordering（順序並べ替え）: 選択肢の並び順で評価。正しい位置にある選択肢の数で採点。
- hybrid（複数選択＋記述）: 選択結果と記述内容の両方を評価。`
}

/** 問題形式の説明を取得 */
function getQuestionTypeLabel(questionType: QuestionType): string {
  switch (questionType) {
    case 'single': return '単一選択のみ（1つだけ選択、記述なし）'
    case 'multiple': return '複数選択のみ（1〜4つ選択可、記述なし）'
    case 'ordering': return '順序並べ替え（4択を正しい順序に並べる、記述なし）'
    case 'text': return '記述式のみ（選択肢なし）'
    case 'hybrid': return '複数選択＋記述（1〜4つ選択＋理由記述）'
    default: return '複数選択＋記述'
  }
}

/** 選択肢の正誤を事前判定 */
function evaluateChoiceCorrectness(step: AIScoringRequest['steps'][0]): {
  isFullyCorrect: boolean
  correctChoices: string[]
  incorrectChoices: string[]
  missingChoices: string[]
  matchingPositions?: number
  totalPositions?: number
} | null {
  const questionType = step.questionType || 'hybrid'
  if (!['single', 'multiple', 'ordering', 'hybrid'].includes(questionType)) return null

  const ma = step.modelAnswer as { ideal_choices?: string[] } | null
  const idealChoices = ma?.ideal_choices
  if (!idealChoices || idealChoices.length === 0) return null

  const selected = step.answer?.selectedChoices || []
  if (selected.length === 0) {
    return {
      isFullyCorrect: false,
      correctChoices: [],
      incorrectChoices: [],
      missingChoices: [...idealChoices],
    }
  }

  if (questionType === 'ordering') {
    const matching = selected.filter((c, i) => i < idealChoices.length && c === idealChoices[i]).length
    return {
      isFullyCorrect: matching === idealChoices.length,
      correctChoices: selected.filter((c, i) => i < idealChoices.length && c === idealChoices[i]),
      incorrectChoices: selected.filter((c, i) => i >= idealChoices.length || c !== idealChoices[i]),
      missingChoices: [],
      matchingPositions: matching,
      totalPositions: idealChoices.length,
    }
  }

  const idealSet = new Set(idealChoices)
  const correctChoices = selected.filter(c => idealSet.has(c))
  const incorrectChoices = selected.filter(c => !idealSet.has(c))
  const selectedSet = new Set(selected)
  const missingChoices = idealChoices.filter(c => !selectedSet.has(c))

  return {
    isFullyCorrect: correctChoices.length === idealChoices.length && incorrectChoices.length === 0,
    correctChoices,
    incorrectChoices,
    missingChoices,
  }
}

/** ステップの回答を問題形式に応じてフォーマット */
function formatStepAnswer(step: AIScoringRequest['steps'][0]): string {
  const answer = step.answer
  const questionType = step.questionType || 'hybrid'

  const lines = [
    `Step${step.stepNumber}（${step.stepName}）[${getQuestionTypeLabel(questionType)}]:`
  ]

  // ordering: 選択した順序を表示
  if (questionType === 'ordering') {
    if (answer?.selectedChoices?.length) {
      const ordered = answer.selectedChoices.map((c, i) => `${i + 1}.${c}`).join(' → ')
      lines.push(`  選択した順序: ${ordered}`)
    } else {
      lines.push(`  選択した順序: (未回答)`)
    }
  } else if (questionType === 'single' || questionType === 'multiple' || questionType === 'hybrid') {
    // 選択式の場合のみ選択結果を表示
    const choices = answer?.selectedChoices?.length
      ? answer.selectedChoices.join(', ')
      : '(未選択)'
    lines.push(`  選択: ${choices}`)
  }

  // 記述式の場合のみ記述内容を表示
  if (questionType === 'text' || questionType === 'hybrid') {
    const reasoning = answer?.reasoningText || '(記述なし)'
    lines.push(`  記述: ${reasoning}`)
  }

  // 選択肢の事前判定結果をプロンプトに組み込み（AIフィードバック精度向上のため）
  const evaluation = evaluateChoiceCorrectness(step)
  if (evaluation) {
    lines.push(`  【システム事前判定】`)
    if (questionType === 'ordering') {
      lines.push(`    正しい位置の数: ${evaluation.matchingPositions}/${evaluation.totalPositions}`)
      lines.push(`    判定: ${evaluation.isFullyCorrect ? '全問正解' : '一部不正解'}`)
    } else {
      if (evaluation.isFullyCorrect) {
        lines.push(`    選択判定: ✅全問正解（正解選択肢を全て正しく選択）`)
      } else {
        if (evaluation.correctChoices.length > 0) {
          lines.push(`    正解選択: ${evaluation.correctChoices.join(', ')}`)
        }
        if (evaluation.incorrectChoices.length > 0) {
          lines.push(`    誤選択: ${evaluation.incorrectChoices.join(', ')}`)
        }
        if (evaluation.missingChoices.length > 0) {
          lines.push(`    選択漏れ: ${evaluation.missingChoices.join(', ')}`)
        }
      }
    }
  }

  return lines.join('\n')
}

/** 模範解答を問題形式に応じてフォーマット */
function formatModelAnswer(step: AIScoringRequest['steps'][0]): string {
  const questionType = step.questionType || 'hybrid'
  const ma = step.modelAnswer as {
    ideal_choices?: string[]
    choice_explanations?: Record<string, string>
    essential_points?: string[]
    good_examples?: string[]
    scoring_anchors?: Record<string, string>
  } | null

  if (!ma) return `Step${step.stepNumber}: (模範解答なし)`

  const parts = [`Step${step.stepNumber}（${step.stepName}）[${getQuestionTypeLabel(questionType)}]:`]

  // ordering: 正しい順序と各位置の理由を表示
  if (questionType === 'ordering') {
    if (ma.ideal_choices?.length) {
      const ordered = ma.ideal_choices.map((c, i) => `${i + 1}.${c}`).join(' → ')
      parts.push(`  正しい順序: ${ordered}`)
    }
    if (ma.choice_explanations) {
      parts.push(`  各位置の理由:`)
      for (const [id, explanation] of Object.entries(ma.choice_explanations)) {
        parts.push(`    ${id}: ${explanation.substring(0, 200)}${explanation.length > 200 ? '...' : ''}`)
      }
    }
  } else if (questionType === 'single' || questionType === 'multiple' || questionType === 'hybrid') {
    // 選択式の場合のみ理想選択肢を表示
    if (ma.ideal_choices?.length) {
      parts.push(`  理想選択: ${ma.ideal_choices.join(', ')}`)
    }
    if (ma.choice_explanations) {
      parts.push(`  選択肢解説（フィードバック生成時に参照すること）:`)
      for (const [id, explanation] of Object.entries(ma.choice_explanations)) {
        // 解説は200文字まで表示（フィードバックに活用するため）
        parts.push(`    ${id}: ${explanation.substring(0, 200)}${explanation.length > 200 ? '...' : ''}`)
      }
    }
  }

  // 記述式の場合のみ必須ポイントと模範例を表示
  if (questionType === 'text' || questionType === 'hybrid') {
    if (ma.essential_points?.length) {
      parts.push(`  必須ポイント: ${ma.essential_points.join('; ')}`)
    }
    if (ma.good_examples?.length) {
      parts.push(`  優秀回答例: ${ma.good_examples[0]?.substring(0, 150)}${(ma.good_examples[0]?.length || 0) > 150 ? '...' : ''}`)
    }
  }

  // 採点基準は全形式で表示（1-5点をmax_scoreにスケーリング）
  if (ma.scoring_anchors) {
    const maxScore = step.maxScore || 20
    parts.push(`  採点基準（品質レベル→実際のスコア）:`)
    for (const [level, desc] of Object.entries(ma.scoring_anchors)) {
      const levelNum = parseInt(level) || 1
      const actualScore = Math.round((levelNum / 5) * maxScore)
      parts.push(`    品質${level}（=${actualScore}/${maxScore}点）: ${desc}`)
    }
  }

  return parts.join('\n')
}

/** ステップの評価ルールを問題形式に応じて生成 */
function getEvaluationRulesForStep(step: AIScoringRequest['steps'][0]): string {
  const questionType = step.questionType || 'hybrid'
  const evaluation = evaluateChoiceCorrectness(step)

  switch (questionType) {
    case 'single': {
      if (evaluation?.isFullyCorrect) {
        return `Step${step.stepNumber}は【単一選択】です。★システム判定: 正解★ 学習者は正解選択肢を選んでいます。スコアは満点（${step.maxScore}点）としてください。フィードバックでは、この選択が正しい理由と、選択肢解説を参照して選択が示す理解度を具体的に述べてください。`
      }
      return `Step${step.stepNumber}は【単一選択】です。★システム判定: 不正解★ 記述は求められていないため、記述がなくても減点しないでください。フィードバックでは、選んだ選択肢が不適切な理由と、正解選択肢の解説を述べてください。`
    }

    case 'multiple': {
      if (evaluation?.isFullyCorrect) {
        return `Step${step.stepNumber}は【複数選択】です。★システム判定: 全問正解★ 学習者は正解選択肢を全て正しく選んでいます。スコアは満点（${step.maxScore}点）としてください。フィードバックでは、各正解選択肢がなぜ適切かを選択肢解説を参照して具体的に述べてください。`
      }
      const parts = [`Step${step.stepNumber}は【複数選択】です。★システム判定: 一部正解★`]
      if (evaluation) {
        if (evaluation.correctChoices.length > 0) parts.push(`正解選択: ${evaluation.correctChoices.join(', ')}`)
        if (evaluation.incorrectChoices.length > 0) parts.push(`誤選択: ${evaluation.incorrectChoices.join(', ')}`)
        if (evaluation.missingChoices.length > 0) parts.push(`選択漏れ: ${evaluation.missingChoices.join(', ')}`)
      }
      parts.push(`記述は求められていないため、記述がなくても減点しないでください。フィードバックでは選択肢解説を参照して、正解・不正解の理由を具体的に述べてください。`)
      return parts.join(' ')
    }

    case 'ordering': {
      const optCount = (step.options as Array<unknown>)?.length || 4
      if (evaluation) {
        return `Step${step.stepNumber}は【順序並べ替え】です。★システム判定: ${evaluation.matchingPositions}/${evaluation.totalPositions}個が正しい位置★ 記述は求められていないため、記述がなくても減点しないでください。フィードバックでは正しい順序の理由を説明してください。`
      }
      return `Step${step.stepNumber}は【順序並べ替え】です。選択肢の並び順を評価してください。全${optCount}個中N個が正しい位置の場合、品質レベル = ceil(N/${optCount} * 5) で評価してください。記述は求められていないため、記述がなくても減点しないでください。`
    }

    case 'text':
      return `Step${step.stepNumber}は【記述式】です。記述内容のみで評価してください。選択肢はないため、選択がなくても問題ありません。記述の論理性、具体性、必須ポイントの網羅度で評価してください。`

    case 'hybrid': {
      if (evaluation?.isFullyCorrect) {
        return `Step${step.stepNumber}は【複数選択＋記述】です。★システム判定: 選択肢は全問正解★ 選択肢の正誤はシステムで確定済みです。あなたは記述内容（理由説明）の質のみを評価してください。記述が論理的で具体的か、必須ポイントを網羅しているかで採点してください。選択が正解であることを前提にフィードバックを生成し、記述の良い点・改善点を述べてください。`
      }
      const parts = [`Step${step.stepNumber}は【複数選択＋記述】です。★システム判定: 選択肢は一部不正解★`]
      if (evaluation) {
        if (evaluation.correctChoices.length > 0) parts.push(`正解選択: ${evaluation.correctChoices.join(', ')}`)
        if (evaluation.incorrectChoices.length > 0) parts.push(`誤選択: ${evaluation.incorrectChoices.join(', ')}`)
        if (evaluation.missingChoices.length > 0) parts.push(`選択漏れ: ${evaluation.missingChoices.join(', ')}`)
      }
      parts.push(`選択肢の正誤はシステムで確定済みです。あなたは記述内容（理由説明）の質を中心に評価してください。選択の誤りと記述の質を合わせてスコアを判断してください。`)
      return parts.join(' ')
    }

    default:
      return ''
  }
}

/** ユーザープロンプトを構築 */
export function buildScoringPrompt(request: AIScoringRequest): string {
  // この問題で使用されるスキル軸のみ抽出（ステップのtarget_skillsに含まれるもの）
  const usedSkillCodes = new Set<string>()
  for (const step of request.steps) {
    if (step.targetSkills) {
      for (const skill of step.targetSkills) {
        usedSkillCodes.add(skill)
      }
    }
  }

  // 関連するルーブリック軸のみフィルタ（target_skillsが空の場合は全軸使用）
  const relevantAxes = usedSkillCodes.size > 0
    ? request.rubricAxes.filter(a => usedSkillCodes.has(a.axisCode))
    : request.rubricAxes

  // ルーブリック軸情報
  const axesDescription = relevantAxes
    .map((axis, i) => `${i + 1}. ${axis.axisCode}: ${axis.axisName}（${axis.definition || '説明なし'}）`)
    .join('\n')

  // ステップ回答情報（問題形式に応じてフォーマット）
  const stepsDescription = request.steps
    .map(step => formatStepAnswer(step))
    .join('\n\n')

  // 模範解答（問題形式に応じてフォーマット）
  const modelAnswers = request.steps
    .map(step => formatModelAnswer(step))
    .join('\n\n')

  // 問題形式別の評価ルール
  const stepEvaluationRules = request.steps
    .map(step => getEvaluationRulesForStep(step))
    .join('\n')

  // スキル軸名一覧（JSONキー用 - 関連するもののみ）
  const skillKeys = relevantAxes.map(a => a.axisCode)

  return `【評価対象ケース】
${request.caseText.substring(0, 1000)}${request.caseText.length > 1000 ? '...(省略)' : ''}

【学習者の回答】
${stepsDescription}

【採点基準（模範解答）】
${modelAnswers}

【ルーブリック評価軸】
${axesDescription}

【メタ情報】
ヒント使用回数: ${request.hintCount}
ステップ数: ${request.steps.length}

【各ステップの問題形式と評価方法】
${stepEvaluationRules}

【評価ルール】
1. 各ステップごとに、そのステップのmax_score(${request.steps.map(s => `Step${s.stepNumber}:${s.maxScore}点`).join(', ')})を上限として採点すること。
2. ★最重要★ 「システム判定」に従うこと：
   - 「★システム判定: 正解★」「★システム判定: 全問正解★」のステップは、システムが既に正解と確認済み。スコアは指示された点数にすること。
   - 「★システム判定: 選択肢は全問正解★」（hybrid）のステップは、選択の正誤は確定済み。記述の質のみで評価すること。
   - 選択式問題のスコアはシステムが後から上書きするため、AIは主にフィードバックの質に注力すること。
3. ★スコア計算（text/hybrid記述部分）★ 採点基準の品質レベル(1-5)はmax_scoreにスケーリングすること：
   - 品質1 → max_score × 0.2 (例: 20点満点なら4点)
   - 品質3 → max_score × 0.6 (例: 20点満点なら12点)
   - 品質5 → max_score × 1.0 (例: 20点満点なら20点)
4. 各スキル軸ごとに1〜5点の整数で採点すること。
5. ★フィードバック生成★
   - 「選択肢解説」を参照し、選んだ選択肢がなぜ良い/悪いかを具体的に説明すること
   - 正解の場合：その選択が示す思考力や理解度を言及すること
   - 例：「AsIs/ToBeの整理軸を選択したことで、課題の全体像を漏れなく把握できる視点を示しています」
   - hybrid形式で選択正解の場合：選択が正しいことを認めた上で、記述の質について詳しくフィードバックすること
6. 書いていないことを加点しないこと。
7. ヒントを使いすぎている場合、適切に減点してよい。
8. ★重要★ 各ステップの問題形式（単一選択/複数選択/記述式/複合）に応じて適切に評価すること。求められていない形式の回答がなくても減点しないこと。

【出力フォーマット（厳守）】
{
  "step_scores": [
    ${request.steps.map(s => `{"step": ${s.stepNumber}, "score": 数値, "max": ${s.maxScore}, "feedback": "フィードバック"}`).join(',\n    ')}
  ],
  "skill_scores": {
    ${skillKeys.map(k => `"${k}": 数値`).join(',\n    ')}
  },
  "overall_feedback": "総合コメント（3〜5文）"
}

JSON以外の文を絶対に出力しないこと。`
}
