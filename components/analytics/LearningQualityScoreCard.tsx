// 学習品質スコア表示コンポーネント
// S/A/B/C/Dランク・5要素詳細・改善提案を表示

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Clock, 
  Target, 
  BarChart3, 
  Lightbulb,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react'
import { 
  analyzeLearningQuality,
  calculateLearningQualityScoreClient,
  type LearningQualityScore,
  QUALITY_SCORE_WEIGHTS
} from '@/lib/learning-quality-calculator'
import { supabase } from '@/lib/supabase'

interface LearningQualityScoreCardProps {
  userId: string
  className?: string
  refreshTrigger?: number
}

export default function LearningQualityScoreCard({ 
  userId, 
  className = "",
  refreshTrigger = 0
}: LearningQualityScoreCardProps) {
  const [qualityScore, setQualityScore] = useState<LearningQualityScore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // 学習品質スコア取得
  const loadQualityScore = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)

      // 過去30日間のデータで品質スコアを計算
      const today = new Date().toISOString().split('T')[0]
      const score = await calculateLearningQualityScoreClient(supabase, userId, today, 30)
      
      setQualityScore(score)
      setLastUpdated(new Date().toLocaleString('ja-JP'))

    } catch (err) {
      console.error('学習品質スコア取得エラー:', err)
      setError('品質スコアの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 初期読み込み・更新トリガー
  useEffect(() => {
    loadQualityScore()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshTrigger])

  // ランクバッジの色とアイコン
  const getRankStyle = (score: number, grade?: string) => {
    // STARTランク（学習データ不足）の特別処理
    if (grade === 'START') {
      return { 
        variant: 'default' as const, 
        className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0',
        icon: '🚀',
        label: 'START'
      }
    }
    
    if (score >= 90) return { 
      variant: 'default' as const, 
      className: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0',
      icon: '🏆',
      label: 'S'
    }
    if (score >= 80) return { 
      variant: 'default' as const, 
      className: 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0',
      icon: '🥇',
      label: 'A'
    }
    if (score >= 70) return { 
      variant: 'default' as const, 
      className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0',
      icon: '🥈',
      label: 'B'
    }
    if (score >= 60) return { 
      variant: 'default' as const, 
      className: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0',
      icon: '🥉',
      label: 'C'
    }
    return { 
      variant: 'default' as const, 
      className: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0',
      icon: '📚',
      label: 'D'
    }
  }

  // 要素別アイコンとラベル
  const getElementInfo = (element: string) => {
    const elements = {
      consistency: { icon: Calendar, label: '継続性', color: 'text-blue-600' },
      accuracy: { icon: Target, label: '正確性', color: 'text-green-600' },
      efficiency: { icon: TrendingUp, label: '効率性', color: 'text-purple-600' },
      diversity: { icon: BarChart3, label: '多様性', color: 'text-orange-600' },
      depth: { icon: Clock, label: '深度', color: 'text-red-600' }
    }
    return elements[element as keyof typeof elements] || { icon: Info, label: element, color: 'text-gray-600' }
  }

  // ローディング状態
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            学習品質総合スコア
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                  <div className="h-2 w-full bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // エラー状態
  if (error || !qualityScore) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            学習品質総合スコア
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">データ取得エラー</h3>
            <p className="text-muted-foreground mb-4">
              {error || '品質スコアデータの取得に失敗しました'}
            </p>
            <Button onClick={loadQualityScore} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const analysis = analyzeLearningQuality(qualityScore, qualityScore._stats)
  const rankStyle = getRankStyle(qualityScore.total_score, analysis.grade)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            学習品質総合スコア
          </div>
          <Button 
            onClick={loadQualityScore} 
            disabled={isLoading}
            variant="ghost" 
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 総合スコア・ランク表示 */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="text-4xl font-bold text-gray-900">
              {qualityScore.total_score}
            </div>
            <Badge className={rankStyle.className}>
              <span className="text-lg mr-1">{rankStyle.icon}</span>
              <span className="text-lg font-bold">{rankStyle.label}</span>
            </Badge>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {analysis.grade}ランク - {analysis.message}
            </h3>
            <div className="text-sm text-muted-foreground">
              分析期間: {qualityScore.analysis_period}日間 | 
              最終更新: {lastUpdated}
            </div>
          </div>
        </div>

        {/* 5要素詳細スコア */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            詳細スコア
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { key: 'consistency', score: qualityScore.consistency_score, weight: QUALITY_SCORE_WEIGHTS.consistency },
              { key: 'accuracy', score: qualityScore.accuracy_score, weight: QUALITY_SCORE_WEIGHTS.accuracy },
              { key: 'efficiency', score: qualityScore.efficiency_score, weight: QUALITY_SCORE_WEIGHTS.efficiency },
              { key: 'diversity', score: qualityScore.diversity_score, weight: QUALITY_SCORE_WEIGHTS.diversity },
              { key: 'depth', score: qualityScore.depth_score, weight: QUALITY_SCORE_WEIGHTS.depth }
            ].map(({ key, score, weight }) => {
              const elementInfo = getElementInfo(key)
              const IconComponent = elementInfo.icon
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`h-4 w-4 ${elementInfo.color}`} />
                      <span className="text-sm font-medium">{elementInfo.label}</span>
                      <span className="text-xs text-muted-foreground">({weight}%)</span>
                    </div>
                    <span className="text-sm font-semibold">{score}/100</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              )
            })}
          </div>
        </div>

        {/* 改善提案 */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              改善提案
            </h4>
            <div className="space-y-2">
              {analysis.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* グレード説明 */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="text-sm font-medium text-gray-900 mb-2">スコア評価基準</h5>
          <div className="grid grid-cols-6 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium">START</div>
              <div className="text-muted-foreground">開始段階</div>
            </div>
            <div className="text-center">
              <div className="font-medium">S (90+)</div>
              <div className="text-muted-foreground">優秀</div>
            </div>
            <div className="text-center">
              <div className="font-medium">A (80+)</div>
              <div className="text-muted-foreground">良好</div>
            </div>
            <div className="text-center">
              <div className="font-medium">B (70+)</div>
              <div className="text-muted-foreground">普通</div>
            </div>
            <div className="text-center">
              <div className="font-medium">C (60+)</div>
              <div className="text-muted-foreground">要改善</div>
            </div>
            <div className="text-center">
              <div className="font-medium">D (60未満)</div>
              <div className="text-muted-foreground">要強化</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}