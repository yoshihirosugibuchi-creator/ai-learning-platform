'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  Flame, 
  Trophy, 
  TrendingUp, 
  History, 
  BarChart3,
  Crown,
  Calendar,
  Coins
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserStats } from '@/lib/supabase-quiz'
import { getUserSKPBalance, getUserSKPTransactions } from '@/lib/supabase-learning'

export default function ProfilePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, profile, loading } = useAuth()
  const [quizStats, setQuizStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    accuracy: 0,
    totalQuizzes: 0,
    averageScore: 0,
    totalTimeSpent: 0
  })
  const [skpBalance, setSkpBalance] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  // クイズ統計とSKPバランスを取得
  useEffect(() => {
    if (user && profile) {
      // クイズ統計を取得
      getUserStats(user.id).then(stats => {
        setQuizStats(stats)
      })
      
      // SKPバランスを取得
      getUserSKPBalance(user.id).then(balance => {
        setSkpBalance(balance)
      }).catch(error => {
        console.error('Error fetching SKP balance:', error)
      })
      
      // 最近のSKP取引を取得
      getUserSKPTransactions(user.id).then(transactions => {
        setRecentTransactions(transactions.slice(0, 5)) // 最新5件
      }).catch(error => {
        console.error('Error fetching SKP transactions:', error)
      })
    }
  }, [user, profile])

  // 認証ガード
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">ログインが必要です</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profile?.name || 'ユーザー'}のプロフィール</h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 基本統計 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学習レベル</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.current_level || 1}</div>
              <p className="text-xs text-muted-foreground">
                {profile?.skill_level === 'beginner' && '初心者レベル'}
                {profile?.skill_level === 'intermediate' && '中級レベル'}
                {profile?.skill_level === 'advanced' && '上級レベル'}
                {!profile?.skill_level && '初心者レベル'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">連続学習</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.streak || 0}</div>
              <p className="text-xs text-muted-foreground">日連続</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">解答数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizStats.totalQuestions}</div>
              <p className="text-xs text-muted-foreground">問題</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">正答率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quizStats.totalQuestions > 0 ? `${quizStats.accuracy}%` : '-%'}
              </div>
              <p className="text-xs text-muted-foreground">
                {quizStats.totalQuestions > 0 ? `${quizStats.correctAnswers}問正解` : 'まだデータなし'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">獲得XP</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.total_xp || 0}</div>
              <p className="text-xs text-muted-foreground">XP</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SKPポイント</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{skpBalance}</div>
              <p className="text-xs text-muted-foreground">SKP</p>
            </CardContent>
          </Card>
        </div>

        {/* レベル進行状況 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>次のレベルまで</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>レベル {profile?.current_level || 1}</span>
              <span>{profile?.total_xp || 0}/100 XP</span>
            </div>
            <Progress value={((profile?.total_xp || 0) % 100)} />
            <p className="text-xs text-muted-foreground">
              {quizStats.totalQuestions > 0 
                ? `${quizStats.totalQuizzes}回のクイズに挑戦しました！` 
                : 'クイズに挑戦してXPを獲得しましょう！'
              }
            </p>
          </CardContent>
        </Card>

        {/* 最近のSKP獲得履歴 */}
        {recentTransactions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5 text-yellow-600" />
                <span>最近のSKP獲得履歴</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.timestamp).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className={`text-sm font-bold ${
                      transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'earned' ? '+' : '-'}{transaction.amount} SKP
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/skp-history'}>
                    <History className="h-4 w-4 mr-2" />
                    全履歴を見る
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* プロフィール設定 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>アカウント設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">メールアドレス</label>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">登録日</label>
                <p className="text-sm text-gray-600">
                  {new Date(user.created_at || Date.now()).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <div className="pt-4">
                <Badge variant="outline">Supabase認証</Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  サーバーサイド認証でデータが安全に管理されています
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}