/**
 * クイズパック ローカルクエリ
 * quiz_packs, quiz_sessions, skill_levelsをWatermelonDBから取得
 */
import type { Database } from '@nozbe/watermelondb'

export interface QuizPackRecord {
  id: string
  name: string
  description: string | null
  question_count: number
  categories: string[]
  difficulties: string[]
  icon_emoji: string
  color_theme: string
  total_attempts: number
  average_score: number | null
  user_attempts: number
  user_best_score: number | null
}

export interface SkillLevelRecord {
  id: string
  name: string
  display_order: number
}

/** ローカルDBからクイズパック一覧を取得 */
export async function getQuizPacksLocal(
  database: Database,
  userId?: string
): Promise<{ packs: QuizPackRecord[]; skillLevels: SkillLevelRecord[] }> {
  // パックマスタ
  const packsRaw = await database.get('quiz_packs').query().fetch()
  const packs = packsRaw
    .map(r => {
      const raw = (r as { _raw: Record<string, unknown> })._raw
      let categories: string[] = []
      let difficulties: string[] = []
      try {
        const catStr = raw.categories
        categories = typeof catStr === 'string' ? JSON.parse(catStr) : Array.isArray(catStr) ? catStr as string[] : []
      } catch { /* ignore */ }
      try {
        const diffStr = raw.difficulties
        difficulties = typeof diffStr === 'string' ? JSON.parse(diffStr) : Array.isArray(diffStr) ? diffStr as string[] : []
      } catch { /* ignore */ }

      return {
        id: String(raw.id || ''),
        name: String(raw.name || ''),
        description: raw.description ? String(raw.description) : null,
        question_count: Number(raw.question_count) || 0,
        categories,
        difficulties,
        icon_emoji: String(raw.icon_emoji || '📝'),
        color_theme: String(raw.color_theme || 'primary'),
        is_published: raw.is_published !== false,
        total_attempts: Number(raw.total_attempts) || 0,
        average_score: raw.average_score != null ? Number(raw.average_score) : null,
      }
    })
    .filter(p => p.is_published)

  // ユーザーのパック別成績
  const userPackStats: Record<string, { attempts: number; bestScore: number | null }> = {}
  if (userId) {
    try {
      const sessionsRaw = await database.get('quiz_sessions').query().fetch()
      for (const s of sessionsRaw) {
        const raw = (s as { _raw: Record<string, unknown> })._raw
        if (String(raw.user_id) !== userId) continue
        const packId = raw.pack_id ? String(raw.pack_id) : null
        if (!packId) continue
        const accuracy = raw.accuracy_rate != null ? Number(raw.accuracy_rate) : null

        if (!userPackStats[packId]) {
          userPackStats[packId] = { attempts: 0, bestScore: null }
        }
        userPackStats[packId].attempts++
        if (accuracy != null && (userPackStats[packId].bestScore == null || accuracy > userPackStats[packId].bestScore)) {
          userPackStats[packId].bestScore = accuracy
        }
      }
    } catch {
      // quiz_sessionsが空でもOK
    }
  }

  const packsWithStats: QuizPackRecord[] = packs.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    question_count: p.question_count,
    categories: p.categories,
    difficulties: p.difficulties,
    icon_emoji: p.icon_emoji,
    color_theme: p.color_theme,
    total_attempts: p.total_attempts,
    average_score: p.average_score,
    user_attempts: userPackStats[p.id]?.attempts || 0,
    user_best_score: userPackStats[p.id]?.bestScore ?? null,
  }))

  // スキルレベル
  const skillRaw = await database.get('skill_levels').query().fetch()
  const skillLevels = skillRaw
    .map(r => {
      const raw = (r as { _raw: Record<string, unknown> })._raw
      return {
        id: String(raw.id || ''),
        name: String(raw.name || ''),
        display_order: Number(raw.display_order) || 0,
      }
    })
    .sort((a, b) => a.display_order - b.display_order)

  return { packs: packsWithStats, skillLevels }
}
