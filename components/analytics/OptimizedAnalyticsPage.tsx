'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, BarChart3, Brain, Lightbulb, TrendingUp, Target, Clock, Activity } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getLearningAnalytics, LearningAnalytics } from '@/lib/supabase-analytics'
import { aiAnalytics, LearningPattern, OptimalLearningTime, PersonalizedHints } from '@/lib/ai-analytics'
import IndustryAnalysisPage from '@/components/analytics/IndustryAnalysisPage'
import XPStatsCard from '@/components/xp/XPStatsCard'
import LearningQualityScoreCard from '@/components/analytics/LearningQualityScoreCard'
import HourlyEfficiencyChart from '@/components/analytics/HourlyEfficiencyChart'
import LearningPatternComparison from '@/components/analytics/LearningPatternComparison'

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
}

const CACHE_DURATION = 5 * 60 * 1000 // 5分間キャッシュ

export default function OptimizedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { user, loading } = useAuth()
  
  // タブごとのキャッシュ状態
  const [tabCache, setTabCache] = useState<TabCache>({
    overview: { analytics: null, loaded: false, lastRefresh: 0 },
    patterns: { aiPatterns: null, optimalTime: null, loaded: false, lastRefresh: 0 },
    insights: { hints: null, loaded: false, lastRefresh: 0 },
    industry: { loaded: false, lastRefresh: 0 }
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
          setTabCache(prev => ({
            ...prev,
            industry: { loaded: true, lastRefresh: Date.now() }
          }))
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto lg:h-10 gap-1 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">基本統計</TabsTrigger>
          <TabsTrigger value="industry" className="text-xs sm:text-sm py-2">業界分析</TabsTrigger>
          <TabsTrigger value="patterns" className="text-xs sm:text-sm py-2">学習パターン（AI）</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs sm:text-sm py-2">インサイト（AI）</TabsTrigger>
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
                  {tabCache.overview.analytics.weeklyProgress.map((week, index) => {
                    // 注意フラグの判定ロジック（学習データがある場合のみ）
                    const hasLearningData = week.sessionsCompleted > 0 && week.averageScore > 0
                    const lowAccuracy = hasLearningData && week.averageScore < 60
                    const lowFrequency = week.sessionsCompleted < 2 && week.sessionsCompleted > 0 // 学習はしているが頻度が少ない
                    
                    // 前週との比較（両週とも学習データがある場合のみ）
                    const previousWeek = index > 0 ? tabCache.overview.analytics!.weeklyProgress[index - 1] : null
                    const hasPreviousData = previousWeek && previousWeek.sessionsCompleted > 0 && previousWeek.averageScore > 0
                    const isImproving = hasLearningData && hasPreviousData && week.averageScore > previousWeek.averageScore
                    const isDecline = hasLearningData && hasPreviousData && week.averageScore < previousWeek.averageScore && week.averageScore < 70
                    
                    const needsAttention = lowAccuracy || lowFrequency || isDecline
                    
                    return (
                      <div key={index} className={`p-4 rounded-lg ${needsAttention ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{week.week}</p>
                            <p className="text-sm text-muted-foreground">
                              {week.sessionsCompleted}セッション完了
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{week.averageScore}%</p>
                              {isImproving && (
                                <span className="text-green-600 text-xs">📈</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">平均スコア</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{week.timeSpent}分</p>
                            <p className="text-xs text-muted-foreground">学習時間</p>
                          </div>
                        </div>
                        
                        {needsAttention && (
                          <div className="mt-3 text-xs text-orange-600 bg-orange-100 p-2 rounded">
                            ⚠️ 注意が必要: {
                              lowAccuracy ? '正答率が低めです（60%未満）' :
                              isDecline ? '前週より正答率が低下しています' :
                              lowFrequency ? '学習頻度が少なめです' : '改善の余地があります'
                            }
                          </div>
                        )}
                      </div>
                    )
                  })}
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
          {/* セクション説明 */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Brain className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">AI学習パターン分析</h3>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    あなたの学習行動データを多角的にAI分析し、学習の質・効率・パターンを可視化します。
                    継続性・正確性・効率性・多様性・深度の5つの観点から総合的に評価し、
                    個人最適化された学習改善提案を提供します。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user?.id && (
            <>
              {/* 学習品質総合評価 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  学習品質総合評価
                </h4>
                <LearningQualityScoreCard 
                  userId={user.id} 
                  refreshTrigger={tabCache.patterns.lastRefresh}
                  className="w-full"
                />
              </div>
              
              {/* 時間効率分析 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  時間効率分析
                </h4>
                <HourlyEfficiencyChart 
                  userId={user.id}
                  refreshTrigger={tabCache.patterns.lastRefresh}
                  className="w-full"
                />
              </div>
              
              {/* 学習スタイル分析 */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  学習スタイル分析
                </h4>
                <LearningPatternComparison 
                  userId={user.id}
                  refreshTrigger={tabCache.patterns.lastRefresh}
                  className="w-full"
                />
              </div>
            </>
          )}
          
          {/* 詳細統計データ */}
          {!isTabLoading && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                詳細統計情報
                <span className="text-sm font-normal text-gray-500 ml-2">（上記分析の基礎データ）</span>
              </h4>
              
              {/* 基礎統計カード */}
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    学習活動統計
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    上記の品質スコア・効率分析・パターン分析の計算に使用されている基礎データです
                  </p>
                </CardHeader>
                <CardContent>
                  {tabCache.patterns.aiPatterns ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* 学習頻度データ */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">学習頻度データ</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>平均日次問題数:</span>
                            <span className="font-medium">{tabCache.patterns.aiPatterns.learningFrequency.averageDailyQuestions}問</span>
                          </div>
                          <div className="flex justify-between">
                            <span>活動日数:</span>
                            <span className="font-medium">{tabCache.patterns.aiPatterns.learningFrequency.activeDays}日</span>
                          </div>
                          <div className="flex justify-between">
                            <span>継続性指標:</span>
                            <span className="font-medium">{Math.round(tabCache.patterns.aiPatterns.learningFrequency.consistency * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* 時間帯データ */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">時間帯別データ</h5>
                        {tabCache.patterns.aiPatterns.timeOfDayPatterns.bestPerformanceHours.length > 0 ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>最高パフォーマンス時間:</span>
                              <span className="font-medium">
                                {tabCache.patterns.aiPatterns.timeOfDayPatterns.bestPerformanceHours[0].hour}時台
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
                          <p className="text-sm text-gray-600">データ蓄積中...</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-600 text-sm">
                        学習データを蓄積中です
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 学習最適化提案 */}
              {tabCache.patterns.optimalTime && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                      個人最適化提案
                    </CardTitle>
                    <p className="text-sm text-orange-700">
                      あなたの学習パターン分析に基づく、パフォーマンス向上のための具体的な提案です
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
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

                    {/* 詳細な改善提案 */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center">
                        <Brain className="w-4 h-4 mr-2 text-orange-600" />
                        パターン分析からの具体的改善提案
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {tabCache.patterns.aiPatterns?.learningFrequency?.consistency && tabCache.patterns.aiPatterns.learningFrequency.consistency < 0.5 && (
                          <div className="bg-white p-3 rounded border border-orange-200">
                            <div className="flex items-start gap-2">
                              <span className="text-orange-600 text-sm">⚠️</span>
                              <div>
                                <p className="text-sm font-medium text-orange-800">継続性の改善が必要</p>
                                <p className="text-xs text-orange-700 mt-1">
                                  週間継続率が低めです。毎日短時間でも継続することで学習効果が向上します。
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {tabCache.patterns.aiPatterns?.learningFrequency?.averageDailyQuestions && tabCache.patterns.aiPatterns.learningFrequency.averageDailyQuestions < 5 && (
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-600 text-sm">📈</span>
                              <div>
                                <p className="text-sm font-medium text-blue-800">学習量の増加推奨</p>
                                <p className="text-xs text-blue-700 mt-1">
                                  1日の問題数を5-10問に増やすとより効果的な学習が期待できます。
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-white p-3 rounded border border-purple-200">
                          <div className="flex items-start gap-2">
                            <span className="text-purple-600 text-sm">⏱️</span>
                            <div>
                              <p className="text-sm font-medium text-purple-800">集中力最適化</p>
                              <p className="text-xs text-purple-700 mt-1">
                                15-25分程度の短時間集中学習が最も効果的とされています。
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 text-sm">✨</span>
                            <div>
                              <p className="text-sm font-medium text-green-800">モチベーション維持</p>
                              <p className="text-xs text-green-700 mt-1">
                                小さな達成感を積み重ねることで長期的な学習継続が可能になります。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* セクション説明 */}
          <Card className="bg-gradient-to-r from-green-50 to-yellow-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">AI学習インサイト</h3>
                  <p className="text-green-800 text-sm leading-relaxed">
                    あなたの学習パターン分析結果に基づいて、AIが生成したパーソナライズされた学習改善提案とヒントです。
                    継続的な学習効果向上を目指すための具体的なアクションプランを提供します。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                パーソナライズドヒント
              </CardTitle>
              <p className="text-gray-600 text-sm mt-2">
                あなたの学習行動分析に基づく個人最適化された改善提案
              </p>
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
                <div className="space-y-6">
                  {/* 強化された分類システム */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* 即座に実行可能な改善提案 */}
                    {tabCache.insights.hints.generalTips.length > 0 && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <h4 className="font-medium text-red-900 mb-3 flex items-center">
                          <Target className="w-5 h-5 mr-2" />
                          🚨 即座に実行
                        </h4>
                        <div className="space-y-2">
                          {tabCache.insights.hints.generalTips.slice(0, 2).map((tip, index) => (
                            <div key={index} className="bg-white p-3 rounded border border-red-100">
                              <p className="text-sm text-red-800 font-medium mb-1">
                                改善提案 #{index + 1}
                              </p>
                              <p className="text-sm text-red-700">{tip}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                  優先度: 高
                                </span>
                                <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  推定時間: 5-10分
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* スキル強化提案 */}
                    {tabCache.insights.hints.performanceTips.length > 0 && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                          <Brain className="w-5 h-5 mr-2" />
                          📚 スキル強化
                        </h4>
                        <div className="space-y-2">
                          {tabCache.insights.hints.performanceTips.slice(0, 2).map((tip, index) => (
                            <div key={index} className="bg-white p-3 rounded border border-blue-100">
                              <p className="text-sm text-blue-800 font-medium mb-1">
                                スキル向上 #{index + 1}
                              </p>
                              <p className="text-sm text-blue-700">{tip}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                  優先度: 中
                                </span>
                                <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  推定時間: 15-30分
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 学習パターン最適化 */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      ⏰ 学習パターン最適化
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <p className="text-sm text-purple-800 font-medium mb-1">最適学習時間の活用</p>
                        <p className="text-sm text-purple-700">
                          あなたの集中力が最も高い時間帯での学習を心がけましょう
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-purple-100">
                        <p className="text-sm text-purple-800 font-medium mb-1">セッション時間の調整</p>
                        <p className="text-sm text-purple-700">
                          15-25分の短時間集中学習が効果的です
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 継続性改善 */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-3 flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      📅 継続性改善
                    </h4>
                    <div className="bg-white p-3 rounded border border-green-100">
                      <p className="text-sm text-green-800 font-medium mb-2">学習習慣の定着化</p>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li className="flex items-start">
                          <span className="mr-2 text-green-600">•</span>
                          毎日同じ時間帯に学習する習慣をつけましょう
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-600">•</span>
                          週末も含めて継続的な学習を心がけましょう
                        </li>
                        <li className="flex items-start">
                          <span className="mr-2 text-green-600">•</span>
                          小さな目標を達成する喜びを積み重ねましょう
                        </li>
                      </ul>
                    </div>
                  </div>
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
          <IndustryAnalysisPage refreshTrigger={tabCache.industry.lastRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}