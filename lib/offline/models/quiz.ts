import { Model } from '@nozbe/watermelondb'
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators'

const sanitize = (raw: unknown) => (typeof raw === 'string' ? JSON.parse(raw) : raw ?? null)

/** クイズ問題マスタ */
export class QuizQuestion extends Model {
  static table = 'quiz_questions'

  @field('server_id') serverId!: number
  @text('category_id') categoryId!: string
  @text('subcategory_id') subcategoryId!: string | null
  @text('question') question!: string
  @text('option1') option1!: string
  @text('option2') option2!: string
  @text('option3') option3!: string
  @text('option4') option4!: string
  @field('correct_answer') correctAnswer!: number
  @text('difficulty') difficulty!: string | null
  @text('explanation') explanation!: string | null
  @text('level1_hint') level1Hint!: string | null
  @text('level2_hint') level2Hint!: string | null
  @text('level3_hint') level3Hint!: string | null
  @field('time_limit') timeLimit!: number | null
  @text('source') source!: string | null
  @field('is_deleted') isDeleted!: boolean | null
  @json('related_topics', sanitize) relatedTopics!: unknown
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** クイズパック */
export class QuizPack extends Model {
  static table = 'quiz_packs'

  @text('name') name!: string
  @text('description') description!: string | null
  @field('question_count') questionCount!: number
  @json('categories', sanitize) categories!: unknown
  @json('difficulties', sanitize) difficulties!: unknown
  @json('subcategories', sanitize) subcategories!: unknown
  @field('display_order') displayOrder!: number
  @field('is_published') isPublished!: boolean
  @text('icon_emoji') iconEmoji!: string | null
  @text('color_theme') colorTheme!: string | null
  @field('total_attempts') totalAttempts!: number
  @field('average_score') averageScore!: number | null
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}

/** コース内クイズ */
export class SessionQuiz extends Model {
  static table = 'session_quizzes'

  @text('session_id') sessionId!: string
  @text('question') question!: string
  @field('correct_answer') correctAnswer!: number
  @json('options', sanitize) options!: unknown
  @text('explanation') explanation!: string
  @field('display_order') displayOrder!: number
  @text('quiz_type') quizType!: string
  @readonly @date('created_at') createdAt!: Date | null
}

/** クイズセッション（ユーザーデータ） */
export class QuizSession extends Model {
  static table = 'quiz_sessions'

  @text('user_id') userId!: string
  @text('quiz_type') quizType!: string
  @text('status') status!: string
  @field('total_questions') totalQuestions!: number
  @field('correct_answers') correctAnswers!: number
  @field('accuracy_rate') accuracyRate!: number
  @field('total_xp') totalXp!: number
  @field('bonus_xp') bonusXp!: number
  @field('duration_seconds') durationSeconds!: number | null
  @text('category_id') categoryId!: string | null
  @text('subcategory_id') subcategoryId!: string | null
  @text('pack_id') packId!: string | null
  @json('question_ids', sanitize) questionIds!: unknown
  @field('current_question_index') currentQuestionIndex!: number | null
  @field('wisdom_cards_awarded') wisdomCardsAwarded!: number | null
  @date('session_start_time') sessionStartTime!: Date
  @date('session_end_time') sessionEndTime!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
  @date('updated_at') updatedAtDate!: Date | null
}

/** 事前生成クイズセット（ユーザーデータ） */
export class PrecomputedQuizSet extends Model {
  static table = 'precomputed_quiz_sets'

  @text('user_id') userId!: string
  @text('quiz_type') quizType!: string
  @json('question_ids', sanitize) questionIds!: number[]
  @json('analysis_data', sanitize) analysisData!: unknown
  @date('used_at') usedAt!: Date | null
  @date('expires_at') expiresAt!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
}

/** クイズ回答（ユーザーデータ） */
export class QuizAnswer extends Model {
  static table = 'quiz_answers'

  @text('user_id') userId!: string | null
  @text('quiz_session_id') quizSessionId!: string | null
  @text('question_id') questionId!: string
  @text('category_id') categoryId!: string
  @text('subcategory_id') subcategoryId!: string
  @text('difficulty') difficulty!: string
  @field('is_correct') isCorrect!: boolean
  @field('is_timeout') isTimeout!: boolean
  @field('user_answer') userAnswer!: number | null
  @field('earned_xp') earnedXp!: number
  @field('time_spent') timeSpent!: number
  @field('hint_used') hintUsed!: boolean
  @field('max_hint_level') maxHintLevel!: number | null
  @json('hint_usage_details', sanitize) hintUsageDetails!: unknown
  @field('confidence_level') confidenceLevel!: number | null
  @field('review_needed') reviewNeeded!: boolean
  @text('review_reason') reviewReason!: string | null
  @date('reviewed_at') reviewedAt!: Date | null
  @text('course_id') courseId!: string | null
  @text('course_session_id') courseSessionId!: string | null
  @text('theme_id') themeId!: string | null
  @text('genre_id') genreId!: string | null
  @text('session_type') sessionType!: string | null
  @readonly @date('created_at') createdAt!: Date | null
}
