'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  RefreshCw, 
  Info,
  Target,
  Zap
} from 'lucide-react'

import { LearningAnalyticsCard, type LearningStage, type AnalyticsData } from './LearningAnalyticsCard'
import { RealTimeLearningGuidance, type CognitiveLoadState, type FlowState, type SessionMetrics } from './RealTimeLearningGuidance'
import { SpacedRepetitionRecommendations, type ReviewItem, type ForgettingCurveInsights } from './SpacedRepetitionRecommendations'
import { UnifiedLearningAnalysisEngine } from '@/lib/unified-learning-analytics'

interface LearningAnalyticsDashboardProps {
  userId: string
  isInSession?: boolean
  currentSessionId?: string
  className?: string
}

export function LearningAnalyticsDashboard({ 
  userId, 
  isInSession = false, 
  currentSessionId,
  className 
}: LearningAnalyticsDashboardProps) {
  const [analyticsEngine] = useState(() => new UnifiedLearningAnalysisEngine(userId))
  
  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Analytics data
  const [learningStage, setLearningStage] = useState<LearningStage | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [forgettingInsights, setForgettingInsights] = useState<ForgettingCurveInsights | null>(null)
  
  // Real-time session data (only when in session)
  const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoadState | null>(null)
  const [flowState, setFlowState] = useState<FlowState | null>(null)
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null)

  const initializeDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user learning profile
      const profile = await analyticsEngine.getUserLearningProfile()
      
      // Determine learning stage based on data availability
      const stage = determineLearningStage(profile)
      setLearningStage(stage)

      // If sufficient data exists, get analytics
      if (stage.stage !== 'analyzing') {
        const personalAnalysis = await analyticsEngine.analyzePersonalLearningPatterns()
        // Transform PersonalLearningAnalysis to AnalyticsData
        const analyticsData: AnalyticsData = {
          timePatterns: {
            optimalHours: personalAnalysis.timePatterns.optimalHours,
            weeklyPerformance: personalAnalysis.timePatterns.weeklyPerformance.map(day => ({
              day: day.dayOfWeek.toString(),
              performance: day.averageAccuracy,
              accuracy: day.averageAccuracy
            })),
            fatigueThreshold: personalAnalysis.timePatterns.fatigueThreshold,
            averageAccuracy: personalAnalysis.timePatterns.weeklyPerformance.reduce((sum, day) => sum + day.averageAccuracy, 0) / personalAnalysis.timePatterns.weeklyPerformance.length
          },
          forgettingCurve: {
            retentionStrength: personalAnalysis.forgettingCurve.memoryRetentionStrength,
            optimalReviewDays: personalAnalysis.forgettingCurve.optimalReviewSchedule.map(date => Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
            nextReviewCount: personalAnalysis.forgettingCurve.optimalReviewSchedule.length
          },
          cognitiveLoad: {
            averageLoad: personalAnalysis.cognitiveLoad.currentLoadLevel,
            tolerance: personalAnalysis.cognitiveLoad.loadTolerance,
            optimalSessionMinutes: personalAnalysis.cognitiveLoad.optimalSessionDuration
          },
          flowState: {
            averageFlow: personalAnalysis.flowState.currentFlowIndex,
            bestConditions: 'Optimal difficulty range',
            flowFrequency: personalAnalysis.flowState.engagementLevel
          }
        }
        setAnalyticsData(analyticsData)
      }

      // Get spaced repetition data
      const [reviews, recommendations] = await Promise.all([
        analyticsEngine.getDueReviews(20),
        analyticsEngine.getForgettingCurveRecommendations()
      ])

      setReviewItems(transformReviewItems(reviews))
      setForgettingInsights(transformForgettingInsights(recommendations))

    } catch (err) {
      console.error('Failed to initialize dashboard:', err)
      setError('学習分析データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [analyticsEngine])

  const updateRealTimeMetrics = useCallback(async () => {
    if (!currentSessionId) return

    try {
      // Mock real-time data - in production, this would come from session tracking
      const mockSessionMetrics: SessionMetrics = {
        accuracy: 78.5,
        averageResponseTime: 15000,
        questionsCompleted: 12,
        timeElapsed: 1200 // 20 minutes
      }

      const mockCognitiveLoad: CognitiveLoadState = {
        currentLoad: 6.2,
        tolerance: 8.0,
        timeElapsed: 20,
        trend: 'stable',
        recommendedAction: 'continue'
      }

      // Get flow guidance from engine
      const flowGuidance = await analyticsEngine.provideFlowStateGuidance(
        currentSessionId,
        mockSessionMetrics.accuracy,
        Math.floor(mockSessionMetrics.timeElapsed / 60),
        [12000, 15000, 18000, 14000, 16000] // Recent response times
      )

      setSessionMetrics(mockSessionMetrics)
      setCognitiveLoad(mockCognitiveLoad)
      setFlowState(flowGuidance)

    } catch (err) {
      console.error('Failed to update real-time metrics:', err)
    }
  }, [currentSessionId, analyticsEngine])

  // Initialize dashboard data
  useEffect(() => {
    initializeDashboard()
  }, [userId, initializeDashboard])

  // Real-time updates during session
  useEffect(() => {
    if (isInSession && currentSessionId) {
      const interval = setInterval(() => {
        updateRealTimeMetrics()
      }, 30000) // Update every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [isInSession, currentSessionId, updateRealTimeMetrics])

  const determineLearningStage = (_profile: unknown): LearningStage => {
    // Mock calculation - in production, calculate based on actual data
    const daysActive = 15 // Calculate from user's learning history
    const sessionCount = 45 // Get from analytics

    if (daysActive < 7 || sessionCount < 10) {
      return {
        stage: 'analyzing',
        daysActive,
        sessionCount,
        dataQuality: 'insufficient'
      }
    } else if (daysActive < 60 || sessionCount < 50) {
      return {
        stage: 'patterns_emerging',
        daysActive,
        sessionCount,
        dataQuality: 'basic'
      }
    } else {
      return {
        stage: 'ai_coach_active',
        daysActive,
        sessionCount,
        dataQuality: 'excellent'
      }
    }
  }

  const transformReviewItems = (reviews: Record<string, unknown>[]): ReviewItem[] => {
    return reviews.map((review) => ({
      contentId: (review.id as string) || (review.content_id as string) || 'unknown',
      contentType: ((review.content_type as string) || 'quiz_question') as 'quiz_question' | 'course_material' | 'concept' | 'skill',
      categoryId: review.category_id as string,
      categoryName: review.category_id as string, // Would get actual name from categories
      subcategoryName: review.subcategory_id as string,
      daysSinceLearning: (review.days_overdue as number) || 1,
      predictedRetention: ((review.mastery_level as number) || 0.5) * 100,
      urgencyScore: (review.priority_score as number) || 5,
      recommendedAction: ((review.urgency_score as number) || 5) > 8 ? 'URGENT_REVIEW' : 'REVIEW_SOON',
      masteryLevel: (review.mastery_level as number) || 0.5,
      reviewCount: (review.review_count as number) || 0,
      nextOptimalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    }))
  }

  const transformForgettingInsights = (_recommendations: unknown): ForgettingCurveInsights => {
    const recArray = Array.isArray(_recommendations) ? _recommendations : []
    return {
      personalRetentionRate: 72,
      averageForgettingRate: 0.5,
      strongCategories: ['ビジネス戦略', 'マーケティング'],
      weakCategories: ['データ分析', 'プログラミング'],
      totalItemsToReview: recArray.length,
      optimalReviewFrequency: 7
    }
  }

  // Event handlers
  const handleBreakSuggested = () => {
    // Pause session or navigate to break screen
    console.log('Break suggested')
  }

  const handleContinueSession = () => {
    // Continue current session
    console.log('Continue session')
  }

  const handleAdjustDifficulty = (direction: 'easier' | 'harder') => {
    // Adjust question difficulty
    console.log('Adjust difficulty:', direction)
  }

  const handleStartReview = (item: ReviewItem) => {
    // Navigate to review session
    console.log('Start review:', item)
  }

  const handleScheduleReview = (item: ReviewItem, date: Date) => {
    // Schedule review for later
    console.log('Schedule review:', item, date)
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className={className}>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={initializeDashboard}
            className="ml-2"
          >
            再試行
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-500" />
          学習分析ダッシュボード
        </h2>
        <Button variant="outline" size="sm" onClick={initializeDashboard}>
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      {/* Main Analytics Card */}
      {learningStage && (
        <LearningAnalyticsCard 
          stage={learningStage}
          data={analyticsData || undefined}
        />
      )}

      {/* Real-time Guidance (only during session) */}
      {isInSession && cognitiveLoad && flowState && sessionMetrics && (
        <RealTimeLearningGuidance
          cognitiveLoad={cognitiveLoad}
          flowState={flowState}
          sessionMetrics={sessionMetrics}
          onBreakSuggested={handleBreakSuggested}
          onContinueSession={handleContinueSession}
          onAdjustDifficulty={handleAdjustDifficulty}
        />
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            概要
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            復習管理
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            詳細分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                学習統計概要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {learningStage?.daysActive || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">学習継続日数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {learningStage?.sessionCount || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">総セッション数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {analyticsData?.timePatterns?.averageAccuracy?.toFixed(1) || '---'}%
                  </p>
                  <p className="text-sm text-muted-foreground">平均正答率</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {forgettingInsights?.totalItemsToReview || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">復習待ち項目</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          {forgettingInsights && (
            <SpacedRepetitionRecommendations
              reviewItems={reviewItems}
              insights={forgettingInsights}
              onStartReview={handleStartReview}
              onScheduleReview={handleScheduleReview}
            />
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              詳細な学習分析機能は現在開発中です。より多くの学習データが蓄積されると、
              高度な分析結果をここに表示します。
            </AlertDescription>
          </Alert>
          
          {/* Placeholder for advanced analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                高度分析（開発中）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4" />
                <p>学習パターンの詳細分析</p>
                <p className="text-sm">カテゴリー別習得率、時間効率分析など</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}