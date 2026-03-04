'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/lib/capacitor-utils'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // ネイティブアプリ内ではSW登録をスキップ（WebViewとの競合回避）
    if (isNativeApp()) return

    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope)
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    }
  }, [])

  return null
}
