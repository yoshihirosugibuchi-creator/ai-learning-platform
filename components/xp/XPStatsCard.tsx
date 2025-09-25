'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Zap, 
  Target, 
  Award,
  TrendingUp,
  Calendar,
  Sparkles,
  BookOpen
} from 'lucide-react'
import { useXPStats } from '@/hooks/useXPStats'
import { loadXPSettings } from '@/lib/xp-settings'
import { useState, useEffect } from 'react'

interface XPStatsCardProps {
  showDetailedStats?: boolean
  className?: string
}

export default function XPStatsCard({ showDetailedStats = false, className }: XPStatsCardProps) {
  const { stats, loading, error } = useXPStats()
  const [, setLevelThreshold] = useState(1000) // デフォルト値

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
            XP統計
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
            XP統計
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
            XP統計
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
            XP統計
          </div>
          <Badge variant="outline" className="text-xs">
            総合レベル {currentLevel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本統計 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{user.total_xp.toLocaleString()}</div>
            <div className="text-xs text-gray-600">総合XP</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{user.quiz_sessions_completed + user.course_sessions_completed}</div>
            <div className="text-xs text-gray-600">学習セッション</div>
          </div>
        </div>

        {/* XP内訳 */}
        <div className="space-y-2">
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
                  <div className="text-gray-600">クイズ正答率</div>
                  <div className="font-medium">{user.quiz_average_accuracy.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-gray-600">活動カテゴリー</div>
                  <div className="font-medium">{categoryCount}種類</div>
                </div>
                <div>
                  <div className="text-gray-600">学習分野</div>
                  <div className="font-medium">{subcategoryCount}分野</div>
                </div>
                <div>
                  <div className="text-gray-600">活動日数</div>
                  <div className="font-medium">{recentActivityDays}日</div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" />
                獲得アイテム
              </h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{user.wisdom_cards_total}</div>
                  <div className="text-gray-600">格言カード</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{user.knowledge_cards_total}</div>
                  <div className="text-gray-600">知識カード</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{user.badges_total}</div>
                  <div className="text-gray-600">バッジ</div>
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