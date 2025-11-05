'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, BookOpen, Brain, Settings, RefreshCw, Target } from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { useAuth } from '@/components/auth/AuthProvider'
import { getAppStats } from '@/lib/stats'

export default function Home() {
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, loading } = useAuth()
  const [stats, setStats] = useState({ totalQuestions: 115, totalCategories: 12, totalSubcategories: 50, questionsFromData: 0 })
  const [reviewStats, setReviewStats] = useState<{
    totalReviewNeeded: number
    todayCompleted: number
    shouldShowNotification: boolean
    reviewEffectiveness: {
      improvement: number
      sampleSize: number
    }
  } | null>(null)
  // const [loadingReviewStats, setLoadingReviewStats] = useState(false)

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return
    
    // ユーザーが存在しない場合はログインページにリダイレクト
    if (!user) {
      router.push('/login')
      return
    }
    
    // Supabaseユーザーは認証済みなので、オンボーディングはスキップ
    // TODO: 後でSupabaseにユーザープロファイル情報を追加
    
    // それ以外の場合はこのページを表示（正常なログイン済みユーザー）
  }, [user, loading, router])

  // 統計データを取得
  useEffect(() => {
    async function loadStats() {
      const appStats = await getAppStats()
      setStats(appStats)
    }
    loadStats()
  }, [])
  
  // 復習統計データを取得
  useEffect(() => {
    if (!user || loading) return
    
    async function loadReviewStats() {
      // setLoadingReviewStats(true)
      try {
        // 既存のSupabaseクライアントを使用（新しいクライアント作成を避ける）
        const { supabase } = await import('@/lib/supabase')
        
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        
        if (!token) {
          console.warn('No auth token available for review stats')
          return
        }

        const response = await fetch('/api/review/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          setReviewStats(data)
        }
      } catch (error) {
        console.error('Error loading review stats:', error)
      } finally {
        // setLoadingReviewStats(false)
      }
    }
    
    loadReviewStats()
  }, [user, loading])

  return (
    <>
      {loading && <LoadingScreen />}
      
      <div className="min-h-screen bg-background">
        <Header 
          onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
        />
        
        <MobileNav 
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold mb-4">
              AI Learning Enterprise
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-8">
              AIパーソナライズ学習プラットフォーム
            </p>
            
            {!user ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  AIがあなたの学習スタイルに合わせてカスタマイズした学習体験を提供します
                </p>
                <div className="space-x-4">
                  <Button>
                    無料で始める
                  </Button>
                  <Button variant="outline">
                    ログイン
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <p className="text-muted-foreground">
                  学習を続けましょう！AIがあなたの学習進度に合わせて最適な問題を提供します。
                </p>
                
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                        <Brain className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>ビジネスAIパーソナライズクイズ</CardTitle>
                      <CardDescription>
                        学習レベルや弱点を考慮したAI出題
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/quiz?mode=business-ai" prefetch={true}>
                        <Button className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          クイズ開始
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 p-3 bg-blue-100 rounded-full w-fit">
                        <Settings className="h-6 w-6 text-blue-600" />
                      </div>
                      <CardTitle>セルフパーソナライズクイズ</CardTitle>
                      <CardDescription>
                        お好みのカテゴリーと学習レベルを自由設定
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Link href="/quiz?mode=self-personalized" prefetch={true}>
                        <Button className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          クイズ開始
                        </Button>
                      </Link>
                      <Link href="/categories" prefetch={true}>
                        <Button variant="outline" className="w-full">
                          特定カテゴリーで挑戦
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  {/* 統合復習AIクイズ */}
                  <Card className={`border-2 transition-all relative ${
                    (reviewStats?.totalReviewNeeded ?? 0) > 0 
                      ? 'border-orange-200 bg-orange-50 hover:border-orange-400' 
                      : 'border-purple-200 hover:border-purple-400'
                  }`}>
                    {/* 復習必要な場合のみバッジ表示 - 右上に配置 */}
                    {(reviewStats?.totalReviewNeeded ?? 0) > 0 && (
                      <Badge variant="destructive" className="absolute top-3 right-3 bg-orange-500 text-xs z-10">
                        {reviewStats?.totalReviewNeeded}問
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center">
                      <div className={`mx-auto mb-2 p-3 rounded-full w-fit ${
                        (reviewStats?.totalReviewNeeded ?? 0) > 0 ? 'bg-orange-100' : 'bg-purple-100'
                      }`}>
                        <RefreshCw className={`h-6 w-6 ${
                          (reviewStats?.totalReviewNeeded ?? 0) > 0 ? 'text-orange-600' : 'text-purple-600'
                        }`} />
                      </div>
                      <CardTitle>復習推奨AIクイズ</CardTitle>
                      <CardDescription>
                        {(reviewStats?.totalReviewNeeded ?? 0) > 0 
                          ? '間違えた問題や回答に困った問題の復習'
                          : '復習が必要な問題が見つかったら通知します'
                        }
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* 復習必要な場合のみ詳細統計表示 */}
                      {(reviewStats?.totalReviewNeeded ?? 0) > 0 ? (
                        <>
                          {(reviewStats?.reviewEffectiveness?.improvement ?? 0) > 0 && (
                            <div className="text-xs">
                              <span className="text-green-600 flex items-center">
                                <Target className="h-3 w-3 mr-1" />
                                効果: +{reviewStats?.reviewEffectiveness?.improvement}%
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="h-4 w-4 text-gray-400" />
                            <span>現在復習対象の問題はありません</span>
                          </div>
                          <div className="mt-1 text-gray-500">
                            クイズを解いて学習を進めると、復習推奨問題が表示されます
                          </div>
                        </div>
                      )}
                      
                      {(reviewStats?.totalReviewNeeded ?? 0) > 0 ? (
                        <Link href="/quiz?mode=review" prefetch={true}>
                          <Button className="w-full bg-orange-600 hover:bg-orange-700">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            復習開始
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          disabled 
                          className="w-full bg-gray-400 cursor-not-allowed"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          復習が必要になるまでお待ちください
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 p-3 bg-green-100 rounded-full w-fit">
                        <BookOpen className="h-6 w-6 text-green-600" />
                      </div>
                      <CardTitle>コース学習</CardTitle>
                      <CardDescription>
                        教材ベースのステップバイステップ学習
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link 
                        href="/learning" 
                        prefetch={true}
                        onClick={() => console.log('🔗 Home: Navigating to /learning')}
                      >
                        <Button variant="outline" className="w-full">
                          <BookOpen className="h-4 w-4 mr-2" />
                          学習を開始
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>


                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">{stats.totalQuestions}</div>
                    <div className="text-sm text-muted-foreground">問題数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">{stats.totalCategories}</div>
                    <div className="text-sm text-muted-foreground">カテゴリ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">{stats.totalSubcategories}</div>
                    <div className="text-sm text-muted-foreground">サブカテゴリ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">AI</div>
                    <div className="text-sm text-muted-foreground">パーソナライズ</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
