'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  RefreshCw, 
  Target,
  Clock,
  Trophy,
  Activity
} from 'lucide-react'
import { useFullLearningAnalytics } from '@/hooks/useLearningAnalytics'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface CategoryBreakdownItem {
  categoryId: string
  categoryName: string
  totalXP: number
  accuracyRate: number
  masteryLevel: number
  skillLevel: string
  currentLevel?: string
  questionsAnswered?: number
  questionsCorrect?: number
  sessionsLast14Days?: number
  improvementTrend?: number
  needsAttention?: boolean
  trendDirection?: string
}

interface RecommendationItem {
  type: string
  title: string
  description: string
  priority: number
  estimatedTime: number
  categoryId?: string
  reason?: string
  confidence?: number
  content?: {
    title?: string
    description?: string
  }
  expectedTime?: number
}

interface CachedLearningDashboardProps {
  userId: string
  className?: string
}

interface IndustryData {
  careerReadiness: {
    readinessScore: number
    overallPercentile: number
    skillDistribution: {
      expert: number
      advanced: number
      intermediate: number
      beginner: number
    }
    topStrengths?: Array<{
      skill: string
      level: string
      percentile: number
    }>
    priorityGaps?: Array<{
      skill: string
      currentLevel: string
      targetLevel: string
      gapXP: number
      estimatedWeeks: number
    }>
  }
  careerRecommendations: Array<{
    type: string
    title: string
    description: string
    priority: number
    estimatedWeeks: number
    impact: string
  }>
}

export function CachedLearningDashboard({ userId, className }: CachedLearningDashboardProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  
  const { 
    overview, 
    detailed, 
    recommendations, 
    isLoading, 
    isError, 
    error, 
    refetchAll 
  } = useFullLearningAnalytics(userId, period)

  // Industry comparison data
  const { data: industryData, error: industryError } = useSWR<IndustryData>(
    `/api/learning-analytics/industry-comparison?userId=${userId}&targetRole=frontend_developer`,
    fetcher,
    { refreshInterval: 300000 } // 5分間隔更新
  )

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (isLoading) {
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

  if (isError) {
    return (
      <Alert className={className}>
        <AlertDescription>
          {error?.message || 'Failed to load analytics'}
          <Button variant="outline" size="sm" className="ml-2" onClick={refetchAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const metrics = overview.data?.metrics
  const categoryBreakdown = detailed.data?.categoryBreakdown || []
  const recommendationData = recommendations.data || {}

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
              disabled={overview.isFetching}
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
              レベル {Math.floor((metrics?.totalXP || 0) / 1000) + 1}
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
              {(metrics?.averageAccuracy || 0) >= 80 ? '優秀' : (metrics?.averageAccuracy || 0) >= 60 ? '良好' : '要改善'}
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
          <TabsTrigger value="patterns">学習パターン</TabsTrigger>
          <TabsTrigger value="industry">業界比較</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                カテゴリー別習熟度
                {detailed.isFetching && (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryBreakdown.length > 0 ? (
                  categoryBreakdown.map((category: CategoryBreakdownItem) => (
                    <div key={category.categoryId} className="space-y-3 border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{category.categoryName}</span>
                          <Badge variant={category.skillLevel === 'expert' ? 'default' : category.skillLevel === 'advanced' ? 'secondary' : 'outline'}>
                            {category.skillLevel === 'expert' ? 'エキスパート' : 
                             category.skillLevel === 'advanced' ? '上級' :
                             category.skillLevel === 'intermediate' ? '中級' : '初級'}
                          </Badge>
                          {category.trendDirection && (
                            <Badge variant={category.trendDirection === 'improving' ? 'default' : category.trendDirection === 'declining' ? 'destructive' : 'outline'}>
                              {category.trendDirection === 'improving' ? '📈 向上中' : 
                               category.trendDirection === 'declining' ? '📉 低下' : '➡️ 安定'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(category.accuracyRate)}% | {category.totalXP}XP
                        </div>
                      </div>
                      
                      <Progress value={category.masteryLevel} className="h-2" />
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div>レベル: {category.currentLevel}</div>
                        <div>回答数: {category.questionsAnswered}</div>
                        <div>正解数: {category.questionsCorrect}</div>
                        <div>14日間: {category.sessionsLast14Days || 0}セッション</div>
                      </div>
                      
                      {category.improvementTrend !== undefined && category.improvementTrend !== 0 && (
                        <div className="text-xs">
                          <span className={category.improvementTrend > 0 ? 'text-green-600' : 'text-red-600'}>
                            改善傾向: {category.improvementTrend > 0 ? '+' : ''}{category.improvementTrend}%
                          </span>
                        </div>
                      )}
                      
                      {category.needsAttention && (
                        <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ 注意が必要: 正答率が低いか、パフォーマンスが低下しています
                        </div>
                      )}
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
                {recommendations.isFetching && (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {detailed.data?.recommendations && detailed.data.recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group recommendations by type */}
                    {['immediate', 'category_improvement', 'study_pattern', 'skill_advancement', 'consistency'].map(type => {
                      const typeRecs = detailed.data?.recommendations?.filter((rec: RecommendationItem) => rec.type === type) || []
                      if (typeRecs.length === 0) return null

                      const typeLabels = {
                        immediate: '🚨 即座に実行',
                        category_improvement: '📚 スキル強化',
                        study_pattern: '⏰ 学習パターン最適化',
                        skill_advancement: '🚀 上級スキル開発',
                        consistency: '📅 継続性改善'
                      }

                      return (
                        <div key={type}>
                          <h4 className="font-medium mb-3">{typeLabels[type as keyof typeof typeLabels] || type}</h4>
                          <div className="space-y-3">
                            {typeRecs.map((rec: RecommendationItem, index: number) => (
                              <div key={index} className="border rounded-lg p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium">{rec.title}</h5>
                                  <div className="flex gap-2">
                                    {rec.estimatedTime > 0 && (
                                      <Badge variant="outline">
                                        {rec.estimatedTime}分
                                      </Badge>
                                    )}
                                    <Badge variant={rec.priority <= 2 ? 'default' : 'secondary'}>
                                      優先度{rec.priority}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {rec.description}
                                </p>
                                {rec.reason && (
                                  <p className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                                    💡 理由: {rec.reason}
                                  </p>
                                )}
                                {rec.confidence && (
                                  <div className="text-xs text-muted-foreground">
                                    信頼度: {Math.round(rec.confidence * 100)}%
                                  </div>
                                )}
                                {rec.categoryId && (
                                  <div className="text-xs text-blue-600">
                                    📂 対象カテゴリー: {rec.categoryId.replace(/_/g, ' ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {/* Legacy recommendations for backward compatibility */}
                    {recommendationData?.immediate?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">追加推奨事項</h4>
                        <div className="space-y-3">
                          {recommendationData.immediate.map((rec: RecommendationItem, index: number) => (
                            <div key={index} className="border rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">{rec.content?.title || rec.title}</h5>
                                <Badge variant="outline">
                                  {rec.expectedTime}分
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {rec.content?.description || rec.description}
                              </p>
                              {rec.reason && (
                                <p className="text-xs text-muted-foreground">
                                  理由: {rec.reason}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : recommendationData?.immediate?.length > 0 ? (
                  <>
                    <div>
                      <h4 className="font-medium mb-3">即座に実行可能</h4>
                      <div className="space-y-3">
                        {recommendationData.immediate.map((rec: RecommendationItem, index: number) => (
                          <div key={index} className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium">{rec.content?.title || rec.title}</h5>
                              <Badge variant="outline">
                                {rec.expectedTime}分
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {rec.content?.description || rec.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              理由: {rec.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {recommendationData.shortTerm?.goals?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">短期目標 ({recommendationData.shortTerm.timeframe})</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {recommendationData.shortTerm.goals.map((goal: string, index: number) => (
                            <li key={index}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    現在レコメンデーションはありません。学習を続けるとAIが最適な学習提案を行います。
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                学習パターン分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detailed.data?.learningPatterns ? (
                <div className="space-y-6">
                  {/* Main metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {detailed.data.learningPatterns.optimalStudyTime}
                      </div>
                      <div className="text-sm text-muted-foreground">最適学習時間</div>
                      {detailed.data?.learningPatterns?.optimalAccuracy && (
                        <div className="text-xs text-blue-500">
                          {Math.round(detailed.data.learningPatterns.optimalAccuracy)}% 正答率
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(detailed.data.learningPatterns.weeklyConsistency)}%
                      </div>
                      <div className="text-sm text-muted-foreground">週間継続率</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(detailed.data.learningPatterns.averageSessionDuration)}分
                      </div>
                      <div className="text-sm text-muted-foreground">平均セッション時間</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {detailed.data.learningPatterns.studyStreakQuality === 'excellent' ? '優秀' :
                         detailed.data.learningPatterns.studyStreakQuality === 'good' ? '良好' : '要改善'}
                      </div>
                      <div className="text-sm text-muted-foreground">学習品質</div>
                    </div>
                  </div>

                  {/* Hourly performance */}
                  {detailed.data?.learningPatterns?.hourlyPerformance && detailed.data.learningPatterns.hourlyPerformance.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">⏰ 時間帯別パフォーマンス（上位5位）</h4>
                      <div className="space-y-2">
                        {detailed.data?.learningPatterns?.hourlyPerformance?.map((hourData: {
                          hour: number
                          averageAccuracy: number
                          sessionCount: number
                          performance: number
                        }, index: number) => (
                          <div key={hourData.hour} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                #{index + 1}
                              </Badge>
                              <span className="font-medium">
                                {hourData.hour}:00 - {hourData.hour + 1}:00
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {Math.round(hourData.averageAccuracy)}% 正答率 ({hourData.sessionCount}セッション)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daily consistency */}
                  {detailed.data?.learningPatterns?.dailyConsistency && detailed.data.learningPatterns.dailyConsistency.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">📅 曜日別学習パターン</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {detailed.data?.learningPatterns?.dailyConsistency?.map((dayData: {
                          dayOfWeek: number
                          sessionCount: number
                          averageAccuracy: number
                          dayName: string
                        }) => (
                          <div key={dayData.dayOfWeek} className="text-center p-3 border rounded-lg">
                            <div className="font-medium">{dayData.dayName}</div>
                            <div className="text-sm text-muted-foreground">
                              {dayData.sessionCount}セッション
                            </div>
                            <div className="text-xs text-blue-600">
                              {Math.round(dayData.averageAccuracy)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations based on patterns */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">💡 パターン分析からの提案</h4>
                    <div className="space-y-2 text-sm">
                      {detailed.data.learningPatterns.studyStreakQuality === 'needs_improvement' && (
                        <div className="text-orange-600">
                          ⚠️ 学習品質の改善が必要です。最適時間帯（{detailed.data.learningPatterns.optimalStudyTime}）での学習を試してください。
                        </div>
                      )}
                      {detailed.data.learningPatterns.weeklyConsistency < 50 && (
                        <div className="text-blue-600">
                          📈 週間継続率が低めです。毎日短時間でも継続することで学習効果が向上します。
                        </div>
                      )}
                      {detailed.data.learningPatterns.averageSessionDuration < 10 && (
                        <div className="text-purple-600">
                          ⏱️ セッション時間が短めです。15-25分程度の学習が最も効果的とされています。
                        </div>
                      )}
                      {detailed.data.learningPatterns.studyStreakQuality === 'excellent' && (
                        <div className="text-green-600">
                          ✨ 素晴らしい学習パターンです！この調子で継続してください。
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  学習パターンを分析するには、もう少し学習データが必要です。
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="industry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                業界比較分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              {industryData ? (
                <div className="space-y-6">
                  {/* Career readiness overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {industryData.careerReadiness?.readinessScore || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">キャリア準備度</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {industryData.careerReadiness?.overallPercentile || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">業界パーセンタイル</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {industryData.careerReadiness?.skillDistribution?.expert || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">エキスパートスキル数</div>
                    </div>
                  </div>

                  {/* Top strengths */}
                  {industryData?.careerReadiness?.topStrengths?.length && industryData.careerReadiness.topStrengths.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 text-green-700">🎯 強みスキル</h4>
                      <div className="space-y-2">
                        {industryData.careerReadiness.topStrengths.map((strength: {skill: string, level: string, percentile: number}, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div>
                              <span className="font-medium">{strength.skill}</span>
                              <span className="ml-2 text-sm text-muted-foreground">({strength.level})</span>
                            </div>
                            <Badge variant="secondary">
                              {strength.percentile}%tile
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority gaps */}
                  {industryData?.careerReadiness?.priorityGaps?.length && industryData.careerReadiness.priorityGaps.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 text-orange-700">⚠️ 改善優先スキル</h4>
                      <div className="space-y-2">
                        {industryData.careerReadiness.priorityGaps.map((gap: {skill: string, currentLevel: string, targetLevel: string, gapXP: number, estimatedWeeks: number}, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div>
                              <span className="font-medium">{gap.skill}</span>
                              <div className="text-sm text-muted-foreground">
                                {gap.currentLevel} → {gap.targetLevel}
                              </div>
                            </div>
                            <Badge variant="outline">
                              {gap.estimatedWeeks}週間
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Career recommendations */}
                  {industryData.careerRecommendations?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">🚀 キャリア推奨アクション</h4>
                      <div className="space-y-3">
                        {industryData.careerRecommendations.map((rec: {type: string, title: string, description: string, priority: number, estimatedWeeks: number, impact: string}, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium">{rec.title}</h5>
                              <Badge variant={rec.impact === 'high' ? 'default' : 'secondary'}>
                                {rec.impact} impact
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {rec.description}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              推定期間: {rec.estimatedWeeks}週間
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : industryError ? (
                <p className="text-center text-muted-foreground py-8">
                  業界比較データの読み込みに失敗しました。
                </p>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refresh button */}
      <div className="flex justify-end gap-2">
        <div className="text-xs text-muted-foreground flex items-center">
          {overview.dataUpdatedAt && (
            <>最終更新: {new Date(overview.dataUpdatedAt).toLocaleTimeString()}</>
          )}
        </div>
        <Button variant="outline" onClick={refetchAll} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>
    </div>
  )
}