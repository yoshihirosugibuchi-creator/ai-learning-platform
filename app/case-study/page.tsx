'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import CaseStudyList from '@/components/case-study/CaseStudyList'
import CaseStudyCard from '@/components/case-study/CaseStudyCard'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// Tabs UI reserved for future use
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, TrendingUp, Shuffle, Calendar, History } from 'lucide-react'

interface Problem {
  id: string
  title: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  industry: string | null
  estimated_minutes: number
  step_count: number
  user_completed?: boolean
  user_best_score?: number | null
  avg_score?: number | null
  recommendation_score?: number
  recommendation_reason?: string
}

interface DailyChallenge extends Problem {
  is_admin_featured: boolean
  user_score: number | null
  total_sessions: number
}

export default function CaseStudyPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<Problem[]>([])
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token

        if (!accessToken) return

        setToken(accessToken)

        // おすすめと今日のチャレンジを並行取得
        const [recommendationsRes, dailyChallengeRes] = await Promise.all([
          fetch('/api/case-study/recommendations?limit=3', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }),
          fetch('/api/case-study/daily-challenge', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          })
        ])

        if (recommendationsRes.ok) {
          const data = await recommendationsRes.json()
          if (data.success) {
            setRecommendations(data.recommendations)
          }
        }

        if (dailyChallengeRes.ok) {
          const data = await dailyChallengeRes.json()
          if (data.success && data.daily_challenge) {
            setDailyChallenge(data.daily_challenge)
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  const handleQuickStart = async () => {
    if (!token) return

    try {
      const response = await fetch('/api/case-study/quick-start', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.problem) {
          router.push(`/case-study/${data.problem.id}`)
        }
      }
    } catch (error) {
      console.error('Quick start error:', error)
    }
  }

  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="読み込み中..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">ケーススタディ</h1>
          <p className="text-muted-foreground">
            実践的なビジネスケースで思考力を鍛えましょう
          </p>
        </div>

        {/* 今日のチャレンジ */}
        {dailyChallenge && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">今日のチャレンジ</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium">{dailyChallenge.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {dailyChallenge.estimated_minutes}分 ・ {dailyChallenge.step_count}ステップ
                    {dailyChallenge.user_completed && ` ・ あなたのスコア: ${dailyChallenge.user_score}%`}
                  </p>
                </div>
                <Button onClick={() => router.push(`/case-study/${dailyChallenge.id}`)}>
                  {dailyChallenge.user_completed ? '再挑戦' : 'チャレンジ'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* クイックアクション */}
        <div className="flex gap-2 mb-6">
          <Button onClick={handleQuickStart} variant="outline" className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            クイックスタート
          </Button>
          <Button onClick={() => router.push('/case-study/history')} variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            学習履歴
          </Button>
        </div>

        {/* おすすめ */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">あなたへのおすすめ</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((problem) => (
                <CaseStudyCard
                  key={problem.id}
                  problem={problem}
                  showRecommendation
                />
              ))}
            </div>
          </div>
        )}

        {/* 問題一覧 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">問題一覧</h2>
          </div>
          <CaseStudyList />
        </div>
      </main>
    </div>
  )
}
