'use client'

import { useRef } from 'react'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Radar } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { IndustryAnalysisData } from '@/lib/industry-xp-analytics'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

interface IndustryRadarChartProps {
  industryData: IndustryAnalysisData
  selectedLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
  showComparison?: boolean
}

export default function IndustryRadarChart({
  industryData,
  selectedLevel,
  showComparison = true
}: IndustryRadarChartProps) {
  const chartRef = useRef<ChartJS<'radar'> | null>(null)

  // レーダーチャート表示対象のサブカテゴリー（最大10個）
  const radarItems = industryData.subcategoryStats
    .filter(stat => stat.displayInRadar)
    .slice(0, 10)

  if (radarItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>スキルレーダーチャート</span>
            <Badge variant="outline">{selectedLevel.toUpperCase()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-lg mb-2">📊</div>
            <p>レーダーチャート用のデータがありません</p>
            <p className="text-sm">学習を進めるとスキル分析が表示されます</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // レベル別の色設定
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'basic':
        return {
          background: 'rgba(34, 197, 94, 0.1)',
          border: 'rgb(34, 197, 94)',
          point: 'rgb(34, 197, 94)'
        }
      case 'intermediate':
        return {
          background: 'rgba(59, 130, 246, 0.1)',
          border: 'rgb(59, 130, 246)',
          point: 'rgb(59, 130, 246)'
        }
      case 'advanced':
        return {
          background: 'rgba(251, 146, 60, 0.1)',
          border: 'rgb(251, 146, 60)',
          point: 'rgb(251, 146, 60)'
        }
      case 'expert':
        return {
          background: 'rgba(168, 85, 247, 0.1)',
          border: 'rgb(168, 85, 247)',
          point: 'rgb(168, 85, 247)'
        }
      default:
        return {
          background: 'rgba(107, 114, 128, 0.1)',
          border: 'rgb(107, 114, 128)',
          point: 'rgb(107, 114, 128)'
        }
    }
  }

  const currentLevelColors = getLevelColor(selectedLevel)
  const targetLevelColors = {
    background: 'rgba(239, 68, 68, 0.1)',
    border: 'rgb(239, 68, 68)',
    point: 'rgb(239, 68, 68)'
  }

  // チャートデータの準備
  const chartData = {
    labels: radarItems.map(item => {
      // ラベルが長い場合は短縮
      const name = item.subcategoryName
      return name.length > 8 ? name.substring(0, 8) + '...' : name
    }),
    datasets: [
      {
        label: `現在のXP (${selectedLevel})`,
        data: radarItems.map(item => item.currentXP),
        backgroundColor: currentLevelColors.background,
        borderColor: currentLevelColors.border,
        borderWidth: 2,
        pointBackgroundColor: currentLevelColors.point,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
      ...(showComparison ? [{
        label: `目標XP (${selectedLevel})`,
        data: radarItems.map(item => item.targetXP),
        backgroundColor: targetLevelColors.background,
        borderColor: targetLevelColors.border,
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: targetLevelColors.point,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }] : [])
    ]
  }

  // チャートオプション
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 12
          },
          color: 'rgb(75, 85, 99)'
        },
        ticks: {
          display: true,
          stepSize: 50, // 50XP刻みで表示
          font: {
            size: 10
          },
          color: 'rgb(107, 114, 128)',
          backdropColor: 'rgba(255, 255, 255, 0.8)',
          backdropPadding: 2
        },
        suggestedMax: Math.max(
          ...radarItems.map(item => Math.max(item.currentXP, item.targetXP)),
          200 // 最小スケール
        )
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: {
            dataset: { label?: string }
            parsed: { r: number }
            dataIndex: number
          }) {
            const label = context.dataset.label || ''
            const value = context.parsed.r
            const item = radarItems[context.dataIndex]
            const percentage = item.targetXP > 0 
              ? Math.round((item.currentXP / item.targetXP) * 100) 
              : 0
            
            return [
              `${label}: ${value} XP`,
              `進捗: ${percentage}%`,
              `重要度: ${item.importance_weight}`
            ]
          }
        }
      }
    },
    interaction: {
      intersect: false
    }
  }

  // 統計情報
  const totalCurrentXP = radarItems.reduce((sum, item) => sum + item.currentXP, 0)
  const totalTargetXP = radarItems.reduce((sum, item) => sum + item.targetXP, 0)
  const overallProgress = totalTargetXP > 0 ? Math.round((totalCurrentXP / totalTargetXP) * 100) : 0
  const achievedCount = radarItems.filter(item => item.progressPercentage >= 100).length
  const maxXPItem = radarItems.reduce((max, item) => 
    item.currentXP > max.currentXP ? item : max, radarItems[0]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{industryData.industryName} スキル分析</span>
          <Badge variant="outline" className={`
            ${selectedLevel === 'basic' ? 'bg-green-50 text-green-700 border-green-200' : ''}
            ${selectedLevel === 'intermediate' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
            ${selectedLevel === 'advanced' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
            ${selectedLevel === 'expert' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
          `}>
            {selectedLevel.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* レーダーチャート */}
        <div style={{ height: '400px' }}>
          <Radar 
            ref={chartRef}
            data={chartData} 
            options={options} 
          />
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{overallProgress}%</div>
            <div className="text-sm text-gray-600">全体進捗</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{achievedCount}</div>
            <div className="text-sm text-green-600">達成項目</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{totalCurrentXP}</div>
            <div className="text-sm text-blue-600">現在XP</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">{radarItems.length}</div>
            <div className="text-sm text-orange-600">分析項目</div>
          </div>
        </div>

        {/* 最高XPスキル */}
        {maxXPItem && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">🏆 最高スキル分野</h4>
            <div className="flex items-center justify-between">
              <span className="font-medium">{maxXPItem.subcategoryName}</span>
              <div className="text-right">
                <div className="font-bold text-lg">{maxXPItem.currentXP} XP</div>
                <div className="text-sm text-gray-600">
                  {maxXPItem.progressPercentage}% 達成
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 注意事項・説明 */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded">
            📊 <strong>レーダーチャートの見方</strong><br/>
            • 数値はXP（経験値）を表示（50XP刻み）<br/>
            • 実線：現在のXP、点線：目標XP<br/>
            • 外側に近いほど高いスキルレベル
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            ※ 重要度の高い上位{radarItems.length}項目を表示。
            全{industryData.subcategoryStats.length}項目の詳細は「詳細進捗」タブでご確認ください。
          </div>
        </div>
      </CardContent>
    </Card>
  )
}