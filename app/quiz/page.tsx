'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import QuizSession from '@/components/quiz/QuizSession'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { Question } from '@/lib/types'
import { getAllQuestions } from '@/lib/questions'
import { useAuth } from '@/components/auth/AuthProvider'

export default function QuizPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const mode = searchParams.get('mode')
  const categoryParam = searchParams.get('category')
  const difficultiesParam = searchParams.get('difficulties')
  const returnToParam = searchParams.get('returnTo')
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const questionsData = await getAllQuestions()
        setQuestions(questionsData)
      } catch (error) {
        console.error('Failed to load questions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  const handleQuizComplete = (results: { 
    score: number
    totalQuestions: number 
    correctAnswers: number 
    timeSpent: number 
    rewardedCard?: unknown
    isNewCard?: boolean
    cardCount?: number
  }) => {
    console.log('Quiz completed:', results)
  }

  const handleQuizExit = () => {
    // returnToパラメータがある場合はそこに戻る、なければホームに戻る
    router.push(returnToParam || '/')
  }

  // 認証ガード
  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    router.push('/login')
    return <LoadingScreen message="ログインページに移動中..." />
  }

  // パラメータチェック：適切なクイズ開始条件があるかを確認
  const hasValidParams = mode === 'random' || categoryParam
  
  if (!hasValidParams) {
    // パラメータが不適切な場合はホームにリダイレクト
    console.log('⚠️ Invalid quiz access - redirecting to home')
    router.push('/')
    return <LoadingScreen message="ホームページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="問題を読み込んでいます..." />
  }

  // 難易度パラメータを配列に変換
  const difficulties = difficultiesParam ? difficultiesParam.split(',') : undefined

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
      />
      
      <MobileNav 
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <main className="container mx-auto px-4 py-6">
        <QuizSession
          questions={questions}
          category={categoryParam || undefined}
          level={null}
          difficulties={difficulties}
          user={user}
          profile={profile}
          onComplete={handleQuizComplete}
          onExit={handleQuizExit}
        />
      </main>
    </div>
  )
}