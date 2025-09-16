'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  Flame, 
  Zap, 
  Trophy, 
  TrendingUp, 
  ShoppingBag, 
  History, 
  BarChart3,
  Crown,
  Calendar,
  Building,
  Briefcase,
  Target,
  Plus,
  Minus,
  Clock
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { useUserContext } from '@/contexts/UserContext'
import { getQuizResults, getUserQuizResults } from '@/lib/storage'
import { getCategoryDisplayName } from '@/lib/category-mapping'

export default function ProfilePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, updateTrigger } = useUserContext()

  // userオブジェクトの変更を監視して強制的に再レンダリング
  const [renderKey, setRenderKey] = useState(0)
  
  useEffect(() => {
    setRenderKey(prev => prev + 1)
  }, [user, updateTrigger])

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

  const quizResults = user?.id ? getUserQuizResults(user.id) : getQuizResults() // Fallback for backward compatibility
  const accuracyRate = user.progress.totalAnswers > 0 
    ? Math.round((user.progress.correctAnswers / user.progress.totalAnswers) * 100)
    : 0

  const levelProgress = (user.progress.totalXP % 1000) / 10 // Percentage to next level

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="secondary">
                    レベル {user.progress.currentLevel}
                  </Badge>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{user.skpBalance}</span>
                      <span className="text-muted-foreground">SKP</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>累計: {user.skpTotalEarned || user.skpBalance}</span>
                      <span>•</span>
                      <span>使用: {(user.skpTotalEarned || user.skpBalance) - user.skpBalance}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Level Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">レベル進捗</span>
                <span className="font-medium">{Math.round(levelProgress)}%</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{user.progress.totalXP} XP</span>
                <span>次のレベルまで {1000 - (user.progress.totalXP % 1000)} XP</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        {user.profile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>プロフィール情報</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.profile.industry && (
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">業界</p>
                      <p className="font-medium">{user.profile.industry}</p>
                    </div>
                  </div>
                )}
                
                {user.profile.jobTitle && (
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">職種</p>
                      <p className="font-medium">{user.profile.jobTitle}</p>
                    </div>
                  </div>
                )}
                
                {user.profile.experienceYears !== undefined && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">経験年数</p>
                      <p className="font-medium">
                        {user.profile.experienceYears === 0 ? '1年未満' : 
                         user.profile.experienceYears <= 3 ? '1-3年' :
                         user.profile.experienceYears <= 7 ? '4-7年' :
                         user.profile.experienceYears <= 15 ? '8-15年' : '16年以上'}
                      </p>
                    </div>
                  </div>
                )}
                
                {user.profile.weeklyGoal && (
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">週間目標</p>
                      <p className="font-medium">
                        {user.profile.weeklyGoal === 'light' ? 'ライト (週2-3回)' :
                         user.profile.weeklyGoal === 'medium' ? 'ミディアム (週4-5回)' :
                         'ヘビー (毎日)'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {user.profile.learningGoals && user.profile.learningGoals.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">学習目標</p>
                  <div className="flex flex-wrap gap-2">
                    {user.profile.learningGoals.map((goal, index) => (
                      <Badge key={index} variant="outline">{goal}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {/* Category Level Progress */}
        {user.categoryProgress && user.categoryProgress.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>カテゴリー別レベル</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.categoryProgress
                  .sort((a, b) => b.currentLevel - a.currentLevel) // レベル順でソート
                  .map((progress) => {
                    const accuracy = progress.totalAnswers > 0 ? Math.round((progress.correctAnswers / progress.totalAnswers) * 100) : 0
                    const levelProgress = (progress.totalXP % 500) / 5 // 次のレベルまでの進捗（%）
                    
                    return (
                      <div key={progress.categoryId} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{getCategoryDisplayName(progress.categoryId)}</h4>
                          <Badge variant="secondary">レベル {progress.currentLevel}</Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>経験値: {progress.totalXP} XP</span>
                            <span>正答率: {accuracy}%</span>
                          </div>
                          
                          <Progress value={levelProgress} className="h-2" />
                          
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>問題数: {progress.totalAnswers}問</span>
                            <span>次レベルまで: {500 - (progress.totalXP % 500)} XP</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Flame className="h-8 w-8 text-orange-500" />
                <div className="text-2xl font-bold">{user.progress.streak}</div>
                <div className="text-xs text-muted-foreground">連続日数</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div className="text-2xl font-bold">{accuracyRate}%</div>
                <div className="text-xs text-muted-foreground">正答率</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <BarChart3 className="h-8 w-8 text-blue-500" />
                <div className="text-2xl font-bold">{user.progress.totalAnswers}</div>
                <div className="text-xs text-muted-foreground">回答数</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Crown className="h-8 w-8 text-purple-500" />
                <div className="text-2xl font-bold">対応予定</div>
                <div className="text-xs text-muted-foreground">ランキング</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold">SKPショップ</h3>
                  <p className="text-sm text-muted-foreground">ポイントで便利機能をゲット</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <History className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold">学習履歴</h3>
                  <p className="text-sm text-muted-foreground">クイズ結果と進捗を確認</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/skp-history'}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Zap className="h-8 w-8 text-yellow-500" />
                <div>
                  <h3 className="font-semibold">ポイント履歴</h3>
                  <p className="text-sm text-muted-foreground">SKPポイントの獲得・使用履歴</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/analytics'}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-orange-500" />
                <div>
                  <h3 className="font-semibold">詳細分析</h3>
                  <p className="text-sm text-muted-foreground">学習パターンを確認</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quiz Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>最近のクイズ結果</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quizResults.slice(0, 5).map((result, index) => (
                <div key={result.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      (result.correctAnswers / result.totalQuestions) >= 0.8 
                        ? 'bg-green-500' 
                        : (result.correctAnswers / result.totalQuestions) >= 0.6
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium">
                        {result.category || 'ランダムクイズ'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(result.timestamp).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {result.correctAnswers}/{result.totalQuestions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round((result.correctAnswers / result.totalQuestions) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
              {quizResults.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  まだクイズ結果がありません
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Goal */}
        <Card>
          <CardHeader>
            <CardTitle>今週の目標</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">財務分析スキル向上</span>
              <Badge variant="outline">
                {Math.min(user.progress.totalXP, 500)}/500 XP
              </Badge>
            </div>
            <Progress value={Math.min((user.progress.totalXP / 500) * 100, 100)} />
            <p className="text-sm text-muted-foreground">
              目標達成まで残り {Math.max(0, 500 - user.progress.totalXP)} XP
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}