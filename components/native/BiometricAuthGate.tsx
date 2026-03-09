'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { isNativeApp } from '@/lib/capacitor-utils'
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  getBiometryLabel,
} from '@/lib/biometric-auth'
import {
  isBiometricEnabled,
  getRefreshToken,
  storeRefreshToken,
  storeUserEmail,
  setBiometricEnabled as storeBiometricEnabled,
} from '@/lib/native-secure-storage'
import BiometricEnableDialog from '@/components/native/BiometricEnableDialog'

/**
 * ネイティブアプリ起動時のFace ID / Touch ID認証ゲート
 * - 生体認証が有効な場合: アプリ起動時にFace IDプロンプトを表示
 * - ログイン成功後: 生体認証の有効化を提案
 * AuthProviderの子として配置する
 */
export default function BiometricAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, getSessionRefreshToken } = useAuth()
  const [showEnableDialog, setShowEnableDialog] = useState(false)
  const [biometryLabel, setBiometryLabel] = useState('生体認証')
  const [hasPromptedEnable, setHasPromptedEnable] = useState(false)

  // ログイン成功後に生体認証の有効化を提案
  useEffect(() => {
    if (!isNativeApp() || loading || !user || hasPromptedEnable) return

    let mounted = true

    async function checkAndPrompt() {
      try {
        const [bioInfo, alreadyEnabled] = await Promise.all([
          checkBiometricAvailability(),
          isBiometricEnabled().catch(() => false),
        ])

        if (!mounted) return

        if (bioInfo.isAvailable && !alreadyEnabled) {
          setBiometryLabel(getBiometryLabel(bioInfo.biometryType))
          setShowEnableDialog(true)
          setHasPromptedEnable(true)
        }
      } catch {
        // 生体認証チェック失敗は無視（通常のログインフローに影響しない）
      }
    }

    checkAndPrompt()
    return () => { mounted = false }
  }, [user, loading, hasPromptedEnable])

  const handleEnableBiometric = useCallback(async () => {
    try {
      const refreshToken = await getSessionRefreshToken()
      if (refreshToken && user?.email) {
        await Promise.all([
          storeRefreshToken(refreshToken),
          storeUserEmail(user.email),
          storeBiometricEnabled(true),
        ])
      }
    } catch {
      // Keychain保存失敗は無視
    }
    setShowEnableDialog(false)
  }, [user, getSessionRefreshToken])

  const handleSkipBiometric = useCallback(() => {
    setShowEnableDialog(false)
  }, [])

  // ネイティブアプリ起動時のFace ID自動認証
  useEffect(() => {
    if (!isNativeApp() || loading) return

    let mounted = true

    async function tryBiometricLogin() {
      try {
        const enabled = await isBiometricEnabled().catch(() => false)
        if (!enabled || !mounted) return

        const storedToken = await getRefreshToken()
        if (!storedToken || !mounted) return

        // Face ID認証プロンプト表示
        const authResult = await authenticateWithBiometric()
        if (!authResult.success || !mounted) return

        // セッション復元は不要（WebViewがセッションを保持しているため）
        // ここではFace IDによる「アプリロック解除」として機能する
      } catch {
        // 生体認証失敗は無視
      }
    }

    // ユーザーが未ログインの場合のみFace IDでセッション復元を試行
    if (!user) {
      tryBiometricLogin()
    }

    return () => { mounted = false }
  }, [loading, user])

  return (
    <>
      {children}
      <BiometricEnableDialog
        open={showEnableDialog}
        biometryLabel={biometryLabel}
        onEnable={handleEnableBiometric}
        onSkip={handleSkipBiometric}
      />
    </>
  )
}
