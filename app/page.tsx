'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, BookOpen, Trophy } from 'lucide-react'
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                        <Play className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>クイズに挑戦</CardTitle>
                      <CardDescription>
                        毎日継続すると不思議とスキルがレベルアップ
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/quiz?mode=random" prefetch={true}>
                        <Button className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          開始
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 p-3 bg-green-100 rounded-full w-fit">
                        <BookOpen className="h-6 w-6 text-green-600" />
                      </div>
                      <CardTitle>コース学習</CardTitle>
                      <CardDescription>
                        体系的に学習できるカリキュラム
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

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-2 p-3 bg-yellow-100 rounded-full w-fit">
                        <Trophy className="h-6 w-6 text-yellow-600" />
                      </div>
                      <CardTitle>学習分析</CardTitle>
                      <CardDescription>
                        学習の進捗状況を確認
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/analytics" prefetch={true}>
                        <Button variant="outline" className="w-full">
                          <Trophy className="h-4 w-4 mr-2" />
                          分析を見る
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
