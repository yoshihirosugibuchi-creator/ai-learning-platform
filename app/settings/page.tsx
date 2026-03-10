'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Shield,
  Bell,
  Palette,
  ChevronRight,
  Fingerprint
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { isNativeApp } from '@/lib/capacitor-utils'
import { useAuth } from '@/components/auth/AuthProvider'

export default function SettingsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const { user, getSessionRefreshToken } = useAuth()

  // Face ID 状態管理
  const [isNative, setIsNative] = useState(false)
  const [biometricStatus, setBiometricStatus] = useState<'loading' | 'unavailable' | 'available' | 'enabled'>('loading')
  const [biometricLabel, setBiometricLabel] = useState('Face ID')
  const [biometricDebug, setBiometricDebug] = useState('')

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
        setBiometricDebug('importing modules...')
        const { checkBiometricAvailability, getBiometryLabel } = await import('@/lib/biometric-auth')
        const { isBiometricEnabled } = await import('@/lib/native-secure-storage')
        if (!mounted) return
        setBiometricDebug('modules loaded, calling checkBiometry...')

        // タイムアウト付きでプラグイン呼び出し（ハング防止）
        const timeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
          Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms))])

        const [info, enabled] = await Promise.all([
          timeout(checkBiometricAvailability(), 5000, 'checkBiometry'),
          timeout(isBiometricEnabled(), 5000, 'isBiometricEnabled').catch(() => false),
        ])
        if (!mounted) return
        setBiometricLabel(getBiometryLabel(info.biometryType))
        setBiometricDebug(`available=${info.isAvailable}, type=${info.biometryType}, reason=${info.reason}, enabled=${enabled}`)
        if (enabled) {
          setBiometricStatus('enabled')
        } else if (info.isAvailable) {
          setBiometricStatus('available')
        } else {
          setBiometricStatus('unavailable')
        }
      } catch (e) {
        if (mounted) {
          setBiometricStatus('unavailable')
          setBiometricDebug(`error: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }
    check()
    return () => { mounted = false }
  }, [])

  const handleEnableBiometric = useCallback(async () => {
    try {
      const { storeRefreshToken, storeUserEmail, setBiometricEnabled } = await import('@/lib/native-secure-storage')
      const refreshToken = await getSessionRefreshToken()
      if (refreshToken && user?.email) {
        await Promise.all([
          storeRefreshToken(refreshToken),
          storeUserEmail(user.email),
          setBiometricEnabled(true),
        ])
        setBiometricStatus('enabled')
      }
    } catch {
      // 失敗時は無視
    }
  }, [user, getSessionRefreshToken])

  const handleDisableBiometric = useCallback(async () => {
    try {
      const { clearSecureStorage } = await import('@/lib/native-secure-storage')
      await clearSecureStorage()
      setBiometricStatus('available')
    } catch {
      // 失敗時は無視
    }
  }, [])

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
    }
  ]

  const groupedSettings = settingsMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof settingsMenuItems>)

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
      />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">設定</h1>
              <p className="text-muted-foreground">
                アプリケーションの設定と管理オプション
              </p>
            </div>
          </div>

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
                      {biometricDebug && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {biometricDebug}
                        </div>
                      )}
                    </div>
                  </div>
                  {biometricStatus === 'available' && (
                    <button
                      type="button"
                      className="w-full py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg active:bg-indigo-800"
                      style={{ WebkitAppearance: 'none' }}
                      onPointerUp={handleEnableBiometric}
                    >
                      {biometricLabel}を有効にする
                    </button>
                  )}
                  {biometricStatus === 'enabled' && (
                    <button
                      type="button"
                      className="w-full py-3 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg active:bg-gray-100"
                      style={{ WebkitAppearance: 'none' }}
                      onPointerUp={handleDisableBiometric}
                    >
                      {biometricLabel}を無効にする
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
      </main>
    </div>
  )
}