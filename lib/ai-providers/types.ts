/**
 * AI採点プロバイダー共通型定義
 */

import type { CaseStudySkillAxis } from '@/lib/types/case-study'

/** サポートするAIプロバイダー名 */
export type AIProviderName = 'huggingface' | 'openai' | 'anthropic' | 'gemini'

/** 問題形式タイプ */
export type QuestionType = 'single' | 'multiple' | 'ordering' | 'text' | 'hybrid'

/** 採点リクエスト */
export interface AIScoringRequest {
  /** ケースの本文 */
  caseText: string
  /** 各ステップの情報と回答 */
  steps: Array<{
    stepNumber: number
    stepName: string
    description: string
    /** 問題形式: single=単一選択, multiple=複数選択, text=記述のみ, hybrid=選択+記述 */
    questionType: QuestionType
    options: unknown
    modelAnswer: unknown
    targetSkills: string[]
    maxScore: number
    answer: {
      selectedChoices: string[] | null
      reasoningText: string | null
    } | null
  }>
  /** ルーブリック軸の情報 */
  rubricAxes: Array<{
    axisName: string
    axisNameEn: string
    description: string | null
    weight: number
    rubricGroupName: string
  }>
  /** ヒント使用回数 */
  hintCount: number
  /** ステップ別所要時間（秒） */
  stepTimes?: Record<number, number>
}

/** 採点レスポンス（ステップ単位） */
export interface AIScoringStepResult {
  step: number
  score: number
  maxScore: number
  feedback: string
  skillScores: Partial<Record<CaseStudySkillAxis, number>>
}

/** 採点レスポンス（全体） */
export interface AIScoringResponse {
  stepResults: AIScoringStepResult[]
  skillScores: Partial<Record<CaseStudySkillAxis, number>>
  overallFeedback: string
  /** 使用プロバイダー名 */
  providerUsed: AIProviderName
  /** 生のAIレスポンス（デバッグ用） */
  rawResponse?: string
}

/** AIプロバイダーインターフェース */
export interface AIProvider {
  /** プロバイダー名 */
  readonly name: AIProviderName
  /** 利用可能かどうか（APIキーの存在確認等） */
  isAvailable(): boolean
  /** 採点を実行 */
  score(request: AIScoringRequest): Promise<AIScoringResponse>
}
