/**
 * WatermelonDB 同期ロジック
 * サーバーからマスタデータ + ユーザーデータを pull して
 * ローカルDBを最新状態に保つ
 */
import { synchronize } from '@nozbe/watermelondb/sync'
import { getDatabase } from './database'
import { setLastDiagnostic, getTableType, type TableSyncStatus, type SyncDiagnosticResult } from './sync-diagnostics'

/** 同期ロック（WatermelonDBは concurrent synchronize を禁止） */
let syncLock = false

/** 同期APIのベースURL */
function getSyncUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/sync`
  }
  return '/api/sync'
}

/** 認証トークンを取得 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

/** 同期を実行（診断情報付き） */
export async function syncDatabase(): Promise<{ success: boolean; error?: string }> {
  if (syncLock) {
    console.log('⏳ Sync already in progress, skipping')
    return { success: true } // 既に同期中なのでエラーにしない
  }
  syncLock = true

  const startedAt = Date.now()
  let pullDuration = 0
  let pushDuration = 0
  const tableStatuses: TableSyncStatus[] = []
  let serverTableErrors: Record<string, string> = {}

  try {
    const database = getDatabase()
    const token = await getAuthToken()

    console.log('🔄 Starting WatermelonDB sync...')

    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const pullStart = Date.now()
        console.log('📥 Pull: lastPulledAt =', lastPulledAt)
        const url = new URL(`${getSyncUrl()}/pull`)
        if (lastPulledAt) {
          url.searchParams.set('last_pulled_at', String(lastPulledAt))
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url.toString(), { headers })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Sync pull failed: ${response.status} ${text.substring(0, 200)}`)
        }

        const json = await response.json()
        const { changes, timestamp, tableErrors } = json
        serverTableErrors = tableErrors || {}
        pullDuration = Date.now() - pullStart

        // テーブル単位の診断情報を記録
        for (const [table, c] of Object.entries(changes)) {
          const tc = c as { created: unknown[]; updated: unknown[]; deleted: unknown[] }
          const status: TableSyncStatus = {
            table,
            type: getTableType(table),
            localCount: 0, // 同期後に更新
            pullCreated: tc.created.length,
            pullUpdated: tc.updated.length,
            pullDeleted: tc.deleted.length,
            status: serverTableErrors[table] ? 'error' : 'success',
            error: serverTableErrors[table],
            lastSyncAt: Date.now(),
          }
          tableStatuses.push(status)
        }

        // デバッグ: 各テーブルの件数をログ
        const summary = Object.entries(changes).map(([t, c]) => {
          const tc = c as { created: unknown[]; updated: unknown[]; deleted: unknown[] }
          const total = tc.created.length + tc.updated.length + tc.deleted.length
          return total > 0 ? `${t}:${tc.created.length}c/${tc.updated.length}u/${tc.deleted.length}d` : null
        }).filter(Boolean)
        console.log('📥 Pull response:', summary.join(', '))

        if (Object.keys(serverTableErrors).length > 0) {
          console.warn('⚠️ Server table errors:', serverTableErrors)
        }

        return { changes, timestamp }
      },
      pushChanges: async ({ changes }) => {
        const pushStart = Date.now()
        const hasChanges = Object.values(changes).some(
          (table) => {
            const t = table as { created: unknown[]; updated: unknown[]; deleted: unknown[] }
            return t.created.length > 0 || t.updated.length > 0 || t.deleted.length > 0
          }
        )

        if (!hasChanges) {
          console.log('📤 Push: no local changes')
          pushDuration = Date.now() - pushStart
          return
        }

        // デバッグ: push内容をログ
        const pushSummary = Object.entries(changes).map(([t, c]) => {
          const tc = c as { created: unknown[]; updated: unknown[]; deleted: unknown[] }
          const total = tc.created.length + tc.updated.length + tc.deleted.length
          return total > 0 ? `${t}:${tc.created.length}c/${tc.updated.length}u/${tc.deleted.length}d` : null
        }).filter(Boolean)
        console.log('📤 Push:', pushSummary.join(', '))

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${getSyncUrl()}/push`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ changes }),
        })

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`Sync push failed: ${response.status} ${text.substring(0, 200)}`)
        }

        const result = await response.json()
        pushDuration = Date.now() - pushStart
        console.log('📤 Push result:', JSON.stringify(result).substring(0, 300))
      },
    })

    // 同期後のローカル件数を取得
    try {
      const { getLocalTableCounts } = await import('./sync-diagnostics')
      const counts = await getLocalTableCounts(database)
      for (const ts of tableStatuses) {
        ts.localCount = counts[ts.table] ?? 0
      }
    } catch (e) {
      console.warn('⚠️ Failed to get local counts:', e)
    }

    const totalError = tableStatuses.filter(t => t.status === 'error').length
    const diagnostic: SyncDiagnosticResult = {
      tables: tableStatuses,
      overallStatus: totalError === 0 ? 'success' : 'partial',
      startedAt,
      completedAt: Date.now(),
      pullDuration,
      pushDuration,
      totalError,
    }
    setLastDiagnostic(diagnostic)

    console.log('✅ WatermelonDB sync completed')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : ''
    console.error('❌ WatermelonDB sync failed:', message)
    console.error('❌ Full error:', error)
    if (stack) console.error('❌ Stack:', stack)

    // エラー時も診断情報を保存
    const diagnostic: SyncDiagnosticResult = {
      tables: tableStatuses,
      overallStatus: 'error',
      startedAt,
      completedAt: Date.now(),
      pullDuration,
      pushDuration,
      totalError: tableStatuses.filter(t => t.status === 'error').length,
      errorMessage: message,
    }
    setLastDiagnostic(diagnostic)

    return { success: false, error: message }
  } finally {
    syncLock = false
  }
}

/** 特定テーブルのみ同期（軽量） */
export async function syncTables(tables: string[]): Promise<{ success: boolean; error?: string }> {
  if (syncLock) {
    console.log('⏳ Sync already in progress, skipping table sync')
    return { success: true }
  }
  syncLock = true

  try {
    const database = getDatabase()
    const token = await getAuthToken()

    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const url = new URL(`${getSyncUrl()}/pull`)
        if (lastPulledAt) {
          url.searchParams.set('last_pulled_at', String(lastPulledAt))
        }
        url.searchParams.set('tables', tables.join(','))

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url.toString(), { headers })
        if (!response.ok) {
          throw new Error(`Sync pull failed: ${response.status}`)
        }

        const { changes, timestamp } = await response.json()
        return { changes, timestamp }
      },
      pushChanges: async () => {
        // テーブル指定同期ではpushしない
      },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Sync tables failed:', message)
    return { success: false, error: message }
  } finally {
    syncLock = false
  }
}
