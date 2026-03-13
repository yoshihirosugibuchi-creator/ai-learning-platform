'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { Database } from '@nozbe/watermelondb'

type OfflineDBContextType = {
  /** データベースインスタンス */
  database: Database | null
  /** 同期中フラグ */
  syncing: boolean
  /** 最後の同期エラー（手動同期時のみセット） */
  lastSyncError: string | null
  /** 手動同期トリガー */
  triggerSync: () => Promise<void>
}

const OfflineDBContext = createContext<OfflineDBContextType>({
  database: null,
  syncing: false,
  lastSyncError: null,
  triggerSync: async () => {},
})

export function useOfflineDB() {
  return useContext(OfflineDBContext)
}

/** 認証セッションの有無を確認 */
async function hasAuthSession(): Promise<boolean> {
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch {
    return false
  }
}

export function OfflineDBProvider({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<Database | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const initRef = useRef(false)
  const dbRef = useRef<Database | null>(null)

  // バックグラウンド同期（エラーはログのみ、UIには表示しない）
  const doBackgroundSync = useCallback(async () => {
    if (!dbRef.current || !navigator.onLine) return
    const authenticated = await hasAuthSession()
    if (!authenticated) return

    setSyncing(true)
    try {
      const { syncDatabase } = await import('./sync')
      const result = await syncDatabase()
      if (!result.success) {
        console.warn('⚠️ Background sync failed (will retry later):', result.error)
      } else {
        setLastSyncError(null)
        console.log('✅ Background sync completed')
      }
    } catch (e) {
      console.warn('⚠️ Background sync error:', e)
    } finally {
      setSyncing(false)
    }
  }, [])

  // DB初期化
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      try {
        const { getDatabase } = await import('./database')
        const db = getDatabase()
        setDatabase(db)
        dbRef.current = db
        console.log('✅ WatermelonDB initialized')

        // localStorage quiz_backup_* の移行
        try {
          const { migrateLocalStorageBackups } = await import('./write-helpers')
          await migrateLocalStorageBackups(db)
        } catch (e) {
          console.warn('⚠️ localStorage migration skipped:', e)
        }

        // 認証済みの場合のみバックグラウンド同期
        if (navigator.onLine) {
          const authenticated = await hasAuthSession()
          if (authenticated) {
            setSyncing(true)
            try {
              const { syncDatabase } = await import('./sync')
              const result = await syncDatabase()
              if (!result.success) {
                console.warn('⚠️ Initial sync failed:', result.error)
              }
            } catch (e) {
              console.warn('⚠️ Initial sync error:', e)
            }
            setSyncing(false)
          }
        }
      } catch (error) {
        console.error('❌ WatermelonDB init failed:', error)
      }
    }

    init()
  }, [])

  // 認証状態変化でsyncトリガー（ログイン完了時）
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    import('@/lib/supabase').then(({ supabase }) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' && dbRef.current) {
          console.log('🔑 Signed in - triggering background sync')
          doBackgroundSync()
        }
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => unsubscribe?.()
  }, [doBackgroundSync])

  // オンライン復帰時に自動同期（認証済みのみ）
  useEffect(() => {
    function handleOnline() {
      console.log('🌐 Online - triggering background sync')
      doBackgroundSync()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [doBackgroundSync])

  // 手動同期（エラーをUIに表示）
  const triggerSync = useCallback(async () => {
    if (syncing || !dbRef.current) return
    const authenticated = await hasAuthSession()
    if (!authenticated) return

    setSyncing(true)
    try {
      const { syncDatabase } = await import('./sync')
      const result = await syncDatabase()
      if (!result.success) {
        setLastSyncError(result.error ?? 'Unknown sync error')
      } else {
        setLastSyncError(null)
      }
    } catch (e) {
      setLastSyncError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  return (
    <OfflineDBContext.Provider value={{ database, syncing, lastSyncError, triggerSync }}>
      {children}
    </OfflineDBContext.Provider>
  )
}
