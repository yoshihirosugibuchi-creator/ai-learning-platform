'use client'

import { useEffect, useState } from 'react'
import { useOfflineDB } from '@/lib/offline/provider'
import { useAuth } from '@/components/auth/AuthProvider'
import { RefreshCw, WifiOff, AlertTriangle, Check } from 'lucide-react'

type SyncState = 'idle' | 'syncing' | 'error' | 'offline' | 'success'

export function SyncStatusIndicator() {
  const { syncing, lastSyncError, triggerSync } = useOfflineDB()
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const [state, setState] = useState<SyncState>('idle')
  const [showSuccess, setShowSuccess] = useState(false)

  // オンライン状態の監視
  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 状態の決定
  useEffect(() => {
    if (!isOnline) {
      setState('offline')
      setShowSuccess(false)
    } else if (syncing) {
      setState('syncing')
      setShowSuccess(false)
    } else if (lastSyncError) {
      setState('error')
      setShowSuccess(false)
    } else if (state === 'syncing') {
      setState('success')
      setShowSuccess(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, syncing, lastSyncError])

  // 同期完了表示を3秒で非表示
  useEffect(() => {
    if (!showSuccess) return
    const timer = setTimeout(() => {
      setShowSuccess(false)
      setState('idle')
    }, 3000)
    return () => clearTimeout(timer)
  }, [showSuccess])

  // 未ログイン時またはidle状態では何も表示しない
  if (!user || state === 'idle') return null

  const config = {
    syncing: {
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      text: '同期中...',
      className: 'bg-blue-500/90 text-white',
    },
    offline: {
      icon: <WifiOff className="h-3.5 w-3.5" />,
      text: 'オフライン',
      className: 'bg-gray-600/90 text-white',
    },
    error: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: `同期エラー: ${lastSyncError || ''}`.substring(0, 80),
      className: 'bg-red-500/90 text-white cursor-pointer max-w-[90vw]',
    },
    success: {
      icon: <Check className="h-3.5 w-3.5" />,
      text: '同期完了',
      className: 'bg-green-500/90 text-white',
    },
    idle: { icon: null, text: '', className: '' },
  }

  const current = config[state]

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transition-all ${current.className}`}
      onClick={state === 'error' ? triggerSync : undefined}
      role={state === 'error' ? 'button' : undefined}
    >
      {current.icon}
      <span>{current.text}</span>
    </div>
  )
}
