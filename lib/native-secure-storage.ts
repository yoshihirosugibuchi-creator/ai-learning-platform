/**
 * iOS Keychainに認証トークン等を安全に保存するラッパー
 * ネイティブアプリでのみ使用（ブラウザではno-op）
 */
import { isNativeApp } from '@/lib/capacitor-utils'

const KEYS = {
  REFRESH_TOKEN: 'ale_refresh_token',
  USER_EMAIL: 'ale_user_email',
  BIOMETRIC_ENABLED: 'ale_biometric_enabled',
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storageInstance: any = null
let initialized = false

async function getStorage() {
  if (!isNativeApp()) return null
  if (!storageInstance) {
    const mod = await import('@aparajita/capacitor-secure-storage')
    storageInstance = mod.SecureStorage
  }
  if (!initialized) {
    await storageInstance.setSynchronize(false)
    initialized = true
  }
  return storageInstance
}

/** リフレッシュトークンをKeychainに保存 */
export async function storeRefreshToken(token: string): Promise<void> {
  const storage = await getStorage()
  if (!storage) return
  await storage.set(KEYS.REFRESH_TOKEN, token)
}

/** Keychainからリフレッシュトークンを取得 */
export async function getRefreshToken(): Promise<string | null> {
  const storage = await getStorage()
  if (!storage) return null
  const result = await storage.get(KEYS.REFRESH_TOKEN)
  return result != null ? String(result) : null
}

/** ユーザーのメールアドレスをKeychainに保存 */
export async function storeUserEmail(email: string): Promise<void> {
  const storage = await getStorage()
  if (!storage) return
  await storage.set(KEYS.USER_EMAIL, email)
}

/** Keychainからメールアドレスを取得 */
export async function getUserEmail(): Promise<string | null> {
  const storage = await getStorage()
  if (!storage) return null
  const result = await storage.get(KEYS.USER_EMAIL)
  return result != null ? String(result) : null
}

/** 生体認証の有効/無効をKeychainに保存 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  const storage = await getStorage()
  if (!storage) return
  await storage.set(KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false')
}

/** 生体認証が有効かどうかを取得 */
export async function isBiometricEnabled(): Promise<boolean> {
  const storage = await getStorage()
  if (!storage) return false
  const result = await storage.get(KEYS.BIOMETRIC_ENABLED)
  return String(result) === 'true'
}

/** Keychain内の認証データをすべてクリア */
export async function clearSecureStorage(): Promise<void> {
  const storage = await getStorage()
  if (!storage) return
  await storage.remove(KEYS.REFRESH_TOKEN)
  await storage.remove(KEYS.USER_EMAIL)
  await storage.remove(KEYS.BIOMETRIC_ENABLED)
}
