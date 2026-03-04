'use client'

import { useEffect } from 'react'
import { isNativeApp, isIOSNative } from '@/lib/capacitor-utils'

/**
 * ネイティブアプリ検出時にbodyにクラスを追加し、
 * ステータスバーのスタイルを設定するコンポーネント
 */
export default function NativeAppDetector() {
  useEffect(() => {
    if (!isNativeApp()) return

    document.body.classList.add('native-app')

    if (isIOSNative()) {
      document.body.classList.add('native-ios')

      // ステータスバー設定
      import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: Style.Light })
      })
    }

    return () => {
      document.body.classList.remove('native-app', 'native-ios')
    }
  }, [])

  return null
}
