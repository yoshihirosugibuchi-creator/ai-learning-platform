/**
 * ホーム画面のローカルDBクエリ
 * - 選ばれし課題（user_challenge_selections）
 * - コンテンツ統計（各マスタテーブルのカウント）
 * - 設定モーダル用検索（learning_courses, quiz_packs, case_study_problems）
 */
import type { Database } from '@nozbe/watermelondb'

interface ChallengeSelection {
  content_id: string
  content_name: string | null
  selected_by: string
}

interface ChallengeSelections {
  course: ChallengeSelection | null
  quiz_pack: ChallengeSelection | null
  case_study: ChallengeSelection | null
}

interface ContentCounts {
  quiz_questions: number
  course_themes: number
  course_sessions: number
  case_study_problems: number
}

interface ContentItem {
  id: string
  name: string
  description?: string
}

type SlotType = 'course' | 'quiz_pack' | 'case_study'

/** ローカルDBから選ばれし課題を取得 */
export async function getChallengeSelectionsLocal(
  database: Database
): Promise<ChallengeSelections | null> {
  try {
    const records = await database.get('user_challenge_selections').query().fetch()
    if (records.length === 0) return null

    const selections: ChallengeSelections = {
      course: null,
      quiz_pack: null,
      case_study: null,
    }

    for (const record of records) {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      const slotType = String(raw.slot_type || '') as SlotType
      if (slotType === 'course' || slotType === 'quiz_pack' || slotType === 'case_study') {
        selections[slotType] = {
          content_id: String(raw.content_id || ''),
          content_name: raw.content_name ? String(raw.content_name) : null,
          selected_by: String(raw.selected_by || 'user'),
        }
      }
    }

    return selections
  } catch (e) {
    console.warn('Failed to load challenge selections from local DB:', e)
    return null
  }
}

/** ローカルDBからコンテンツ統計を取得 */
export async function getContentCountsLocal(
  database: Database
): Promise<ContentCounts | null> {
  try {
    const [quizCount, themeCount, sessionCount, caseStudyCount] = await Promise.all([
      database.get('quiz_questions').query().fetchCount(),
      database.get('learning_themes').query().fetchCount(),
      database.get('learning_sessions').query().fetchCount(),
      database.get('case_study_problems').query().fetchCount(),
    ])

    // ローカルにデータがなければnull（サーバーフォールバック）
    if (quizCount === 0 && sessionCount === 0 && caseStudyCount === 0) return null

    return {
      quiz_questions: quizCount,
      course_themes: themeCount,
      course_sessions: sessionCount,
      case_study_problems: caseStudyCount,
    }
  } catch (e) {
    console.warn('Failed to load content counts from local DB:', e)
    return null
  }
}

/** ローカルDBからコンテンツを検索（設定モーダル用） */
export async function searchContentLocal(
  database: Database,
  type: SlotType,
  query: string
): Promise<ContentItem[]> {
  try {
    const q = query.toLowerCase()

    if (type === 'course') {
      const records = await database.get('learning_courses').query().fetch()
      return records
        .map(r => {
          const raw = (r as { _raw: Record<string, unknown> })._raw
          return {
            id: String(raw.id || ''),
            name: String(raw.title || ''),
            description: raw.description ? String(raw.description) : undefined,
            status: String(raw.status || ''),
          }
        })
        .filter(c => c.status === 'available')
        .filter(c => !q || c.name.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false))
        .map(({ id, name, description }) => ({ id, name, description }))
    }

    if (type === 'quiz_pack') {
      const records = await database.get('quiz_packs').query().fetch()
      return records
        .map(r => {
          const raw = (r as { _raw: Record<string, unknown> })._raw
          return {
            id: String(raw.id || ''),
            name: String(raw.name || ''),
            description: raw.description ? String(raw.description) : undefined,
            is_published: raw.is_published,
          }
        })
        .filter(p => p.is_published)
        .filter(p => !q || p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false))
        .map(({ id, name, description }) => ({ id, name, description }))
    }

    if (type === 'case_study') {
      const records = await database.get('case_study_problems').query().fetch()
      return records
        .map(r => {
          const raw = (r as { _raw: Record<string, unknown> })._raw
          return {
            id: String(raw.id || ''),
            name: String(raw.title || ''),
            description: raw.difficulty ? String(raw.difficulty) : undefined,
            status: String(raw.status || ''),
          }
        })
        .filter(p => p.status === 'active')
        .filter(p => !q || p.name.toLowerCase().includes(q))
        .map(({ id, name, description }) => ({ id, name, description }))
    }

    return []
  } catch (e) {
    console.warn('Failed to search content from local DB:', e)
    return []
  }
}
