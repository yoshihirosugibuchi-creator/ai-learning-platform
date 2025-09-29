'use client'

import { useState } from 'react'
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
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()

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
        showBackButton={true}
        onBackClick={() => router.back()}
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