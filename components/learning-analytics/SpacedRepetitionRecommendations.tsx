'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  Clock, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Brain,
  Target,
  ChevronRight
} from 'lucide-react'

export interface ReviewItem {
  contentId: string
  contentType: 'quiz_question' | 'course_material' | 'concept' | 'skill'
  categoryId: string
  categoryName: string
  subcategoryName: string
  title?: string
  daysSinceLearning: number
  predictedRetention: number
  urgencyScore: number
  recommendedAction: 'URGENT_REVIEW' | 'REVIEW_SOON' | 'SCHEDULE_REVIEW' | 'CONSIDER_REVIEW' | 'WELL_RETAINED'
  masteryLevel: number
  reviewCount: number
  nextOptimalDate?: Date
}

export interface ForgettingCurveInsights {
  personalRetentionRate: number
  averageForgettingRate: number
  strongCategories: string[]
  weakCategories: string[]
  totalItemsToReview: number
  optimalReviewFrequency: number
}

interface SpacedRepetitionRecommendationsProps {
  reviewItems: ReviewItem[]
  insights: ForgettingCurveInsights
  onStartReview?: (item: ReviewItem) => void
  onScheduleReview?: (item: ReviewItem, date: Date) => void
  onMarkAsReviewed?: (item: ReviewItem, performance: number) => void
  className?: string
}

export function SpacedRepetitionRecommendations({
  reviewItems,
  insights,
  onStartReview,
  onScheduleReview,
  onMarkAsReviewed: _onMarkAsReviewed,
  className
}: SpacedRepetitionRecommendationsProps) {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'due' | 'scheduled'>('urgent')
  const [showInsights, setShowInsights] = useState(true)

  // フィルタリング
  const filteredItems = reviewItems.filter(item => {
    switch (filter) {
      case 'urgent':
        return item.recommendedAction === 'URGENT_REVIEW'
      case 'due':
        return ['URGENT_REVIEW', 'REVIEW_SOON'].includes(item.recommendedAction)
      case 'scheduled':
        return ['SCHEDULE_REVIEW', 'CONSIDER_REVIEW'].includes(item.recommendedAction)
      default:
        return true
    }
  }).sort((a, b) => b.urgencyScore - a.urgencyScore)

  // 緊急度別の色とアイコン
  const getUrgencyConfig = (action: ReviewItem['recommendedAction']) => {
    switch (action) {
      case 'URGENT_REVIEW':
        return {
          color: 'destructive',
          icon: <AlertTriangle className="h-4 w-4" />,
          label: '緊急',
          bgColor: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        }
      case 'REVIEW_SOON':
        return {
          color: 'secondary',
          icon: <Clock className="h-4 w-4" />,
          label: '近日',
          bgColor: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
        }
      case 'SCHEDULE_REVIEW':
        return {
          color: 'outline',
          icon: <Calendar className="h-4 w-4" />,
          label: '予定',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
        }
      case 'CONSIDER_REVIEW':
        return {
          color: 'outline',
          icon: <Brain className="h-4 w-4" />,
          label: '検討',
          bgColor: 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
        }
      case 'WELL_RETAINED':
        return {
          color: 'outline',
          icon: <CheckCircle className="h-4 w-4" />,
          label: '良好',
          bgColor: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
        }
    }
  }

  // 記憶保持率の色
  const getRetentionColor = (retention: number) => {
    if (retention < 30) return 'text-red-600'
    if (retention < 50) return 'text-orange-600'
    if (retention < 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* インサイトカード */}
      {showInsights && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                忘却曲線分析
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInsights(false)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">個人記憶保持率</p>
                <p className="font-bold text-lg text-blue-600">
                  {insights.personalRetentionRate.toFixed(0)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">復習待ち項目</p>
                <p className="font-bold text-lg text-orange-600">
                  {insights.totalItemsToReview}件
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">推奨復習頻度</p>
                <p className="font-bold text-lg text-green-600">
                  {insights.optimalReviewFrequency}日
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">得意分野</p>
                <p className="font-bold text-lg text-purple-600">
                  {insights.strongCategories.length}分野
                </p>
              </div>
            </div>

            {insights.weakCategories.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-orange-700 dark:text-orange-300 mb-2">
                  💡 重点復習推奨分野
                </h4>
                <div className="flex flex-wrap gap-2">
                  {insights.weakCategories.slice(0, 3).map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* フィルターとリスト */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-500" />
              復習推奨リスト
            </CardTitle>
          </div>
          
          {/* フィルターボタン */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'urgent', label: '緊急', count: reviewItems.filter(i => i.recommendedAction === 'URGENT_REVIEW').length },
              { key: 'due', label: '復習待ち', count: reviewItems.filter(i => ['URGENT_REVIEW', 'REVIEW_SOON'].includes(i.recommendedAction)).length },
              { key: 'scheduled', label: '予定済み', count: reviewItems.filter(i => ['SCHEDULE_REVIEW', 'CONSIDER_REVIEW'].includes(i.recommendedAction)).length },
              { key: 'all', label: '全て', count: reviewItems.length }
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(key as 'all' | 'urgent' | 'due' | 'scheduled')}
                className="text-xs"
              >
                {label} ({count})
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>復習が必要な項目はありません</p>
              <p className="text-xs">素晴らしい学習習慣です！</p>
            </div>
          ) : (
            filteredItems.slice(0, 10).map((item, _index) => {
              const config = getUrgencyConfig(item.recommendedAction)
              
              return (
                <Card key={item.contentId} className={`${config.bgColor} border transition-all hover:shadow-md`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={config.color as "default" | "destructive" | "outline" | "secondary"} className="text-xs">
                              {config.icon}
                              <span className="ml-1">{config.label}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.daysSinceLearning}日前
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-sm truncate">
                            {item.title || `${item.categoryName} - ${item.subcategoryName}`}
                          </h4>
                          
                          <p className="text-xs text-muted-foreground">
                            {item.contentType === 'quiz_question' ? 'クイズ問題' :
                             item.contentType === 'course_material' ? 'コース教材' :
                             item.contentType === 'concept' ? '概念' : 'スキル'}
                          </p>
                        </div>
                        
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className={`text-sm font-medium ${getRetentionColor(item.predictedRetention)}`}>
                            {item.predictedRetention.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">記憶保持率</p>
                        </div>
                      </div>

                      {/* 進捗バー */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>習得度</span>
                          <span>{(item.masteryLevel * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={item.masteryLevel * 100} className="h-1.5" />
                      </div>

                      {/* アクションボタン */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          復習回数: {item.reviewCount}回
                        </div>
                        
                        <div className="flex gap-2">
                          {(item.recommendedAction === 'URGENT_REVIEW' || item.recommendedAction === 'REVIEW_SOON') && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => onStartReview?.(item)}
                              className="text-xs"
                            >
                              <Target className="h-3 w-3 mr-1" />
                              復習開始
                            </Button>
                          )}
                          
                          {item.nextOptimalDate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onScheduleReview?.(item, item.nextOptimalDate!)}
                              className="text-xs"
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              予定
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}

          {filteredItems.length > 10 && (
            <div className="text-center pt-4">
              <Button variant="outline" size="sm">
                さらに表示 <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}