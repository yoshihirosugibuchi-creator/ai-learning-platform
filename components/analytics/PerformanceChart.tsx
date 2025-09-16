'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  RadialLinearScale,
} from 'chart.js'
import { Line, Doughnut, Bar, Radar } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuizResult } from '@/lib/storage'
import { getCategoryDisplayName, mapToMainCategoryId } from '@/lib/category-mapping'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  RadialLinearScale
)

interface PerformanceChartProps {
  quizResults: QuizResult[]
}

export default function PerformanceChart({ quizResults }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    if (quizResults.length === 0) return null

    // Sort by timestamp
    const sortedResults = [...quizResults].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Performance over time data
    const performanceData = {
      labels: sortedResults.map(result => 
        new Date(result.timestamp).toLocaleDateString('ja-JP', { 
          month: 'short', 
          day: 'numeric' 
        })
      ),
      datasets: [
        {
          label: '正答率 (%)',
          data: sortedResults.map(result => 
            Math.round((result.correctAnswers / result.totalQuestions) * 100)
          ),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    }

    // Category performance data for radar chart - 正しい10カテゴリー
    const mainCategories = [
      'communication_presentation',
      'logical_thinking_problem_solving',
      'strategy_management', 
      'finance',
      'marketing_sales',
      'leadership_hr',
      'ai_digital_utilization',
      'project_operations',
      'business_process_analysis',
      'risk_crisis_management'
    ]

    // Map all category data to main categories
    const categoryStats = quizResults.reduce((acc, result) => {
      Object.entries(result.categoryScores).forEach(([category, scores]) => {
        // Map the category to the correct main category ID
        const mainCategoryId = mapToMainCategoryId(category)
        
        if (!acc[mainCategoryId]) {
          acc[mainCategoryId] = { correct: 0, total: 0 }
        }
        acc[mainCategoryId].correct += scores.correct
        acc[mainCategoryId].total += scores.total
      })
      return acc
    }, {} as Record<string, { correct: number; total: number }>)

    // Create radar chart data with 10 categories
    const radarData = mainCategories.map(categoryId => {
      const stat = categoryStats[categoryId]
      if (!stat || stat.total === 0) return 0
      return Math.round((stat.correct / stat.total) * 100)
    })

    const categoryData = {
      labels: mainCategories.map(id => getCategoryDisplayName(id)),
      datasets: [
        {
          label: '正答率 (%)',
          data: radarData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)',
        },
      ],
    }

    // Difficulty distribution
    const difficultyStats = quizResults.reduce((acc, result) => {
      const accuracy = (result.correctAnswers / result.totalQuestions) * 100
      if (accuracy >= 80) acc.excellent++
      else if (accuracy >= 60) acc.good++
      else if (accuracy >= 40) acc.average++
      else acc.needsImprovement++
      return acc
    }, { excellent: 0, good: 0, average: 0, needsImprovement: 0 })

    const difficultyData = {
      labels: ['優秀 (80%+)', '良好 (60-79%)', '平均 (40-59%)', '要改善 (<40%)'],
      datasets: [
        {
          data: [
            difficultyStats.excellent,
            difficultyStats.good,
            difficultyStats.average,
            difficultyStats.needsImprovement,
          ],
          backgroundColor: [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#ef4444',
          ],
          borderWidth: 0,
        },
      ],
    }

    return {
      performance: performanceData,
      category: categoryData,
      difficulty: difficultyData,
    }
  }, [quizResults])

  if (!chartData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <p>クイズ結果がまだありません</p>
              <p className="text-sm mt-1">クイズに挑戦してデータを蓄積しましょう</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Over Time */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>学習パフォーマンスの推移</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Line
              data={chartData.performance}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: function(value) {
                        return value + '%'
                      }
                    }
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Performance - Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>カテゴリ別スキルレーダー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Radar
              data={chartData.category}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      stepSize: 20,
                      callback: function(value) {
                        return value + '%'
                      }
                    },
                    grid: {
                      color: 'rgba(0, 0, 0, 0.1)',
                    },
                    angleLines: {
                      color: 'rgba(0, 0, 0, 0.1)',
                    },
                    pointLabels: {
                      font: {
                        size: 12,
                      },
                    },
                  },
                },
                elements: {
                  point: {
                    radius: 4,
                    hoverRadius: 6,
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>成績分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Doughnut
              data={chartData.difficulty}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}