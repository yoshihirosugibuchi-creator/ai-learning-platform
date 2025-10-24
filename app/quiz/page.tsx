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
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([])
  const [reviewStats, setReviewStats] = useState<{selectedCount: number, totalAvailable: number} | null>(null)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        if (mode === 'review') {
          // 復習モードの場合は復習問題を取得
          // 既存のSupabaseクライアントを使用（新しいクライアント作成を避ける）
          const { supabase } = await import('@/lib/supabase')
          
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token
          
          if (!token) {
            console.warn('No auth token available for review questions')
            throw new Error('Authentication required')
          }

          const response = await fetch('/api/review/questions?count=10', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.questions && data.questions.length > 0) {
              setReviewQuestions(data.questions)
              setReviewStats({
                selectedCount: data.selectedCount,
                totalAvailable: data.totalAvailable
              })
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
          
          // セルフパーソナライズクイズの場合、設定をチェック
          if (mode === 'self-personalized' && user) {
            const settings = await getUserQuizSettings(user.id)
            if (isDefaultSettings(settings)) {
              setShowSettingsPrompt(true)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load questions:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && !authLoading) {
      loadQuestions()
    }
  }, [mode, user, authLoading, router])

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
  const hasValidParams = mode === 'random' || mode === 'ai-personalized' || mode === 'self-personalized' || mode === 'review' || categoryParam
  
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
          <div>
            {/* 復習モード情報表示 */}
            {mode === 'review' && reviewStats && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-orange-900">復習AI推奨クイズ</h2>
                    <p className="text-sm text-orange-700">
                      忘却曲線や苦手カテゴリーを分析して選定した問題です
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-orange-600">
                      選定問題: {reviewStats.selectedCount}問
                    </div>
                    <div className="text-xs text-orange-500">
                      全復習対象: {reviewStats.totalAvailable}問
                    </div>
                  </div>
                </div>
                
                {/* 復習理由の説明 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-700">🧠 忘却曲線: 時間経過で記憶が薄れている問題</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-700">📊 苦手分野: 正解率が低いカテゴリーの問題</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-orange-700">🔄 繰り返しミス: 同じパターンで間違えた問題</span>
                  </div>
                </div>
              </div>
            )}
            
            <QuizSession
              questions={mode === 'review' ? reviewQuestions : questions}
              category={categoryParam || undefined}
              level={null}
              difficulties={difficulties}
              user={user}
              profile={profile}
              onComplete={handleQuizComplete}
              onExit={handleQuizExit}
              isReviewMode={mode === 'review'}
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