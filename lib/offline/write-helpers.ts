/**
 * WatermelonDB ローカル書き込みヘルパー
 * ユーザーデータをローカルDBに先行書き込み
 * 次回sync時にサーバーへpush
 */
import type { Database } from '@nozbe/watermelondb'
import type { Model } from '@nozbe/watermelondb'

// ========== 型定義 ==========

export interface QuizSessionWrite {
  id: string
  user_id: string
  pack_id?: string
  total_questions: number
  correct_answers: number
  score_percentage: number
  xp_earned?: number
  skp_earned?: number
  time_spent_seconds?: number
  category_breakdown?: Record<string, unknown>
  answers_data?: Record<string, unknown>[]
  review_reasons?: string[]
  session_metadata?: Record<string, unknown>
}

export interface QuizAnswerWrite {
  id: string
  session_id: string
  question_id: number
  user_id: string
  selected_answer: string
  is_correct: boolean
  time_spent_ms?: number
  options?: string[]
}

export interface WisdomCardAcquisitionWrite {
  user_id: string
  card_id: number
  count?: number
}

export interface KnowledgeCardAcquisitionWrite {
  user_id: string
  theme_id: string
}

export interface CourseSessionCompletionWrite {
  id: string
  user_id: string
  course_id: string
  genre_id: string
  theme_id: string
  session_id: string
  is_first_completion?: boolean
  session_metadata?: Record<string, unknown>
}

// ========== 書き込み関数 ==========

/** クイズセッション＋回答をローカルDBに書き込み */
export async function writeQuizSession(
  database: Database,
  session: QuizSessionWrite,
  answers: QuizAnswerWrite[]
): Promise<void> {
  await database.write(async () => {
    const sessionCollection = database.get('quiz_sessions')
    const answerCollection = database.get('quiz_answers')

    // セッション作成
    await sessionCollection.create((record: Model) => {
      const raw = record._raw as Record<string, unknown>
      raw.id = session.id
      raw.user_id = session.user_id
      raw.pack_id = session.pack_id || null
      raw.total_questions = session.total_questions
      raw.correct_answers = session.correct_answers
      raw.score_percentage = session.score_percentage
      raw.xp_earned = session.xp_earned || 0
      raw.skp_earned = session.skp_earned || 0
      raw.time_spent_seconds = session.time_spent_seconds || 0
      raw.category_breakdown = session.category_breakdown ? JSON.stringify(session.category_breakdown) : null
      raw.answers_data = session.answers_data ? JSON.stringify(session.answers_data) : null
      raw.review_reasons = session.review_reasons ? JSON.stringify(session.review_reasons) : null
      raw.session_metadata = session.session_metadata ? JSON.stringify(session.session_metadata) : null
      raw.created_at = Date.now()
      raw.updated_at = Date.now()
    })

    // 回答を一括作成
    for (const answer of answers) {
      await answerCollection.create((record: Model) => {
        const raw = record._raw as Record<string, unknown>
        raw.id = answer.id
        raw.session_id = answer.session_id
        raw.question_id = answer.question_id
        raw.user_id = answer.user_id
        raw.selected_answer = answer.selected_answer
        raw.is_correct = answer.is_correct
        raw.time_spent_ms = answer.time_spent_ms || 0
        raw.options = answer.options ? JSON.stringify(answer.options) : null
        raw.created_at = Date.now()
      })
    }
  })

  console.log(`✅ Local DB: quiz session ${session.id} + ${answers.length} answers written`)
}

/** 格言カード取得をローカルDBに書き込み */
export async function writeWisdomCardAcquisition(
  database: Database,
  data: WisdomCardAcquisitionWrite
): Promise<void> {
  await database.write(async () => {
    const collection = database.get('wisdom_card_collection')

    // 既存レコードを検索
    const existing = await collection
      .query()
      .fetch()
      .then(records =>
        records.find((r: Model) => {
          const raw = r._raw as Record<string, unknown>
          return raw.user_id === data.user_id && raw.card_id === data.card_id
        })
      )

    if (existing) {
      // カウント増加
      await existing.update((record: Model) => {
        const raw = record._raw as Record<string, unknown>
        raw.count = (Number(raw.count) || 0) + 1
        raw.last_obtained_at = Date.now()
      })
    } else {
      // 新規作成
      await collection.create((record: Model) => {
        const raw = record._raw as Record<string, unknown>
        raw.user_id = data.user_id
        raw.card_id = data.card_id
        raw.count = data.count || 1
        raw.obtained_at = Date.now()
        raw.last_obtained_at = Date.now()
      })
    }
  })

  console.log(`✅ Local DB: wisdom card ${data.card_id} acquired`)
}

/** ナレッジカード取得をローカルDBに書き込み */
export async function writeKnowledgeCardAcquisition(
  database: Database,
  data: KnowledgeCardAcquisitionWrite
): Promise<void> {
  await database.write(async () => {
    const collection = database.get('user_knowledge_collection_v2')

    // 重複チェック
    const existing = await collection
      .query()
      .fetch()
      .then(records =>
        records.find((r: Model) => {
          const raw = r._raw as Record<string, unknown>
          return raw.user_id === data.user_id && raw.theme_id === data.theme_id
        })
      )

    if (existing) return // 既に取得済み

    await collection.create((record: Model) => {
      const raw = record._raw as Record<string, unknown>
      raw.user_id = data.user_id
      raw.theme_id = data.theme_id
      raw.obtained_at = Date.now()
      raw.created_at = Date.now()
    })
  })

  console.log(`✅ Local DB: knowledge card ${data.theme_id} acquired`)
}

/** コースセッション完了をローカルDBに書き込み */
export async function writeCourseSessionCompletion(
  database: Database,
  data: CourseSessionCompletionWrite
): Promise<void> {
  await database.write(async () => {
    const collection = database.get('course_session_completions')

    await collection.create((record: Model) => {
      const raw = record._raw as Record<string, unknown>
      raw.id = data.id
      raw.user_id = data.user_id
      raw.course_id = data.course_id
      raw.genre_id = data.genre_id
      raw.theme_id = data.theme_id
      raw.session_id = data.session_id
      raw.is_first_completion = data.is_first_completion ?? true
      raw.session_metadata = data.session_metadata ? JSON.stringify(data.session_metadata) : null
      raw.completion_time = Date.now()
      raw.created_at = Date.now()
    })
  })

  console.log(`✅ Local DB: course session ${data.session_id} completion written`)
}

/** localStorage quiz_backup_* をWatermelonDBに移行 */
export async function migrateLocalStorageBackups(database: Database): Promise<number> {
  let migrated = 0

  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiz_backup_'))

    for (const key of keys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')

        if (data.session_id && data.user_id) {
          await writeQuizSession(database, {
            id: data.session_id,
            user_id: data.user_id,
            pack_id: data.pack_id,
            total_questions: data.total_questions || 0,
            correct_answers: data.correct_answers || 0,
            score_percentage: data.score_percentage || 0,
            xp_earned: data.xp_earned,
            skp_earned: data.skp_earned,
            time_spent_seconds: data.time_spent_seconds,
            answers_data: data.answers,
            session_metadata: data.session_metadata,
          }, [])

          localStorage.removeItem(key)
          migrated++
          console.log(`✅ Migrated localStorage backup: ${key}`)
        }
      } catch (error) {
        console.warn(`⚠️ Failed to migrate ${key}:`, error)
      }
    }
  } catch {
    // localStorage not available
  }

  if (migrated > 0) {
    console.log(`✅ Migrated ${migrated} localStorage backups to WatermelonDB`)
  }

  return migrated
}
