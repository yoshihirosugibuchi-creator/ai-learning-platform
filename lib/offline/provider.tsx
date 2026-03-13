'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { Database } from '@nozbe/watermelondb'

type OfflineDBContextType = {
  /** データベースインスタンス */
  database: Database | null
  /** 同期中フラグ */
  syncing: boolean
  /** 最後の同期結果 */
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

  // 同期実行（認証確認付き）
  const doSync = useCallback(async () => {
    if (!dbRef.current || !navigator.onLine) return
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

        // 認証済みの場合のみ初期同期
        if (navigator.onLine) {
          const authenticated = await hasAuthSession()
          if (authenticated) {
            setSyncing(true)
            const { syncDatabase } = await import('./sync')
            const result = await syncDatabase()
            if (!result.success) {
              setLastSyncError(result.error ?? 'Unknown sync error')
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
          console.log('🔑 Signed in - triggering sync')
          doSync()
        }
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => unsubscribe?.()
  }, [doSync])

  // オンライン復帰時に自動同期（認証済みのみ）
  useEffect(() => {
    function handleOnline() {
      console.log('🌐 Online - checking auth before sync')
      doSync()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [doSync])

  const triggerSync = useCallback(async () => {
    if (syncing) return
    await doSync()
  }, [syncing, doSync])

  return (
    <OfflineDBContext.Provider value={{ database, syncing, lastSyncError, triggerSync }}>
      {children}
    </OfflineDBContext.Provider>
  )
}
