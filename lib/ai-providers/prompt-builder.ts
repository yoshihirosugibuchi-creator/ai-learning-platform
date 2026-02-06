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
- hybrid（複数選択＋記述）: 選択結果と記述内容の両方を評価。`
}

/** 問題形式の説明を取得 */
function getQuestionTypeLabel(questionType: QuestionType): string {
  switch (questionType) {
    case 'single': return '単一選択のみ（1つだけ選択、記述なし）'
    case 'multiple': return '複数選択のみ（1〜4つ選択可、記述なし）'
    case 'text': return '記述式のみ（選択肢なし）'
    case 'hybrid': return '複数選択＋記述（1〜4つ選択＋理由記述）'
    default: return '複数選択＋記述'
  }
}

/** ステップの回答を問題形式に応じてフォーマット */
function formatStepAnswer(step: AIScoringRequest['steps'][0]): string {
  const answer = step.answer
  const questionType = step.questionType || 'hybrid'

  const lines = [
    `Step${step.stepNumber}（${step.stepName}）[${getQuestionTypeLabel(questionType)}]:`
  ]

  // 選択式の場合のみ選択結果を表示
  if (questionType === 'single' || questionType === 'multiple' || questionType === 'hybrid') {
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

  // 選択式の場合のみ理想選択肢を表示
  if (questionType === 'single' || questionType === 'multiple' || questionType === 'hybrid') {
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

  switch (questionType) {
    case 'single':
      return `Step${step.stepNumber}は【単一選択】です。選択結果のみで評価してください。記述は求められていないため、記述がなくても減点しないでください。正解選択肢を選んでいれば高得点、不正解なら低得点としてください。`

    case 'multiple':
      return `Step${step.stepNumber}は【複数選択】です。選択結果のみで評価してください。記述は求められていないため、記述がなくても減点しないでください。正解選択肢を全て選び不正解を選ばなければ満点、部分的に正解なら部分点としてください。`

    case 'text':
      return `Step${step.stepNumber}は【記述式】です。記述内容のみで評価してください。選択肢はないため、選択がなくても問題ありません。記述の論理性、具体性、必須ポイントの網羅度で評価してください。`

    case 'hybrid':
      return `Step${step.stepNumber}は【複数選択＋記述】です。選択結果と記述内容の両方を評価してください。選択の正確さと、記述による理由説明の質の両方が求められます。`

    default:
      return ''
  }
}

/** ユーザープロンプトを構築 */
export function buildScoringPrompt(request: AIScoringRequest): string {
  // ルーブリック軸情報
  const axesDescription = request.rubricAxes
    .map((axis, i) => `${i + 1}. ${axis.axisNameEn}: ${axis.axisName}（${axis.description || '説明なし'}）重み: ${(axis.weight * 100).toFixed(0)}%`)
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

  // スキル軸名一覧（JSONキー用）
  const skillKeys = request.rubricAxes.map(a => a.axisNameEn)

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
2. ★スコア計算★ 採点基準の品質レベル(1-5)はmax_scoreにスケーリングすること：
   - 品質1 → max_score × 0.2 (例: 20点満点なら4点)
   - 品質3 → max_score × 0.6 (例: 20点満点なら12点)
   - 品質5 → max_score × 1.0 (例: 20点満点なら20点)
3. 各スキル軸ごとに1〜5点の整数で採点すること。
4. ★フィードバック生成★
   - 「選択肢解説」を参照し、選んだ選択肢がなぜ良い/悪いかを具体的に説明すること
   - 「正解を選びました」だけでなく、その選択が示す思考力や理解度を言及すること
   - 例：「AsIs/ToBeの整理軸を選択したことで、課題の全体像を漏れなく把握できる視点を示しています」
5. 書いていないことを加点しないこと。
6. ヒントを使いすぎている場合、適切に減点してよい。
7. ★重要★ 各ステップの問題形式（単一選択/複数選択/記述式/複合）に応じて適切に評価すること。求められていない形式の回答がなくても減点しないこと。

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
