/**
 * WKWebViewのデータストアをネイティブ側からクリアするプラグイン
 * ログアウト時にlocalStorage/Cookie/IndexedDB/CacheをWKWebsiteDataStoreレベルで完全削除
 */
import { isNativeApp } from '@/lib/capacitor-utils'
import { registerPlugin } from '@capacitor/core'

interface ClearWebDataPluginInterface {
  clearAllData(): Promise<{ cleared: boolean }>
}

const ClearWebDataPlugin = registerPlugin<ClearWebDataPluginInterface>('ALEClearWebData')

/** WKWebViewの全データをネイティブ側からクリア（ネイティブアプリのみ） */
export async function clearAllWebViewData(): Promise<void> {
  if (!isNativeApp()) return
  try {
    await ClearWebDataPlugin.clearAllData()
  } catch {
    // プラグイン未登録時は無視（ブラウザ環境）
  }
}
