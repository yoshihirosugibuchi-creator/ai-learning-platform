/**
 * WatermelonDB 同期API - Push エンドポイント
 * クライアントのローカル変更をSupabaseに反映
 * 冪等処理: 重複レコードはON CONFLICT DO NOTHINGでスキップ
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Push可能なユーザーデータテーブル（append-only）
const APPENDABLE_TABLES = new Set([
  'quiz_sessions',
  'quiz_answers',
  'case_study_sessions',
  'case_study_step_details',
  'case_study_thinking_logs',
  'course_session_completions',
])

// Upsert対象テーブル（コレクション系）
const UPSERT_TABLES = new Set([
  'wisdom_card_collection',
  'user_knowledge_collection_v2',
  'user_challenge_selections',
])

// Push対象外テーブル（サーバー計算 or マスタ）
const SKIP_TABLES = new Set([
  'user_xp_stats_v2',
  'daily_xp_records',
  'course_theme_completions',
  // マスタテーブルは全てスキップ
  'quiz_questions', 'quiz_packs', 'session_quizzes',
  'case_study_problems', 'case_study_steps', 'case_study_rubric_axes',
  'case_study_options', 'case_study_course_links',
  'learning_courses', 'learning_genres', 'learning_themes',
  'learning_sessions', 'session_contents',
  'skill_levels', 'categories', 'subcategories',
  'xp_level_skp_settings', 'wisdom_cards',
])

// JSONフィールド定義（文字列→オブジェクト変換が必要なフィールド）
const JSON_FIELDS: Record<string, string[]> = {
  quiz_sessions: ['category_breakdown', 'answers_data', 'review_reasons', 'session_metadata'],
  quiz_answers: ['options'],
  case_study_sessions: ['evaluation_result', 'session_metadata'],
  case_study_step_details: ['rubric_scores', 'ai_evaluation', 'options_data'],
  case_study_thinking_logs: ['metadata'],
  wisdom_card_collection: [],
  user_knowledge_collection_v2: [],
  course_session_completions: ['session_metadata'],
}

/** WatermelonDB行をSupabase形式に逆変換 */
function reverseTransformRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const jsonFields = JSON_FIELDS[table] || []

  for (const [key, value] of Object.entries(row)) {
    // WatermelonDB内部フィールドをスキップ
    if (key === '_status' || key === '_changed') continue

    // server_idフィールドはスキップ（pull時にのみ使用）
    if (key === 'server_id') continue

    // タイムスタンプ数値 → ISO文字列
    if (
      (key.endsWith('_at') || key === 'completion_time' || key === 'timestamp') &&
      typeof value === 'number' &&
      value > 0
    ) {
      result[key] = new Date(value).toISOString()
      continue
    }

    // JSON文字列 → オブジェクト
    if (jsonFields.includes(key) && typeof value === 'string') {
      try {
        result[key] = JSON.parse(value)
      } catch {
        result[key] = value
      }
      continue
    }

    result[key] = value
  }

  return result
}

/** テーブルへのappend（ON CONFLICT DO NOTHING） */
async function pushAppendable(
  table: string,
  created: Record<string, unknown>[],
  updated: Record<string, unknown>[],
  userId: string
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = []
  let inserted = 0
  const allRows = [...created, ...updated]

  for (const row of allRows) {
    const transformed = reverseTransformRow(table, row)
    // user_idの検証（他ユーザーのデータを書き込ませない）
    if (transformed.user_id && transformed.user_id !== userId) {
      errors.push(`${table}: user_id mismatch`)
      continue
    }

    const { error } = await supabaseAdmin
      .from(table)
      .upsert(transformed, { onConflict: 'id', ignoreDuplicates: true })

    if (error) {
      errors.push(`${table} [${transformed.id}]: ${error.message}`)
    } else {
      inserted++
    }
  }

  return { inserted, errors }
}

/** コレクションテーブルのupsert */
async function pushUpsert(
  table: string,
  created: Record<string, unknown>[],
  updated: Record<string, unknown>[],
  userId: string
): Promise<{ upserted: number; errors: string[] }> {
  const errors: string[] = []
  let upserted = 0
  const allRows = [...created, ...updated]

  for (const row of allRows) {
    const transformed = reverseTransformRow(table, row)
    if (transformed.user_id && transformed.user_id !== userId) {
      errors.push(`${table}: user_id mismatch`)
      continue
    }

    if (table === 'wisdom_card_collection') {
      // wisdom_card_collectionは card_id + user_id でupsert
      const { error } = await supabaseAdmin
        .from(table)
        .upsert(transformed, { onConflict: 'user_id,card_id' })

      if (error) {
        errors.push(`${table} [${transformed.card_id}]: ${error.message}`)
      } else {
        upserted++
      }
    } else if (table === 'user_knowledge_collection_v2') {
      // user_knowledge_collection_v2は theme_id + user_id でupsert
      const { error } = await supabaseAdmin
        .from(table)
        .upsert(transformed, { onConflict: 'user_id,theme_id', ignoreDuplicates: true })

      if (error) {
        errors.push(`${table} [${transformed.theme_id}]: ${error.message}`)
      } else {
        upserted++
      }
    } else if (table === 'user_challenge_selections') {
      // user_challenge_selectionsは user_id + slot_type でupsert
      const { error } = await supabaseAdmin
        .from(table)
        .upsert(transformed, { onConflict: 'user_id,slot_type' })

      if (error) {
        errors.push(`${table} [${transformed.slot_type}]: ${error.message}`)
      } else {
        upserted++
      }
    }
  }

  return { upserted, errors }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    let userId: string | undefined

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id
    }

    // 開発環境認証バイパス
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = request.headers.get('x-test-user-id') ?? undefined
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { changes } = body as {
      changes: Record<string, {
        created: Record<string, unknown>[]
        updated: Record<string, unknown>[]
        deleted: string[]
      }>
    }

    if (!changes) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    const results: Record<string, { status: string; count: number; errors?: string[] }> = {}

    for (const [table, tableChanges] of Object.entries(changes)) {
      // スキップ対象テーブル
      if (SKIP_TABLES.has(table)) {
        results[table] = { status: 'skipped', count: 0 }
        continue
      }

      const hasChanges =
        tableChanges.created.length > 0 ||
        tableChanges.updated.length > 0 ||
        tableChanges.deleted.length > 0

      if (!hasChanges) {
        results[table] = { status: 'empty', count: 0 }
        continue
      }

      // Append-only テーブル
      if (APPENDABLE_TABLES.has(table)) {
        const { inserted, errors } = await pushAppendable(
          table,
          tableChanges.created,
          tableChanges.updated,
          userId
        )
        results[table] = {
          status: errors.length > 0 ? 'partial' : 'success',
          count: inserted,
          ...(errors.length > 0 && { errors }),
        }
        continue
      }

      // Upsertテーブル
      if (UPSERT_TABLES.has(table)) {
        const { upserted, errors } = await pushUpsert(
          table,
          tableChanges.created,
          tableChanges.updated,
          userId
        )
        results[table] = {
          status: errors.length > 0 ? 'partial' : 'success',
          count: upserted,
          ...(errors.length > 0 && { errors }),
        }
        continue
      }

      // 未知のテーブル
      results[table] = { status: 'unknown_table', count: 0 }
    }

    console.log('✅ Sync push completed:', results)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('❌ Sync push error:', error)
    return NextResponse.json(
      { error: 'Sync push failed' },
      { status: 500 }
    )
  }
}
