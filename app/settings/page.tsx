'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Shield,
  Bell,
  Palette,
  ChevronRight,
  Fingerprint,
  Database
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { isNativeApp } from '@/lib/capacitor-utils'
import { useAuth } from '@/components/auth/AuthProvider'

export default function SettingsPage() {
  const router = useRouter()
  const { user, getSessionRefreshToken } = useAuth()

  // Face ID 状態管理
  const [isNative, setIsNative] = useState(false)
  const [biometricStatus, setBiometricStatus] = useState<'loading' | 'unavailable' | 'available' | 'enabled'>('loading')
  const [biometricLabel, setBiometricLabel] = useState('Face ID')

  useEffect(() => {
    const native = isNativeApp()
    setIsNative(native)
    if (!native) {
      setBiometricStatus('unavailable')
      return
    }
    let mounted = true
    async function check() {
      try {
        const { checkBiometricAvailability, getBiometryLabel } = await import('@/lib/biometric-auth')
        const { isBiometricEnabled } = await import('@/lib/native-secure-storage')
        if (!mounted) return

        // タイムアウト付きでプラグイン呼び出し（ハング防止）
        const timeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
          Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms))])

        const [info, enabled] = await Promise.all([
          timeout(checkBiometricAvailability(), 5000, 'checkBiometry'),
          timeout(isBiometricEnabled(), 5000, 'isBiometricEnabled').catch(() => false),
        ])
        if (!mounted) return
        setBiometricLabel(getBiometryLabel(info.biometryType))
        if (enabled) {
          setBiometricStatus('enabled')
        } else if (info.isAvailable) {
          setBiometricStatus('available')
        } else {
          setBiometricStatus('unavailable')
        }
      } catch {
        if (mounted) {
          setBiometricStatus('unavailable')
        }
      }
    }
    check()
    return () => { mounted = false }
  }, [])

  const [biometricProcessing, setBiometricProcessing] = useState(false)

  const handleEnableBiometric = useCallback(async () => {
    if (biometricProcessing) return
    setBiometricProcessing(true)
    try {
      // 1. Face ID認証を実行（本人確認）
      const { authenticateWithBiometric } = await import('@/lib/biometric-auth')
      const authResult = await authenticateWithBiometric()
      if (!authResult.success) return

      // 2. 認証成功 → セッション情報取得
      const refreshToken = await getSessionRefreshToken()
      if (!refreshToken || !user?.email) return

      // 3. Keychainに保存（各ステップにタイムアウト付き）
      const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms))])

      const { storeRefreshToken, storeUserEmail, setBiometricEnabled } = await import('@/lib/native-secure-storage')
      await withTimeout(storeRefreshToken(refreshToken), 5000, 'storeRefreshToken')
      await withTimeout(storeUserEmail(user.email), 5000, 'storeUserEmail')
      await withTimeout(setBiometricEnabled(true), 5000, 'setBiometricEnabled')

      setBiometricStatus('enabled')
    } catch {
      // エラー時は何もしない
    } finally {
      setBiometricProcessing(false)
    }
  }, [user, getSessionRefreshToken, biometricProcessing])

  const handleDisableBiometric = useCallback(async () => {
    if (biometricProcessing) return
    setBiometricProcessing(true)
    try {
      const { clearSecureStorage } = await import('@/lib/native-secure-storage')
      await clearSecureStorage()
      setBiometricStatus('available')
    } catch {
      // エラー時は何もしない
    } finally {
      setBiometricProcessing(false)
    }
  }, [biometricProcessing])

  const settingsMenuItems = [
    {
      id: 'account',
      title: 'アカウント設定',
      description: 'プロフィール・パスワード変更・アカウント管理',
      icon: <Shield className="h-5 w-5" />,
      href: '/settings/coming-soon',
      category: '基本設定',
      available: false,
      features: [
        'パスワード変更・二段階認証',
        'ログインセッション管理', 
        'セキュリティ設定管理'
      ]
    },
    {
      id: 'notifications',
      title: '通知設定',
      description: '学習通知・お知らせの設定',
      icon: <Bell className="h-5 w-5" />,
      href: '/settings/coming-soon',
      category: '基本設定',
      available: false
    },
    {
      id: 'privacy',
      title: 'プライバシー・データ管理',
      description: 'データエクスポート・アカウント削除',
      icon: <Shield className="h-5 w-5" />,
      href: '/settings/coming-soon',
      category: 'プライバシー',
      available: false,
      features: [
        'プライバシー・通知設定',
        '学習データエクスポート',
        'アカウント削除・一時停止'
      ]
    },
    {
      id: 'appearance',
      title: '表示設定',
      description: 'テーマ・言語設定',
      icon: <Palette className="h-5 w-5" />,
      href: '/settings/coming-soon',
      category: '基本設定',
      available: false
    },
    ...(isNative ? [{
      id: 'sync-debug',
      title: '同期診断',
      description: 'ローカルDB状態・テーブル件数・同期エラー確認',
      icon: <Database className="h-5 w-5" />,
      href: '/settings/sync-debug',
      category: '開発者ツール',
      available: true
    }] : [])
  ]

  const groupedSettings = settingsMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof settingsMenuItems>)

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <PageHeader
            icon={Settings}
            title="設定"
            description="アプリケーションの設定と管理オプション"
          />

          {/* Face ID / Touch ID（ネイティブアプリのみ表示） */}
          {isNative && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">セキュリティ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{biometricLabel}</div>
                      <div className="text-sm text-muted-foreground">
                        {biometricStatus === 'loading' && '確認中...'}
                        {biometricStatus === 'unavailable' && 'この端末では利用できません'}
                        {biometricStatus === 'available' && '次回から素早くログインできます'}
                        {biometricStatus === 'enabled' && '有効'}
                      </div>
                    </div>
                  </div>
                  {biometricStatus === 'available' && (
                    <button
                      type="button"
                      disabled={biometricProcessing}
                      className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg transition-all duration-150 active:scale-95 active:bg-indigo-800 disabled:opacity-50"
                      style={{ WebkitAppearance: 'none', WebkitTapHighlightColor: 'rgba(79,70,229,0.3)' }}
                      onClick={handleEnableBiometric}
                    >
                      {biometricProcessing ? '処理中...' : `${biometricLabel}を有効にする`}
                    </button>
                  )}
                  {biometricStatus === 'enabled' && (
                    <button
                      type="button"
                      disabled={biometricProcessing}
                      className="w-full py-3 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg transition-all duration-150 active:scale-95 active:bg-gray-200 disabled:opacity-50"
                      style={{ WebkitAppearance: 'none', WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                      onClick={handleDisableBiometric}
                    >
                      {biometricProcessing ? '処理中...' : `${biometricLabel}を無効にする`}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings Groups */}
          {Object.entries(groupedSettings).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full justify-start h-auto p-4 ${!item.available ? 'opacity-60 cursor-not-allowed' : ''}`}
                    onClick={() => router.push(item.href)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="p-2 rounded-lg bg-muted">
                        {item.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.title}</span>
                          {!item.available && (
                            <Badge variant="secondary" className="text-xs">
                              準備中
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                      {item.available && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))}

        </div>
      </div>
    </AppShell>
  )
}