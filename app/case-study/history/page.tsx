'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  ChevronRight,
  Clock,
  Trophy,
  Star,
  Zap,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'
import type { CaseStudyScoringResult, CaseStudyBonusDetails, CaseStudyDifficulty } from '@/lib/types/case-study'

interface HistorySession {
  id: string
  problem_id: string
  status: 'in_progress' | 'completed' | 'abandoned'
  current_step: number
  is_retry: boolean
  started_at: string
  completed_at: string | null
  total_time_seconds: number | null
  hint_count: number
  total_score: number | null
  max_possible_score: number | null
  score_percentage: number | null
  xp_earned: number
  skp_earned: number
  scoring_result: CaseStudyScoringResult | null
  bonus_details: CaseStudyBonusDetails | null
  case_study_problems: {
    id: string
    title: string
    difficulty: CaseStudyDifficulty
    industry: string | null
    estimated_minutes: number
    step_count: number
  }
}

const difficultyLabels: Record<CaseStudyDifficulty, string> = {
  basic: '基礎',
  intermediate: '中級',
  advanced: '上級',
  expert: 'エキスパート'
}

const difficultyColors: Record<CaseStudyDifficulty, string> = {
  basic: 'bg-green-100 text-green-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced: 'bg-orange-100 text-orange-800',
  expert: 'bg-red-100 text-red-800'
}

export default function CaseStudyHistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('completed')
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  const fetchHistory = useCallback(async (reset = false) => {
    if (!user) return

    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const { supabase } = await import('@/lib/supabase')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) return

      const offset = reset ? 0 : pagination.offset + pagination.limit
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString()
      })

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/case-study/history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          if (reset) {
            setSessions(data.sessions)
          } else {
            setSessions(prev => [...prev, ...data.sessions])
          }
          setPagination(data.pagination)
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user, statusFilter, pagination.offset, pagination.limit])

  useEffect(() => {
    if (user) {
      fetchHistory(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter])

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { label: 'S', color: 'text-yellow-500' }
    if (percentage >= 80) return { label: 'A', color: 'text-green-500' }
    if (percentage >= 70) return { label: 'B', color: 'text-blue-500' }
    if (percentage >= 60) return { label: 'C', color: 'text-orange-500' }
    return { label: 'D', color: 'text-red-500' }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">完了</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">進行中</Badge>
      case 'abandoned':
        return <Badge className="bg-gray-100 text-gray-800">中断</Badge>
      default:
        return null
    }
  }

  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="履歴を読み込み中..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/case-study')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              学習履歴
            </h1>
            <p className="text-muted-foreground">
              過去のケーススタディ学習記録を振り返れます
            </p>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ステータス:</span>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
                <SelectItem value="in_progress">進行中</SelectItem>
                <SelectItem value="abandoned">中断</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            {pagination.total}件の記録
          </span>
        </div>

        {/* 履歴一覧 */}
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">学習履歴がありません</p>
              <Button className="mt-4" onClick={() => router.push('/case-study')}>
                ケーススタディを始める
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const problem = session.case_study_problems
              const isCompleted = session.status === 'completed'
              const grade = isCompleted && session.score_percentage
                ? getGrade(session.score_percentage)
                : null

              return (
                <Card
                  key={session.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (isCompleted) {
                      router.push(`/case-study/result/${session.id}`)
                    } else if (session.status === 'in_progress') {
                      router.push(`/case-study/session/${session.id}`)
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* 問題タイトルとステータス */}
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(session.status)}
                          <Badge className={difficultyColors[problem.difficulty]}>
                            {difficultyLabels[problem.difficulty]}
                          </Badge>
                          {session.is_retry && (
                            <Badge variant="outline" className="text-xs">再挑戦</Badge>
                          )}
                        </div>

                        <h3 className="font-medium mb-1 truncate">{problem.title}</h3>

                        {/* 日時情報 */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{formatDate(session.started_at)}</span>
                          {session.total_time_seconds && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(session.total_time_seconds)}
                            </span>
                          )}
                          {problem.industry && (
                            <span>{problem.industry}</span>
                          )}
                        </div>

                        {/* 完了時のスコア・報酬表示 */}
                        {isCompleted && session.score_percentage !== null && (
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span className={`font-bold ${grade?.color}`}>
                                {grade?.label}
                              </span>
                              <span className="text-sm">
                                {session.score_percentage}%
                                <span className="text-muted-foreground ml-1">
                                  ({session.total_score}/{session.max_possible_score}点)
                                </span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                +{session.xp_earned} XP
                              </span>
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-purple-500" />
                                +{session.skp_earned} SKP
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 進行中の場合の進捗表示 */}
                        {session.status === 'in_progress' && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            Step {session.current_step} / {problem.step_count} まで進行中
                          </div>
                        )}
                      </div>

                      {/* 矢印アイコン */}
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* もっと読み込む */}
        {pagination.has_more && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => fetchHistory(false)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  読み込み中...
                </>
              ) : (
                'もっと見る'
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
