'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Package,
  Play,
  Trophy,
  Users,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { DifficultyLabels, DifficultyColors } from '@/lib/types/learning'

interface QuizPack {
  id: string
  name: string
  description: string | null
  question_count: number
  categories: string[]
  difficulties: string[]
  icon_emoji: string
  color_theme: string
  total_attempts: number
  average_score: number | null
  user_attempts: number
  user_best_score: number | null
}

interface SkillLevel {
  id: string
  name: string
}

const colorThemeClasses: Record<string, string> = {
  primary: 'from-primary/10 to-primary/5 border-primary/20',
  blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
  green: 'from-green-500/10 to-green-500/5 border-green-500/20',
  orange: 'from-orange-500/10 to-orange-500/5 border-orange-500/20',
  purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
  red: 'from-red-500/10 to-red-500/5 border-red-500/20',
}

export default function QuizPacksPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)
  const [packs, setPacks] = useState<QuizPack[]>([])
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  const fetchPacks = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) return

      // パックと難易度を並行取得
      const [packsResponse, skillLevelsData] = await Promise.all([
        fetch('/api/quiz-packs', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        supabase.from('skill_levels').select('id, name').order('display_order')
      ])

      if (packsResponse.ok) {
        const data = await packsResponse.json()
        if (data.success) {
          setPacks(data.packs)
        }
      }

      if (skillLevelsData.data) {
        setSkillLevels(skillLevelsData.data)
      }
    } catch (error) {
      console.error('Failed to fetch packs:', error)
      toast({ title: 'パックの取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (user) {
      fetchPacks()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleStartQuiz = async (packId: string) => {
    setStarting(packId)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        toast({ title: 'ログインが必要です', variant: 'destructive' })
        return
      }

      const response = await fetch(`/api/quiz-packs/${packId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        // クイズパック専用ページに遷移
        router.push(`/quiz-packs/play?pack=${packId}&session=${data.session_id}`)
      } else {
        toast({ title: data.error || 'クイズの開始に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to start quiz:', error)
      toast({ title: 'クイズの開始に失敗しました', variant: 'destructive' })
    } finally {
      setStarting(null)
    }
  }

  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="クイズパックを読み込み中..." />
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            クイズ
          </h1>
          <p className="text-muted-foreground">
            テーマ別のクイズパックで効率的に学習しましょう
          </p>
        </div>

        {packs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">利用可能なクイズパックがありません</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packs.map((pack) => (
              <Card
                key={pack.id}
                className={`overflow-hidden border bg-gradient-to-br ${colorThemeClasses[pack.color_theme] || colorThemeClasses.primary}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{pack.icon_emoji}</span>
                      <CardTitle className="text-lg">{pack.name}</CardTitle>
                    </div>
                  </div>
                  {pack.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {pack.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {/* 難易度バッジ */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {pack.difficulties.map(diff => (
                      <Badge
                        key={diff}
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: (DifficultyColors as Record<string, string>)[diff] || '#6B7280', color: 'white' }}
                      >
                        {skillLevels.find(s => s.id === diff)?.name || (DifficultyLabels as Record<string, string>)[diff] || diff}
                      </Badge>
                    ))}
                  </div>

                  {/* 統計情報 */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {pack.question_count}問
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {pack.total_attempts}回
                    </span>
                    {pack.average_score !== null && (
                      <span className="flex items-center gap-1">
                        平均 {pack.average_score.toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* ユーザーの成績 */}
                  {pack.user_attempts > 0 && (
                    <div className="mb-3 p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          あなたの最高スコア
                        </span>
                        <span className="font-medium">{pack.user_best_score}%</span>
                      </div>
                      <Progress value={pack.user_best_score || 0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {pack.user_attempts}回挑戦済み
                      </p>
                    </div>
                  )}

                  {/* 開始ボタン */}
                  <Button
                    className="w-full"
                    onClick={() => handleStartQuiz(pack.id)}
                    disabled={starting === pack.id}
                  >
                    {starting === pack.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        準備中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {pack.user_attempts > 0 ? '再挑戦する' : 'クイズを始める'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
