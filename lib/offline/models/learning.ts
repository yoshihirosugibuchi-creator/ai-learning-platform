import { Model } from '@nozbe/watermelondb'
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators'

const sanitize = (raw: unknown) => (typeof raw === 'string' ? JSON.parse(raw) : raw ?? null)

/** 学習コース */
export class LearningCourse extends Model {
  static table = 'learning_courses'

  @text('title') title!: string
  @text('description') description!: string
  @text('difficulty') difficulty!: string
  @text('icon') icon!: string
  @text('color') color!: string
  @field('display_order') displayOrder!: number
  @field('estimated_days') estimatedDays!: number
  @text('status') status!: string
  @json('badge_data', sanitize) badgeData!: unknown
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** 学習ジャンル */
export class LearningGenre extends Model {
  static table = 'learning_genres'

  @text('course_id') courseId!: string
  @text('title') title!: string
  @text('description') description!: string
  @field('display_order') displayOrder!: number
  @field('estimated_days') estimatedDays!: number
  @text('category_id') categoryId!: string
  @text('subcategory_id') subcategoryId!: string | null
  @json('badge_data', sanitize) badgeData!: unknown
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** 学習テーマ */
export class LearningTheme extends Model {
  static table = 'learning_themes'

  @text('genre_id') genreId!: string
  @text('title') title!: string
  @text('description') description!: string
  @field('display_order') displayOrder!: number
  @field('estimated_minutes') estimatedMinutes!: number
  @text('subcategory_id') subcategoryId!: string | null
  @json('reward_card_data', sanitize) rewardCardData!: unknown
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** 学習セッション */
export class LearningSession extends Model {
  static table = 'learning_sessions'

  @text('theme_id') themeId!: string
  @text('title') title!: string
  @field('display_order') displayOrder!: number
  @field('estimated_minutes') estimatedMinutes!: number
  @text('session_type') sessionType!: string
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** セッションコンテンツ */
export class SessionContent extends Model {
  static table = 'session_contents'

  @text('session_id') sessionId!: string
  @text('title') title!: string | null
  @text('content') content!: string
  @text('content_type') contentType!: string
  @field('display_order') displayOrder!: number
  @field('duration') duration!: number | null
  @readonly @date('created_at') createdAt!: Date | null
}

/** コースセッション完了記録（ユーザーデータ） */
export class CourseSessionCompletion extends Model {
  static table = 'course_session_completions'

  @text('user_id') userId!: string
  @text('session_id') sessionId!: string
  @text('course_id') courseId!: string
  @text('genre_id') genreId!: string
  @text('theme_id') themeId!: string
  @text('category_id') categoryId!: string
  @text('subcategory_id') subcategoryId!: string
  @field('earned_xp') earnedXp!: number
  @field('is_first_completion') isFirstCompletion!: boolean
  @field('session_quiz_correct') sessionQuizCorrect!: boolean
  @field('review_count') reviewCount!: number
  @field('duration_seconds') durationSeconds!: number | null
  @date('completion_time') completionTime!: Date
  @date('session_start_time') sessionStartTime!: Date | null
  @date('session_end_time') sessionEndTime!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
}
