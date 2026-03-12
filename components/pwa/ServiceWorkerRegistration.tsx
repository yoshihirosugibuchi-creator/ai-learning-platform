'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // ネイティブアプリでもSWを有効にする（オフラインキャッシュのため）
    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope)

          // 新しいSWが見つかったら自動更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (!newWorker) return

            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'activated' &&
                navigator.serviceWorker.controller
              ) {
                console.log('SW updated, new content available')
              }
            })
          })
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    }
  }, [])

  return null
}
