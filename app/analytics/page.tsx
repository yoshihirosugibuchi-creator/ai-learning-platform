'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Calendar,
  Download,
  RefreshCw,
  Flame
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import PerformanceChart from '@/components/analytics/PerformanceChart'
import LearningInsights from '@/components/analytics/LearningInsights'
import { useUserContext } from '@/contexts/UserContext'
import { getQuizResults, getUserQuizResults } from '@/lib/storage'

export default function AnalyticsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user } = useUserContext()

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p>ログインが必要です</p>
          </div>
        </main>
      </div>
    )
  }

  const quizResults = user?.id ? getUserQuizResults(user.id) : getQuizResults() // User-specific quiz results

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleExport = () => {
    const data = {
      user: {
        name: user.name,
        level: user.progress.currentLevel,
        totalXP: user.progress.totalXP,
        streak: user.progress.streak,
        totalAnswers: user.progress.totalAnswers,
        correctAnswers: user.progress.correctAnswers
      },
      quizResults: quizResults,
      exportedAt: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `learning_analytics_${user.name}_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <span>学習分析</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              AIが分析するあなたの学習パターンと成長記録
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              更新
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              エクスポート
            </Button>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl h-14 p-1">
              <TabsTrigger value="overview" className="flex items-center justify-center space-x-3 text-base font-medium py-3">
                <BarChart3 className="h-5 w-5" />
                <span>概要</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center justify-center space-x-3 text-base font-medium py-3">
                <TrendingUp className="h-5 w-5" />
                <span>パフォーマンス</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center justify-center space-x-3 text-base font-medium py-3">
                <Brain className="h-5 w-5" />
                <span>AI分析</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="space-y-6">
              <LearningInsights 
                key={refreshKey} 
                quizResults={quizResults} 
                user={user} 
              />
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceChart key={refreshKey} quizResults={quizResults} />
          </TabsContent>

          <TabsContent value="insights">
            <div className="space-y-6">
              {/* AI Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span>AI学習レコメンデーション</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quizResults.length >= 5 ? (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">📈 学習パターン分析</h4>
                        <p className="text-blue-800 text-sm">
                          あなたの学習パターンを分析した結果、
                          {user.progress.streak >= 5 
                            ? '継続的な学習習慣が身についています。この調子で続けましょう。'
                            : '学習の継続性に改善の余地があります。毎日少しずつでも学習を続けることをお勧めします。'
                          }
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2">🎯 最適化提案</h4>
                        <p className="text-green-800 text-sm">
                          {user.progress.correctAnswers / user.progress.totalAnswers >= 0.8
                            ? 'より難易度の高い問題にチャレンジすることで、さらなるスキル向上が期待できます。'
                            : '基礎的な問題を繰り返し練習することで、正答率の向上が期待できます。'
                          }
                        </p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-2">🚀 次のステップ</h4>
                        <p className="text-purple-800 text-sm">
                          現在のレベル{user.progress.currentLevel}から次のレベルへ上がるために、
                          あと{1000 - (user.progress.totalXP % 1000)}XPが必要です。
                          1日1回のクイズで約{Math.ceil((1000 - (user.progress.totalXP % 1000)) / 100)}日で達成できます。
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="font-semibold mb-2">AI分析データを収集中</h3>
                      <p className="text-sm">
                        5回以上クイズに挑戦すると、AIがあなたの学習パターンを分析して
                        パーソナライズされた提案を行います。
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}