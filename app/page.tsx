'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  BookOpen,
  Brain,
  Settings,
  RefreshCw,
  Loader2,
  Sun,
  Award,
  Briefcase,
  Package,
  Dumbbell
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { useAuth } from '@/components/auth/AuthProvider'
import { useReviewQuickCheck } from '@/hooks/useReviewQuickCheck'
import ChallengeSettingsModal from '@/components/dashboard/ChallengeSettingsModal'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface ChallengeSelection {
  content_id: string
  content_name: string | null
  selected_by: string
}

interface ChallengeSelections {
  course: ChallengeSelection | null
  quiz_pack: ChallengeSelection | null
  case_study: ChallengeSelection | null
}

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, loading } = useAuth()
  const { reviewStatus, isLoading: reviewLoading } = useReviewQuickCheck()
  const [challengeSettingsOpen, setChallengeSettingsOpen] = useState(false)
  const [challengeSelections, setChallengeSelections] = useState<ChallengeSelections>({
    course: null,
    quiz_pack: null,
    case_study: null
  })
  const [startingQuizPack, setStartingQuizPack] = useState(false)

  // クイズパックを直接開始
  const startQuizPack = useCallback(async (packId: string) => {
    if (!user) return

    setStartingQuizPack(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        toast({ title: '認証エラー', variant: 'destructive' })
        return
      }

      const response = await fetch(`/api/quiz-packs/${packId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success && data.session_id) {
        router.push(`/quiz-packs/play?pack=${packId}&session=${data.session_id}&from=home`)
      } else {
        toast({ title: data.error || 'クイズの開始に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to start quiz pack:', error)
      toast({ title: 'クイズの開始に失敗しました', variant: 'destructive' })
    } finally {
      setStartingQuizPack(false)
    }
  }, [user, router, toast])

  // 選ばれし課題の選択を取得
  const fetchChallengeSelections = useCallback(async () => {
    if (!user) return

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) return

      const response = await fetch('/api/challenge-selections', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.selections) {
          setChallengeSelections(data.selections)
        }
      }
    } catch (error) {
      console.error('Failed to fetch challenge selections:', error)
    }
  }, [user])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    fetchChallengeSelections()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router])

  return (
    <>
      {loading && <LoadingScreen />}

      <div className="min-h-screen bg-background">
        <Header
          onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
        />

        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <main className="container mx-auto px-4 py-4">
          {!user ? (
            <div className="text-center py-12">
              <h1 className="text-xl font-bold mb-4">AI Learning Enterprise</h1>
              <p className="text-muted-foreground mb-8">
                AIパーソナライズ学習プラットフォーム
              </p>
              <div className="space-x-4">
                <Button>無料で始める</Button>
                <Button variant="outline">ログイン</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* ページタイトル */}
              <div className="text-center">
                <h1 className="text-lg font-bold text-foreground">
                  マイセレクションダッシュボード
                </h1>
              </div>

              {/* ===== 日々の努力 ===== */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="h-4 w-4 text-yellow-500" />
                  <h2 className="text-sm font-semibold text-muted-foreground">日々の努力</h2>
                </div>

                <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
                          <Brain className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm">今日のチャレンジ</h3>
                          <p className="text-xs text-muted-foreground">
                            ビジネスAIクイズで知識の幅を広げよう
                          </p>
                        </div>
                      </div>
                      <Link href="/quiz?mode=business-ai" prefetch={true}>
                        <Button size="sm" className="shrink-0 bg-yellow-600 hover:bg-yellow-700">
                          <Play className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">クイズ</span>開始
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* ===== 選ばれし課題 ===== */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-500" />
                    <h2 className="text-sm font-semibold text-muted-foreground">選ばれし課題</h2>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-purple-600 hover:bg-purple-100"
                    onClick={() => setChallengeSettingsOpen(true)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    設定
                  </Button>
                </div>

                {/* モバイル: リスト形式 / PC: カード形式 */}
                <div className="space-y-2 md:hidden">
                  {/* モバイル用リスト */}
                  <Card className="border border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                          <BookOpen className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">コース</p>
                          <h3 className="font-semibold text-sm truncate">
                            {challengeSelections.course?.content_name || '未選択'}
                          </h3>
                        </div>
                        {challengeSelections.course ? (
                          <Link href={`/learning/${challengeSelections.course.content_id}?from=home`} prefetch={true}>
                            <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-300 hover:bg-emerald-100">
                              学習
                            </Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setChallengeSettingsOpen(true)}>
                            選択
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-sky-200 bg-sky-50/50 hover:border-sky-300 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                          <Package className="h-4 w-4 text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">クイズパック</p>
                          <h3 className="font-semibold text-sm truncate">
                            {challengeSelections.quiz_pack?.content_name || '未選択'}
                          </h3>
                        </div>
                        {challengeSelections.quiz_pack ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-sky-300 hover:bg-sky-100"
                            onClick={() => startQuizPack(challengeSelections.quiz_pack!.content_id)}
                            disabled={startingQuizPack}
                          >
                            {startingQuizPack ? <Loader2 className="h-3 w-3 animate-spin" /> : '挑戦'}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setChallengeSettingsOpen(true)}>
                            選択
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-violet-200 bg-violet-50/50 hover:border-violet-300 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg shrink-0">
                          <Briefcase className="h-4 w-4 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground">ケーススタディ</p>
                          <h3 className="font-semibold text-sm truncate">
                            {challengeSelections.case_study?.content_name || '未選択'}
                          </h3>
                        </div>
                        {challengeSelections.case_study ? (
                          <Link href={`/case-study/${challengeSelections.case_study.content_id}?from=home`} prefetch={true}>
                            <Button size="sm" variant="outline" className="h-8 text-xs border-violet-300 hover:bg-violet-100">
                              取組
                            </Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setChallengeSettingsOpen(true)}>
                            選択
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* PC用カード */}
                <div className="hidden md:grid md:grid-cols-3 gap-3">
                  <Card className="border border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="p-3 bg-emerald-100 rounded-lg">
                          <BookOpen className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0 w-full">
                          <p className="text-xs text-muted-foreground">コース</p>
                          <h3 className="font-semibold text-sm truncate">
                            {challengeSelections.course?.content_name || '未選択'}
                          </h3>
                        </div>
                        {challengeSelections.course ? (
                          <Link href={`/learning/${challengeSelections.course.content_id}?from=home`} prefetch={true} className="w-full">
                            <Button size="sm" variant="outline" className="w-full border-emerald-300 hover:bg-emerald-100">
                              学習開始
                            </Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => setChallengeSettingsOpen(true)}>
                            選択する
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-sky-200 bg-sky-50/50 hover:border-sky-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="p-3 bg-sky-100 rounded-lg">
                          <Package className="h-5 w-5 text-sky-600" />
                        </div>
                        <div className="min-w-0 w-full">
                          <p className="text-xs text-muted-foreground">クイズパック</p>
                          <h3 className="font-semibold text-sm truncate">
                            {challengeSelections.quiz_pack?.content_name || '未選択'}
                          </h3>
                        </div>
                        {challengeSelections.quiz_pack ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-sky-300 hover:bg-sky-100"
                            onClick={() => startQuizPack(challengeSelections.quiz_pack!.content_id)}
                            disabled={startingQuizPack}
                          >
                            {startingQuizPack ? <Loader2 className="h-4 w-4 animate-spin" /> : '挑戦する'}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => setChallengeSettingsOpen(true)}>
                            選択する
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-violet-200 bg-violet-50/50 hover:border-violet-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="p-3 bg-violet-100 rounded-lg">
                          <Briefcase className="h-5 w-5 text-violet-600" />
                        </div>
                        <div className="min-w-0 w-full">
                          <p className="text-xs text-muted-foreground">ケーススタディ</p>
                          <h3 className="font-semibold text-sm truncate">
                            {challengeSelections.case_study?.content_name || '未選択'}
                          </h3>
                        </div>
                        {challengeSelections.case_study ? (
                          <Link href={`/case-study/${challengeSelections.case_study.content_id}?from=home`} prefetch={true} className="w-full">
                            <Button size="sm" variant="outline" className="w-full border-violet-300 hover:bg-violet-100">
                              取り組む
                            </Button>
                          </Link>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => setChallengeSettingsOpen(true)}>
                            選択する
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* ===== 自己鍛錬 ===== */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-4 w-4 text-indigo-500" />
                  <h2 className="text-sm font-semibold text-muted-foreground">自己鍛錬</h2>
                </div>

                <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
                  {/* セルフパーソナライズクイズ */}
                  <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 hover:border-yellow-300 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
                          <Settings className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm">セルフパーソナライズクイズ</h3>
                          <p className="text-xs text-muted-foreground">
                            好みのカテゴリー・レベルで挑戦
                          </p>
                          <Link href="/categories" prefetch={true} className="text-[10px] text-yellow-700 hover:underline">
                            特定カテゴリーで挑戦 →
                          </Link>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Link href="/profile#quiz-settings" prefetch={true}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-yellow-600 hover:bg-yellow-100">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href="/quiz?mode=self-personalized" prefetch={true}>
                            <Button size="sm" className="h-8 text-xs bg-yellow-600 hover:bg-yellow-700">
                              開始
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 復習クイズ */}
                  <Card className={`border-2 transition-colors relative ${
                    (reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0)
                      ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-red-50'
                      : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                  }`}>
                    {/* 復習バッジ */}
                    {(reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0) && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 bg-orange-500 text-[10px] h-5 min-w-5 px-1.5 flex items-center justify-center"
                      >
                        {reviewStatus.totalQuestions > 99 ? '99+' : reviewStatus.totalQuestions}
                      </Badge>
                    )}

                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          (reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0)
                            ? 'bg-orange-100'
                            : 'bg-gray-100'
                        }`}>
                          <RefreshCw className={`h-4 w-4 ${
                            (reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0)
                              ? 'text-orange-600'
                              : 'text-gray-400'
                          } ${reviewLoading ? 'animate-spin' : ''}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm">復習クイズ</h3>
                          <p className="text-xs text-muted-foreground">
                            {reviewLoading || reviewStatus?.isGenerating
                              ? '確認中...'
                              : (reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0)
                                ? reviewStatus.displayText
                                : '復習対象なし'
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Link href="/profile#review-settings" prefetch={true}>
                            <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${
                              (reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0)
                                ? 'text-orange-600 hover:bg-orange-100'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                          {(reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0) && !reviewStatus.isGenerating ? (
                            <Link href="/quiz?mode=review" prefetch={true}>
                              <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700">
                                開始
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" disabled>
                              {reviewLoading || reviewStatus?.isGenerating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : '—'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          )}
        </main>

        {/* 選ばれし課題設定モーダル */}
        <ChallengeSettingsModal
          isOpen={challengeSettingsOpen}
          onClose={() => setChallengeSettingsOpen(false)}
          onSave={fetchChallengeSelections}
          currentSelections={challengeSelections}
        />
      </div>
    </>
  )
}
