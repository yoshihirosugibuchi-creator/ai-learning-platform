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

export function OfflineDBProvider({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<Database | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const initRef = useRef(false)

  // DB初期化
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      try {
        const { getDatabase } = await import('./database')
        const db = getDatabase()
        setDatabase(db)
        console.log('✅ WatermelonDB initialized')

        // localStorage quiz_backup_* の移行
        try {
          const { migrateLocalStorageBackups } = await import('./write-helpers')
          await migrateLocalStorageBackups(db)
        } catch (e) {
          console.warn('⚠️ localStorage migration skipped:', e)
        }

        // 初期同期（バックグラウンド）
        if (navigator.onLine) {
          setSyncing(true)
          const { syncDatabase } = await import('./sync')
          const result = await syncDatabase()
          if (!result.success) {
            setLastSyncError(result.error ?? 'Unknown sync error')
          }
          setSyncing(false)
        }
      } catch (error) {
        console.error('❌ WatermelonDB init failed:', error)
      }
    }

    init()
  }, [])

  // オンライン復帰時に自動同期
  useEffect(() => {
    function handleOnline() {
      if (!database) return
      console.log('🌐 Online - triggering sync')
      setSyncing(true)
      import('./sync').then(({ syncDatabase }) => {
        syncDatabase().then((result) => {
          if (!result.success) {
            setLastSyncError(result.error ?? 'Unknown sync error')
          } else {
            setLastSyncError(null)
          }
          setSyncing(false)
        })
      })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [database])

  const triggerSync = useCallback(async () => {
    if (syncing || !database) return
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
  }, [syncing, database])

  return (
    <OfflineDBContext.Provider value={{ database, syncing, lastSyncError, triggerSync }}>
      {children}
    </OfflineDBContext.Provider>
  )
}
