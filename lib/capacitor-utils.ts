import { Capacitor } from '@capacitor/core'

/** Capacitorネイティブ環境（iOS/Android）で動作しているか判定 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** iOSネイティブアプリで動作しているか判定 */
export function isIOSNative(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

/** ブラウザ（PWA含む）で動作しているか判定 */
export function isBrowser(): boolean {
  return Capacitor.getPlatform() === 'web'
}
