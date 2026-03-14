/**
 * クイズ履歴（セッション＋回答） データ取得
 * ローカルDB優先 → Supabaseフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import { resolveData } from '../data-source'

// ========== 共通型定義 ==========

export interface QuizSessionRecord {
  id: string
  user_id: string
  quiz_type: string
  status: string
  total_questions: number
  correct_answers: number
  accuracy_rate: number
  total_xp: number
  bonus_xp: number
  duration_seconds: number | null
  category_id: string | null
  subcategory_id: string | null
  pack_id: string | null
  session_start_time: string
  session_end_time: string | null
  created_at: string | null
}

export interface QuizAnswerRecord {
  id: string
  user_id: string | null
  quiz_session_id: string | null
  question_id: string
  category_id: string
  subcategory_id: string
  difficulty: string
  is_correct: boolean
  is_timeout: boolean
  user_answer: number | null
  earned_xp: number
  time_spent: number
  hint_used: boolean
  max_hint_level: number | null
  confidence_level: number | null
  review_needed: boolean
  review_reason: string | null
  reviewed_at: string | null
  created_at: string | null
}

export interface QuizHistoryData {
  sessions: QuizSessionRecord[]
  answers: QuizAnswerRecord[]
}

// ========== 共通処理ロジック ==========

/** セッションに紐づく回答を取得 */
export function getAnswersForSession(sessionId: string, answers: QuizAnswerRecord[]): QuizAnswerRecord[] {
  return answers.filter(a => a.quiz_session_id === sessionId)
}

/** カテゴリーでセッションをフィルタ（回答のcategory_idベース） */
export function filterSessionsByCategory(
  sessions: QuizSessionRecord[],
  answers: QuizAnswerRecord[],
  categoryId: string
): QuizSessionRecord[] {
  const sessionIdsWithCategory = new Set(
    answers.filter(a => a.category_id === categoryId).map(a => a.quiz_session_id)
  )
  return sessions.filter(s => sessionIdsWithCategory.has(s.id))
}

/** 復習統計を計算 */
export function computeReviewStats(answers: QuizAnswerRecord[]) {
  const reviewNeeded = answers.filter(a => a.review_needed && !a.reviewed_at)
  const reviewed = answers.filter(a => a.reviewed_at)
  return {
    pendingReviewCount: reviewNeeded.length,
    reviewedCount: reviewed.length,
    totalReviewNeeded: answers.filter(a => a.review_needed).length,
  }
}

// ========== データソース: ローカルDB ==========

async function loadFromLocalDB(db: WMDatabase, userId?: string): Promise<QuizHistoryData | null> {
  if (!userId) return null

  const [sessionsRaw, answersRaw] = await Promise.all([
    db.get('quiz_sessions').query().fetch(),
    db.get('quiz_answers').query().fetch(),
  ])

  // ユーザーのセッションをフィルタ
  const sessions: QuizSessionRecord[] = sessionsRaw
    .filter(record => {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      return raw.user_id === userId
    })
    .map(record => {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      return {
        id: String(raw.id),
        user_id: String(raw.user_id),
        quiz_type: String(raw.quiz_type || ''),
        status: String(raw.status || 'completed'),
        total_questions: Number(raw.total_questions) || 0,
        correct_answers: Number(raw.correct_answers) || 0,
        accuracy_rate: Number(raw.accuracy_rate) || 0,
        total_xp: Number(raw.total_xp) || 0,
        bonus_xp: Number(raw.bonus_xp) || 0,
        duration_seconds: raw.duration_seconds != null ? Number(raw.duration_seconds) : null,
        category_id: raw.category_id ? String(raw.category_id) : null,
        subcategory_id: raw.subcategory_id ? String(raw.subcategory_id) : null,
        pack_id: raw.pack_id ? String(raw.pack_id) : null,
        session_start_time: raw.session_start_time ? new Date(Number(raw.session_start_time)).toISOString() : new Date().toISOString(),
        session_end_time: raw.session_end_time ? new Date(Number(raw.session_end_time)).toISOString() : null,
        created_at: raw.created_at ? new Date(Number(raw.created_at)).toISOString() : null,
      }
    })
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  if (sessions.length === 0) return null

  // ユーザーの回答をフィルタ
  const answers: QuizAnswerRecord[] = answersRaw
    .filter(record => {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      return raw.user_id === userId
    })
    .map(record => {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      return {
        id: String(raw.id),
        user_id: raw.user_id ? String(raw.user_id) : null,
        quiz_session_id: raw.quiz_session_id ? String(raw.quiz_session_id) : null,
        question_id: String(raw.question_id || ''),
        category_id: String(raw.category_id || ''),
        subcategory_id: String(raw.subcategory_id || ''),
        difficulty: String(raw.difficulty || ''),
        is_correct: raw.is_correct === true,
        is_timeout: raw.is_timeout === true,
        user_answer: raw.user_answer != null ? Number(raw.user_answer) : null,
        earned_xp: Number(raw.earned_xp) || 0,
        time_spent: Number(raw.time_spent) || 0,
        hint_used: raw.hint_used === true,
        max_hint_level: raw.max_hint_level != null ? Number(raw.max_hint_level) : null,
        confidence_level: raw.confidence_level != null ? Number(raw.confidence_level) : null,
        review_needed: raw.review_needed === true,
        review_reason: raw.review_reason ? String(raw.review_reason) : null,
        reviewed_at: raw.reviewed_at ? new Date(Number(raw.reviewed_at)).toISOString() : null,
        created_at: raw.created_at ? new Date(Number(raw.created_at)).toISOString() : null,
      }
    })

  console.log(`✅ Local DB: ${sessions.length} quiz sessions, ${answers.length} quiz answers loaded`)
  return { sessions, answers }
}

// ========== データソース: サーバー ==========

async function loadFromServer(userId?: string): Promise<QuizHistoryData> {
  if (!userId) return { sessions: [], answers: [] }

  const { supabase } = await import('@/lib/supabase')

  const [sessionsResult, answersResult] = await Promise.all([
    supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('quiz_answers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const sessions: QuizSessionRecord[] = (sessionsResult.data ?? []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    quiz_type: row.quiz_type ?? '',
    status: row.status ?? 'completed',
    total_questions: row.total_questions ?? 0,
    correct_answers: row.correct_answers ?? 0,
    accuracy_rate: row.accuracy_rate ?? 0,
    total_xp: row.total_xp ?? 0,
    bonus_xp: row.bonus_xp ?? 0,
    duration_seconds: row.duration_seconds ?? null,
    category_id: row.category_id ?? null,
    subcategory_id: row.subcategory_id ?? null,
    pack_id: row.pack_id ?? null,
    session_start_time: row.session_start_time ?? new Date().toISOString(),
    session_end_time: row.session_end_time ?? null,
    created_at: row.created_at ?? null,
  }))

  const answers: QuizAnswerRecord[] = (answersResult.data ?? []).map(row => ({
    id: row.id,
    user_id: row.user_id ?? null,
    quiz_session_id: row.quiz_session_id ?? null,
    question_id: String(row.question_id ?? ''),
    category_id: row.category_id ?? '',
    subcategory_id: row.subcategory_id ?? '',
    difficulty: row.difficulty ?? '',
    is_correct: row.is_correct ?? false,
    is_timeout: row.is_timeout ?? false,
    user_answer: row.user_answer ?? null,
    earned_xp: row.earned_xp ?? 0,
    time_spent: row.time_spent ?? 0,
    hint_used: row.hint_used ?? false,
    max_hint_level: row.max_hint_level ?? null,
    confidence_level: row.confidence_level ?? null,
    review_needed: row.review_needed ?? false,
    review_reason: row.review_reason ?? null,
    reviewed_at: row.reviewed_at ?? null,
    created_at: row.created_at ?? null,
  }))

  console.log(`✅ Server: ${sessions.length} quiz sessions, ${answers.length} quiz answers loaded`)
  return { sessions, answers }
}

// ========== エントリポイント ==========

/**
 * クイズ履歴（セッション＋回答）を取得
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 * @param userId ユーザーID
 */
export async function getQuizHistoryData(
  database: WMDatabase | null,
  userId?: string
): Promise<QuizHistoryData> {
  return resolveData(
    {
      loadFromLocal: (db) => loadFromLocalDB(db, userId),
      loadFromServer: () => loadFromServer(userId),
    },
    database,
    userId
  )
}
