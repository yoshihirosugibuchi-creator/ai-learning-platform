'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Zap, 
  Coffee, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react'

export interface CognitiveLoadState {
  currentLoad: number
  tolerance: number
  timeElapsed: number
  trend: 'increasing' | 'decreasing' | 'stable'
  recommendedAction: 'continue' | 'take_break' | 'switch_content'
}

export interface FlowState {
  currentFlow: number
  status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW' | 'POOR'
  recommendedAction: string
  adjustmentSuggestion: string
  continueRecommendation: boolean
}

export interface FlowStateGuidance {
  currentFlow: number
  status: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'LOW' | 'POOR'
  recommendedAction: string
  adjustmentSuggestion: string
  continueRecommendation: boolean
}

export interface SessionMetrics {
  accuracy: number
  averageResponseTime: number
  questionsCompleted: number
  timeElapsed: number
}

interface RealTimeLearningGuidanceProps {
  cognitiveLoad: CognitiveLoadState
  flowState: FlowState
  sessionMetrics: SessionMetrics
  onBreakSuggested?: () => void
  onContinueSession?: () => void
  onAdjustDifficulty?: (direction: 'easier' | 'harder') => void
  className?: string
}

export function RealTimeLearningGuidance({
  cognitiveLoad,
  flowState,
  sessionMetrics,
  onBreakSuggested,
  onContinueSession,
  onAdjustDifficulty,
  className
}: RealTimeLearningGuidanceProps) {
  const [showDetailed, setShowDetailed] = useState(false)

  // 総合的な学習状態評価
  const getOverallStatus = () => {
    if (cognitiveLoad.currentLoad > cognitiveLoad.tolerance * 0.9) {
      return { status: 'warning', message: '認知負荷が高くなっています', color: 'text-yellow-600' }
    }
    if (flowState.status === 'POOR' || flowState.status === 'LOW') {
      return { status: 'attention', message: 'フロー状態が低下しています', color: 'text-orange-600' }
    }
    if (flowState.status === 'EXCELLENT' && cognitiveLoad.currentLoad < cognitiveLoad.tolerance * 0.7) {
      return { status: 'excellent', message: '最適な学習状態です', color: 'text-green-600' }
    }
    return { status: 'good', message: '良好な学習状態です', color: 'text-blue-600' }
  }

  const overallStatus = getOverallStatus()

  // 認知負荷インジケーター
  const getCognitiveLoadColor = () => {
    const ratio = cognitiveLoad.currentLoad / cognitiveLoad.tolerance
    if (ratio > 0.9) return 'bg-red-500'
    if (ratio > 0.7) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // フロー状態インジケーター
  const getFlowStateColor = () => {
    switch (flowState.status) {
      case 'EXCELLENT': return 'text-green-500'
      case 'GOOD': return 'text-blue-500'
      case 'MODERATE': return 'text-yellow-500'
      case 'LOW': return 'text-orange-500'
      case 'POOR': return 'text-red-500'
    }
  }

  // トレンドアイコン
  const getTrendIcon = () => {
    switch (cognitiveLoad.trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-green-500" />
      case 'stable': return <Minus className="h-4 w-4 text-blue-500" />
    }
  }

  // 推奨アクション
  const getRecommendedAction = () => {
    if (cognitiveLoad.recommendedAction === 'take_break') {
      return {
        type: 'break',
        title: '休憩を推奨',
        description: '認知負荷が高くなっています。5-10分の休憩をおすすめします。',
        action: onBreakSuggested
      }
    }
    
    if (cognitiveLoad.recommendedAction === 'switch_content') {
      return {
        type: 'adjust',
        title: '難易度調整を推奨',
        description: flowState.adjustmentSuggestion,
        action: () => {
          if (flowState.adjustmentSuggestion.includes('易しい')) {
            onAdjustDifficulty?.('easier')
          } else if (flowState.adjustmentSuggestion.includes('難しい')) {
            onAdjustDifficulty?.('harder')
          }
        }
      }
    }

    return {
      type: 'continue',
      title: '学習継続',
      description: '良好な状態です。このまま学習を続けてください。',
      action: onContinueSession
    }
  }

  const recommendedAction = getRecommendedAction()

  return (
    <Card className={`${className} transition-all duration-300`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            リアルタイム学習ガイダンス
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailed(!showDetailed)}
          >
            {showDetailed ? '簡易表示' : '詳細表示'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 総合ステータス */}
        <Alert>
          <div className="flex items-center gap-2">
            {overallStatus.status === 'excellent' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : overallStatus.status === 'warning' ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : (
              <Target className="h-4 w-4 text-blue-500" />
            )}
            <AlertDescription className={overallStatus.color}>
              {overallStatus.message}
            </AlertDescription>
          </div>
        </Alert>

        {/* メトリクス表示 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 認知負荷 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                認知負荷
                {getTrendIcon()}
              </span>
              <span className="font-medium">
                {cognitiveLoad.currentLoad.toFixed(1)}/{cognitiveLoad.tolerance.toFixed(1)}
              </span>
            </div>
            <Progress 
              value={(cognitiveLoad.currentLoad / cognitiveLoad.tolerance) * 100} 
              className={`h-2 ${getCognitiveLoadColor()}`}
            />
          </div>

          {/* フロー状態 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                フロー状態
              </span>
              <span className={`font-medium ${getFlowStateColor()}`}>
                {(flowState.currentFlow * 100).toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={flowState.currentFlow * 100} 
              className="h-2"
            />
          </div>
        </div>

        {/* セッション統計 */}
        {showDetailed && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">正答率</p>
              <p className="font-medium text-lg">{sessionMetrics.accuracy.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">問題数</p>
              <p className="font-medium text-lg">{sessionMetrics.questionsCompleted}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">経過時間</p>
              <p className="font-medium text-lg">{Math.round(sessionMetrics.timeElapsed / 60)}分</p>
            </div>
          </div>
        )}

        {/* 推奨アクション */}
        <div className="bg-muted/50 p-3 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            {recommendedAction.type === 'break' ? (
              <Coffee className="h-4 w-4 text-orange-500" />
            ) : recommendedAction.type === 'adjust' ? (
              <Target className="h-4 w-4 text-blue-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <h4 className="font-medium text-sm">{recommendedAction.title}</h4>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {recommendedAction.description}
          </p>

          {recommendedAction.action && (
            <Button 
              size="sm" 
              variant={recommendedAction.type === 'break' ? 'destructive' : 'default'}
              onClick={recommendedAction.action}
              className="w-full"
            >
              {recommendedAction.type === 'break' && <Coffee className="h-4 w-4 mr-2" />}
              {recommendedAction.type === 'adjust' && <Target className="h-4 w-4 mr-2" />}
              {recommendedAction.type === 'continue' && <CheckCircle className="h-4 w-4 mr-2" />}
              
              {recommendedAction.type === 'break' ? '休憩する' :
               recommendedAction.type === 'adjust' ? '難易度調整' : '学習継続'}
            </Button>
          )}
        </div>

        {/* 詳細情報 */}
        {showDetailed && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>平均回答時間: {(sessionMetrics.averageResponseTime / 1000).toFixed(1)}秒</span>
            </div>
            <div>
              <span>フロー状態詳細: {flowState.adjustmentSuggestion}</span>
            </div>
            <div>
              <span>認知負荷傾向: {
                cognitiveLoad.trend === 'increasing' ? '上昇中' :
                cognitiveLoad.trend === 'decreasing' ? '低下中' : '安定'
              }</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}