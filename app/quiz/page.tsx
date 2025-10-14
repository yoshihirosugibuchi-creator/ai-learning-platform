'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import QuizSession from '@/components/quiz/QuizSession'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import SettingsPromptModal from '@/components/quiz/SettingsPromptModal'
import { Question } from '@/lib/types'
import { getAllQuestions } from '@/lib/questions'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserQuizSettings, isDefaultSettings } from '@/lib/user-quiz-settings'

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
  const [showSettingsPrompt, setShowSettingsPrompt] = useState(false)
  const [proceedWithQuiz, setProceedWithQuiz] = useState(false)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const questionsData = await getAllQuestions()
        setQuestions(questionsData)
        
        // セルフパーソナライズクイズの場合、設定をチェック
        if (mode === 'self-personalized' && user) {
          const settings = await getUserQuizSettings(user.id)
          if (isDefaultSettings(settings)) {
            setShowSettingsPrompt(true)
          }
        }
      } catch (error) {
        console.error('Failed to load questions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [mode, user])

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

  const handleConfigureSettings = () => {
    // プロフィール画面の基本情報タブに遷移（クイズ設定がある場所）
    router.push('/profile?tab=basic&openSettings=true')
  }

  const handleSkipToQuiz = () => {
    setShowSettingsPrompt(false)
    setProceedWithQuiz(true)
  }

  // 認証ガード
  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!authLoading && !user) {
    router.push('/login')
    return <LoadingScreen message="ログインページに移動中..." />
  }

  // パラメータチェック：適切なクイズ開始条件があるかを確認
  // ai-personalizedはrandomと同じ処理（将来のAI機能実装まではエイリアスとして扱う）
  const hasValidParams = mode === 'random' || mode === 'ai-personalized' || mode === 'self-personalized' || categoryParam
  
  if (!hasValidParams) {
    // パラメータが不適切な場合はホームにリダイレクト
    console.log('⚠️ Invalid quiz access - redirecting to home')
    router.push('/')
    return <LoadingScreen message="ホームページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="問題を読み込んでいます..." />
  }

  // 難易度パラメータを配列に変換（単一選択でも配列として処理）
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
        {user && (mode !== 'self-personalized' || proceedWithQuiz || !showSettingsPrompt) && (
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
        )}
      </main>

      {/* 設定誘導モーダル */}
      <SettingsPromptModal
        isOpen={showSettingsPrompt}
        onClose={() => setShowSettingsPrompt(false)}
        onConfigureSettings={handleConfigureSettings}
        onSkipToQuiz={handleSkipToQuiz}
      />
    </div>
  )
}