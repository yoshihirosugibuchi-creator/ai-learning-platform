'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import QuizSession from '@/components/quiz/QuizSession'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Question } from '@/lib/types'

interface QuizResults {
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  categoryScores: Record<string, { correct: number; total: number }>
}

function QuizPackPlayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, profile, loading: authLoading } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [packInfo, setPackInfo] = useState<{ name: string; icon_emoji: string } | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const packId = searchParams.get('pack')
  const sessionParam = searchParams.get('session')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const loadSession = async () => {
      if (!user || !packId || !sessionParam) {
        if (!packId || !sessionParam) {
          toast({ title: 'パラメータが不足しています', variant: 'destructive' })
          router.push('/quiz-packs')
        }
        return
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(
          `/api/quiz-packs/${packId}/session?session_id=${sessionParam}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )

        const data = await response.json()

        if (data.success) {
          // セッションAPIが正しいQuestion形式で返すので、そのまま使用
          const formattedQuestions: Question[] = data.questions

          setQuestions(formattedQuestions)
          setPackInfo(data.pack)
          setSessionId(data.session.id)
        } else {
          toast({ title: data.error || 'セッションの取得に失敗しました', variant: 'destructive' })
          router.push('/quiz-packs')
        }
      } catch (error) {
        console.error('Failed to load session:', error)
        toast({ title: 'セッションの取得に失敗しました', variant: 'destructive' })
        router.push('/quiz-packs')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadSession()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, packId, sessionParam])

  const handleComplete = async (results: QuizResults) => {
    // セッション完了処理
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (token && sessionId) {
        // セッションステータスを更新（既存のXP保存APIを使用）
        await fetch('/api/xp-save/quiz', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: sessionId,
            correct_answers: results.correctAnswers,
            total_questions: results.totalQuestions,
            time_spent: results.timeSpent,
            category_scores: results.categoryScores
          })
        })
      }
    } catch (error) {
      console.error('Failed to save results:', error)
    }

    // 結果表示後にパック一覧に戻る
    toast({ title: `クイズ完了！ ${results.correctAnswers}/${results.totalQuestions}問正解` })
  }

  const handleExit = () => {
    router.push('/quiz-packs')
  }

  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="クイズを準備中..." />
  }

  if (questions.length === 0) {
    return <LoadingScreen message="問題を読み込み中..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        {packInfo && (
          <div className="mb-4 text-center">
            <span className="text-2xl mr-2">{packInfo.icon_emoji}</span>
            <span className="text-lg font-medium">{packInfo.name}</span>
          </div>
        )}

        <QuizSession
          questions={questions}
          user={user}
          profile={profile}
          mode="pack"
          onComplete={handleComplete}
          onExit={handleExit}
          hintsEnabled={true}
        />
      </main>
    </div>
  )
}

export default function QuizPackPlayPage() {
  return (
    <Suspense fallback={<LoadingScreen message="読み込み中..." />}>
      <QuizPackPlayContent />
    </Suspense>
  )
}
