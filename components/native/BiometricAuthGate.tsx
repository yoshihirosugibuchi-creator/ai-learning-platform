'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { isNativeApp } from '@/lib/capacitor-utils'
import {
  storeRefreshToken,
  storeUserEmail,
  setBiometricEnabled as storeBiometricEnabled,
} from '@/lib/native-secure-storage'
import BiometricEnableDialog from '@/components/native/BiometricEnableDialog'

/**
 * ネイティブアプリ起動時のFace ID / Touch ID有効化提案
 * ログイン済みユーザーに対して、初回のみダイアログを表示する
 */
export default function BiometricAuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, getSessionRefreshToken } = useAuth()
  const [showEnableDialog, setShowEnableDialog] = useState(false)
  const [biometryLabel, setBiometryLabel] = useState('Face ID')
  const [hasPromptedEnable, setHasPromptedEnable] = useState(false)

  // ログイン済みユーザーに生体認証の有効化を提案
  useEffect(() => {
    if (!isNativeApp() || loading || !user || hasPromptedEnable) return

    // sessionStorageで同一セッション内の重複表示を防止
    const alreadyPrompted = sessionStorage.getItem('biometric_prompted')
    if (alreadyPrompted) {
      setHasPromptedEnable(true)
      return
    }

    // ネイティブアプリならダイアログを表示
    setBiometryLabel('Face ID')
    setShowEnableDialog(true)
    setHasPromptedEnable(true)
    sessionStorage.setItem('biometric_prompted', 'true')
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
