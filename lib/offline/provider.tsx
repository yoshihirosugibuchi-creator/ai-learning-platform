'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { Database } from '@nozbe/watermelondb'

type OfflineDBContextType = {
  /** データベースインスタンス（PCではnull） */
  database: Database | null
  /** 同期中フラグ */
  syncing: boolean
  /** 最後の同期エラー */
  lastSyncError: string | null
  /** 手動同期トリガー */
  triggerSync: () => Promise<void>
  /** ネイティブアプリかどうか */
  isNative: boolean
}

const OfflineDBContext = createContext<OfflineDBContextType>({
  database: null,
  syncing: false,
  lastSyncError: null,
  triggerSync: async () => {},
  isNative: false,
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

/** ネイティブアプリ判定（Capacitor） */
async function checkIsNative(): Promise<boolean> {
  try {
    const { isNativeApp } = await import('@/lib/capacitor-utils')
    return isNativeApp()
  } catch {
    return false
  }
}

export function OfflineDBProvider({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<Database | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const [isNative, setIsNative] = useState(false)
  const initRef = useRef(false)
  const dbRef = useRef<Database | null>(null)

  // バックグラウンド同期（エラーはログのみ、ユーザーに表示しない）
  const doBackgroundSync = useCallback(async () => {
    if (!dbRef.current || !navigator.onLine) return
    const authenticated = await hasAuthSession()
    if (!authenticated) return

    setSyncing(true)
    try {
      const { syncDatabase } = await import('./sync')
      const result = await syncDatabase()
      if (!result.success) {
        console.warn('⚠️ Background sync failed:', result.error)
        // バックグラウンド同期のエラーはユーザーに表示しない（transient failureの可能性）
      } else {
        setLastSyncError(null)
      }
    } catch (e) {
      console.warn('⚠️ Background sync error:', e)
    } finally {
      setSyncing(false)
    }
  }, [])

  // DB初期化（ネイティブアプリのみ）
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      // PC（ブラウザ）ではWatermelonDB不要
      const native = await checkIsNative()
      setIsNative(native)
      if (!native) {
        console.log('🖥️ Browser detected - skipping WatermelonDB')
        return
      }

      try {
        const { getDatabase } = await import('./database')
        const db = getDatabase()
        setDatabase(db)
        dbRef.current = db
        console.log('✅ WatermelonDB initialized (native app)')

        // localStorage quiz_backup_* の移行
        try {
          const { migrateLocalStorageBackups } = await import('./write-helpers')
          await migrateLocalStorageBackups(db)
        } catch (e) {
          console.warn('⚠️ localStorage migration skipped:', e)
        }

        // 認証済みの場合のみ初期同期（エラーはログのみ）
        if (navigator.onLine) {
          const authenticated = await hasAuthSession()
          if (authenticated) {
            setSyncing(true)
            try {
              const { syncDatabase } = await import('./sync')
              const result = await syncDatabase()
              if (!result.success) {
                console.warn('⚠️ Initial sync failed:', result.error)
                // 初期同期のエラーはユーザーに表示しない（ローカルDBで動作可能）
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

  // 認証状態変化でsyncトリガー（ログイン完了時、ネイティブのみ）
  useEffect(() => {
    if (!isNative) return
    let unsubscribe: (() => void) | undefined

    import('@/lib/supabase').then(({ supabase }) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' && dbRef.current) {
          console.log('🔑 Signed in - triggering sync')
          doBackgroundSync()
        }
      })
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => unsubscribe?.()
  }, [doBackgroundSync, isNative])

  // オンライン復帰時に自動同期（ネイティブのみ）
  useEffect(() => {
    if (!isNative) return

    function handleOnline() {
      console.log('🌐 Online - triggering sync')
      doBackgroundSync()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [doBackgroundSync, isNative])

  // 手動同期
  const triggerSync = useCallback(async () => {
    if (syncing) {
      console.warn('⚠️ triggerSync skipped: already syncing')
      return
    }
    if (!dbRef.current) {
      console.warn('⚠️ triggerSync skipped: database not initialized (isNative:', isNative, ')')
      setLastSyncError('データベースが初期化されていません。アプリを再起動してください。')
      return
    }
    const authenticated = await hasAuthSession()
    if (!authenticated) {
      console.warn('⚠️ triggerSync skipped: not authenticated')
      setLastSyncError('認証されていません。再ログインしてください。')
      return
    }

    setSyncing(true)
    setLastSyncError(null)
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
  }, [syncing, isNative])

  return (
    <OfflineDBContext.Provider value={{ database, syncing, lastSyncError, triggerSync, isNative }}>
      {children}
    </OfflineDBContext.Provider>
  )
}
