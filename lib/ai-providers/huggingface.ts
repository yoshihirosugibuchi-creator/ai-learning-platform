/**
 * HuggingFace AI プロバイダー実装
 *
 * Qwen2.5-72B-Instruct を OpenAI互換APIで呼び出し
 */

import type { AIProvider, AIScoringRequest, AIScoringResponse, AIScoringStepResult } from './types'
import type { CaseStudySkillAxis } from '@/lib/types/case-study'
import { buildSystemPrompt, buildScoringPrompt } from './prompt-builder'

export class HuggingFaceProvider implements AIProvider {
  readonly name = 'huggingface' as const

  isAvailable(): boolean {
    return !!process.env.HUGGINGFACE_API_KEY
  }

  async score(request: AIScoringRequest): Promise<AIScoringResponse> {
    const hfToken = process.env.HUGGINGFACE_API_KEY
    if (!hfToken) {
      throw new Error('HUGGINGFACE_API_KEY is not configured')
    }

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildScoringPrompt(request)

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error')
      throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const generatedText = data.choices?.[0]?.message?.content

    if (!generatedText) {
      throw new Error('No response generated from HuggingFace API')
    }

    return this.parseResponse(generatedText, request)
  }

  private parseResponse(rawText: string, request: AIScoringRequest): AIScoringResponse {
    const parsed = JSON.parse(rawText.trim())

    if (!parsed.step_scores || !parsed.skill_scores) {
      throw new Error('Invalid scoring structure from HuggingFace')
    }

    // ステップ結果の変換
    const stepResults: AIScoringStepResult[] = parsed.step_scores.map((s: {
      step: number
      score: number
      max: number
      feedback: string
    }) => {
      // このステップに紐づくスキル軸のスコアを抽出
      const stepInfo = request.steps.find(st => st.stepNumber === s.step)
      const stepSkillScores: Partial<Record<CaseStudySkillAxis, number>> = {}
      if (stepInfo?.targetSkills) {
        for (const skill of stepInfo.targetSkills) {
          const skillKey = skill as CaseStudySkillAxis
          if (parsed.skill_scores[skillKey] !== undefined) {
            stepSkillScores[skillKey] = parsed.skill_scores[skillKey]
          }
        }
      }

      return {
        step: s.step,
        score: Math.min(s.score, s.max),
        maxScore: s.max,
        feedback: s.feedback || '',
        skillScores: stepSkillScores,
      }
    })

    // スキル軸スコアの変換
    const skillScores: Partial<Record<CaseStudySkillAxis, number>> = {}
    for (const [key, value] of Object.entries(parsed.skill_scores)) {
      skillScores[key as CaseStudySkillAxis] = Math.min(Math.max(Number(value) || 0, 1), 5)
    }

    return {
      stepResults,
      skillScores,
      overallFeedback: parsed.overall_feedback || '',
      providerUsed: 'huggingface',
      rawResponse: rawText,
    }
  }
}
