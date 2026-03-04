'use client'

import { useState, useEffect, useCallback } from 'react'
import { isNativeApp } from '@/lib/capacitor-utils'
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  getBiometryLabel,
  type BiometryInfo,
} from '@/lib/biometric-auth'
import {
  isBiometricEnabled,
  getRefreshToken,
  getUserEmail,
  storeRefreshToken,
  storeUserEmail,
  setBiometricEnabled as storeBiometricEnabled,
  clearSecureStorage,
} from '@/lib/native-secure-storage'

type BiometricAuthState = {
  /** 生体認証のハードウェア情報 */
  biometryInfo: BiometryInfo
  /** ユーザーが生体認証を有効化しているか */
  enabled: boolean
  /** 認証処理中フラグ */
  authenticating: boolean
  /** 生体認証の種類ラベル（"Face ID", "Touch ID"等） */
  biometryLabel: string
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    biometryInfo: { isAvailable: false, biometryType: 'none', reason: '' },
    enabled: false,
    authenticating: false,
    biometryLabel: '生体認証',
  })

  // 初期化: 生体認証の利用可能性とユーザー設定を確認
  useEffect(() => {
    if (!isNativeApp()) return

    let mounted = true

    async function init() {
      const [info, enabled] = await Promise.all([
        checkBiometricAvailability(),
        isBiometricEnabled(),
      ])

      if (mounted) {
        setState({
          biometryInfo: info,
          enabled,
          authenticating: false,
          biometryLabel: getBiometryLabel(info.biometryType),
        })
      }
    }

    init()
    return () => { mounted = false }
  }, [])

  /**
   * 生体認証でログイン
   * 成功時: KeychainのトークンとメールでSupabaseセッション復元
   */
  const loginWithBiometric = useCallback(async (): Promise<{
    success: boolean
    refreshToken?: string
    email?: string
    error?: string
  }> => {
    setState((prev) => ({ ...prev, authenticating: true }))

    try {
      const authResult = await authenticateWithBiometric()
      if (!authResult.success) {
        return { success: false, error: authResult.error }
      }

      const [refreshToken, email] = await Promise.all([
        getRefreshToken(),
        getUserEmail(),
      ])

      if (!refreshToken) {
        return {
          success: false,
          error: 'トークンが見つかりません。メールアドレスでログインしてください。',
        }
      }

      return { success: true, refreshToken, email: email ?? undefined }
    } finally {
      setState((prev) => ({ ...prev, authenticating: false }))
    }
  }, [])

  /**
   * 生体認証を有効化（初回ログイン成功後に呼ぶ）
   */
  const enableBiometric = useCallback(
    async (refreshToken: string, email: string): Promise<void> => {
      await Promise.all([
        storeRefreshToken(refreshToken),
        storeUserEmail(email),
        storeBiometricEnabled(true),
      ])
      setState((prev) => ({ ...prev, enabled: true }))
    },
    []
  )

  /**
   * 生体認証を無効化
   */
  const disableBiometric = useCallback(async (): Promise<void> => {
    await clearSecureStorage()
    setState((prev) => ({ ...prev, enabled: false }))
  }, [])

  /**
   * トークンを更新（セッションリフレッシュ時）
   */
  const updateStoredToken = useCallback(
    async (refreshToken: string): Promise<void> => {
      if (!state.enabled) return
      await storeRefreshToken(refreshToken)
    },
    [state.enabled]
  )

  return {
    ...state,
    /** ネイティブアプリかつ生体認証が利用可能 */
    canUseBiometric: isNativeApp() && state.biometryInfo.isAvailable,
    /** 生体認証でログイン可能（有効化済み＋利用可能） */
    canLoginWithBiometric:
      isNativeApp() && state.biometryInfo.isAvailable && state.enabled,
    loginWithBiometric,
    enableBiometric,
    disableBiometric,
    updateStoredToken,
  }
}
