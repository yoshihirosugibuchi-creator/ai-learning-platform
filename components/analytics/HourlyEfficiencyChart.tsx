// 時間帯別効率グラフコンポーネント
// 24時間の学習効率推移・ピーク時間表示

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  RefreshCw,
  Star,
  Sun,
  Moon,
  Coffee,
  Sunset,
  Info,
  BarChart3
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database-types-official'
import { 
  parseHourlyEfficiencyData,
  analyzeHourlyEfficiency,
  type HourlyEfficiencyData 
} from '@/lib/hourly-efficiency'

interface HourlyEfficiencyChartProps {
  userId: string
  className?: string
  refreshTrigger?: number
}

interface HourlyChartData {
  hour: number
  efficiency: number
  sessionCount: number
  timeSlot: string
  isPeak: boolean
}

export default function HourlyEfficiencyChart({ 
  userId, 
  className = "",
  refreshTrigger = 0
}: HourlyEfficiencyChartProps) {
  const [hourlyData, setHourlyData] = useState<HourlyEfficiencyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7) // 7日間

  // 時間帯別効率データ取得
  const loadHourlyData = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)

      // 直近の指定期間のdaily_xp_recordsから時間帯データを取得
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - selectedPeriod)

      const { data: records, error: fetchError } = await supabase
        .from('daily_xp_records')
        .select('hourly_efficiency_data')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (fetchError) {
        throw new Error(`データ取得エラー: ${fetchError.message}`)
      }

      // 複数日のデータを統合
      const combinedData = combineMultipleDaysData(records || [])
      setHourlyData(combinedData)

    } catch (err) {
      console.error('時間帯別効率データ取得エラー:', err)
      setError(err instanceof Error ? err.message : '時間帯別データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 複数日のデータを統合
  const combineMultipleDaysData = (records: { hourly_efficiency_data?: Json }[]): HourlyEfficiencyData => {
    const combinedStats: Record<string, { 
      quiz_time: number, 
      xp_earned: number, 
      session_count: number 
    }> = {}

    // 全レコードのデータを統合
    records.forEach(record => {
      if (record.hourly_efficiency_data && typeof record.hourly_efficiency_data === 'string') {
        const data = parseHourlyEfficiencyData(record.hourly_efficiency_data)
        
        Object.entries(data.hourly_stats).forEach(([hour, stats]: [string, { quiz_time: number; xp_earned: number; session_count: number }]) => {
          if (!combinedStats[hour]) {
            combinedStats[hour] = { quiz_time: 0, xp_earned: 0, session_count: 0 }
          }
          
          combinedStats[hour].quiz_time += stats.quiz_time
          combinedStats[hour].xp_earned += stats.xp_earned
          combinedStats[hour].session_count += stats.session_count
        })
      }
    })

    // 効率を再計算
    const hourlyStats: Record<string, { quiz_time: number; xp_earned: number; session_count: number; efficiency: number }> = {}
    Object.entries(combinedStats).forEach(([hour, stats]) => {
      hourlyStats[hour] = {
        ...stats,
        efficiency: stats.quiz_time > 0 ? (stats.xp_earned / (stats.quiz_time / 60)) : 0
      }
    })

    // ピーク時間計算
    const peakHours = Object.entries(hourlyStats)
      .filter(([_, stats]) => stats.session_count >= 2)
      .sort(([_, a], [__, b]) => b.efficiency - a.efficiency)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    return {
      timezone: 'Asia/Tokyo',
      hourly_stats: hourlyStats,
      peak_hours: peakHours,
      total_thinking_time: Object.values(combinedStats).reduce((sum, s) => sum + s.quiz_time, 0),
      daily_session_count: Object.values(combinedStats).reduce((sum, s) => sum + s.session_count, 0),
      last_updated_jst: new Date().toISOString()
    }
  }

  // 時間帯ラベル取得
  const getTimeSlotLabel = (hour: number): string => {
    if (hour >= 6 && hour < 12) return '朝'
    if (hour >= 12 && hour < 18) return '午後'
    if (hour >= 18 && hour < 22) return '夜'
    return '深夜'
  }

  // チャート用データの準備
  const chartData = useMemo((): HourlyChartData[] => {
    if (!hourlyData) return []

    const data: HourlyChartData[] = []
    
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = hour.toString().padStart(2, '0')
      const stats = hourlyData.hourly_stats[hourKey]
      
      data.push({
        hour,
        efficiency: stats?.efficiency || 0,
        sessionCount: stats?.session_count || 0,
        timeSlot: getTimeSlotLabel(hour),
        isPeak: hourlyData.peak_hours.includes(hour)
      })
    }
    
    return data
  }, [hourlyData])

  // 時間帯アイコン取得
  const getTimeSlotIcon = (timeSlot: string) => {
    const icons = {
      '朝': Sun,
      '午後': Coffee,
      '夜': Sunset,
      '深夜': Moon
    }
    return icons[timeSlot as keyof typeof icons] || Clock
  }

  // 効率レベルの色取得
  const getEfficiencyColor = (efficiency: number, isPeak: boolean) => {
    if (isPeak) return 'bg-gradient-to-t from-yellow-400 to-yellow-500'
    if (efficiency >= 1.0) return 'bg-gradient-to-t from-green-400 to-green-500'
    if (efficiency >= 0.5) return 'bg-gradient-to-t from-blue-400 to-blue-500'
    if (efficiency > 0) return 'bg-gradient-to-t from-gray-300 to-gray-400'
    return 'bg-gray-100'
  }

  // 期間変更
  const handlePeriodChange = (period: number) => {
    setSelectedPeriod(period)
  }

  // 初期読み込み・更新トリガー
  useEffect(() => {
    loadHourlyData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedPeriod, refreshTrigger])

  // ローディング状態
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            時間帯別学習効率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // エラー状態
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            時間帯別学習効率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">データ取得エラー</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadHourlyData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const analysis = hourlyData ? analyzeHourlyEfficiency(hourlyData) : null
  const maxEfficiency = Math.max(...chartData.map(d => d.efficiency), 1)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            時間帯別学習効率
          </div>
          <div className="flex items-center gap-2">
            {/* 期間選択 */}
            <div className="flex gap-1">
              {[7, 14, 30].map(period => (
                <Button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  variant={selectedPeriod === period ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                >
                  {period}日
                </Button>
              ))}
            </div>
            <Button 
              onClick={loadHourlyData} 
              disabled={isLoading}
              variant="ghost" 
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* サマリー情報 */}
        {analysis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-900">
                {analysis.topHour?.hour || '-'}時
              </div>
              <div className="text-xs text-blue-600">最高効率時間</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-900">
                {analysis.averageEfficiency} XP/分
              </div>
              <div className="text-xs text-green-600">平均効率</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-semibold text-purple-900">
                {analysis.activeHours}時間帯
              </div>
              <div className="text-xs text-purple-600">活動時間帯数</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-lg font-semibold text-orange-900">
                {analysis.totalThinkingTimeMinutes}分
              </div>
              <div className="text-xs text-orange-600">総思考時間</div>
            </div>
          </div>
        )}

        {/* 24時間効率チャート */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">24時間効率グラフ</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-yellow-500" />
              ピーク時間
            </div>
          </div>
          
          {/* 時間軸とバーチャート */}
          <div className="space-y-2">
            {/* チャートバー */}
            <div className="grid grid-cols-24 gap-1">
              {chartData.map((data) => (
                <div
                  key={data.hour}
                  className="relative group"
                  title={`${data.hour}時: ${data.efficiency.toFixed(2)} XP/分 (${data.sessionCount}回)`}
                >
                  {/* バー */}
                  <div
                    className={`${getEfficiencyColor(data.efficiency, data.isPeak)} rounded-t transition-all duration-200 hover:opacity-80 relative`}
                    style={{
                      height: `${Math.max((data.efficiency / maxEfficiency) * 64, data.sessionCount > 0 ? 8 : 2)}px`,
                      minHeight: '2px'
                    }}
                  >
                    {/* ピークマーク */}
                    {data.isPeak && (
                      <Star className="absolute -top-3 left-1/2 transform -translate-x-1/2 h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                  
                  {/* ツールチップ */}
                  <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-10">
                    {data.hour}時<br/>
                    {data.efficiency.toFixed(2)} XP/分<br/>
                    {data.sessionCount}セッション
                  </div>
                </div>
              ))}
            </div>
            
            {/* 時間ラベル */}
            <div className="grid grid-cols-24 gap-1 text-xs text-center text-muted-foreground">
              {chartData.map((data) => (
                <div key={`label-${data.hour}`} className="truncate">
                  {data.hour % 6 === 0 ? `${data.hour}` : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 時間帯別サマリー */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">時間帯別サマリー</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['朝', '午後', '夜', '深夜'].map((timeSlot) => {
              const timeSlotData = chartData.filter(d => d.timeSlot === timeSlot)
              const avgEfficiency = timeSlotData.length > 0 
                ? timeSlotData.reduce((sum, d) => sum + d.efficiency, 0) / timeSlotData.length 
                : 0
              const totalSessions = timeSlotData.reduce((sum, d) => sum + d.sessionCount, 0)
              const hasPeak = timeSlotData.some(d => d.isPeak)
              const IconComponent = getTimeSlotIcon(timeSlot)
              
              return (
                <div 
                  key={timeSlot} 
                  className={`p-3 rounded-lg border-2 ${hasPeak ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">{timeSlot}</span>
                    {hasPeak && <Badge variant="secondary" className="text-xs">Peak</Badge>}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>効率: {avgEfficiency.toFixed(2)} XP/分</div>
                    <div>セッション: {totalSessions}回</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 学習効率の説明 */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">学習効率について</div>
              <div>学習効率 = 獲得XP ÷ 思考時間（分）で計算されます。高い効率は短時間で多くの学習成果を上げていることを示します。ピーク時間は最も効率的な学習時間帯です。</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}