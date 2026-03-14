/**
 * 事前生成クイズセット データ取得
 * ローカルDB優先 → Supabaseフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import type { Question } from '@/lib/types'

// ========== 共通型定義 ==========

export interface PrecomputedSetRecord {
  id: string
  user_id: string
  quiz_type: string
  question_ids: number[]
  analysis_data: Record<string, unknown> | null
  used_at: string | null
  expires_at: string | null
  created_at: string | null
}

// ========== 共通処理ロジック ==========

/** 有効な（未使用＆未期限切れ）セットをフィルタ */
export function filterValidSets(sets: PrecomputedSetRecord[]): PrecomputedSetRecord[] {
  const now = new Date().toISOString()
  return sets.filter(s => !s.used_at && (!s.expires_at || s.expires_at > now))
}

/** 指定タイプのセットを取得（未使用優先、新しい順） */
export function getSetByType(
  sets: PrecomputedSetRecord[],
  quizType: string
): PrecomputedSetRecord | null {
  const validSets = filterValidSets(sets).filter(s => s.quiz_type === quizType)
  if (validSets.length === 0) return null
  // 新しいもの優先
  validSets.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return validSets[0]
}

// ========== データソース: ローカルDB ==========

async function loadSetsFromLocalDB(
  db: WMDatabase,
  userId: string,
  quizType?: string
): Promise<PrecomputedSetRecord[] | null> {
  const raw = await db.get('precomputed_quiz_sets').query().fetch()
  if (raw.length === 0) return null

  const now = Date.now()
  const sets: PrecomputedSetRecord[] = raw
    .filter(record => {
      const r = (record as { _raw: Record<string, unknown> })._raw
      if (r.user_id !== userId) return false
      if (quizType && r.quiz_type !== quizType) return false
      // 期限切れ除外
      if (r.expires_at && Number(r.expires_at) < now) return false
      return true
    })
    .map(record => {
      const r = (record as { _raw: Record<string, unknown> })._raw
      let questionIds: number[] = []
      if (typeof r.question_ids === 'string') {
        try { questionIds = JSON.parse(r.question_ids) } catch { /* empty */ }
      } else if (Array.isArray(r.question_ids)) {
        questionIds = r.question_ids as number[]
      }

      let analysisData: Record<string, unknown> | null = null
      if (typeof r.analysis_data === 'string') {
        try { analysisData = JSON.parse(r.analysis_data) } catch { /* empty */ }
      } else if (r.analysis_data && typeof r.analysis_data === 'object') {
        analysisData = r.analysis_data as Record<string, unknown>
      }

      return {
        id: String(r.id),
        user_id: String(r.user_id),
        quiz_type: String(r.quiz_type),
        question_ids: questionIds,
        analysis_data: analysisData,
        used_at: r.used_at ? new Date(Number(r.used_at)).toISOString() : null,
        expires_at: r.expires_at ? new Date(Number(r.expires_at)).toISOString() : null,
        created_at: r.created_at ? new Date(Number(r.created_at)).toISOString() : null,
      }
    })
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  if (sets.length === 0) return null

  console.log(`✅ Local DB: ${sets.length} precomputed quiz sets loaded`)
  return sets
}

// ========== データソース: サーバー ==========

async function loadSetsFromServer(
  userId: string,
  quizType?: string
): Promise<PrecomputedSetRecord[]> {
  const { supabase } = await import('@/lib/supabase')
  let query = supabase
    .from('precomputed_quiz_sets')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (quizType) {
    query = query.eq('quiz_type', quizType as 'business-ai' | 'self-personalized' | 'category' | 'review')
  }

  const { data, error } = await query
  if (error) {
    console.error('❌ Failed to load precomputed sets from server:', error)
    return []
  }

  return (data ?? []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    quiz_type: row.quiz_type,
    question_ids: row.question_ids ?? [],
    analysis_data: row.analysis_data as Record<string, unknown> | null,
    used_at: row.used_at ?? null,
    expires_at: row.expires_at ?? null,
    created_at: row.created_at ?? null,
  }))
}

// ========== エントリポイント ==========

/**
 * 事前生成クイズセットを取得
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 * @param userId ユーザーID
 * @param quizType フィルタ用クイズタイプ（省略=全タイプ）
 */
export async function getPrecomputedSets(
  database: WMDatabase | null,
  userId: string,
  quizType?: string
): Promise<PrecomputedSetRecord[]> {
  if (database) {
    try {
      const local = await loadSetsFromLocalDB(database, userId, quizType)
      if (local !== null) return local
    } catch (e) {
      console.warn('⚠️ Local DB precomputed sets read failed:', e)
    }
  }
  return loadSetsFromServer(userId, quizType)
}

/**
 * セットからQuestion[]に変換（question_idsを使ってquiz_questionsテーブルから取得）
 */
export async function resolveSetQuestions(
  database: WMDatabase | null,
  questionIds: number[]
): Promise<Question[]> {
  if (questionIds.length === 0) return []

  if (database) {
    try {
      const { getAllQuestionsLocal } = await import('@/lib/offline/queries/questions')
      const allQuestions = await getAllQuestionsLocal(database)
      // question_idsの順序を維持
      const questionMap = new Map(allQuestions.map(q => [Number(q.id), q]))
      return questionIds
        .map(id => questionMap.get(id))
        .filter((q): q is Question => q !== undefined)
    } catch (e) {
      console.warn('⚠️ Local question resolution failed:', e)
    }
  }

  // サーバーフォールバック
  const { supabase } = await import('@/lib/supabase')
  const { data } = await supabase
    .from('quiz_questions')
    .select('*')
    .in('id', questionIds)

  if (!data) return []

  const { toQuestion } = await import('@/lib/offline/queries/questions')
  const questionMap = new Map(data.map(row => [row.id, toQuestion(row as Record<string, unknown>)]))
  return questionIds
    .map(id => questionMap.get(id))
    .filter((q): q is Question => q !== undefined)
}
