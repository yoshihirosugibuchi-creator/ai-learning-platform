/**
 * ケーススタディ ローカルクエリ
 * case_study_problems, case_study_sessions等をWatermelonDBから取得
 */
import type { Database } from '@nozbe/watermelondb'

export interface CaseStudyProblemRecord {
  id: string
  title: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  industry: string | null
  estimated_minutes: number
  status: string
}

export interface CaseStudyProblemWithStatus extends CaseStudyProblemRecord {
  step_count: number
  user_completed: boolean
  user_best_score: number | null
  avg_score: number | null
}

/** ローカルDBからケーススタディ問題一覧を取得 */
export async function getCaseStudyProblemsLocal(
  database: Database,
  userId?: string,
  options?: { keyword?: string; difficulty?: string; industry?: string; limit?: number }
): Promise<CaseStudyProblemWithStatus[]> {
  // 問題マスタ
  const problemsRaw = await database.get('case_study_problems').query().fetch()
  let problems = problemsRaw.map(r => {
    const raw = (r as { _raw: Record<string, unknown> })._raw
    return {
      id: String(raw.id || ''),
      title: String(raw.title || ''),
      primary_category_id: String(raw.primary_category_id || ''),
      primary_subcategory_id: String(raw.primary_subcategory_id || ''),
      difficulty: String(raw.difficulty || 'basic') as 'basic' | 'intermediate' | 'advanced' | 'expert',
      industry: raw.industry ? String(raw.industry) : null,
      estimated_minutes: Number(raw.estimated_minutes) || 30,
      status: String(raw.status || 'active'),
    }
  }).filter(p => p.status === 'active')

  // フィルタリング
  if (options?.keyword) {
    const kw = options.keyword.toLowerCase()
    problems = problems.filter(p => p.title.toLowerCase().includes(kw))
  }
  if (options?.difficulty && options.difficulty !== 'all') {
    problems = problems.filter(p => p.difficulty === options.difficulty)
  }
  if (options?.industry && options.industry !== 'all') {
    problems = problems.filter(p => p.industry === options.industry)
  }

  // ステップ数取得
  const stepsRaw = await database.get('case_study_steps').query().fetch()
  const stepCounts: Record<string, number> = {}
  for (const s of stepsRaw) {
    const raw = (s as { _raw: Record<string, unknown> })._raw
    const problemId = String(raw.problem_id || '')
    stepCounts[problemId] = (stepCounts[problemId] || 0) + 1
  }

  // ユーザーセッション（完了状況）
  const userSessions: Record<string, { completed: boolean; bestScore: number | null }> = {}
  if (userId) {
    try {
      const sessionsRaw = await database.get('case_study_sessions').query().fetch()
      for (const s of sessionsRaw) {
        const raw = (s as { _raw: Record<string, unknown> })._raw
        if (String(raw.user_id) !== userId) continue
        const problemId = String(raw.problem_id || '')
        const status = String(raw.status || '')
        const score = raw.total_score != null ? Number(raw.total_score) : null

        const existing = userSessions[problemId]
        if (!existing) {
          userSessions[problemId] = {
            completed: status === 'completed',
            bestScore: score,
          }
        } else {
          if (status === 'completed') existing.completed = true
          if (score != null && (existing.bestScore == null || score > existing.bestScore)) {
            existing.bestScore = score
          }
        }
      }
    } catch {
      // セッションテーブルが空でもOK
    }
  }

  // 結合
  let result: CaseStudyProblemWithStatus[] = problems.map(p => ({
    ...p,
    step_count: stepCounts[p.id] || 0,
    user_completed: userSessions[p.id]?.completed || false,
    user_best_score: userSessions[p.id]?.bestScore ?? null,
    avg_score: null, // ローカルでは全体平均は計算しない
  }))

  // limit
  if (options?.limit) {
    result = result.slice(0, options.limit)
  }

  return result
}
