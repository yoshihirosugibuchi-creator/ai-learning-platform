/**
 * オフラインクイズ生成
 * precomputed_quiz_setsが枯渇時、ローカルDBからクイズを生成
 * 対応タイプ: business-ai, self-personalized
 * 非対応: review（サーバーサイド分析が必要）
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import type { Question } from '@/lib/types'
import { getAllQuestionsLocal } from './questions'

const DEFAULT_QUIZ_COUNT = 10

// ========== 共通ユーティリティ ==========

/** Fisher-Yatesシャッフル */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** 最近の回答履歴から回答済みquestion_idsを取得 */
async function getRecentlyAnsweredIds(
  db: WMDatabase,
  userId: string,
  dayLimit = 7
): Promise<Set<number>> {
  try {
    const answersRaw = await db.get('quiz_answers').query().fetch()
    const cutoff = Date.now() - dayLimit * 24 * 60 * 60 * 1000

    const recentIds = new Set<number>()
    for (const record of answersRaw) {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      if (raw.user_id !== userId) continue
      const createdAt = Number(raw.created_at) || 0
      if (createdAt < cutoff) continue
      const qId = Number(raw.question_id)
      if (!isNaN(qId)) recentIds.add(qId)
    }
    return recentIds
  } catch {
    return new Set()
  }
}

/** ユーザーの正答率から難易度分布を計算 */
function getDifficultyDistribution(accuracy: number): Record<string, number> {
  if (accuracy >= 80) {
    return { basic: 1, intermediate: 3, advanced: 4, expert: 2 }
  } else if (accuracy >= 60) {
    return { basic: 2, intermediate: 4, advanced: 3, expert: 1 }
  } else if (accuracy >= 40) {
    return { basic: 3, intermediate: 4, advanced: 2, expert: 1 }
  } else {
    return { basic: 4, intermediate: 4, advanced: 2, expert: 0 }
  }
}

// ========== business-ai クイズ生成 ==========

/**
 * business-aiタイプのクイズをローカルDBから生成
 * ユーザーの学習履歴に基づく難易度分布で出題
 */
export async function generateBusinessAIQuizLocally(
  db: WMDatabase,
  userId: string,
  count: number = DEFAULT_QUIZ_COUNT
): Promise<Question[]> {
  const [allQuestions, recentIds, statsRaw] = await Promise.all([
    getAllQuestionsLocal(db),
    getRecentlyAnsweredIds(db, userId),
    db.get('user_xp_stats_v2').query().fetch(),
  ])

  if (allQuestions.length === 0) return []

  // ユーザーの正答率を取得
  const userStats = statsRaw.find(r => {
    const raw = (r as { _raw: Record<string, unknown> })._raw
    return raw.user_id === userId
  })
  const accuracy = userStats
    ? Number((userStats as { _raw: Record<string, unknown> })._raw.quiz_average_accuracy || 50)
    : 50

  // 難易度分布
  const distribution = getDifficultyDistribution(accuracy > 1 ? accuracy : accuracy * 100)

  // 未回答問題を優先
  const unanswered = allQuestions.filter(q => !recentIds.has(Number(q.id)))
  const pool = unanswered.length >= count ? unanswered : allQuestions

  // 難易度ごとに分類
  const byDifficulty: Record<string, Question[]> = {}
  for (const q of pool) {
    const d = q.difficulty || 'intermediate'
    if (!byDifficulty[d]) byDifficulty[d] = []
    byDifficulty[d].push(q)
  }

  // 難易度分布に従って選択
  const selected: Question[] = []
  const totalWeight = Object.values(distribution).reduce((s, v) => s + v, 0)

  for (const [difficulty, weight] of Object.entries(distribution)) {
    const targetCount = Math.round((weight / totalWeight) * count)
    const available = shuffle(byDifficulty[difficulty] || [])
    selected.push(...available.slice(0, targetCount))
  }

  // 不足分を補充
  if (selected.length < count) {
    const selectedIds = new Set(selected.map(q => q.id))
    const remaining = shuffle(pool.filter(q => !selectedIds.has(q.id)))
    selected.push(...remaining.slice(0, count - selected.length))
  }

  return shuffle(selected).slice(0, count)
}

// ========== self-personalized クイズ生成 ==========

/**
 * self-personalizedタイプのクイズをローカルDBから生成
 * ユーザーの選択カテゴリーに基づいて出題
 */
export async function generateSelfPersonalizedQuizLocally(
  db: WMDatabase,
  userId: string,
  categoryIds?: string[],
  difficulties?: string[],
  count: number = DEFAULT_QUIZ_COUNT
): Promise<Question[]> {
  const [allQuestions, recentIds] = await Promise.all([
    getAllQuestionsLocal(db),
    getRecentlyAnsweredIds(db, userId),
  ])

  if (allQuestions.length === 0) return []

  // カテゴリーフィルタ
  let pool = allQuestions
  if (categoryIds && categoryIds.length > 0) {
    const catSet = new Set(categoryIds)
    pool = pool.filter(q => catSet.has(q.category))
  }

  // 難易度フィルタ
  if (difficulties && difficulties.length > 0) {
    const diffSet = new Set(difficulties)
    const filtered = pool.filter(q => q.difficulty && diffSet.has(q.difficulty))
    if (filtered.length > 0) pool = filtered
  }

  // 未回答問題を優先
  const unanswered = pool.filter(q => !recentIds.has(Number(q.id)))
  const finalPool = unanswered.length >= count ? unanswered : pool

  return shuffle(finalPool).slice(0, count)
}

// ========== レビュークイズ（ローカル版） ==========

/**
 * レビュークイズをローカルDBから生成
 * quiz_answersのreview_needed=trueかつreviewed_at=nullの問題を選択
 */
export async function generateReviewQuizLocally(
  db: WMDatabase,
  userId: string,
  count: number = DEFAULT_QUIZ_COUNT
): Promise<Question[]> {
  const [allQuestions, answersRaw] = await Promise.all([
    getAllQuestionsLocal(db),
    db.get('quiz_answers').query().fetch(),
  ])

  if (allQuestions.length === 0) return []

  // review_needed=trueかつreviewed_at=nullの回答を取得
  const reviewQuestionIds = new Set<number>()
  for (const record of answersRaw) {
    const raw = (record as { _raw: Record<string, unknown> })._raw
    if (raw.user_id !== userId) continue
    if (raw.review_needed !== true) continue
    if (raw.reviewed_at) continue // 既にレビュー済み
    const qId = Number(raw.question_id)
    if (!isNaN(qId)) reviewQuestionIds.add(qId)
  }

  if (reviewQuestionIds.size === 0) return []

  // 対応する問題を取得
  const reviewQuestions = allQuestions.filter(q => reviewQuestionIds.has(Number(q.id)))
  return shuffle(reviewQuestions).slice(0, count)
}

// ========== 統合エントリポイント ==========

/**
 * オフラインクイズ生成（precomputed_quiz_sets枯渇時のフォールバック）
 * @param db WatermelonDBインスタンス
 * @param userId ユーザーID
 * @param quizType クイズタイプ
 * @param options カテゴリー・難易度など
 */
export async function generateQuizLocally(
  db: WMDatabase,
  userId: string,
  quizType: string,
  options?: {
    categoryIds?: string[]
    difficulties?: string[]
    count?: number
  }
): Promise<Question[]> {
  const count = options?.count ?? DEFAULT_QUIZ_COUNT

  switch (quizType) {
    case 'business-ai':
      return generateBusinessAIQuizLocally(db, userId, count)
    case 'self-personalized':
    case 'category':
      return generateSelfPersonalizedQuizLocally(
        db, userId, options?.categoryIds, options?.difficulties, count
      )
    case 'review':
      return generateReviewQuizLocally(db, userId, count)
    default:
      return generateBusinessAIQuizLocally(db, userId, count)
  }
}
