/**
 * HuggingFace AI プロバイダー実装
 *
 * Llama-3.3-70B-Instruct を OpenAI互換APIで呼び出し
 * （旧: Qwen2.5-72B-Instruct → 2026年2月に廃止）
 */

import type { AIProvider, AIScoringRequest, AIScoringResponse, AIScoringStepResult } from './types'
import type { CaseStudySkillAxis } from '@/lib/types/case-study'
import { buildSystemPrompt, buildScoringPrompt } from './prompt-builder'

// 利用可能なモデル（優先順）
const MODELS = [
  'meta-llama/Llama-3.3-70B-Instruct',
  'Qwen/Qwen3-32B',
] as const

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

    // モデルを順番に試行（最初に成功したものを使用）
    let lastError: Error | null = null
    for (const model of MODELS) {
      try {
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
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
          console.warn(`HuggingFace model ${model} failed: ${response.status} - ${errorText}`)
          lastError = new Error(`HuggingFace API error: ${response.status} - ${errorText}`)
          continue // 次のモデルを試行
        }

        const data = await response.json()
        const generatedText = data.choices?.[0]?.message?.content

        if (!generatedText) {
          lastError = new Error(`No response generated from model ${model}`)
          continue
        }

        console.log(`✅ HuggingFace scoring with model: ${model}`)
        return this.parseResponse(generatedText, request)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.warn(`HuggingFace model ${model} error:`, lastError.message)
        continue
      }
    }

    throw lastError || new Error('All HuggingFace models failed')
  }

  private parseResponse(rawText: string, request: AIScoringRequest): AIScoringResponse {
    // Qwen3の<think>タグを除去
    let jsonText = rawText.trim()
    if (jsonText.includes('<think>')) {
      jsonText = jsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    }

    // マークダウンコードブロックを除去（```json ... ``` 形式に対応）
    if (jsonText.startsWith('```')) {
      // ```json または ``` で始まる場合、最初の行と最後の ``` を除去
      const lines = jsonText.split('\n')
      const startIndex = lines[0].startsWith('```') ? 1 : 0
      const endIndex = lines[lines.length - 1] === '```' ? lines.length - 1 : lines.length
      jsonText = lines.slice(startIndex, endIndex).join('\n').trim()
    }

    const parsed = JSON.parse(jsonText)

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

    // この問題で使用されるスキル軸のみ抽出
    const usedSkillCodes = new Set<string>()
    for (const step of request.steps) {
      if (step.targetSkills) {
        for (const skill of step.targetSkills) {
          usedSkillCodes.add(skill)
        }
      }
    }

    // スキル軸スコアの変換（関連するもののみ）
    const skillScores: Partial<Record<CaseStudySkillAxis, number>> = {}
    for (const [key, value] of Object.entries(parsed.skill_scores)) {
      // target_skillsが設定されている場合、関連するスキルのみ含める
      if (usedSkillCodes.size > 0 && !usedSkillCodes.has(key)) continue
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
