/**
 * 生体認証（Face ID / Touch ID）サービス
 * ネイティブアプリでのみ使用
 */
import { isNativeApp } from '@/lib/capacitor-utils'

export type BiometryInfo = {
  isAvailable: boolean
  biometryType: 'faceId' | 'touchId' | 'none'
  reason: string
}

/** Face ID / Touch ID の対応状況をチェック */
export async function checkBiometricAvailability(): Promise<BiometryInfo> {
  if (!isNativeApp()) {
    return { isAvailable: false, biometryType: 'none', reason: 'Not a native app' }
  }

  try {
    const { BiometricAuth, BiometryType } = await import(
      '@aparajita/capacitor-biometric-auth'
    )
    const result = await BiometricAuth.checkBiometry()

    let biometryType: BiometryInfo['biometryType'] = 'none'
    if (result.biometryType === BiometryType.faceId) {
      biometryType = 'faceId'
    } else if (result.biometryType === BiometryType.touchId) {
      biometryType = 'touchId'
    }

    return {
      isAvailable: result.isAvailable,
      biometryType,
      reason: result.reason || `raw: avail=${result.isAvailable}, type=${result.biometryType}, strongType=${typeof result.biometryType}`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { isAvailable: false, biometryType: 'none', reason: `Check failed: ${msg}` }
  }
}

/** 生体認証プロンプトを表示して認証を実行 */
export async function authenticateWithBiometric(): Promise<{
  success: boolean
  error?: string
}> {
  if (!isNativeApp()) {
    return { success: false, error: 'Not a native app' }
  }

  try {
    const { BiometricAuth } = await import(
      '@aparajita/capacitor-biometric-auth'
    )
    await BiometricAuth.authenticate({
      reason: 'ALE学習にログインするために認証してください',
      cancelTitle: 'キャンセル',
      allowDeviceCredential: true,
    })
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '認証に失敗しました'
    return { success: false, error: message }
  }
}

/** 生体認証の種類に応じたラベルを返す */
export function getBiometryLabel(
  type: BiometryInfo['biometryType']
): string {
  switch (type) {
    case 'faceId':
      return 'Face ID'
    case 'touchId':
      return 'Touch ID'
    default:
      return '生体認証'
  }
}
