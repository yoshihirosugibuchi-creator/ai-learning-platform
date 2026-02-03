/**
 * ケーススタディ学習機能の型定義
 *
 * Note: これらの型はマイグレーション適用後、database-types-official.ts を
 * 再生成することで自動的に更新されます。その際、このファイルは不要になります。
 * 再生成手順: CLAUDE.md の「Supabase型定義更新」セクションを参照
 */

import type { Json } from '../database-types-official'

// ============================================================
// 難易度・ステータス・問題タイプのEnum
// ============================================================

export type CaseStudyDifficulty = 'basic' | 'intermediate' | 'advanced' | 'expert'

export type CaseStudyProblemStatus = 'draft' | 'review' | 'active' | 'archived'

export type CaseStudySessionStatus = 'in_progress' | 'completed' | 'abandoned'

export type CaseStudyQuestionType = 'single' | 'multiple' | 'ordering' | 'text' | 'hybrid'

export type CaseStudyActionType =
  | 'choice_selected'
  | 'choice_changed'
  | 'reasoning_typed'
  | 'reasoning_edited'
  | 'hint_requested'
  | 'step_submitted'

// ============================================================
// 10軸ルーブリック評価のスキル軸
// ============================================================

export type CaseStudySkillAxis =
  | 'problem_setting'       // 問題設定力
  | 'structuring_logic'     // ロジック構造化
  | 'hypothesis_thinking'   // 仮説思考
  | 'analysis_design'       // 分析設計
  | 'proposal_specificity'  // 提案具体性
  | 'perspective_diversity' // 視点の多様性
  | 'feasibility'           // 実現可能性
  | 'impact'                // インパクト
  | 'expression'            // 表現力
  | 'originality'           // 独自性

// ============================================================
// JSON構造の型定義
// ============================================================

/** 選択肢オプションの構造 */
export interface CaseStudyStepOption {
  id: string
  text: string
  is_correct: boolean
  partial_score: number
}

/** 模範解答・採点基準の構造 */
export interface CaseStudyModelAnswer {
  ideal_choices?: string[]
  acceptable_choices?: string[]
  essential_points?: string[]
  good_examples?: string[]
  common_mistakes?: string[]
  scoring_anchors?: {
    '1': string
    '2': string
    '3': string
    '4': string
    '5': string
  }
}

/** AI採点結果の構造（セッション全体） */
export interface CaseStudyScoringResult {
  step_scores: Array<{
    step: number
    score: number
    max: number
    feedback: string
  }>
  skill_scores: Partial<Record<CaseStudySkillAxis, number>>
  overall_feedback: string
}

/** ステップ別AI採点結果の構造 */
export interface CaseStudyStepScoring {
  score: number
  max_score: number
  skill_scores?: Partial<Record<CaseStudySkillAxis, number>>
  keyword_match?: {
    found: string[]
    missing: string[]
  }
  feedback: string
  improvement_points?: string[]
}

/** ボーナス詳細の構造 */
export interface CaseStudyBonusDetails {
  high_score?: number
  no_hint?: number
  quick?: number
}

/** 思考ログのアクションデータ構造 */
export type CaseStudyActionData =
  | { choice: string }                      // choice_selected
  | { from: string; to: string }            // choice_changed
  | { text_length: number; word_count: number }  // reasoning_typed
  | Record<string, never>                   // hint_requested
  | Record<string, never>                   // step_submitted

// ============================================================
// テーブル型定義（Row/Insert/Update）
// ============================================================

// ------------------------------------------------------------
// case_study_problems（問題マスタ）
// ------------------------------------------------------------

export interface CaseStudyProblemRow {
  id: string
  title: string
  case_text: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty: CaseStudyDifficulty
  industry: string | null
  scenario_type: string | null
  estimated_minutes: number
  step_count: number
  custom_base_xp_per_step: number | null
  is_ai_generated: boolean
  generation_prompt: string | null
  generation_model: string | null
  generation_parameters: Json | null
  status: CaseStudyProblemStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CaseStudyProblemInsert {
  id?: string
  title: string
  case_text: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty?: CaseStudyDifficulty
  industry?: string | null
  scenario_type?: string | null
  estimated_minutes?: number
  step_count?: number
  custom_base_xp_per_step?: number | null
  is_ai_generated?: boolean
  generation_prompt?: string | null
  generation_model?: string | null
  generation_parameters?: Json | null
  status?: CaseStudyProblemStatus
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface CaseStudyProblemUpdate {
  id?: string
  title?: string
  case_text?: string
  primary_category_id?: string
  primary_subcategory_id?: string
  difficulty?: CaseStudyDifficulty
  industry?: string | null
  scenario_type?: string | null
  estimated_minutes?: number
  step_count?: number
  custom_base_xp_per_step?: number | null
  is_ai_generated?: boolean
  generation_prompt?: string | null
  generation_model?: string | null
  generation_parameters?: Json | null
  status?: CaseStudyProblemStatus
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// ------------------------------------------------------------
// case_study_steps（ステップ定義）
// ------------------------------------------------------------

export interface CaseStudyStepRow {
  id: string
  problem_id: string
  step_number: number
  step_name: string
  description: string
  category_id: string
  subcategory_id: string
  question_type: CaseStudyQuestionType
  options: CaseStudyStepOption[] | null
  model_answer: CaseStudyModelAnswer
  hint: string | null
  target_skills: CaseStudySkillAxis[]
  max_score: number
  display_order: number | null
  created_at: string
}

export interface CaseStudyStepInsert {
  id?: string
  problem_id: string
  step_number: number
  step_name: string
  description: string
  category_id: string
  subcategory_id: string
  question_type: CaseStudyQuestionType
  options?: CaseStudyStepOption[] | null
  model_answer: CaseStudyModelAnswer
  hint?: string | null
  target_skills: CaseStudySkillAxis[]
  max_score?: number
  display_order?: number | null
  created_at?: string
}

export interface CaseStudyStepUpdate {
  id?: string
  problem_id?: string
  step_number?: number
  step_name?: string
  description?: string
  category_id?: string
  subcategory_id?: string
  question_type?: CaseStudyQuestionType
  options?: CaseStudyStepOption[] | null
  model_answer?: CaseStudyModelAnswer
  hint?: string | null
  target_skills?: CaseStudySkillAxis[]
  max_score?: number
  display_order?: number | null
  created_at?: string
}

// ------------------------------------------------------------
// case_study_sessions（学習セッション）
// ------------------------------------------------------------

export interface CaseStudySessionRow {
  id: string
  user_id: string
  problem_id: string
  status: CaseStudySessionStatus
  current_step: number
  is_retry: boolean
  started_at: string
  completed_at: string | null
  total_time_seconds: number | null
  hint_count: number
  scoring_result: CaseStudyScoringResult | null
  total_score: number | null
  max_possible_score: number | null
  score_percentage: number | null
  xp_earned: number
  skp_earned: number
  bonus_details: CaseStudyBonusDetails | null
  created_at: string
  updated_at: string
}

export interface CaseStudySessionInsert {
  id?: string
  user_id: string
  problem_id: string
  status?: CaseStudySessionStatus
  current_step?: number
  is_retry?: boolean
  started_at?: string
  completed_at?: string | null
  total_time_seconds?: number | null
  hint_count?: number
  scoring_result?: CaseStudyScoringResult | null
  total_score?: number | null
  max_possible_score?: number | null
  score_percentage?: number | null
  xp_earned?: number
  skp_earned?: number
  bonus_details?: CaseStudyBonusDetails | null
  created_at?: string
  updated_at?: string
}

export interface CaseStudySessionUpdate {
  id?: string
  user_id?: string
  problem_id?: string
  status?: CaseStudySessionStatus
  current_step?: number
  is_retry?: boolean
  started_at?: string
  completed_at?: string | null
  total_time_seconds?: number | null
  hint_count?: number
  scoring_result?: CaseStudyScoringResult | null
  total_score?: number | null
  max_possible_score?: number | null
  score_percentage?: number | null
  xp_earned?: number
  skp_earned?: number
  bonus_details?: CaseStudyBonusDetails | null
  created_at?: string
  updated_at?: string
}

// ------------------------------------------------------------
// case_study_step_details（回答詳細）
// ------------------------------------------------------------

export interface CaseStudyStepDetailRow {
  id: string
  quiz_answer_id: string
  session_id: string
  step_id: string
  step_number: number
  selected_choices: string[] | null
  reasoning_text: string | null
  step_scoring: CaseStudyStepScoring | null
  step_started_at: string | null
  step_answered_at: string | null
  created_at: string
}

export interface CaseStudyStepDetailInsert {
  id?: string
  quiz_answer_id: string
  session_id: string
  step_id: string
  step_number: number
  selected_choices?: string[] | null
  reasoning_text?: string | null
  step_scoring?: CaseStudyStepScoring | null
  step_started_at?: string | null
  step_answered_at?: string | null
  created_at?: string
}

export interface CaseStudyStepDetailUpdate {
  id?: string
  quiz_answer_id?: string
  session_id?: string
  step_id?: string
  step_number?: number
  selected_choices?: string[] | null
  reasoning_text?: string | null
  step_scoring?: CaseStudyStepScoring | null
  step_started_at?: string | null
  step_answered_at?: string | null
  created_at?: string
}

// ------------------------------------------------------------
// case_study_thinking_logs（思考プロセスログ）
// ------------------------------------------------------------

export interface CaseStudyThinkingLogRow {
  id: string
  session_id: string
  step_number: number
  action_type: CaseStudyActionType
  action_data: CaseStudyActionData | null
  timestamp: string
  time_since_step_start_ms: number | null
  choices_at_action: string[] | null
  reasoning_length_at_action: number | null
}

export interface CaseStudyThinkingLogInsert {
  id?: string
  session_id: string
  step_number: number
  action_type: CaseStudyActionType
  action_data?: CaseStudyActionData | null
  timestamp?: string
  time_since_step_start_ms?: number | null
  choices_at_action?: string[] | null
  reasoning_length_at_action?: number | null
}

export interface CaseStudyThinkingLogUpdate {
  id?: string
  session_id?: string
  step_number?: number
  action_type?: CaseStudyActionType
  action_data?: CaseStudyActionData | null
  timestamp?: string
  time_since_step_start_ms?: number | null
  choices_at_action?: string[] | null
  reasoning_length_at_action?: number | null
}

// ============================================================
// エイリアス型（database-types-official.ts との整合性）
// ============================================================

export type CaseStudyProblem = CaseStudyProblemRow
export type CaseStudyStep = CaseStudyStepRow
export type CaseStudySession = CaseStudySessionRow
export type CaseStudyStepDetail = CaseStudyStepDetailRow
export type CaseStudyThinkingLog = CaseStudyThinkingLogRow

// ============================================================
// API レスポンス用の型定義
// ============================================================

/** セッション開始APIレスポンス */
export interface CaseStudyStartSessionResponse {
  success: boolean
  session_id: string
  is_retry: boolean
  problem: CaseStudyProblem
  steps: CaseStudyStep[]
  current_step: number
}

/** 回答提出APIレスポンス */
export interface CaseStudyAnswerResponse {
  success: boolean
  next_step?: number
  is_last_step: boolean
  is_update?: boolean
}

/** セッション完了APIレスポンス */
export interface CaseStudyCompleteResponse {
  success: boolean
  scoring_result: {
    total_score: number
    max_possible_score: number
    score_percentage: number
    step_scores: Array<{ step: number; score: number; feedback: string }>
    skill_scores: Partial<Record<CaseStudySkillAxis, number>>
    overall_feedback: string
  }
  rewards: {
    xp_earned: number
    skp_earned: number
    is_retry: boolean
    bonus_details: CaseStudyBonusDetails
  }
}

/** 問題一覧取得時の拡張型 */
export interface CaseStudyProblemWithStats extends CaseStudyProblem {
  total_sessions?: number
  average_score?: number
  completion_rate?: number
}

/** レコメンドAPI用 */
export interface CaseStudyRecommendation extends CaseStudyProblem {
  recommendation_score: number
  recommendation_reason: string
}

// ============================================================
// XP設定キーの型定義
// ============================================================

export interface CaseStudyXPSettings {
  xp_case_study_step: Record<CaseStudyDifficulty, number>
  xp_bonus: {
    case_study_high_score: number
    case_study_no_hint: number
    case_study_quick: number
  }
  skp: {
    case_study_base: number
    case_study_high_score_bonus: number
  }
}

/** XP計算に必要なセッション情報 */
export interface CaseStudySessionForXPCalculation {
  total_score: number
  max_possible_score: number
  hint_count: number
  total_time_seconds: number
  is_retry: boolean
}

/** XP計算に必要な問題情報 */
export interface CaseStudyProblemForXPCalculation {
  difficulty: CaseStudyDifficulty
  step_count: number
  custom_base_xp_per_step: number | null
}
