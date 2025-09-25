'use client'

import { useState, useEffect, Suspense, lazy } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Calendar,
  RefreshCw,
  Flame,
  Clock,
  Target,
  BookOpen,
  Award,
  Lightbulb,
  Zap,
  Users,
  CheckCircle2
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { useAuth } from '@/components/auth/AuthProvider'
import { getLearningAnalytics, LearningAnalytics } from '@/lib/supabase-analytics'
import { aiAnalytics, LearningPattern, OptimalLearningTime, PersonalizedHints } from '@/lib/ai-analytics'
import { industryAnalytics, IndustrySkillProfile } from '@/lib/industry-analytics'
import { SimpleSelect, SimpleSelectItem } from '@/components/ui/select'
import { globalCache, useResourceMonitor } from '@/lib/performance-optimizer'
import XPStatsCard from '@/components/xp/XPStatsCard'

// レーダーチャートコンポーネントを遅延読み込み
const SkillRadarChart = lazy(() => import('@/components/analytics/SkillRadarChart'))

interface CachedAnalyticsData {
  analytics: LearningAnalytics | null
  aiPatterns: LearningPattern | null  
  optimalTime: OptimalLearningTime | null
  hints: PersonalizedHints | null
  industryProfile: IndustrySkillProfile | null
}

export default function AnalyticsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [aiPatterns, setAiPatterns] = useState<LearningPattern | null>(null)
  const [optimalTime, setOptimalTime] = useState<OptimalLearningTime | null>(null)
  const [hints, setHints] = useState<PersonalizedHints | null>(null)
  const [industryProfile, setIndustryProfile] = useState<IndustrySkillProfile | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState<string>('consulting')
  const { user, loading } = useAuth()

  // パフォーマンス監視（開発環境のみ）
  useResourceMonitor()

  // 業界選択のデバウンス（将来実装予定）
  // const debouncedIndustryChange = useDebounce((industry: string) => {
  //   setSelectedIndustry(industry)
  // }, 300)

  // 分析データの読み込み
  useEffect(() => {
    async function loadAnalytics() {
      if (user?.id) {
        setIsLoading(true)
        try {
          const cacheKey = `analytics_${user.id}_${selectedIndustry}`
          
          // キャッシュから取得を試行
          const cachedData = globalCache.get(cacheKey) as CachedAnalyticsData | undefined
          if (cachedData) {
            setAnalytics(cachedData.analytics)
            setAiPatterns(cachedData.aiPatterns)
            setOptimalTime(cachedData.optimalTime)
            setHints(cachedData.hints)
            setIndustryProfile(cachedData.industryProfile)
            setIsLoading(false)
            return
          }

          // Initialize AI analytics
          await aiAnalytics.init()
          
          // Load all analytics data
          const [basicData, patterns, optimalTimeData, hintsData] = await Promise.all([
            getLearningAnalytics(user.id),
            aiAnalytics.analyzeLearningPatterns(user.id),
            aiAnalytics.recommendOptimalLearningTime(user.id),
            aiAnalytics.generatePersonalizedHints(user.id)
          ])
          
          setAnalytics(basicData)
          setAiPatterns(patterns)
          setOptimalTime(optimalTimeData)
          setHints(hintsData)
          
          // Load industry profile if patterns exist
          let industryData = null
          if (patterns && patterns.learningFrequency.activeDays > 0) {
            const progressData: unknown[] = [] // We'll need to extract this from the patterns
            industryData = await industryAnalytics.analyzeIndustrySkills(
              user.id, 
              selectedIndustry, 
              progressData
            )
            setIndustryProfile(industryData)
          }

          // キャッシュに保存（2分間有効）
          globalCache.set(cacheKey, {
            analytics: basicData,
            aiPatterns: patterns,
            optimalTime: optimalTimeData,
            hints: hintsData,
            industryProfile: industryData
          }, 2 * 60 * 1000)

        } catch (error) {
          console.error('Error loading analytics:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadAnalytics()
  }, [user?.id, selectedIndustry])

  // 分析データの更新
  const refreshAnalytics = async () => {
    if (user?.id) {
      setIsLoading(true)
      try {
        // キャッシュをクリア
        const cacheKey = `analytics_${user.id}_${selectedIndustry}`
        globalCache.delete(cacheKey)
        
        // 新しいデータを読み込み
        const [basicData, patterns, optimalTimeData, hintsData] = await Promise.all([
          getLearningAnalytics(user.id),
          aiAnalytics.analyzeLearningPatterns(user.id),
          aiAnalytics.recommendOptimalLearningTime(user.id),
          aiAnalytics.generatePersonalizedHints(user.id)
        ])
        
        setAnalytics(basicData)
        setAiPatterns(patterns)
        setOptimalTime(optimalTimeData)
        setHints(hintsData)

        // 業界プロファイルも更新
        if (patterns && patterns.learningFrequency.activeDays > 0) {
          const progressData: unknown[] = []
          const industryData = await industryAnalytics.analyzeIndustrySkills(
            user.id, 
            selectedIndustry, 
            progressData
          )
          setIndustryProfile(industryData)
        }

      } catch (error) {
        console.error('Error refreshing analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">学習分析</h1>
            <p className="text-gray-600 mt-2">あなたの学習進捗と成果を詳しく分析します</p>
          </div>
          <Button onClick={refreshAnalytics} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto lg:h-10 gap-1 p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">概要</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm py-2">パフォーマンス</TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs sm:text-sm py-2">学習パターン</TabsTrigger>
            <TabsTrigger value="industry" className="text-xs sm:text-sm py-2">業界分析</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs sm:text-sm py-2">インサイト</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* XP統計カード */}
            <XPStatsCard showDetailedStats={true} className="mb-6" />
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">総セッション数</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.totalSessions || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      完了: {analytics?.completedSessions || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">正答率</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics?.accuracy ? `${analytics.accuracy}%` : '-'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.totalQuizQuestions || 0}問中 {analytics?.correctAnswers || 0}問正解
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">学習日数</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.learningDays || 0}</div>
                    <p className="text-xs text-muted-foreground">日間</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">連続学習</CardTitle>
                    <Flame className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics?.streak || 0}</div>
                    <p className="text-xs text-muted-foreground">日連続</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* カテゴリー別進捗 */}
            <Card>
              <CardHeader>
                <CardTitle>カテゴリー別進捗</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-2 w-full bg-gray-100 rounded mb-2"></div>
                        <div className="h-3 w-24 bg-gray-100 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : analytics?.categoriesProgress && analytics.categoriesProgress.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.categoriesProgress.map((category) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">
                            {category.category === 'ai_literacy_fundamentals' ? 'AI基礎リテラシー' : category.category}
                          </h4>
                          <Badge variant="outline">{category.accuracy}%</Badge>
                        </div>
                        <Progress 
                          value={(category.completedSessions / Math.max(category.totalSessions, 1)) * 100} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{category.completedSessions}/{category.totalSessions} セッション完了</span>
                          <span>最終学習: {new Date(category.lastAccessed).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">学習データがありません</h3>
                    <p className="text-muted-foreground mb-4">
                      学習セッションを完了して分析データを蓄積しましょう！
                    </p>
                    <Button onClick={() => window.location.href = '/learning'}>
                      学習を始める
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 最近のアクティビティ */}
            {analytics?.recentActivity && analytics.recentActivity.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>最近のアクティビティ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(activity.date).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.sessionsCompleted}セッション完了
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{activity.quizScore}%</p>
                          <p className="text-xs text-muted-foreground">{activity.timeSpent}分</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* 週間進捗 */}
            <Card>
              <CardHeader>
                <CardTitle>週間パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center animate-pulse">
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : analytics?.weeklyProgress && analytics.weeklyProgress.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.weeklyProgress.map((week, index) => (
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

            {/* 学習時間統計 */}
            <Card>
              <CardHeader>
                <CardTitle>学習時間統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Clock className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-blue-700">
                      {analytics?.averageSessionTime || 0}分
                    </p>
                    <p className="text-sm text-blue-600">平均セッション時間</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Award className="mx-auto h-8 w-8 text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-green-700">
                      {analytics?.completedSessions || 0}
                    </p>
                    <p className="text-sm text-green-600">完了セッション数</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <TrendingUp className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-purple-700">
                      {analytics ? Math.round((analytics.completedSessions / Math.max(analytics.totalSessions, 1)) * 100) : 0}%
                    </p>
                    <p className="text-sm text-purple-600">完了率</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-6">
            {/* AI学習パターン分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI学習パターン分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-12 w-full bg-gray-100 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : aiPatterns ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* 学習頻度パターン */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        学習頻度パターン
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>平均日次問題数:</span>
                          <span className="font-medium">{aiPatterns.learningFrequency.averageDailyQuestions}問</span>
                        </div>
                        <div className="flex justify-between">
                          <span>学習日数:</span>
                          <span className="font-medium">{aiPatterns.learningFrequency.activeDays}日</span>
                        </div>
                        <div className="flex justify-between">
                          <span>継続性スコア:</span>
                          <span className="font-medium">{Math.round(aiPatterns.learningFrequency.consistency * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* 時間帯パターン */}
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-3 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        最適学習時間
                      </h4>
                      {aiPatterns.timeOfDayPatterns.bestPerformanceHours.length > 0 ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>最高パフォーマンス時間:</span>
                            <span className="font-medium">
                              {aiPatterns.timeOfDayPatterns.bestPerformanceHours[0].hour}時
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>その時間の正答率:</span>
                            <span className="font-medium">
                              {aiPatterns.timeOfDayPatterns.bestPerformanceHours[0].accuracy}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-green-800">データ蓄積中...</p>
                      )}
                    </div>

                    {/* 科目別強み */}
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        科目別強み・弱み
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>全体正答率:</span>
                          <span className="font-medium">{aiPatterns.subjectStrengths.overallAccuracy}%</span>
                        </div>
                        {aiPatterns.subjectStrengths.strengths.length > 0 && (
                          <div>
                            <span className="text-green-600 font-medium">強み:</span>
                            <span className="ml-2">{aiPatterns.subjectStrengths.strengths[0].category}</span>
                          </div>
                        )}
                        {aiPatterns.subjectStrengths.weaknesses.length > 0 && (
                          <div>
                            <span className="text-orange-600 font-medium">改善点:</span>
                            <span className="ml-2">{aiPatterns.subjectStrengths.weaknesses[0].category}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 学習速度 */}
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        学習速度・改善傾向
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>学習速度スコア:</span>
                          <span className="font-medium">{aiPatterns.learningVelocity.velocityScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>改善傾向:</span>
                          <span className={`font-medium ${
                            aiPatterns.learningVelocity.isImproving ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {aiPatterns.learningVelocity.isImproving ? '向上中' : '安定'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>現在のレベル:</span>
                          <span className="font-medium">{aiPatterns.difficultyProgression.currentLevel}</span>
                        </div>
                      </div>
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
            {optimalTime && (
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
                        {optimalTime.bestTimeOfDay.timeSlot}（{optimalTime.bestTimeOfDay.hour}時頃）
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        信頼度: {optimalTime.bestTimeOfDay.confidence}%
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">推奨セッション長</h4>
                      <p className="text-sm text-green-800">
                        {optimalTime.sessionLength.recommended}分
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {optimalTime.sessionLength.reasoning}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">推奨頻度</h4>
                      <p className="text-sm text-purple-800">
                        1日{optimalTime.frequency.questionsPerDay}問
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        週{optimalTime.frequency.sessionsPerWeek}セッション
                      </p>
                    </div>
                  </div>
                  {optimalTime.customAdvice.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">カスタムアドバイス</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {optimalTime.customAdvice.map((advice, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            {advice}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="industry" className="space-y-6">
            {/* 業界選択 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  業界別スキル分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">分析対象業界を選択:</label>
                  <SimpleSelect value={selectedIndustry} onValueChange={setSelectedIndustry} className="w-64">
                    <SimpleSelectItem value="consulting">コンサルティング業界</SimpleSelectItem>
                    <SimpleSelectItem value="it_si">IT・SI業界</SimpleSelectItem>
                    <SimpleSelectItem value="manufacturing">製造業</SimpleSelectItem>
                    <SimpleSelectItem value="finance">金融業界</SimpleSelectItem>
                    <SimpleSelectItem value="healthcare">ヘルスケア業界</SimpleSelectItem>
                  </SimpleSelect>
                </div>

                {industryProfile ? (
                  <div className="space-y-6">
                    {/* 業界スコア概要 */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <h4 className="font-medium text-blue-900 mb-2">総合スコア</h4>
                        <p className="text-2xl font-bold text-blue-700">{industryProfile.overallScore}</p>
                        <p className="text-xs text-blue-600">/{industryProfile.industryName}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <h4 className="font-medium text-green-900 mb-2">強みスキル</h4>
                        <p className="text-lg font-bold text-green-700">
                          {industryProfile.skillAreas.filter(s => s.score >= 80).length}
                        </p>
                        <p className="text-xs text-green-600">分野</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg text-center">
                        <h4 className="font-medium text-orange-900 mb-2">改善領域</h4>
                        <p className="text-lg font-bold text-orange-700">
                          {industryProfile.skillAreas.filter(s => s.score < 60 && s.importance >= 4).length}
                        </p>
                        <p className="text-xs text-orange-600">分野</p>
                      </div>
                    </div>

                    {/* スキルレーダーチャート */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-4">スキル可視化</h4>
                        <div className="bg-white border rounded-lg p-4">
                          <Suspense fallback={
                            <div className="w-full h-80 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                          }>
                            <SkillRadarChart 
                              data={industryAnalytics.generateRadarChartData(industryProfile)}
                              title={`${industryProfile.industryName}スキルプロファイル`}
                            />
                          </Suspense>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-4">スキル領域別詳細</h4>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {industryProfile.skillAreas.slice(0, 8).map((skill, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-sm">{skill.categoryName}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant={skill.importance >= 4 ? 'default' : 'secondary'} className="text-xs">
                                    重要度: {skill.importance}/5
                                  </Badge>
                                  <Badge variant={skill.score >= 80 ? 'default' : skill.score >= 60 ? 'secondary' : 'destructive'} className="text-xs">
                                    {skill.score}点
                                  </Badge>
                                </div>
                              </div>
                              <Progress value={skill.score} className="h-2 mb-1" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>現在: {skill.currentLevel}</span>
                                <span>目標: {skill.targetLevel}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* レコメンデーション */}
                    {industryProfile.recommendations.length > 0 && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                          <Lightbulb className="w-4 h-4 mr-2" />
                          業界特化レコメンデーション
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          {industryProfile.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 次のアクション */}
                    {industryProfile.nextActions.length > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          推奨アクション
                        </h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          {industryProfile.nextActions.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">業界分析準備中</h3>
                    <p className="text-muted-foreground">
                      学習データの蓄積により業界特化分析が利用可能になります
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>学習インサイト</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* パーソナライズドヒント */}
                  {hints && (
                    <div className="space-y-4">
                      {hints.generalTips.length > 0 && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                            <Lightbulb className="w-4 h-4 mr-2" />
                            一般的なヒント
                          </h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {hints.generalTips.map((tip, index) => (
                              <li key={index} className="flex items-start">
                                <span className="mr-2">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {hints.subjectSpecificTips.length > 0 && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                            <Target className="w-4 h-4 mr-2" />
                            科目別アドバイス
                          </h4>
                          <ul className="text-sm text-purple-800 space-y-1">
                            {hints.subjectSpecificTips.map((tip, index) => (
                              <li key={index} className="flex items-start">
                                <span className="mr-2">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {hints.performanceTips.length > 0 && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-900 mb-2 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            パフォーマンス向上のコツ
                          </h4>
                          <ul className="text-sm text-green-800 space-y-1">
                            {hints.performanceTips.map((tip, index) => (
                              <li key={index} className="flex items-start">
                                <span className="mr-2">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                          <Zap className="w-4 h-4 mr-2" />
                          モチベーションメッセージ
                        </h4>
                        <p className="text-sm text-orange-800">{hints.motivationalMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* 動的インサイト */}
                  {analytics && analytics.totalSessions > 0 ? (
                    <>
                      {analytics.streak > 0 && (
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                            <Flame className="w-4 h-4 mr-2" />
                            連続学習継続中！
                          </h4>
                          <p className="text-sm text-orange-800">
                            {analytics.streak}日連続で学習を継続しています。素晴らしいペースです！
                            この調子で継続しましょう。
                          </p>
                        </div>
                      )}

                      {analytics.accuracy >= 80 && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-900 mb-2 flex items-center">
                            <Target className="w-4 h-4 mr-2" />
                            高い理解度を達成！
                          </h4>
                          <p className="text-sm text-green-800">
                            正答率{analytics.accuracy}%という優秀な成績です。
                            基礎がしっかり身についています。
                          </p>
                        </div>
                      )}

                      {analytics.accuracy < 60 && analytics.totalQuizQuestions > 0 && (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="font-medium text-yellow-900 mb-2">復習をおすすめします</h4>
                          <p className="text-sm text-yellow-800">
                            正答率が{analytics.accuracy}%となっています。
                            以前に学習したセッションを復習すると理解が深まります。
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">学習進捗サマリー</h4>
                        <p className="text-sm text-blue-800">
                          これまで{analytics.totalSessions}セッションに取り組み、
                          {analytics.completedSessions}セッションを完了しました。
                          {analytics.learningDays}日間にわたって学習を継続しています。
                        </p>
                      </div>
                    </>
                  ) : (
                    /* 初回ユーザー向けメッセージ */
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">ようこそ！</h4>
                        <p className="text-sm text-blue-800">
                          AI学習プラットフォームにご登録いただきありがとうございます。
                          学習セッションを完了して分析データを蓄積しましょう！
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900 mb-2">おすすめアクション</h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>• まずはAI基礎リテラシーから学習を始める</li>
                          <li>• 毎日少しずつでも継続して学習</li>
                          <li>• 完了したセッションは復習で知識を定着</li>
                          <li>• 獲得したナレッジカードをコレクションで確認</li>
                        </ul>
                      </div>
                    </>
                  )}

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-2">学習のコツ</h4>
                    <p className="text-sm text-purple-800">
                      継続的な学習が最も効果的です。毎日少しずつでも続けることで、
                      着実に知識を身につけることができます。セッション完了後は
                      ナレッジカードを確認して学習内容を振り返りましょう。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}