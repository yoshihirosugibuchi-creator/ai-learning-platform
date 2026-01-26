'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { UnifiedQuizType, isValidUnifiedQuizType } from '@/lib/types/quiz'
import QuizSession from '@/components/quiz/QuizSession'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import SettingsPromptModal from '@/components/quiz/SettingsPromptModal'
import { Question } from '@/lib/types'
import { getAllQuestions } from '@/lib/questions'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserQuizSettings, isDefaultSettings } from '@/lib/user-quiz-settings'
import { initializeSubcategoryCache } from '@/lib/subcategory-cache'

export default function QuizPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const mode = searchParams.get('mode') as UnifiedQuizType | null
  const categoryParam = searchParams.get('category')
  const difficultiesParam = searchParams.get('difficulties')
  const returnToParam = searchParams.get('returnTo')
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showSettingsPrompt, setShowSettingsPrompt] = useState(false)
  const [proceedWithQuiz, setProceedWithQuiz] = useState(false)
  const [userSkippedSettings, setUserSkippedSettings] = useState(false)
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([])

  // 認証ガード - レンダリング中の副作用を防ぐためuseEffectで実行
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // サブカテゴリーキャッシュの初期化（表示名をDBから取得）
  useEffect(() => {
    initializeSubcategoryCache().catch(console.error)
  }, [])

  // パラメータチェック - レンダリング中の副作用を防ぐためuseEffectで実行
  useEffect(() => {
    const hasValidParams = (mode && isValidUnifiedQuizType(mode)) || categoryParam
    
    if (!hasValidParams) {
      console.log('⚠️ Invalid quiz access - redirecting to home')
      router.push('/')
    }
  }, [mode, categoryParam, router])

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // セルフパーソナライズで既に問題が読み込まれている場合は、設定処理のみ実行
        if (mode === 'self-personalized' && questions.length > 0 && userSkippedSettings) {
          console.log('🔍 User skipped settings - proceeding with quiz (no reload)')
          setShowSettingsPrompt(false)
          setProceedWithQuiz(true)
          return
        }
        
        if (mode === 'review') {
          console.log('🔄 [REVIEW MODE] Starting review quiz mode...')
          console.log('🔄 [REVIEW MODE] Current loading state:', loading)
          
          // 復習問題が既に読み込まれている場合は早期リターン
          if (reviewQuestions.length > 0) {
            console.log('🔄 [REVIEW MODE] Review questions already loaded, skipping API call')
            setLoading(false)
            return
          }
          
          // 復習モードの場合は復習問題を取得
          // 既存のSupabaseクライアントを使用（新しいクライアント作成を避ける）
          const { supabase } = await import('@/lib/supabase')
          
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token
          
          if (!token) {
            console.warn('No auth token available for review questions')
            throw new Error('Authentication required')
          }

          // ユーザー設定に基づいた問題数で復習問題を取得（countパラメータなし）
          console.log('🔄 [REVIEW MODE] Fetching review questions with token:', token ? 'available' : 'missing')
          const response = await fetch('/api/review/questions', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          console.log('🔄 [REVIEW MODE] API response status:', response.status)
          if (response.ok) {
            const data = await response.json()
            console.log('🔄 [REVIEW MODE] Received data:', {
              success: data.success,
              questionsCount: data.questions?.length || 0,
              reviewReasonsAnalyzed: data.reviewReasonsAnalyzed,
              sampleQuestion: data.questions?.[0] ? {
                id: data.questions[0].id,
                hasReviewReason: !!data.questions[0].reviewReason
              } : null
            })
            if (data.success && data.questions && data.questions.length > 0) {
              console.log('🔄 [REVIEW MODE] Setting review questions, count:', data.questions.length)
              setReviewQuestions(data.questions)
              console.log('🔄 [REVIEW MODE] Review questions set successfully')
              console.log('🔄 [REVIEW MODE] Setting loading to false and returning')
              // 復習モードの場合はここで読み込み完了
              setLoading(false)
              return // early return で finally ブロックの setLoading(false) を回避
            } else {
              // 復習問題がない場合はホームにリダイレクト
              console.log('ℹ️ No review questions available - redirecting to home')
              router.push('/?message=no-review-questions')
              return
            }
          } else {
            throw new Error('Failed to fetch review questions')
          }
        } else {
          // 通常モードの場合は全問題を取得
          const questionsData = await getAllQuestions()
          setQuestions(questionsData)
          
          // セルフパーソナライズクイズの場合、設定をチェック（ユーザーがスキップしていない場合のみ）
          if (mode === 'self-personalized' && user && !userSkippedSettings) {
            const settings = await getUserQuizSettings(user.id)
            if (isDefaultSettings(settings)) {
              console.log('🔍 Default settings detected - showing settings prompt modal')
              setShowSettingsPrompt(true)
              setProceedWithQuiz(false) // 確実にクイズ表示を停止
            } else {
              console.log('🔍 Custom settings found - proceeding with quiz')
              setShowSettingsPrompt(false)
              setProceedWithQuiz(true)
            }
          } else if (mode === 'self-personalized' && user && userSkippedSettings) {
            console.log('🔍 User skipped settings - proceeding with quiz')
            setShowSettingsPrompt(false)
            setProceedWithQuiz(true)
          }
          
          // 通常モードの場合はここで読み込み完了
          setLoading(false)
          return // early return で finally ブロックの setLoading(false) を回避
        }
      } catch (error) {
        console.error('Failed to load questions:', error)
        setLoading(false)
      }
    }

    if (user && !authLoading) {
      loadQuestions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user, authLoading, router, userSkippedSettings]) // 復習モードでquestions.lengthによる不要な再実行を防ぐため削除

  // デバッグ用：状態変更を監視
  useEffect(() => {
    console.log('🔍 State change:', { showSettingsPrompt, proceedWithQuiz, userSkippedSettings, mode })
    if (mode === 'self-personalized') {
      const shouldShowQuiz = proceedWithQuiz && !showSettingsPrompt
      console.log('🎯 Self-personalized quiz display condition:', { shouldShowQuiz, proceedWithQuiz, showSettingsPrompt, userSkippedSettings })
    }
  }, [showSettingsPrompt, proceedWithQuiz, userSkippedSettings, mode])

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
    
    // 復習モードの場合は復習結果をログ出力
    if (mode === 'review') {
      console.log('🔄 Review mode quiz completed:', {
        score: results.score,
        correctAnswers: results.correctAnswers,
        totalQuestions: results.totalQuestions,
        accuracy: Math.round((results.correctAnswers / results.totalQuestions) * 100)
      })
    }
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
    console.log('🎯 handleSkipToQuiz called')
    // ユーザーがスキップしたことを記録し、設定チェックを防ぐ
    setUserSkippedSettings(true)
    setShowSettingsPrompt(false)
    setProceedWithQuiz(true)
    console.log('🔧 States updated: userSkippedSettings=true, showSettingsPrompt=false, proceedWithQuiz=true')
  }

  // 認証ガード
  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!authLoading && !user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  // パラメータチェックはuseEffectで実行（レンダリング中の副作用回避）

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
        {user && (mode !== 'self-personalized' || (proceedWithQuiz && !showSettingsPrompt)) && (
          <div>
            <QuizSession
              questions={mode === 'review' ? reviewQuestions : questions}
              category={categoryParam || undefined}
              level={null}
              difficulties={difficulties}
              user={user}
              profile={profile}
              mode={mode}
              onComplete={handleQuizComplete}
              onExit={handleQuizExit}
              isReviewMode={mode === 'review'}
              hintsEnabled={true}
            />
          </div>
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