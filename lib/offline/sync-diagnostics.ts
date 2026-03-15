/**
 * 同期診断ユーティリティ
 * テーブル単位の同期状態・件数・エラーを記録
 */
import type { Database } from '@nozbe/watermelondb'

export interface TableSyncStatus {
  table: string
  type: 'master' | 'user'
  localCount: number
  pullCreated: number
  pullUpdated: number
  pullDeleted: number
  status: 'success' | 'error' | 'pending' | 'skipped'
  error?: string
  lastSyncAt?: number
}

export interface SyncDiagnosticResult {
  tables: TableSyncStatus[]
  overallStatus: 'success' | 'partial' | 'error'
  startedAt: number
  completedAt: number
  pullDuration: number
  pushDuration: number
  totalError: number
  errorMessage?: string
}

// メモリ内に最新の診断結果を保持
let lastDiagnostic: SyncDiagnosticResult | null = null

export function getLastDiagnostic(): SyncDiagnosticResult | null {
  return lastDiagnostic
}

export function setLastDiagnostic(result: SyncDiagnosticResult) {
  lastDiagnostic = result
}

/** ローカルDBの各テーブルの件数を取得 */
export async function getLocalTableCounts(database: Database): Promise<Record<string, number>> {
  const tables = [
    // Master
    'quiz_questions', 'quiz_packs', 'session_quizzes',
    'case_study_problems', 'case_study_steps', 'case_study_rubric_axes',
    'case_study_options', 'case_study_course_links',
    'learning_courses', 'learning_genres', 'learning_themes',
    'learning_sessions', 'session_contents',
    'skill_levels', 'categories', 'subcategories',
    'xp_level_skp_settings', 'wisdom_cards',
    // User
    'quiz_sessions', 'quiz_answers', 'precomputed_quiz_sets',
    'case_study_sessions', 'case_study_step_details', 'case_study_thinking_logs',
    'wisdom_card_collection', 'user_knowledge_collection_v2',
    'user_xp_stats_v2', 'course_session_completions', 'daily_xp_records',
    'user_challenge_selections',
  ]

  const counts: Record<string, number> = {}

  for (const table of tables) {
    try {
      const collection = database.get(table)
      const count = await collection.query().fetchCount()
      counts[table] = count
    } catch (_e) {
      counts[table] = -1 // エラー
    }
  }

  return counts
}

/** テーブルの種別判定 */
export function getTableType(table: string): 'master' | 'user' {
  const userTables = new Set([
    'quiz_sessions', 'quiz_answers', 'precomputed_quiz_sets',
    'case_study_sessions', 'case_study_step_details', 'case_study_thinking_logs',
    'wisdom_card_collection', 'user_knowledge_collection_v2',
    'user_xp_stats_v2', 'course_session_completions', 'daily_xp_records',
    'user_challenge_selections',
  ])
  return userTables.has(table) ? 'user' : 'master'
}

/** テーブルの表示名 */
export function getTableDisplayName(table: string): string {
  const names: Record<string, string> = {
    quiz_questions: 'クイズ問題',
    quiz_packs: 'クイズパック',
    session_quizzes: 'セッションクイズ',
    case_study_problems: 'ケーススタディ問題',
    case_study_steps: 'ケーススタディ手順',
    case_study_rubric_axes: 'ケーススタディ評価軸',
    case_study_options: 'ケーススタディ選択肢',
    case_study_course_links: 'ケーススタディ連携',
    learning_courses: '学習コース',
    learning_genres: '学習ジャンル',
    learning_themes: '学習テーマ',
    learning_sessions: '学習セッション',
    session_contents: 'セッション内容',
    skill_levels: 'スキルレベル',
    categories: 'カテゴリー',
    subcategories: 'サブカテゴリー',
    xp_level_skp_settings: 'XP/SKP設定',
    wisdom_cards: '格言カード',
    quiz_sessions: 'クイズセッション',
    quiz_answers: 'クイズ回答',
    precomputed_quiz_sets: '事前計算クイズ',
    case_study_sessions: 'CS セッション',
    case_study_step_details: 'CS 手順詳細',
    case_study_thinking_logs: 'CS 思考ログ',
    wisdom_card_collection: '格言カードコレクション',
    user_knowledge_collection_v2: 'ナレッジカード',
    user_xp_stats_v2: 'XP統計',
    course_session_completions: 'コース完了記録',
    daily_xp_records: 'デイリー記録',
    user_challenge_selections: '選ばれし課題',
  }
  return names[table] || table
}
