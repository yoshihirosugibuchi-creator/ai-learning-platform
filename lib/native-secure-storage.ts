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

const SimpleStorage = registerPlugin<SimpleStorageInterface>('SimpleStoragePlugin')

const KEYS = {
  REFRESH_TOKEN: 'refresh_token',
  USER_EMAIL: 'user_email',
  BIOMETRIC_ENABLED: 'biometric_enabled',
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

/** 認証データをすべてクリア */
export async function clearSecureStorage(): Promise<void> {
  if (!isNativeApp()) return
  await SimpleStorage.clear()
}
