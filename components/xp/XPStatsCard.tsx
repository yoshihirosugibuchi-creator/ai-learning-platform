'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Zap, 
  Target, 
  TrendingUp,
  Calendar,
  Sparkles,
  BookOpen,
  Star,
  RefreshCw
} from 'lucide-react'
import { useXPStats } from '@/hooks/useXPStats'
import { loadXPSettings } from '@/lib/xp-settings'
import { useState, useEffect } from 'react'

interface XPStatsCardProps {
  showDetailedStats?: boolean
  className?: string
}

// サブカテゴリーの表示名を取得するヘルパー関数
const _getSubcategoryDisplayName = (subcategoryId: string): string => {
  return subcategoryId === 'category_level' ? '総合' : subcategoryId
}

// 学習時間フォーマット関数
const formatLearningTime = (seconds: number): string => {
  if (seconds === 0) return '0m'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
  }
  return `${minutes}m`
}

export default function XPStatsCard({ showDetailedStats = false, className }: XPStatsCardProps) {
  const { stats, loading, error, refetch } = useXPStats()
  const [, setLevelThreshold] = useState(1000) // デフォルト値
  const [isRecalculating, setIsRecalculating] = useState(false)

  // 統計再計算機能
  const handleRecalculateStats = async () => {
    setIsRecalculating(true)
    try {
      // 正しいSupabaseセッション取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証セッションがありません')
      }
      
      const response = await fetch('/api/admin/recalculate-learning-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      })
      
      if (!response.ok) {
        throw new Error('再計算に失敗しました')
      }
      
      const result = await response.json()
      console.log('✅ 統計再計算完了:', result)
      
      // 統計データを再取得
      await refetch()
      
    } catch (error) {
      console.error('❌ 統計再計算エラー:', error)
      alert('統計の再計算に失敗しました。しばらく待ってから再試行してください。')
    } finally {
      setIsRecalculating(false)
    }
  }

  // XP設定からレベル閾値を取得
  useEffect(() => {
    const loadLevelSettings = async () => {
      try {
        const xpSettings = await loadXPSettings()
        setLevelThreshold(xpSettings.level.overall_threshold)
      } catch (error) {
        console.error('レベル設定の読み込みに失敗:', error)
        // デフォルト値（1000）を使用
      }
    }
    loadLevelSettings()
  }, [])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            学習統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            学習統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-sm">
            {error.includes('認証') ? (
              <p>📝 ログインすると、あなたのXP統計が表示されます</p>
            ) : (
              <p>⚠️ データの読み込みに失敗しました: {error}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            学習統計
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-sm">
            <p>🎯 学習を開始すると、XP統計が表示されます</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { user } = stats
  const categoryCount = Object.keys(stats.categories).length
  const subcategoryCount = Object.keys(stats.subcategories).length
  const recentActivityDays = stats.recent_activity.length
  
  // DBから直接レベルを取得
  const currentLevel = user.current_level
  // 次のレベルまでのXP計算は後で実装予定。今はシンプルな表示で代替
  const nextLevelXP = 1000 - (user.total_xp % 1000) // 仮の計算
  const progressPercentage = (user.total_xp % 1000) / 10 // 仮の進捗

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            学習統計
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecalculateStats}
              disabled={isRecalculating}
              className="h-8 w-8 p-0"
              title="統計を再計算"
            >
              <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="outline" className="text-xs">
              総合レベル {currentLevel}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本統計 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{user.total_xp.toLocaleString()}</div>
            <div className="text-xs text-gray-600">総合XP</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{user.total_skp.toLocaleString()}</div>
            <div className="text-xs text-gray-600">累計獲得SKP</div>
          </div>
        </div>
        
        {/* セッション数と総学習時間 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{user.quiz_sessions_completed + user.course_sessions_completed}</div>
            <div className="text-xs text-gray-600">学習セッション</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatLearningTime(user.total_learning_time_seconds || 0)}
            </div>
            <div className="text-xs text-gray-600">総学習時間</div>
          </div>
        </div>

        {/* XP内訳 */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            XP内訳
          </h4>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              クイズXP
            </div>
            <span className="font-medium">{user.quiz_xp.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              コース学習XP
            </div>
            <span className="font-medium">{user.course_xp.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              ボーナスXP
            </div>
            <span className="font-medium">{user.bonus_xp.toLocaleString()}</span>
          </div>
        </div>

        {/* SKP内訳 */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-purple-500" />
            SKP内訳
          </h4>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              クイズSKP
            </div>
            <span className="font-medium">{user.quiz_skp.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              コース学習SKP
            </div>
            <span className="font-medium">{user.course_skp.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              ボーナスSKP
            </div>
            <span className="font-medium">{user.bonus_skp.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              継続SKP
            </div>
            <span className="font-medium">{user.streak_skp.toLocaleString()}</span>
          </div>
        </div>

        {/* 詳細統計 */}
        {showDetailedStats && (
          <>
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                学習実績
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">総合正答率</div>
                  <div className="font-medium">{user.quiz_average_accuracy.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-gray-600">学習実施カテゴリー</div>
                  <div className="font-medium">{categoryCount}分野</div>
                </div>
                <div>
                  <div className="text-gray-600">学習実施サブカテゴリー</div>
                  <div className="font-medium">{subcategoryCount}分野</div>
                </div>
                <div>
                  <div className="text-gray-600">直近30日の学習日数</div>
                  <div className="font-medium">{recentActivityDays}日</div>
                </div>
              </div>
            </div>


            {/* 最新活動 */}
            {stats.recent_activity.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  最新活動（過去7日間）
                </h4>
                <div className="space-y-2">
                  {stats.recent_activity.slice(0, 7).map((activity) => (
                    <div key={activity.date} className="flex items-center justify-between text-sm">
                      <div className="text-gray-600">
                        {new Date(activity.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-3">
                        {activity.quiz_sessions > 0 && (
                          <span className="text-green-600">クイズ{activity.quiz_sessions}回</span>
                        )}
                        {activity.course_sessions > 0 && (
                          <span className="text-blue-600">学習{activity.course_sessions}回</span>
                        )}
                        <span className="font-medium">+{activity.total_xp_earned}XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 次のレベルまでの進捗 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>次のレベルまで</span>
            <span>{nextLevelXP.toLocaleString()} XP</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}