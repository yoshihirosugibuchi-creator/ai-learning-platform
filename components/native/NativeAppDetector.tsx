'use client'

import { useEffect } from 'react'
import { isNativeApp, isIOSNative } from '@/lib/capacitor-utils'

/**
 * ネイティブアプリ検出時にbodyにクラスを追加するコンポーネント
 */
export default function NativeAppDetector() {
  useEffect(() => {
    if (!isNativeApp()) return

    document.body.classList.add('native-app')

    if (isIOSNative()) {
      document.body.classList.add('native-ios')
    }

    return () => {
      document.body.classList.remove('native-app', 'native-ios')
    }
  }, [])

  return null
}
