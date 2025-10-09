'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { loadXPSettings, type XPSettings } from '@/lib/xp-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart3, 
  Brain, 
  RefreshCw, 
  Target,
  Clock,
  Trophy,
  Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface RealLearningAnalyticsDashboardProps {
  userId: string
  className?: string
}

interface OverviewMetrics {
  totalXP: number
  studyStreak: number
  averageAccuracy: number
  totalStudyTime: number
  courseCompletions: number
  quizSessionsCompleted: number
}

interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  totalXP: number
  currentLevel: number
  accuracyRate: number
  masteryLevel: number
  lastStudied: string
}

interface LearningRecommendation {
  type: string
  title: string
  description: string
  priority: number
  estimatedTime: number
}

export function RealLearningAnalyticsDashboard({ userId, className }: RealLearningAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [xpSettings, setXpSettings] = useState<XPSettings | null>(null)
  
  // XP設定をロード
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await loadXPSettings()
        setXpSettings(settings)
      } catch (error) {
        console.error('XP設定のロードに失敗:', error)
      }
    }
    loadSettings()
  }, [])
  
  // Analytics data
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([])
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([])

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // Load overview metrics
      const overviewResponse = await fetch(`/api/learning-analytics/overview?userId=${userId}&period=${period}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (!overviewResponse.ok) {
        throw new Error('Failed to load overview analytics')
      }

      const overviewData = await overviewResponse.json()
      setMetrics(overviewData.metrics)

      // Load detailed analytics
      const detailedResponse = await fetch(`/api/learning-analytics/detailed?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (detailedResponse.ok) {
        const detailedData = await detailedResponse.json()
        setCategoryBreakdown(detailedData.categoryBreakdown || [])
        setRecommendations(detailedData.recommendations || [])
      }

    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [userId, period])

  useEffect(() => {
    if (userId) {
      loadAnalytics()
    }
  }, [userId, period, loadAnalytics])

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[80px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className={className}>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={loadAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">学習分析ダッシュボード</h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p === '7d' ? '7日' : p === '30d' ? '30日' : '90日'}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総XP</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalXP?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              レベル {xpSettings ? Math.floor((metrics?.totalXP || 0) / xpSettings.level.overall_threshold) + 1 : 1}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学習ストリーク</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.studyStreak || 0}日</div>
            <p className="text-xs text-muted-foreground">連続学習</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均正答率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics?.averageAccuracy || 0)}%</div>
            <p className="text-xs text-muted-foreground">
              {(metrics?.averageAccuracy ?? 0) >= 80 ? '優秀' : (metrics?.averageAccuracy ?? 0) >= 60 ? '良好' : '要改善'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総学習時間</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(metrics?.totalStudyTime || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.quizSessionsCompleted || 0} セッション
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed analytics tabs */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">カテゴリー別分析</TabsTrigger>
          <TabsTrigger value="recommendations">学習レコメンデーション</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                カテゴリー別習熟度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryBreakdown.length > 0 ? (
                  categoryBreakdown.map((category) => (
                    <div key={category.categoryId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.categoryName}</span>
                          <Badge variant={category.masteryLevel >= 80 ? 'default' : category.masteryLevel >= 60 ? 'secondary' : 'destructive'}>
                            {category.masteryLevel >= 80 ? 'マスター' : category.masteryLevel >= 60 ? '中級' : '初級'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(category.accuracyRate)}% | {category.totalXP}XP
                        </div>
                      </div>
                      <Progress value={category.masteryLevel} className="h-2" />
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    カテゴリー別データがありません。クイズを開始して学習データを蓄積してください。
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AIレコメンデーション
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge variant="outline">
                          優先度 {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        予想時間: {rec.estimatedTime}分
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    現在レコメンデーションはありません。学習を続けるとAIが最適な学習提案を行います。
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={loadAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>
    </div>
  )
}