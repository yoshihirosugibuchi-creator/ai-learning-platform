/**
 * iOS UserDefaultsに認証トークン等を保存するラッパー
 * カスタムCapacitorプラグイン（SimpleStoragePlugin）を使用
 * ネイティブアプリでのみ使用（ブラウザではno-op）
 */
import { isNativeApp } from '@/lib/capacitor-utils'
import { registerPlugin } from '@capacitor/core'

interface SimpleStorageInterface {
  setItem(options: { key: string; value: string }): Promise<void>
  getItem(options: { key: string }): Promise<{ value: string | null }>
  removeItem(options: { key: string }): Promise<void>
  clear(): Promise<void>
}

const SimpleStorage = registerPlugin<SimpleStorageInterface>('ALESimpleStorage')

const KEYS = {
  REFRESH_TOKEN: 'refresh_token',
  USER_EMAIL: 'user_email',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  LOGGED_OUT: 'logged_out',
  SESSION_ACTIVE: 'session_active',
} as const

/** リフレッシュトークンを保存 */
export async function storeRefreshToken(token: string): Promise<void> {
  if (!isNativeApp()) return
  await SimpleStorage.setItem({ key: KEYS.REFRESH_TOKEN, value: token })
}

/** リフレッシュトークンを取得 */
export async function getRefreshToken(): Promise<string | null> {
  if (!isNativeApp()) return null
  const { value } = await SimpleStorage.getItem({ key: KEYS.REFRESH_TOKEN })
  return value
}

/** メールアドレスを保存 */
export async function storeUserEmail(email: string): Promise<void> {
  if (!isNativeApp()) return
  await SimpleStorage.setItem({ key: KEYS.USER_EMAIL, value: email })
}

/** メールアドレスを取得 */
export async function getUserEmail(): Promise<string | null> {
  if (!isNativeApp()) return null
  const { value } = await SimpleStorage.getItem({ key: KEYS.USER_EMAIL })
  return value
}

/** 生体認証の有効/無効を保存 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (!isNativeApp()) return
  await SimpleStorage.setItem({ key: KEYS.BIOMETRIC_ENABLED, value: enabled ? 'true' : 'false' })
}

/** 生体認証が有効かどうかを取得 */
export async function isBiometricEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false
  const { value } = await SimpleStorage.getItem({ key: KEYS.BIOMETRIC_ENABLED })
  return value === 'true'
}

/** 認証データをすべてクリア（生体認証設定も含む） */
export async function clearSecureStorage(): Promise<void> {
  if (!isNativeApp()) return
  await SimpleStorage.clear()
}

/** セッションアクティブフラグを設定/解除（AppDelegateとAuthProviderが起動時にチェック） */
export async function setSessionActiveFlag(active: boolean): Promise<void> {
  if (!isNativeApp()) return
  if (active) {
    await SimpleStorage.setItem({ key: KEYS.SESSION_ACTIVE, value: 'true' })
  } else {
    await SimpleStorage.removeItem({ key: KEYS.SESSION_ACTIVE })
  }
}

/** セッションアクティブフラグを確認（フラグを消さない） */
export async function isSessionActive(): Promise<boolean> {
  if (!isNativeApp()) return true // ブラウザでは常にtrue（localStorage信頼可能）
  const { value } = await SimpleStorage.getItem({ key: KEYS.SESSION_ACTIVE })
  return value === 'true'
}

/** ログアウトフラグを設定（アプリ再起動時にチェック用） */
export async function setLoggedOutFlag(): Promise<void> {
  if (!isNativeApp()) return
  await SimpleStorage.setItem({ key: KEYS.LOGGED_OUT, value: 'true' })
}

/** ログアウトフラグを確認＆クリア（trueなら未処理のログアウトあり） */
export async function checkAndClearLoggedOutFlag(): Promise<boolean> {
  if (!isNativeApp()) return false
  const { value } = await SimpleStorage.getItem({ key: KEYS.LOGGED_OUT })
  if (value === 'true') {
    await SimpleStorage.removeItem({ key: KEYS.LOGGED_OUT })
    return true
  }
  return false
}
