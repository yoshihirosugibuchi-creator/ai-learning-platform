'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Type definitions for API responses
interface OverviewMetrics {
  totalXP: number
  studyStreak: number
  averageAccuracy: number
  totalStudyTime: number
  courseCompletions: number
  quizSessionsCompleted: number
}

interface CategoryBreakdownItem {
  categoryId: string
  categoryName: string
  totalXP: number
  accuracyRate: number
  masteryLevel: number
  skillLevel: string
  currentLevel: string
  questionsAnswered: number
  questionsCorrect: number
  sessionsLast14Days?: number
  improvementTrend?: number
  needsAttention?: boolean
  trendDirection?: string
}

interface Recommendation {
  type: string
  title: string
  description: string
  priority: number
  estimatedTime: number
  categoryId?: string
  reason?: string
  confidence?: number
}

interface LearningPatterns {
  optimalStudyTime: string
  optimalAccuracy?: number
  weeklyConsistency: number
  averageSessionDuration: number
  studyStreakQuality: string
  hourlyPerformance?: Array<{
    hour: number
    averageAccuracy: number
    sessionCount: number
    performance: number
  }>
  dailyConsistency?: Array<{
    dayOfWeek: number
    sessionCount: number
    averageAccuracy: number
    dayName: string
  }>
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

interface RealTimeUpdateResponse {
  message: string
  success: boolean
  updated: boolean
  analytics?: {
    totalXP: number
    sessionCount: number
  }
}

interface TestResults {
  Overview?: {
    metrics: OverviewMetrics
    period: string
    lastUpdated: string
  }
  Detailed?: {
    categoryBreakdown: CategoryBreakdownItem[]
    learningPatterns: LearningPatterns
    recommendations: Recommendation[]
  }
  Recommendations?: {
    immediate: Recommendation[]
    shortTerm: {
      goals: string[]
      timeframe: string
    }
  }
  Industry?: IndustryData
  RealTime?: RealTimeUpdateResponse
}

export default function TestAnalyticsPage() {
  const [userId, setUserId] = useState('2a4849d1-7d6f-401b-bc75-4e9418e75c07')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResults>({})
  const [error, setError] = useState<string | null>(null)

  const testAPI = async (endpoint: string, label: string) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log(`Testing ${endpoint}...`)
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (response.ok) {
        setResults((prev) => ({ ...prev, [label]: data } as TestResults))
        console.log(`✅ ${label}:`, data)
      } else {
        throw new Error(data.error || `HTTP ${response.status}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(`${label}: ${errorMsg}`)
      console.error(`❌ ${label}:`, err)
    } finally {
      setLoading(false)
    }
  }

  const testAllAPIs = async () => {
    if (!userId) return
    
    setResults({})
    setError(null)
    
    const tests = [
      {
        endpoint: `/api/learning-analytics/overview?userId=${userId}&period=30d`,
        label: 'Overview'
      },
      {
        endpoint: `/api/learning-analytics/detailed?userId=${userId}`,
        label: 'Detailed'
      },
      {
        endpoint: `/api/recommendations/learning-path?userId=${userId}`,
        label: 'Recommendations'
      },
      {
        endpoint: `/api/learning-analytics/industry-comparison?userId=${userId}&targetRole=frontend_developer`,
        label: 'Industry'
      }
    ]
    
    for (const test of tests) {
      await testAPI(test.endpoint, test.label)
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒間隔
    }
  }

  const testRealTimeUpdate = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/learning-analytics/real-time-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId: `test_${Date.now()}`,
          eventType: 'quiz_completion',
          data: {
            accuracy: 75,
            duration: 15,
            categoryId: 'test_category',
            subcategoryId: 'test_subcategory',
            difficulty: 'intermediate',
            totalQuestions: 10,
            correctAnswers: 7
          }
        })
      })
      
      const data = await response.json()
      if (response.ok) {
        setResults(prev => ({ ...prev, 'RealTime': data } as TestResults))
        console.log('✅ Real-time update:', data)
      } else {
        throw new Error(data.error || `HTTP ${response.status}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Real-time update: ${errorMsg}`)
      console.error('❌ Real-time update:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">学習分析システム テスト</h1>
        <p className="text-muted-foreground">実装した学習分析APIの動作確認</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>テスト設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">テストユーザーID:</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ユーザーIDを入力"
              className="mt-1"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={testAllAPIs} disabled={loading || !userId}>
              📊 全APIテスト
            </Button>
            <Button onClick={testRealTimeUpdate} disabled={loading || !userId} variant="outline">
              ⚡ リアルタイム更新テスト
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {Object.keys(results).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(results).map(([label, data]) => (
            <Card key={label}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {label === 'Overview' && '📈 概要分析'}
                  {label === 'Detailed' && '🔍 詳細分析'}
                  {label === 'Recommendations' && '🤖 レコメンデーション'}
                  {label === 'RealTime' && '⚡ リアルタイム更新'}
                  {label === 'Industry' && '🏢 業界比較'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(data, null, 2)}
                </pre>
                
                {label === 'Overview' && 'metrics' in data && data.metrics && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>総XP: {data.metrics.totalXP}</div>
                    <div>ストリーク: {data.metrics.studyStreak}日</div>
                    <div>正答率: {Math.round(data.metrics.averageAccuracy)}%</div>
                    <div>セッション: {data.metrics.quizSessionsCompleted}</div>
                  </div>
                )}
                
                {label === 'Detailed' && 'categoryBreakdown' in data && data.categoryBreakdown && (
                  <div className="mt-3 text-sm">
                    <div>カテゴリー数: {data.categoryBreakdown.length}</div>
                    <div>推奨事項: {data.recommendations?.length || 0}件</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>テスト用ユーザーデータ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>ユーザー1:</strong> 2a4849d1-7d6f-401b-bc75-4e9418e75c07 (2565XP, 132セッション)</div>
            <div><strong>ユーザー2:</strong> 82413077-a06d-4d9c-82bb-6fdb6a6b8e13 (455XP, 14セッション)</div>
            <div><strong>ユーザー3:</strong> a3a66d73-05ad-4b5e-a5b5-8ba36ebc4a59 (1670XP, 121セッション)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}