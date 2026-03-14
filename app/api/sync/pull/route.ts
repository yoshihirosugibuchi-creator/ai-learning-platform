/**
 * WatermelonDB 同期API - Pull エンドポイント
 * マスタデータ + ユーザーデータをWatermelonDB形式で返す
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** ISO文字列をミリ秒タイムスタンプに変換 */
function toTimestamp(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  return new Date(dateStr).getTime()
}

/** JSONフィールドを文字列化 */
function jsonStr(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

// マスタテーブル定義（テーブル名 → idフィールドの型）
const MASTER_TABLES = [
  'quiz_questions', 'quiz_packs', 'session_quizzes',
  'case_study_problems', 'case_study_steps', 'case_study_rubric_axes',
  'case_study_options', 'case_study_course_links',
  'learning_courses', 'learning_genres', 'learning_themes',
  'learning_sessions', 'session_contents',
  'skill_levels', 'categories', 'subcategories',
  'xp_level_skp_settings', 'wisdom_cards',
] as const

// numeric IDを持つテーブル（WatermelonDBではstring IDに変換）
const NUMERIC_ID_TABLES = new Set(['quiz_questions', 'wisdom_cards', 'xp_level_skp_settings'])

// ユーザーデータテーブル
const USER_TABLES = [
  'quiz_sessions', 'quiz_answers', 'precomputed_quiz_sets',
  'case_study_sessions', 'case_study_step_details', 'case_study_thinking_logs',
  'wisdom_card_collection', 'user_knowledge_collection_v2',
  'user_xp_stats_v2', 'course_session_completions', 'daily_xp_records',
] as const

/** Supabase行をWatermelonDB形式に変換 */
function transformRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    if (key === 'id') {
      // numeric IDテーブルはstring変換 + server_id保持
      if (NUMERIC_ID_TABLES.has(table)) {
        result['id'] = String(value)
        result['server_id'] = value
      } else {
        result['id'] = value
      }
      continue
    }

    // user_xp_stats_v2はidではなくuser_idが主キー
    if (table === 'user_xp_stats_v2' && key === 'user_id' && !row['id']) {
      result['id'] = value
      result['user_id'] = value
      continue
    }

    // タイムスタンプ変換
    if (
      (key.endsWith('_at') || key === 'completion_time' || key === 'timestamp') &&
      typeof value === 'string'
    ) {
      result[key] = toTimestamp(value)
      continue
    }

    // JSON/配列フィールド
    if (value !== null && typeof value === 'object') {
      result[key] = jsonStr(value)
      continue
    }

    result[key] = value
  }

  return result
}

/** テーブルの変更分を取得 */
async function pullTable(
  table: string,
  lastPulledAt: number | null,
  userId?: string
): Promise<{ created: Record<string, unknown>[]; updated: Record<string, unknown>[]; deleted: string[] }> {
  const isUserTable = (USER_TABLES as readonly string[]).includes(table)

  // user_xp_stats_v2はidカラムがない特殊テーブル
  const selectColumns = table === 'user_xp_stats_v2' ? '*' : '*'

  let query = supabaseAdmin.from(table).select(selectColumns)

  // ユーザーテーブルはuser_idでフィルタ
  if (isUserTable && userId) {
    query = query.eq('user_id', userId)
  }

  // updated_atがあるテーブルは差分取得
  const sinceDate = lastPulledAt ? new Date(lastPulledAt).toISOString() : null

  if (sinceDate) {
    // updated_atまたはcreated_atで差分フィルタ
    query = query.or(`updated_at.gt.${sinceDate},created_at.gt.${sinceDate}`)
  }

  const { data, error } = await query.limit(10000)

  if (error) {
    console.error(`Sync pull error for ${table}:`, error.message)
    return { created: [], updated: [], deleted: [] }
  }

  if (!data || data.length === 0) {
    return { created: [], updated: [], deleted: [] }
  }

  const rows = data.map((row) => transformRow(table, row as Record<string, unknown>))

  // 初回同期（lastPulledAt=null）は全てcreated
  // 差分同期はupdatedとして扱う（WatermelonDBが重複を処理）
  if (!lastPulledAt) {
    return { created: rows, updated: [], deleted: [] }
  }
  return { created: [], updated: rows, deleted: [] }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lastPulledAtParam = searchParams.get('last_pulled_at')
    const lastPulledAt = lastPulledAtParam ? Number(lastPulledAtParam) : null
    const tablesParam = searchParams.get('tables') // カンマ区切りでテーブル指定（省略時は全テーブル）

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    let userId: string | undefined

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id
    }

    // テスト用認証バイパス
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = request.headers.get('x-test-user-id') ?? undefined
    }

    // 対象テーブルの決定
    const allTables = [...MASTER_TABLES, ...USER_TABLES] as string[]
    const targetTables = tablesParam
      ? tablesParam.split(',').filter((t) => allTables.includes(t))
      : allTables

    // 全テーブルを並列で取得（エラー情報も収集）
    const tableErrors: Record<string, string> = {}
    const results = await Promise.all(
      targetTables.map(async (table) => {
        try {
          const changes = await pullTable(table, lastPulledAt, userId)
          return [table, changes] as const
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error(`Sync pull exception for ${table}:`, msg)
          tableErrors[table] = msg
          return [table, { created: [] as Record<string, unknown>[], updated: [] as Record<string, unknown>[], deleted: [] as string[] }] as const
        }
      })
    )

    const changes: Record<string, { created: Record<string, unknown>[]; updated: Record<string, unknown>[]; deleted: string[] }> = {}
    for (const [table, tableChanges] of results) {
      changes[table] = tableChanges
    }

    return NextResponse.json({
      changes,
      timestamp: Date.now(),
      ...(Object.keys(tableErrors).length > 0 && { tableErrors }),
    })
  } catch (error) {
    console.error('Sync pull error:', error)
    return NextResponse.json(
      { error: 'Sync pull failed' },
      { status: 500 }
    )
  }
}
