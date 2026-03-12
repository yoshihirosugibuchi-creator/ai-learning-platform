import { Model } from '@nozbe/watermelondb'
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators'

const sanitize = (raw: unknown) => (typeof raw === 'string' ? JSON.parse(raw) : raw ?? null)

/** ケーススタディ問題 */
export class CaseStudyProblem extends Model {
  static table = 'case_study_problems'

  @text('title') title!: string
  @text('case_text') caseText!: string
  @text('primary_category_id') primaryCategoryId!: string
  @text('primary_subcategory_id') primarySubcategoryId!: string
  @text('difficulty') difficulty!: string
  @text('industry') industry!: string | null
  @text('scenario_type') scenarioType!: string | null
  @field('estimated_minutes') estimatedMinutes!: number | null
  @field('step_count') stepCount!: number
  @text('step_template') stepTemplate!: string | null
  @text('status') status!: string
  @field('is_ai_generated') isAiGenerated!: boolean | null
  @field('custom_base_xp_per_step') customBaseXpPerStep!: number | null
  @text('scoring_ai_provider') scoringAiProvider!: string | null
  @text('featured_date') featuredDate!: string | null
  @text('created_by') createdBy!: string | null
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** ケーススタディ ステップ */
export class CaseStudyStep extends Model {
  static table = 'case_study_steps'

  @text('problem_id') problemId!: string
  @field('step_number') stepNumber!: number
  @text('step_name') stepName!: string
  @text('description') description!: string
  @text('category_id') categoryId!: string
  @text('subcategory_id') subcategoryId!: string
  @text('question_type') questionType!: string
  @json('options', sanitize) options!: unknown
  @json('model_answer', sanitize) modelAnswer!: unknown
  @text('hint') hint!: string | null
  @json('target_skills', sanitize) targetSkills!: unknown
  @field('max_score') maxScore!: number | null
  @field('display_order') displayOrder!: number | null
  @readonly @date('created_at') createdAt!: Date | null
}

/** 評価ルーブリック（18軸） */
export class CaseStudyRubricAxis extends Model {
  static table = 'case_study_rubric_axes'

  @text('axis_code') axisCode!: string
  @text('axis_name') axisName!: string
  @text('definition') definition!: string
  @text('rubric_group_code') rubricGroupCode!: string
  @text('rubric_group_name') rubricGroupName!: string
  @json('score_anchors', sanitize) scoreAnchors!: unknown
  @json('evaluation_points', sanitize) evaluationPoints!: unknown
  @field('display_order') displayOrder!: number
  @field('is_active') isActive!: boolean | null
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** ケーススタディ オプション */
export class CaseStudyOption extends Model {
  static table = 'case_study_options'

  @text('option_type') optionType!: string
  @text('code') code!: string
  @text('name') name!: string
  @text('name_en') nameEn!: string | null
  @text('description') description!: string | null
  @json('target_skills', sanitize) targetSkills!: unknown
  @field('is_extended') isExtended!: boolean | null
  @field('is_active') isActive!: boolean | null
  @field('display_order') displayOrder!: number | null
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** ケーススタディ コースリンク */
export class CaseStudyCourseLink extends Model {
  static table = 'case_study_course_links'

  @text('course_id') courseId!: string
  @text('problem_id') problemId!: string
  @field('display_after_session') displayAfterSession!: number | null
  @readonly @date('created_at') createdAt!: Date | null
}

/** ケーススタディ セッション（ユーザーデータ） */
export class CaseStudySession extends Model {
  static table = 'case_study_sessions'

  @text('user_id') userId!: string
  @text('problem_id') problemId!: string
  @text('status') status!: string
  @field('current_step') currentStep!: number | null
  @field('is_retry') isRetry!: boolean | null
  @field('hint_count') hintCount!: number | null
  @field('total_score') totalScore!: number | null
  @field('max_possible_score') maxPossibleScore!: number | null
  @field('score_percentage') scorePercentage!: number | null
  @json('scoring_result', sanitize) scoringResult!: unknown
  @field('xp_earned') xpEarned!: number | null
  @field('skp_earned') skpEarned!: number | null
  @json('bonus_details', sanitize) bonusDetails!: unknown
  @field('total_time_seconds') totalTimeSeconds!: number | null
  @date('started_at') startedAt!: Date | null
  @date('completed_at') completedAt!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
  @date('updated_at') updatedAtDate!: Date | null
}

/** ケーススタディ ステップ詳細（ユーザーデータ） */
export class CaseStudyStepDetail extends Model {
  static table = 'case_study_step_details'

  @text('session_id') sessionId!: string
  @text('step_id') stepId!: string
  @text('quiz_answer_id') quizAnswerId!: string
  @field('step_number') stepNumber!: number
  @json('selected_choices', sanitize) selectedChoices!: unknown
  @text('reasoning_text') reasoningText!: string | null
  @json('step_scoring', sanitize) stepScoring!: unknown
  @date('step_started_at') stepStartedAt!: Date | null
  @date('step_answered_at') stepAnsweredAt!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
}

/** ケーススタディ 思考ログ（ユーザーデータ） */
export class CaseStudyThinkingLog extends Model {
  static table = 'case_study_thinking_logs'

  @text('session_id') sessionId!: string
  @field('step_number') stepNumber!: number
  @text('action_type') actionType!: string
  @json('action_data', sanitize) actionData!: unknown
  @json('choices_at_action', sanitize) choicesAtAction!: unknown
  @field('reasoning_length_at_action') reasoningLengthAtAction!: number | null
  @field('time_since_step_start_ms') timeSinceStepStartMs!: number | null
  @date('timestamp') timestamp!: Date | null
}
