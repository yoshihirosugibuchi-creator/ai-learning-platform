'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, BarChart3, Brain, Lightbulb, TrendingUp } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getLearningAnalytics, LearningAnalytics } from '@/lib/supabase-analytics'
import { aiAnalytics, LearningPattern, OptimalLearningTime, PersonalizedHints } from '@/lib/ai-analytics'
import IndustryAnalysisPage from '@/components/analytics/IndustryAnalysisPage'
import XPStatsCard from '@/components/xp/XPStatsCard'
import { CachedLearningDashboard } from '@/components/analytics/CachedLearningDashboard'

// タブごとのデータキャッシュ
interface TabCache {
  overview: {
    analytics: LearningAnalytics | null
    loaded: boolean
    lastRefresh: number
  }
  patterns: {
    aiPatterns: LearningPattern | null
    optimalTime: OptimalLearningTime | null
    loaded: boolean
    lastRefresh: number
  }
  insights: {
    hints: PersonalizedHints | null
    loaded: boolean
    lastRefresh: number
  }
  industry: {
    loaded: boolean
    lastRefresh: number
  }
  unified: {
    loaded: boolean
    lastRefresh: number
  }
}

const CACHE_DURATION = 5 * 60 * 1000 // 5分間キャッシュ

export default function OptimizedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { user, profile, loading } = useAuth()
  
  // タブごとのキャッシュ状態
  const [tabCache, setTabCache] = useState<TabCache>({
    overview: { analytics: null, loaded: false, lastRefresh: 0 },
    patterns: { aiPatterns: null, optimalTime: null, loaded: false, lastRefresh: 0 },
    insights: { hints: null, loaded: false, lastRefresh: 0 },
    industry: { loaded: false, lastRefresh: 0 },
    unified: { loaded: false, lastRefresh: 0 }
  })
  
  // 初期化フラグ
  const isInitialized = useRef(false)
  
  // 現在のタブのローディング状態
  const isTabLoading = useMemo(() => {
    const currentTabData = tabCache[activeTab as keyof TabCache]
    return !currentTabData.loaded && !isRefreshing
  }, [activeTab, tabCache, isRefreshing])

  // キャッシュの有効性チェック
  const isCacheValid = (tabName: keyof TabCache): boolean => {
    const tabData = tabCache[tabName]
    return tabData.loaded && (Date.now() - tabData.lastRefresh) < CACHE_DURATION
  }

  // 基本統計データの取得
  const loadOverviewData = async (force = false) => {
    if (!user?.id || (!force && isCacheValid('overview'))) return
    
    try {
      const analytics = await getLearningAnalytics(user.id)
      setTabCache(prev => ({
        ...prev,
        overview: {
          analytics,
          loaded: true,
          lastRefresh: Date.now()
        }
      }))
    } catch (error) {
      console.error('Error loading overview data:', error)
    }
  }

  // AI分析データの取得
  const loadPatternsData = async (force = false) => {
    if (!user?.id || (!force && isCacheValid('patterns'))) return
    
    try {
      await aiAnalytics.init()
      
      // 並列実行で高速化
      const [aiPatterns, optimalTime] = await Promise.all([
        aiAnalytics.analyzeLearningPatterns(user.id),
        aiAnalytics.recommendOptimalLearningTime(user.id)
      ])
      
      setTabCache(prev => ({
        ...prev,
        patterns: {
          aiPatterns,
          optimalTime,
          loaded: true,
          lastRefresh: Date.now()
        }
      }))
    } catch (error) {
      console.error('Error loading patterns data:', error)
    }
  }

  // インサイトデータの取得
  const loadInsightsData = async (force = false) => {
    if (!user?.id || (!force && isCacheValid('insights'))) return
    
    try {
      const hints = await aiAnalytics.generatePersonalizedHints(user.id)
      setTabCache(prev => ({
        ...prev,
        insights: {
          hints,
          loaded: true,
          lastRefresh: Date.now()
        }
      }))
    } catch (error) {
      console.error('Error loading insights data:', error)
    }
  }

  // タブ切り替え時のデータ読み込み
  const handleTabChange = async (newTab: string) => {
    setActiveTab(newTab)
    
    // 各タブに必要なデータを遅延読み込み
    switch (newTab) {
      case 'overview':
        await loadOverviewData()
        break
      case 'patterns':
        await loadPatternsData()
        break
      case 'insights':
        await loadInsightsData()
        break
      case 'industry':
        setTabCache(prev => ({
          ...prev,
          industry: { loaded: true, lastRefresh: Date.now() }
        }))
        break
      case 'unified':
        setTabCache(prev => ({
          ...prev,
          unified: { loaded: true, lastRefresh: Date.now() }
        }))
        break
    }
  }

  // 手動更新
  const handleRefresh = async () => {
    if (!user?.id) return
    
    setIsRefreshing(true)
    try {
      // 現在のタブのデータのみ更新
      switch (activeTab) {
        case 'overview':
          await loadOverviewData(true)
          break
        case 'patterns':
          await loadPatternsData(true)
          break
        case 'insights':
          await loadInsightsData(true)
          break
        case 'industry':
        case 'unified':
          // 他のタブは個別に更新機能がある
          break
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // 初期データ読み込み（最初のタブのみ）
  useEffect(() => {
    if (user?.id && !loading && !isInitialized.current) {
      isInitialized.current = true
      loadOverviewData() // 最初は基本統計のみ読み込み
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading])

  // 認証ガード
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">ログインが必要です</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">学習分析</h1>
          <p className="text-gray-600 mt-2">あなたの学習進捗と成果を詳しく分析します</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className={`grid w-full ${profile?.role === 'system_admin' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'} h-auto lg:h-10 gap-1 p-1`}>
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">基本統計</TabsTrigger>
          <TabsTrigger value="industry" className="text-xs sm:text-sm py-2">業界分析</TabsTrigger>
          <TabsTrigger value="patterns" className="text-xs sm:text-sm py-2">学習パターン（AI）</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs sm:text-sm py-2">インサイト（AI）</TabsTrigger>
          {profile?.role === 'system_admin' && (
            <TabsTrigger value="unified" className="text-xs sm:text-sm py-2">統合AI分析</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* XP統計カード */}
          <XPStatsCard showDetailedStats={true} className="mb-6" />

          {/* 週間パフォーマンス */}
          <Card>
            <CardHeader>
              <CardTitle>週間パフォーマンス</CardTitle>
            </CardHeader>
            <CardContent>
              {isTabLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center animate-pulse">
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : tabCache.overview.analytics?.weeklyProgress && tabCache.overview.analytics.weeklyProgress.length > 0 ? (
                <div className="space-y-4">
                  {tabCache.overview.analytics.weeklyProgress.map((week, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{week.week}</p>
                        <p className="text-sm text-muted-foreground">
                          {week.sessionsCompleted}セッション完了
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{week.averageScore}%</p>
                        <p className="text-xs text-muted-foreground">平均スコア</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{week.timeSpent}分</p>
                        <p className="text-xs text-muted-foreground">学習時間</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">パフォーマンスデータなし</h3>
                  <p className="text-muted-foreground">
                    継続して学習するとパフォーマンスの推移が表示されます
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {isTabLoading ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI学習パターン分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                      <div className="h-12 w-full bg-gray-100 rounded"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* AI学習パターン分析カード */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI学習パターン分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tabCache.patterns.aiPatterns ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* 学習頻度パターン */}
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-3">学習頻度パターン</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>平均日次問題数:</span>
                            <span className="font-medium">{tabCache.patterns.aiPatterns.learningFrequency.averageDailyQuestions}問</span>
                          </div>
                          <div className="flex justify-between">
                            <span>学習日数:</span>
                            <span className="font-medium">{tabCache.patterns.aiPatterns.learningFrequency.activeDays}日</span>
                          </div>
                          <div className="flex justify-between">
                            <span>継続性スコア:</span>
                            <span className="font-medium">{Math.round(tabCache.patterns.aiPatterns.learningFrequency.consistency * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* 時間帯パターン */}
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-3">最適学習時間</h4>
                        {tabCache.patterns.aiPatterns.timeOfDayPatterns.bestPerformanceHours.length > 0 ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>最高パフォーマンス時間:</span>
                              <span className="font-medium">
                                {tabCache.patterns.aiPatterns.timeOfDayPatterns.bestPerformanceHours[0].hour}時
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>その時間の正答率:</span>
                              <span className="font-medium">
                                {tabCache.patterns.aiPatterns.timeOfDayPatterns.bestPerformanceHours[0].accuracy}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-green-800">データ蓄積中...</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">AI分析データなし</h3>
                      <p className="text-muted-foreground">
                        学習データを蓄積してAI分析を開始しましょう
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 最適化レコメンデーション */}
              {tabCache.patterns.optimalTime && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      学習最適化レコメンデーション
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">最適学習時間</h4>
                        <p className="text-sm text-blue-800">
                          {tabCache.patterns.optimalTime.bestTimeOfDay.timeSlot}（{tabCache.patterns.optimalTime.bestTimeOfDay.hour}時頃）
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">推奨セッション長</h4>
                        <p className="text-sm text-green-800">
                          {tabCache.patterns.optimalTime.sessionLength.recommended}分
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">推奨頻度</h4>
                        <p className="text-sm text-purple-800">
                          1日{tabCache.patterns.optimalTime.frequency.questionsPerDay}問
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>学習インサイト</CardTitle>
            </CardHeader>
            <CardContent>
              {isTabLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                      <div className="h-16 w-full bg-gray-100 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : tabCache.insights.hints ? (
                <div className="space-y-4">
                  {tabCache.insights.hints.generalTips.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        <Lightbulb className="w-4 h-4 mr-2" />
                        一般的なヒント
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {tabCache.insights.hints.generalTips.map((tip, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {tabCache.insights.hints.performanceTips.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        パフォーマンス向上のコツ
                      </h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        {tabCache.insights.hints.performanceTips.map((tip, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">インサイトなし</h3>
                  <p className="text-muted-foreground">
                    学習データを蓄積してインサイトを表示しましょう
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="industry" className="space-y-6">
          <IndustryAnalysisPage />
        </TabsContent>

        <TabsContent value="unified" className="space-y-6">
          {user?.id && (
            <CachedLearningDashboard 
              userId={user.id}
              className="w-full"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}