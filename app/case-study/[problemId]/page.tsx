'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, BarChart3, Users, Trophy, ArrowLeft, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Problem {
  id: string
  title: string
  case_text: string
  case_text_preview: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  industry: string | null
  industry_name?: string | null
  scenario_type: string | null
  estimated_minutes: number
  step_count: number
}

interface Step {
  id: string
  step_number: number
  step_name: string
  target_skills: string[]
}

interface TargetSkill {
  axis_code: string
  axis_name: string
  rubric_group_name: string
}

interface UserHistory {
  total_attempts: number
  completed_count: number
  best_score: number | null
  last_completed: string | null
  in_progress_session_id: string | null
}

interface Stats {
  total_sessions: number
  completion_rate: number
  avg_score: number
  avg_time_seconds: number
}

const difficultyConfig = {
  basic: { label: '初級', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  intermediate: { label: '中級', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  advanced: { label: '上級', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  expert: { label: '超上級', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
}

export default function CaseStudyDetailPage({
  params
}: {
  params: Promise<{ problemId: string }>
}) {
  const { problemId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const fromHome = searchParams.get('from') === 'home'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [_steps, setSteps] = useState<Step[]>([])
  const [targetSkills, setTargetSkills] = useState<TargetSkill[]>([])
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [showFullCase, setShowFullCase] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token

        if (!accessToken) return

        setToken(accessToken)

        const response = await fetch(`/api/case-study/problems/${problemId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setProblem(data.problem)
            setSteps(data.steps)
            setTargetSkills(data.target_skills)
            setUserHistory(data.user_history)
            setStats(data.stats)
          }
        } else if (response.status === 404) {
          toast({
            title: '問題が見つかりません',
            variant: 'destructive'
          })
          router.push('/case-study')
        }
      } catch (error) {
        console.error('Failed to fetch problem:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, problemId])

  const handleStart = async () => {
    if (!token) return

    setStarting(true)

    try {
      // 進行中のセッションがあれば再開
      if (userHistory?.in_progress_session_id) {
        router.push(`/case-study/session/${userHistory.in_progress_session_id}${fromHome ? '?from=home' : ''}`)
        return
      }

      // 新規セッション開始
      const response = await fetch('/api/case-study/sessions/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ problem_id: problemId })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          router.push(`/case-study/session/${data.session_id}${fromHome ? '?from=home' : ''}`)
        }
      } else {
        toast({
          title: 'セッション開始に失敗しました',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Start error:', error)
      toast({
        title: 'セッション開始に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setStarting(false)
    }
  }

  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="読み込み中..." />
  }

  if (!problem) {
    return <LoadingScreen message="問題が見つかりません" />
  }

  const difficulty = difficultyConfig[problem.difficulty] || difficultyConfig.intermediate
  const isRetry = userHistory && userHistory.completed_count > 0
  const hasInProgress = userHistory?.in_progress_session_id

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        {/* 戻るボタン */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(fromHome ? '/' : '/case-study')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {fromHome ? 'ホームに戻る' : '一覧に戻る'}
          </Button>
          {fromHome && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/case-study')}
            >
              ケーススタディ一覧
            </Button>
          )}
        </div>

        {/* メインカード */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className={difficulty.color}>{difficulty.label}</Badge>
              {(problem.industry_name || problem.industry) && <Badge variant="outline">{problem.industry_name || problem.industry}</Badge>}
              {problem.scenario_type && <Badge variant="secondary">{problem.scenario_type}</Badge>}
            </div>
            <CardTitle className="text-xl">{problem.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>約{problem.estimated_minutes}分</span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span>{problem.step_count}ステップ</span>
              </div>
              {stats && stats.total_sessions > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{stats.total_sessions}人が挑戦</span>
                </div>
              )}
            </div>

            {/* ケース概要 */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h4 className="text-base font-medium mb-2">ケース概要</h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap text-sm">
                  {showFullCase ? problem.case_text : problem.case_text_preview}
                </p>
                {problem.case_text.length > 500 && !showFullCase && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowFullCase(true)}
                    className="mt-2 p-0 h-auto"
                  >
                    続きを読む
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 評価スキル */}
        {targetSkills.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">評価スキル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {targetSkills.map((skill) => (
                  <Badge key={skill.axis_code} variant="secondary">
                    {skill.axis_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 学習履歴 */}
        {userHistory && userHistory.total_attempts > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                あなたの履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">挑戦回数</div>
                  <div className="font-medium">{userHistory.total_attempts}回</div>
                </div>
                <div>
                  <div className="text-muted-foreground">完了回数</div>
                  <div className="font-medium">{userHistory.completed_count}回</div>
                </div>
                {userHistory.best_score !== null && (
                  <div>
                    <div className="text-muted-foreground">最高スコア</div>
                    <div className="font-medium text-primary">{userHistory.best_score}%</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 全体統計 */}
        {stats && stats.total_sessions > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">全体統計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">完了率</div>
                  <div className="font-medium">{stats.completion_rate}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">平均スコア</div>
                  <div className="font-medium">{stats.avg_score}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">平均時間</div>
                  <div className="font-medium">
                    {Math.round(stats.avg_time_seconds / 60)}分
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 開始ボタン */}
        <div className="sticky bottom-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleStart}
            disabled={starting}
          >
            <Play className="h-5 w-5 mr-2" />
            {starting
              ? '開始中...'
              : hasInProgress
              ? '続きから再開'
              : isRetry
              ? '再挑戦する'
              : '学習を開始する'
            }
          </Button>
        </div>
      </main>
    </div>
  )
}
