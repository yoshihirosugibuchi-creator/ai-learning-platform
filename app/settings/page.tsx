'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  FileText, 
  Database, 
  Shield, 
  Bell, 
  Palette,
  ChevronRight,
  Cog,
  Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()

  const settingsMenuItems = [
    {
      id: 'quiz-csv',
      title: 'クイズ問題API（CSV）',
      description: 'クイズ問題のCSV出力・取込管理',
      icon: <FileText className="h-5 w-5" />,
      href: '/settings/quiz-csv',
      category: 'データ管理',
      available: true
    },
    {
      id: 'categories-admin',
      title: 'カテゴリー管理',
      description: 'カテゴリーの追加・編集・有効化管理',
      icon: <Cog className="h-5 w-5" />,
      href: '/admin/categories',
      category: '管理者機能',
      available: true
    },
    {
      id: 'account',
      title: 'アカウント設定',
      description: 'プロフィール・パスワード変更',
      icon: <Shield className="h-5 w-5" />,
      href: '/settings/coming-soon',
      category: '基本設定',
      available: false
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
      id: 'appearance',
      title: '表示設定',
      description: 'テーマ・言語設定',
      icon: <Palette className="h-5 w-5" />,
      href: '/settings/coming-soon',
      category: '基本設定',
      available: false
    },
    {
      id: 'data',
      title: 'データ管理',
      description: 'データのエクスポート・インポート',
      icon: <Database className="h-5 w-5" />,
      href: '/settings/coming-soon',
      category: 'データ管理',
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

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">管理者機能について</h3>
                  <p className="text-sm text-blue-700">
                    現在表示されている一部の機能は、将来的に管理者権限でのみアクセス可能になる予定です。
                    詳細については管理者にお問い合わせください。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}