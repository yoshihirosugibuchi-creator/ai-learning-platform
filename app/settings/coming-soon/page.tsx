'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Clock, 
  ArrowLeft,
  Sparkles,
  Bell,
  CheckCircle
} from 'lucide-react'

export default function ComingSoonPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()

  const upcomingFeatures = [
    {
      title: 'アカウント設定',
      description: 'プロフィール編集、パスワード変更、アカウント削除機能',
      status: '開発予定',
      priority: 'high'
    },
    {
      title: '通知設定',
      description: '学習リマインダー、成果通知、システム通知の詳細設定',
      status: '設計中',
      priority: 'medium'
    },
    {
      title: '表示設定',
      description: 'ダークモード、フォントサイズ、言語設定',
      status: '検討中',
      priority: 'medium'
    },
    {
      title: 'データ管理',
      description: '学習データのバックアップ、エクスポート、インポート機能',
      status: '検討中',
      priority: 'low'
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return '高優先度'
      case 'medium': return '中優先度'
      case 'low': return '低優先度'
      default: return '検討中'
    }
  }

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
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">機能準備中</h1>
              <p className="text-muted-foreground">
                この設定項目は現在開発中です
              </p>
            </div>
          </div>

          {/* Main Message */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">順次リリース予定</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    現在、より良いユーザー体験を提供するため、以下の設定機能を開発中です。
                    リリース準備が整い次第、順次提供いたします。
                  </p>
                  <Button 
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => router.push('/settings')}
                  >
                    設定メニューに戻る
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>開発予定の機能</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <div className="p-2 rounded-lg bg-muted">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{feature.title}</h4>
                      <Badge className={getPriorityColor(feature.priority)}>
                        {getPriorityText(feature.priority)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {feature.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Settings className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-green-900 mb-1">ご要望について</h3>
                  <p className="text-sm text-green-700">
                    特定の設定機能について緊急でご利用が必要な場合や、
                    ご要望がございましたら管理者までお知らせください。
                    開発優先度の調整を検討いたします。
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