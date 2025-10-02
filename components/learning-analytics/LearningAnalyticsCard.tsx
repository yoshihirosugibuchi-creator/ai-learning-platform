'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, TrendingUp, Brain, Clock } from 'lucide-react'

export interface LearningStage {
  stage: 'analyzing' | 'patterns_emerging' | 'ai_coach_active'
  daysActive: number
  sessionCount: number
  dataQuality: 'insufficient' | 'basic' | 'good' | 'excellent'
}

export interface AnalyticsData {
  timePatterns?: {
    optimalHours: number[]
    weeklyPerformance?: { day: string; performance: number; accuracy: number }[]
    fatigueThreshold?: number
    bestPerformanceTime?: string
    averageAccuracy?: number
  }
  forgettingCurve?: {
    retentionStrength: number
    optimalReviewDays: number[]
    nextReviewCount: number
  }
  cognitiveLoad?: {
    averageLoad: number
    tolerance: number
    optimalSessionMinutes: number
  }
  flowState?: {
    averageFlow: number
    bestConditions: string
    flowFrequency: number
  }
  learningVelocity?: {
    overall?: number
  }
}

interface LearningAnalyticsCardProps {
  stage: LearningStage
  data?: AnalyticsData
  className?: string
}

export function LearningAnalyticsCard({ stage, data, className }: LearningAnalyticsCardProps) {
  const getStageConfig = () => {
    switch (stage.stage) {
      case 'analyzing':
        return {
          title: '学習DNA解析中...',
          subtitle: `あと${Math.max(0, 7 - stage.daysActive)}日で分析完了`,
          icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
          color: 'blue',
          progress: Math.min(100, (stage.daysActive / 7) * 100)
        }
      case 'patterns_emerging':
        return {
          title: 'パターンが見えてきました！',
          subtitle: '個人最適化を準備中',
          icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
          color: 'orange',
          progress: Math.min(100, (stage.daysActive / 30) * 100)
        }
      case 'ai_coach_active':
        return {
          title: 'AI学習コーチが起動',
          subtitle: '高精度な個人最適化が利用可能',
          icon: <Brain className="h-5 w-5 text-green-500" />,
          color: 'green',
          progress: 100
        }
    }
  }

  const config = getStageConfig()

  const formatTime = (hours: number[]) => {
    if (!hours.length) return '分析中'
    return hours.map(h => `${h}:00`).join(', ')
  }

  const getDataQualityBadge = () => {
    const badges = {
      insufficient: { label: 'データ不足', variant: 'destructive' as const },
      basic: { label: '基本分析', variant: 'secondary' as const },
      good: { label: '良質分析', variant: 'default' as const },
      excellent: { label: '高精度分析', variant: 'default' as const }
    }
    return badges[stage.dataQuality]
  }

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className="text-lg">{config.title}</CardTitle>
          </div>
          <Badge variant={getDataQualityBadge().variant}>
            {getDataQualityBadge().label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        
        {stage.stage !== 'ai_coach_active' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>進捗状況</span>
              <span>{Math.round(config.progress)}%</span>
            </div>
            <Progress value={config.progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 学習統計 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">学習日数</p>
            <p className="font-medium">{stage.daysActive}日</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">セッション数</p>
            <p className="font-medium">{stage.sessionCount}回</p>
          </div>
        </div>

        {/* 段階別コンテンツ */}
        {stage.stage === 'analyzing' && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Clock className="h-4 w-4" />
              <span className="font-medium text-sm">分析中の項目</span>
            </div>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 ml-6">
              <li>• 最適学習時間帯の特定</li>
              <li>• 集中力パターンの分析</li>
              <li>• 学習習慣の基礎データ収集</li>
            </ul>
          </div>
        )}

        {stage.stage === 'patterns_emerging' && data && (
          <div className="space-y-3">
            {data.timePatterns && (
              <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-orange-700 dark:text-orange-300 mb-2">
                  🕐 時間パターン発見
                </h4>
                <div className="text-xs space-y-1">
                  <p>最適時間帯: {formatTime(data.timePatterns.optimalHours)}</p>
                  <p>平均正答率: {data.timePatterns.averageAccuracy?.toFixed(1) || '--'}%</p>
                </div>
              </div>
            )}
            
            {data.cognitiveLoad && (
              <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-orange-700 dark:text-orange-300 mb-2">
                  🧠 認知負荷分析
                </h4>
                <div className="text-xs">
                  <p>最適セッション時間: {data.cognitiveLoad.optimalSessionMinutes}分</p>
                </div>
              </div>
            )}
          </div>
        )}

        {stage.stage === 'ai_coach_active' && data && (
          <div className="space-y-3">
            {data.forgettingCurve && (
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-green-700 dark:text-green-300 mb-2">
                  📚 復習スケジュール最適化
                </h4>
                <div className="text-xs space-y-1">
                  <p>記憶保持強度: {(data.forgettingCurve.retentionStrength * 100).toFixed(0)}%</p>
                  <p>次回復習予定: {data.forgettingCurve.nextReviewCount}件</p>
                </div>
              </div>
            )}
            
            {data.flowState && (
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-green-700 dark:text-green-300 mb-2">
                  ⚡ フロー状態分析
                </h4>
                <div className="text-xs space-y-1">
                  <p>平均フロー度: {(data.flowState.averageFlow * 100).toFixed(0)}%</p>
                  <p>最適条件: {data.flowState.bestConditions}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 段階進化の案内 */}
        {stage.stage === 'analyzing' && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            💡 継続学習により、より精密な分析と個人最適化が可能になります
          </div>
        )}
        
        {stage.stage === 'patterns_emerging' && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            🚀 もう少し学習を続けると、AI学習コーチが起動します
          </div>
        )}
      </CardContent>
    </Card>
  )
}