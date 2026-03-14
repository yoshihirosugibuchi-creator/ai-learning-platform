/**
 * クイズ問題 データ取得
 * ローカルDB優先 → API/JSONフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import type { Question } from '@/lib/types'
import { resolveData } from '../data-source'

// ========== 共通処理ロジック ==========

/** 削除済み問題を除外 */
export function filterActiveQuestions(questions: Question[]): Question[] {
  return questions.filter(q => !q.deleted)
}

/** カテゴリーでフィルタ */
export function filterByCategory(questions: Question[], categoryId: string): Question[] {
  return questions.filter(q => q.category === categoryId && !q.deleted)
}

/** 難易度でフィルタ */
export function filterByDifficulty(questions: Question[], difficulty: string): Question[] {
  return questions.filter(q => q.difficulty === difficulty && !q.deleted)
}

/** Fisher-Yates Shuffle */
export function shuffleQuestions<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** ランダムにN問選択 */
export function selectRandom(questions: Question[], count: number): Question[] {
  const active = filterActiveQuestions(questions)
  return shuffleQuestions(active).slice(0, count)
}

// ========== データソース: ローカルDB ==========

/** WatermelonDBのQuizQuestionレコードをQuestion型に変換 */
export function toQuestion(raw: Record<string, unknown>): Question {
  const serverId = Number(raw.server_id || raw.id)
  return {
    id: serverId,
    category: String(raw.category_id || ''),
    subcategory: String(raw.subcategory_id || ''),
    subcategory_id: String(raw.subcategory_id || ''),
    question: String(raw.question || ''),
    options: [
      String(raw.option1 || ''),
      String(raw.option2 || ''),
      String(raw.option3 || ''),
      String(raw.option4 || ''),
    ],
    correct: Number(raw.correct_answer ?? 0),
    explanation: raw.explanation ? String(raw.explanation) : null,
    difficulty: raw.difficulty ? String(raw.difficulty) : null,
    timeLimit: raw.time_limit ? Number(raw.time_limit) : null,
    relatedTopics: parseJsonArray(raw.related_topics),
    source: raw.source ? String(raw.source) : null,
    deleted: raw.is_deleted === true,
    level1_hint: raw.level1_hint ? String(raw.level1_hint) : null,
    level2_hint: raw.level2_hint ? String(raw.level2_hint) : null,
    level3_hint: raw.level3_hint ? String(raw.level3_hint) : null,
  }
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return [] }
  }
  return []
}

async function loadFromLocalDB(db: WMDatabase): Promise<Question[] | null> {
  const records = await db.get('quiz_questions').query().fetch()
  if (records.length === 0) return null

  const questions = records.map(record => {
    const raw = (record as { _raw: Record<string, unknown> })._raw
    return toQuestion(raw)
  })

  console.log(`✅ Local DB: ${questions.length} quiz questions loaded`)
  return questions
}

// ========== データソース: サーバー ==========

async function loadFromServer(): Promise<Question[]> {
  try {
    const response = await fetch('/api/questions')
    if (!response.ok) throw new Error(`API failed: ${response.status}`)
    const data = await response.json()
    const questions = data.questions || []
    console.log(`✅ Server: ${questions.length} quiz questions loaded`)
    return questions
  } catch (error) {
    console.warn('⚠️ API failed, trying JSON fallback:', error)
    try {
      const response = await fetch('/questions.json')
      if (!response.ok) throw new Error(`JSON failed: ${response.status}`)
      const data = await response.json()
      return data.questions || []
    } catch {
      console.error('❌ All question sources failed')
      return []
    }
  }
}

// ========== エントリポイント ==========

/**
 * 全クイズ問題を取得
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 */
export async function getAllQuestionsLocal(database: WMDatabase | null): Promise<Question[]> {
  return resolveData({ loadFromLocal: loadFromLocalDB, loadFromServer }, database)
}
