/**
 * WatermelonDB 同期ロジック
 * サーバーからマスタデータ + ユーザーデータを pull して
 * ローカルDBを最新状態に保つ
 */
import { synchronize } from '@nozbe/watermelondb/sync'
import { getDatabase } from './database'

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

/** 同期を実行 */
export async function syncDatabase(): Promise<{ success: boolean; error?: string }> {
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
      pushChanges: async ({ changes }) => {
        // Phase 2で実装（ユーザーデータのサーバー送信）
        // 現時点ではマスタデータのpullのみ
        const hasChanges = Object.values(changes).some(
          (table) => {
            const t = table as { created: unknown[]; updated: unknown[]; deleted: unknown[] }
            return t.created.length > 0 || t.updated.length > 0 || t.deleted.length > 0
          }
        )
        if (!hasChanges) return

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
          throw new Error(`Sync push failed: ${response.status}`)
        }
      },
      migrationsEnabledAtVersion: 1,
    })

    console.log('✅ WatermelonDB sync completed')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ WatermelonDB sync failed:', message)
    return { success: false, error: message }
  }
}

/** 特定テーブルのみ同期（軽量） */
export async function syncTables(tables: string[]): Promise<{ success: boolean; error?: string }> {
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
      migrationsEnabledAtVersion: 1,
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Sync tables failed:', message)
    return { success: false, error: message }
  }
}
