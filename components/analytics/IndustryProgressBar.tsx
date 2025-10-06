'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import type { IndustryAnalysisData } from '@/lib/industry-xp-analytics'

interface IndustryProgressBarProps {
  industryData: IndustryAnalysisData
  selectedLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
  onSubcategoryClick?: (subcategoryId: string) => void
}

export default function IndustryProgressBar({
  industryData,
  selectedLevel,
  onSubcategoryClick
}: IndustryProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [sortBy, setSortBy] = useState<'progress' | 'xp' | 'importance' | 'name'>('progress')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // ソート関数
  const sortStats = (stats: typeof industryData.subcategoryStats) => {
    return [...stats].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'progress':
          comparison = a.progressPercentage - b.progressPercentage
          break
        case 'xp':
          comparison = a.currentXP - b.currentXP
          break
        case 'importance':
          comparison = a.importance_weight - b.importance_weight
          break
        case 'name':
          comparison = a.subcategoryName.localeCompare(b.subcategoryName)
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  const sortedStats = sortStats(industryData.subcategoryStats)

  // 統計情報
  const completedCount = sortedStats.filter(stat => stat.progressPercentage >= 100).length
  const inProgressCount = sortedStats.filter(stat => stat.progressPercentage > 0 && stat.progressPercentage < 100).length
  const notStartedCount = sortedStats.filter(stat => stat.progressPercentage === 0).length
  const averageProgress = sortedStats.length > 0 
    ? Math.round(sortedStats.reduce((sum, stat) => sum + stat.progressPercentage, 0) / sortedStats.length)
    : 0

  // 進捗状況に応じた色の取得
  const _getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-gray-300'
  }

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-700'
    if (percentage >= 75) return 'text-blue-700'
    if (percentage >= 50) return 'text-yellow-700'
    if (percentage >= 25) return 'text-orange-700'
    return 'text-gray-700'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>進捗詳細</span>
            <Badge variant="outline">{sortedStats.length}項目</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* サマリー統計 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">{completedCount}</div>
            <div className="text-xs text-green-600">完了</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">{inProgressCount}</div>
            <div className="text-xs text-blue-600">進行中</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-700">{notStartedCount}</div>
            <div className="text-xs text-gray-600">未着手</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-700">{averageProgress}%</div>
            <div className="text-xs text-purple-600">平均進捗</div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* ソートボタン */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sortBy === 'progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('progress')}
            >
              進捗順 {sortBy === 'progress' && (sortOrder === 'desc' ? '↓' : '↑')}
            </Button>
            <Button
              variant={sortBy === 'xp' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('xp')}
            >
              XP順 {sortBy === 'xp' && (sortOrder === 'desc' ? '↓' : '↑')}
            </Button>
            <Button
              variant={sortBy === 'importance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('importance')}
            >
              重要度順 {sortBy === 'importance' && (sortOrder === 'desc' ? '↓' : '↑')}
            </Button>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('name')}
            >
              名前順 {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
            </Button>
          </div>

          {/* 進捗リスト */}
          <div className="space-y-3">
            {sortedStats.map((stat) => (
              <div
                key={stat.subcategoryId}
                className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                  onSubcategoryClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onSubcategoryClick?.(stat.subcategoryId)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-sm">{stat.subcategoryName}</h4>
                    {stat.displayInRadar && (
                      <Badge variant="secondary" className="text-xs">
                        📊 レーダー表示
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      重要度 {stat.importance_weight}
                    </Badge>
                    <span className={`text-sm font-semibold ${getProgressTextColor(stat.progressPercentage)}`}>
                      {stat.progressPercentage}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* 進捗バー */}
                  <Progress 
                    value={stat.progressPercentage} 
                    className="h-2"
                  />
                  
                  {/* XP情報 */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center space-x-3">
                      <span>現在: {stat.currentXP} XP</span>
                      <span>目標: {stat.targetXP} XP</span>
                      {stat.targetXP > 0 && (
                        <span>残り: {Math.max(0, stat.targetXP - stat.currentXP)} XP</span>
                      )}
                    </div>
                    {stat.progressPercentage >= 100 && (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        ✅ 達成
                      </Badge>
                    )}
                  </div>

                  {/* 目標レベル表示 */}
                  <div className="flex items-center space-x-2 text-xs">
                    <Target className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-500">
                      {selectedLevel} レベル目標
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sortedStats.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>この業界の進捗データがありません</p>
              <p className="text-sm">学習を開始すると進捗が表示されます</p>
            </div>
          )}

          {/* フッター情報 */}
          {sortedStats.length > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded mt-4">
              <p>💡 ヒント: レーダーチャートには重要度の高い上位10項目が表示されます</p>
              <p>🎯 {selectedLevel}レベルの目標XPは業界の標準スキル要件に基づいて設定されています</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}