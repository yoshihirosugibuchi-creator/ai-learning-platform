/**
 * ユーザーXP統計・日別記録 データ取得
 * ローカルDB優先 → Supabaseフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import { resolveData } from '../data-source'

// ========== 共通型定義 ==========

export interface UserXpStats {
  user_id: string
  total_xp: number
  total_skp: number
  current_level: number
  quiz_xp: number
  quiz_skp: number
  course_xp: number
  course_skp: number
  bonus_xp: number
  bonus_skp: number
  streak_skp: number
  case_study_xp: number
  case_study_skp: number
  quiz_sessions_completed: number
  quiz_questions_answered: number
  quiz_questions_correct: number
  quiz_perfect_sessions: number
  quiz_80plus_sessions: number
  quiz_average_accuracy: number | null
  quiz_learning_time_seconds: number | null
  course_sessions_completed: number
  course_completed: number | null
  course_themes_completed: number | null
  course_learning_time_seconds: number | null
  case_study_sessions_completed: number | null
  case_study_average_score: number | null
  total_learning_time_seconds: number | null
  badges_total: number
  wisdom_cards_total: number
  knowledge_cards_total: number
  last_activity_at: string | null
}

export interface DailyXpRecord {
  user_id: string
  date: string
  total_xp_earned: number
  quiz_xp_earned: number
  course_xp_earned: number
  bonus_xp_earned: number
  case_study_xp_earned: number
  quiz_sessions: number
  course_sessions: number
  case_study_sessions: number
  study_time_minutes: number
  total_time_seconds: number | null
}

export interface UserStatsData {
  xpStats: UserXpStats | null
  dailyRecords: DailyXpRecord[]
}

// ========== 共通処理ロジック ==========

/** 簡易統計を計算（PC/モバイル共通） */
export function computeQuizSummary(stats: UserXpStats | null) {
  if (!stats) {
    return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, totalQuizzes: 0, averageScore: 0, totalTimeSpent: 0 }
  }
  const averageScore = stats.quiz_average_accuracy
    ? Math.round(stats.quiz_average_accuracy > 1 ? stats.quiz_average_accuracy : stats.quiz_average_accuracy * 100)
    : 0
  return {
    totalQuestions: stats.quiz_questions_answered,
    correctAnswers: stats.quiz_questions_correct,
    accuracy: averageScore,
    totalQuizzes: stats.quiz_sessions_completed,
    averageScore,
    totalTimeSpent: Math.round((stats.quiz_learning_time_seconds || 0) / 60),
  }
}

// ========== データソース: ローカルDB ==========

async function loadFromLocalDB(db: WMDatabase, userId?: string): Promise<UserStatsData | null> {
  if (!userId) return null

  const [statsRaw, dailyRaw] = await Promise.all([
    db.get('user_xp_stats_v2').query().fetch(),
    db.get('daily_xp_records').query().fetch(),
  ])

  // ユーザーのXP統計を検索
  const userStatsRecord = statsRaw.find(record => {
    const raw = (record as { _raw: Record<string, unknown> })._raw
    return raw.user_id === userId
  })

  if (!userStatsRecord) return null

  const raw = (userStatsRecord as { _raw: Record<string, unknown> })._raw
  const xpStats: UserXpStats = {
    user_id: String(raw.user_id),
    total_xp: Number(raw.total_xp) || 0,
    total_skp: Number(raw.total_skp) || 0,
    current_level: Number(raw.current_level) || 1,
    quiz_xp: Number(raw.quiz_xp) || 0,
    quiz_skp: Number(raw.quiz_skp) || 0,
    course_xp: Number(raw.course_xp) || 0,
    course_skp: Number(raw.course_skp) || 0,
    bonus_xp: Number(raw.bonus_xp) || 0,
    bonus_skp: Number(raw.bonus_skp) || 0,
    streak_skp: Number(raw.streak_skp) || 0,
    case_study_xp: Number(raw.case_study_xp) || 0,
    case_study_skp: Number(raw.case_study_skp) || 0,
    quiz_sessions_completed: Number(raw.quiz_sessions_completed) || 0,
    quiz_questions_answered: Number(raw.quiz_questions_answered) || 0,
    quiz_questions_correct: Number(raw.quiz_questions_correct) || 0,
    quiz_perfect_sessions: Number(raw.quiz_perfect_sessions) || 0,
    quiz_80plus_sessions: Number(raw.quiz_80plus_sessions) || 0,
    quiz_average_accuracy: raw.quiz_average_accuracy != null ? Number(raw.quiz_average_accuracy) : null,
    quiz_learning_time_seconds: raw.quiz_learning_time_seconds != null ? Number(raw.quiz_learning_time_seconds) : null,
    course_sessions_completed: Number(raw.course_sessions_completed) || 0,
    course_completed: raw.course_completed != null ? Number(raw.course_completed) : null,
    course_themes_completed: raw.course_themes_completed != null ? Number(raw.course_themes_completed) : null,
    course_learning_time_seconds: raw.course_learning_time_seconds != null ? Number(raw.course_learning_time_seconds) : null,
    case_study_sessions_completed: raw.case_study_sessions_completed != null ? Number(raw.case_study_sessions_completed) : null,
    case_study_average_score: raw.case_study_average_score != null ? Number(raw.case_study_average_score) : null,
    total_learning_time_seconds: raw.total_learning_time_seconds != null ? Number(raw.total_learning_time_seconds) : null,
    badges_total: Number(raw.badges_total) || 0,
    wisdom_cards_total: Number(raw.wisdom_cards_total) || 0,
    knowledge_cards_total: Number(raw.knowledge_cards_total) || 0,
    last_activity_at: raw.last_activity_at ? new Date(Number(raw.last_activity_at)).toISOString() : null,
  }

  // ユーザーの日別記録をフィルタ
  const dailyRecords: DailyXpRecord[] = dailyRaw
    .filter(record => {
      const r = (record as { _raw: Record<string, unknown> })._raw
      return r.user_id === userId
    })
    .map(record => {
      const r = (record as { _raw: Record<string, unknown> })._raw
      return {
        user_id: String(r.user_id),
        date: String(r.date),
        total_xp_earned: Number(r.total_xp_earned) || 0,
        quiz_xp_earned: Number(r.quiz_xp_earned) || 0,
        course_xp_earned: Number(r.course_xp_earned) || 0,
        bonus_xp_earned: Number(r.bonus_xp_earned) || 0,
        case_study_xp_earned: Number(r.case_study_xp_earned) || 0,
        quiz_sessions: Number(r.quiz_sessions) || 0,
        course_sessions: Number(r.course_sessions) || 0,
        case_study_sessions: Number(r.case_study_sessions) || 0,
        study_time_minutes: Number(r.study_time_minutes) || 0,
        total_time_seconds: r.total_time_seconds != null ? Number(r.total_time_seconds) : null,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  console.log(`✅ Local DB: XP stats loaded, ${dailyRecords.length} daily records`)
  return { xpStats, dailyRecords }
}

// ========== データソース: サーバー ==========

async function loadFromServer(userId?: string): Promise<UserStatsData> {
  if (!userId) return { xpStats: null, dailyRecords: [] }

  const { supabase } = await import('@/lib/supabase')

  const [statsResult, dailyResult] = await Promise.all([
    supabase.from('user_xp_stats_v2').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('daily_xp_records').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(30),
  ])

  const xpStats = statsResult.data ? {
    ...statsResult.data,
    case_study_xp: statsResult.data.case_study_xp ?? 0,
    case_study_skp: statsResult.data.case_study_skp ?? 0,
    last_activity_at: statsResult.data.last_activity_at ?? null,
  } as UserXpStats : null

  const dailyRecords: DailyXpRecord[] = (dailyResult.data ?? []).map(row => ({
    user_id: row.user_id,
    date: row.date,
    total_xp_earned: row.total_xp_earned ?? 0,
    quiz_xp_earned: row.quiz_xp_earned ?? 0,
    course_xp_earned: row.course_xp_earned ?? 0,
    bonus_xp_earned: row.bonus_xp_earned ?? 0,
    case_study_xp_earned: row.case_study_xp_earned ?? 0,
    quiz_sessions: row.quiz_sessions ?? 0,
    course_sessions: row.course_sessions ?? 0,
    case_study_sessions: row.case_study_sessions ?? 0,
    study_time_minutes: row.study_time_minutes ?? 0,
    total_time_seconds: row.total_time_seconds ?? null,
  }))

  console.log(`✅ Server: XP stats ${xpStats ? 'found' : 'not found'}, ${dailyRecords.length} daily records`)
  return { xpStats, dailyRecords }
}

// ========== エントリポイント ==========

/**
 * ユーザーXP統計＋日別記録を取得
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 * @param userId ユーザーID
 */
export async function getUserStatsData(
  database: WMDatabase | null,
  userId?: string
): Promise<UserStatsData> {
  return resolveData(
    {
      loadFromLocal: (db) => loadFromLocalDB(db, userId),
      loadFromServer: () => loadFromServer(userId),
    },
    database,
    userId
  )
}
