import { Model } from '@nozbe/watermelondb'
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators'

const sanitize = (raw: unknown) => (typeof raw === 'string' ? JSON.parse(raw) : raw ?? null)

/** ユーザーXP統計 */
export class UserXpStatsV2 extends Model {
  static table = 'user_xp_stats_v2'

  @text('user_id') userId!: string
  @field('total_xp') totalXp!: number
  @field('total_skp') totalSkp!: number
  @field('current_level') currentLevel!: number
  @field('quiz_xp') quizXp!: number
  @field('quiz_skp') quizSkp!: number
  @field('course_xp') courseXp!: number
  @field('course_skp') courseSkp!: number
  @field('bonus_xp') bonusXp!: number
  @field('bonus_skp') bonusSkp!: number
  @field('streak_skp') streakSkp!: number
  @field('case_study_xp') caseStudyXp!: number | null
  @field('case_study_skp') caseStudySkp!: number | null
  @field('quiz_sessions_completed') quizSessionsCompleted!: number
  @field('quiz_questions_answered') quizQuestionsAnswered!: number
  @field('quiz_questions_correct') quizQuestionsCorrect!: number
  @field('quiz_perfect_sessions') quizPerfectSessions!: number
  @field('quiz_80plus_sessions') quiz80plusSessions!: number
  @field('quiz_average_accuracy') quizAverageAccuracy!: number | null
  @field('quiz_learning_time_seconds') quizLearningTimeSeconds!: number | null
  @field('course_sessions_completed') courseSessionsCompleted!: number
  @field('course_completed') courseCompleted!: number | null
  @field('course_themes_completed') courseThemesCompleted!: number | null
  @field('course_learning_time_seconds') courseLearningTimeSeconds!: number | null
  @field('case_study_sessions_completed') caseStudySessionsCompleted!: number | null
  @field('case_study_average_score') caseStudyAverageScore!: number | null
  @field('total_learning_time_seconds') totalLearningTimeSeconds!: number | null
  @field('badges_total') badgesTotal!: number
  @field('wisdom_cards_total') wisdomCardsTotal!: number
  @field('knowledge_cards_total') knowledgeCardsTotal!: number
  @date('last_activity_at') lastActivityAt!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
  @date('updated_at') updatedAtDate!: Date | null
}

/** 日別XP記録 */
export class DailyXpRecord extends Model {
  static table = 'daily_xp_records'

  @text('user_id') userId!: string
  @text('date') date!: string
  @field('total_xp_earned') totalXpEarned!: number
  @field('quiz_xp_earned') quizXpEarned!: number
  @field('course_xp_earned') courseXpEarned!: number
  @field('bonus_xp_earned') bonusXpEarned!: number
  @field('case_study_xp_earned') caseStudyXpEarned!: number | null
  @field('quiz_sessions') quizSessions!: number
  @field('course_sessions') courseSessions!: number
  @field('case_study_sessions') caseStudySessions!: number | null
  @field('study_time_minutes') studyTimeMinutes!: number
  @field('total_time_seconds') totalTimeSeconds!: number | null
  @field('quiz_time_seconds') quizTimeSeconds!: number | null
  @field('course_time_seconds') courseTimeSeconds!: number | null
  @field('case_study_time_seconds') caseStudyTimeSeconds!: number | null
  @json('hourly_efficiency_data', sanitize) hourlyEfficiencyData!: unknown
  @field('learning_quality_score') learningQualityScore!: number | null
  @field('peak_study_hour') peakStudyHour!: number | null
  @readonly @date('created_at') createdAt!: Date | null
}
