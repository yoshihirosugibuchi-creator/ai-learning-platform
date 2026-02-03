/**
 * AI採点プロンプト構築
 *
 * ルーブリック軸＋回答情報からスコアリングプロンプトを生成
 */

import type { AIScoringRequest } from './types'

/** システムプロンプトを構築 */
export function buildSystemPrompt(): string {
  return `あなたは一流のビジネスコンサルタント教育の専門家です。学習者のケーススタディ回答をルーブリック軸で客観的に評価します。

出力ルール：
1. 必ずJSON形式で出力してください
2. 各ステップの採点と、スキル軸別スコア(1-5点)を返してください
3. フィードバックは具体的に、回答内の記述に言及しながら述べてください
4. 書いていないことを加点しないでください
5. JSON以外の文を絶対に出力しないでください`
}

/** ユーザープロンプトを構築 */
export function buildScoringPrompt(request: AIScoringRequest): string {
  // ルーブリック軸情報
  const axesDescription = request.rubricAxes
    .map((axis, i) => `${i + 1}. ${axis.axisNameEn}: ${axis.axisName}（${axis.description || '説明なし'}）重み: ${(axis.weight * 100).toFixed(0)}%`)
    .join('\n')

  // ステップ回答情報
  const stepsDescription = request.steps
    .map(step => {
      const answer = step.answer
      const choices = answer?.selectedChoices?.join(', ') || '(未選択)'
      const reasoning = answer?.reasoningText || '(記述なし)'
      return `Step${step.stepNumber}（${step.stepName}）:
  選択: ${choices}
  記述: ${reasoning}`
    })
    .join('\n\n')

  // 模範解答（採点基準として使用）
  const modelAnswers = request.steps
    .map(step => {
      const ma = step.modelAnswer as {
        ideal_choices?: string[]
        essential_points?: string[]
        scoring_anchors?: Record<string, string>
      } | null
      if (!ma) return `Step${step.stepNumber}: (模範解答なし)`
      const parts = [`Step${step.stepNumber}（${step.stepName}）:`]
      if (ma.ideal_choices?.length) parts.push(`  理想選択: ${ma.ideal_choices.join(', ')}`)
      if (ma.essential_points?.length) parts.push(`  必須ポイント: ${ma.essential_points.join('; ')}`)
      if (ma.scoring_anchors) {
        parts.push(`  採点アンカー:`)
        for (const [score, desc] of Object.entries(ma.scoring_anchors)) {
          parts.push(`    ${score}点: ${desc}`)
        }
      }
      return parts.join('\n')
    })
    .join('\n\n')

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

【評価ルール】
1. 各ステップごとに、そのステップのmax_score(${request.steps.map(s => `Step${s.stepNumber}:${s.maxScore}点`).join(', ')})を上限として採点すること。
2. 各スキル軸ごとに1〜5点の整数で採点すること。
3. フィードバックは客観的に、回答内の具体的行動・記述に言及しながら述べること。
4. 書いていないことを加点しないこと。
5. ヒントを使いすぎている場合、適切に減点してよい。

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
