'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Brain, 
  Award,
  Calendar,
  BarChart3,
  Flame
} from 'lucide-react'
import { QuizResult } from '@/lib/storage'
import { StorageUser } from '@/lib/storage'
import { getCategoryDisplayName, mapToMainCategoryId } from '@/lib/category-mapping'

interface LearningInsightsProps {
  quizResults: QuizResult[]
  user: StorageUser
}

export default function LearningInsights({ quizResults, user }: LearningInsightsProps) {
  const insights = useMemo(() => {
    if (quizResults.length === 0) {
      return {
        avgAccuracy: 0,
        totalTimeSpent: 0,
        strongestCategory: '未実施',
        weakestCategory: '未実施',
        recentTrend: 'neutral',
        consistencyScore: 0,
        improvementAreas: [],
        strengths: []
      }
    }

    // Calculate average accuracy
    const avgAccuracy = quizResults.reduce((sum, result) => 
      sum + (result.correctAnswers / result.totalQuestions), 0
    ) / quizResults.length * 100

    // Total time spent (in minutes)
    const totalTimeSpent = Math.round(
      quizResults.reduce((sum, result) => sum + result.timeSpent, 0) / 60
    )

    // Category analysis with mapping to main categories
    const categoryStats = quizResults.reduce((acc, result) => {
      Object.entries(result.categoryScores).forEach(([category, scores]) => {
        // Map to main category ID
        const mainCategoryId = mapToMainCategoryId(category)
        if (!acc[mainCategoryId]) {
          acc[mainCategoryId] = { correct: 0, total: 0 }
        }
        acc[mainCategoryId].correct += scores.correct
        acc[mainCategoryId].total += scores.total
      })
      return acc
    }, {} as Record<string, { correct: number; total: number }>)

    const categoryAccuracies = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    })).sort((a, b) => b.accuracy - a.accuracy)

    const strongestCategory = categoryAccuracies[0]?.category || '未実施'
    const weakestCategory = categoryAccuracies[categoryAccuracies.length - 1]?.category || '未実施'

    // Recent trend analysis (last 5 results vs previous 5)
    const recentResults = quizResults.slice(-5)
    const previousResults = quizResults.slice(-10, -5)
    
    let recentTrend = 'neutral'
    if (recentResults.length >= 3 && previousResults.length >= 3) {
      const recentAvg = recentResults.reduce((sum, r) => 
        sum + (r.correctAnswers / r.totalQuestions), 0) / recentResults.length
      const previousAvg = previousResults.reduce((sum, r) => 
        sum + (r.correctAnswers / r.totalQuestions), 0) / previousResults.length
      
      if (recentAvg > previousAvg + 0.05) recentTrend = 'up'
      else if (recentAvg < previousAvg - 0.05) recentTrend = 'down'
    }

    // Consistency score based on standard deviation
    const accuracies = quizResults.map(r => (r.correctAnswers / r.totalQuestions) * 100)
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) / accuracies.length
    const stdDev = Math.sqrt(variance)
    const consistencyScore = Math.max(0, 100 - stdDev * 2) // Higher score = more consistent

    // Generate improvement areas and strengths
    const improvementAreas = categoryAccuracies
      .filter(cat => cat.accuracy < 60)
      .slice(0, 3)
      .map(cat => cat.category)

    const strengths = categoryAccuracies
      .filter(cat => cat.accuracy >= 80)
      .slice(0, 3)
      .map(cat => cat.category)

    return {
      avgAccuracy: Math.round(avgAccuracy),
      totalTimeSpent,
      strongestCategory,
      weakestCategory,
      recentTrend,
      consistencyScore: Math.round(consistencyScore),
      improvementAreas,
      strengths
    }
  }, [quizResults])

  return (
    <div className="space-y-6">
      {/* Basic Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center space-y-2">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="text-2xl font-bold">{quizResults.length}</div>
              <div className="text-xs text-muted-foreground">総クイズ回数</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center space-y-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="text-2xl font-bold">
                {user.progress.totalAnswers > 0 
                  ? Math.round((user.progress.correctAnswers / user.progress.totalAnswers) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-muted-foreground">総合正答率</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center space-y-2">
              <Brain className="h-8 w-8 text-purple-500" />
              <div className="text-2xl font-bold">{user.progress.currentLevel}</div>
              <div className="text-xs text-muted-foreground">現在のレベル</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex flex-col items-center space-y-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <div className="text-2xl font-bold">{user.progress.streak}</div>
              <div className="text-xs text-muted-foreground">連続学習日数</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>詳細分析</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-blue-500" />
                <div className="text-xl font-bold">{insights.avgAccuracy}%</div>
              </div>
              <div className="text-sm text-muted-foreground">平均正答率</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div className="text-xl font-bold">{insights.totalTimeSpent}分</div>
              </div>
              <div className="text-sm text-muted-foreground">総学習時間</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div className="text-xl font-bold">{insights.consistencyScore}%</div>
              </div>
              <div className="text-sm text-muted-foreground">安定性スコア</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {insights.recentTrend === 'up' ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : insights.recentTrend === 'down' ? (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                ) : (
                  <Calendar className="h-5 w-5 text-gray-500" />
                )}
                <div className="text-lg font-medium">
                  {insights.recentTrend === 'up' ? '向上中' : 
                   insights.recentTrend === 'down' ? '要注意' : '安定'}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">直近の傾向</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Areas for Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span>あなたの強み</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.strengths.length > 0 ? (
              <div className="space-y-3">
                {insights.strengths.map((category) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="font-medium">{getCategoryDisplayName(category)}</span>
                    <Badge variant="default">得意分野</Badge>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground mt-3">
                  これらの分野では安定して高い成績を維持しています
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                もう少し学習を続けると強みが見えてきます
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <span>改善ポイント</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.improvementAreas.length > 0 ? (
              <div className="space-y-3">
                {insights.improvementAreas.map((category) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="font-medium">{getCategoryDisplayName(category)}</span>
                    <Badge variant="secondary">要強化</Badge>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground mt-3">
                  これらの分野を重点的に学習することで全体的な成績向上が期待できます
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                バランス良く学習できています
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Learning Progress */}
      <Card>
        <CardHeader>
          <CardTitle>学習進捗サマリー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>現在のレベル</span>
                <span>{user.progress.currentLevel}</span>
              </div>
              <Progress value={((user.progress.totalXP % 1000) / 1000) * 100} />
              <div className="text-xs text-muted-foreground mt-1">
                次のレベルまで {1000 - (user.progress.totalXP % 1000)} XP
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>総回答数</span>
                <span>{user.progress.totalAnswers}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>正答数</span>
                <span>{user.progress.correctAnswers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>継続日数</span>
                <span>{user.progress.streak} 日</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}