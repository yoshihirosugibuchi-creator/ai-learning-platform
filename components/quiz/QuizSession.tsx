'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Trophy, Target, Clock, BarChart3, Zap } from 'lucide-react'
import QuizCard from './QuizCard'
import { Question } from '@/lib/types'
import { getRandomQuestions } from '@/lib/questions'
// import { useAuth } from '@/components/auth/AuthProvider'
// Removed old saveQuizResultSupabase - now using new XP system's saveQuizSession
import { useXPStats } from '@/hooks/useXPStats'
import { UserProfileWithProgress } from '@/lib/supabase-user'
import type { User } from '@supabase/supabase-js'
import { WisdomCard as WisdomCardType } from '@/lib/cards'
import WisdomCard from '@/components/cards/WisdomCard'
import { getCategoryDisplayName } from '@/lib/category-mapping'
import { isValidCategoryId, getMainCategoryIds } from '@/lib/categories'
import { optimizeQuestionsWithAI } from '@/lib/unified-optimization-engine'
// import { selectQuestionsByPriority } from '@/lib/question-priority' // Removed - using new API instead
import { 
  calculateMainCategoryAccuracy,
  getDifficultyDistributionByAccuracy,
  getDefaultDifficultyDistribution 
} from '@/lib/accuracy-calculator'
// Removed: import { addWisdomCardToCollection } from '@/lib/supabase-cards' - moved to server
import { UnifiedLearningAnalysisEngine } from '@/lib/unified-learning-analytics'
import { useSearchParams } from 'next/navigation'
import { UnifiedQuizType, convertToUnifiedQuizType } from '@/lib/types/quiz'
import { filterQuestionsByQuizType } from '@/lib/quiz-filtering'
import { supabase } from '@/lib/supabase'
// import { saveDetailedQuizData } from '@/lib/supabase-learning' // 未使用のためコメントアウト
// import { updateProgressAfterQuiz, calculateChallengeQuizRewards, saveChallengeQuizProgressToDatabase } from '@/lib/xp-level-system'
// import { getSubcategoryId } from '@/lib/categories'

interface QuizSessionProps {
  questions: Question[]
  category?: string
  subCategory?: string
  level?: string | null
  difficulties?: string[]
  user: User
  profile: UserProfileWithProgress | null
  mode?: UnifiedQuizType | null
  onComplete: (results: QuizResults) => void
  onExit: () => void
  isReviewMode?: boolean
  hintsEnabled?: boolean
}

interface CategoryProgress {
  category_id: string
  correct_answers: number
  total_answers: number
}

interface QuizResults {
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  categoryScores: Record<string, { correct: number; total: number }>
  // カード関連フィールド復活（サーバーから受信）
  rewardedCard?: WisdomCardType | null // サーバーから受け取ったカード情報
  isNewCard?: boolean
  cardCount?: number
}

interface QuestionAnswer {
  questionId: string
  questionText: string
  selectedAnswer: string
  correctAnswer: string
  selectedOptionIndex: number  // ユーザーが選択した選択肢のインデックス (0-3)
  isCorrect: boolean
  responseTime: number
  category: string
  subcategory?: string
  subcategory_id?: string
  difficulty: string
  confidenceLevel?: number
  // ヒント機能追加
  maxHintLevel?: number        // 使用した最大ヒントレベル (0-3)
  hintUsed?: boolean          // ヒント使用の有無
  hintUsageDetails?: {        // ヒント使用詳細（オプション）
    level1Used?: boolean
    level2Used?: boolean
    level3Used?: boolean
    timestamps?: number[]
  }
}

interface QuizSession {
  sessionId: string
  startTime: string
  endTime: string
  sessionDuration: number
  totalQuestions: number
  category?: string
}

export default function QuizSession({
  questions,
  category,
  subCategory,
  level,
  difficulties,
  user,
  profile,
  mode: propsMode,
  onComplete,
  onExit,
  isReviewMode = false,
  hintsEnabled = true
}: QuizSessionProps) {
  const _router = useRouter()
  const searchParams = useSearchParams()
  
  // クイズタイプを優先順位で決定（props > URL > fallback）
  const modeParam = searchParams.get('mode') as string | null
  const legacyTypeParam = searchParams.get('type') as string | null
  const paramValue = modeParam || legacyTypeParam
  const quizType: UnifiedQuizType = propsMode 
    || (paramValue ? convertToUnifiedQuizType(paramValue) : null)
    || (isReviewMode ? 'review' : 'business-ai') // デフォルトフォールバック
    
  // mode変数を統一
  const mode = quizType
  
  // セッション状態管理
  const sessionInitialized = useRef(false)
  
  // New XP System Hook
  const { saveQuizSession } = useXPStats()
  
  // 堅牢な非同期保存メソッド  
  interface QuizDataWithCard {
    user_id: string
    category_id: string
    subcategory_id: string
    session_start_time: string
    session_end_time?: string
    total_questions: number
    correct_answers: number
    accuracy_rate: number
    answers: Array<{
      question_id: string
      user_answer: number | null
      is_correct: boolean
      time_spent: number
      is_timeout: boolean
      category_id: string
      subcategory_id: string
      difficulty: string
    }>
    selected_card?: {
      id: number
      author: string
      quote: string
      rarity: string
      accuracy_rate: number
    }
  }
  
  const saveQuizWithRetry = async (
    quizData: QuizDataWithCard,
    saveFunction: typeof saveQuizSession,
    maxRetries = 3
  ) => {
    let attempt = 0
    while (attempt < maxRetries) {
      try {
        console.log(`🔄 Background save attempt ${attempt + 1}/${maxRetries}`)
        const result = await saveFunction(quizData)
        
        if (result.success) {
          console.log('✅ Background save successful:', result.session_id)
          return result
        } else {
          throw new Error(result.error || 'Save failed')
        }
      } catch (error) {
        attempt++
        console.warn(`⚠️ Background save attempt ${attempt} failed:`, {
          name: (error as Error).name,
          message: (error as Error).message,
          stack: (error as Error).stack,
          errorString: String(error),
          errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
        })
        
        if (attempt >= maxRetries) {
          console.error('❌ All background save attempts failed')
          // ローカルストレージにバックアップ保存
          try {
            localStorage.setItem(`quiz_backup_${Date.now()}`, JSON.stringify(quizData))
            console.log('💾 Quiz data backed up to localStorage')
          } catch (storageError) {
            console.error('❌ localStorage backup failed:', storageError)
          }
          break
        }
        
        // 指数バックオフでリトライ
        const delay = Math.pow(2, attempt) * 1000
        console.log(`⏳ Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [results, setResults] = useState<QuizResults>({
    score: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    timeSpent: 0,
    categoryScores: {}
  })
  const [startTime] = useState(Date.now())
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([])
  const [isFinished, setIsFinished] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswer[]>([])
  const [currentConfidence, setCurrentConfidence] = useState<number | null>(null)
  const [showConfidenceInput, setShowConfidenceInput] = useState(false)
  const [skpGained, setSkpGained] = useState(0)
  const [, setIsCompleting] = useState(false)
  const completionInProgress = useRef(false)
  const [, setChallengeQuizUpdateData] = useState<{
    userId: string;
    categoryResults: Record<string, unknown>;
  } | null>(null)
  const [analyticsEngine] = useState(() => new UnifiedLearningAnalysisEngine(user.id))
  const [_sessionId] = useState(() => crypto.randomUUID())
  const [cognitiveLoadSamples, setCognitiveLoadSamples] = useState<number[]>([])
  const [flowStateSamples, setFlowStateSamples] = useState<number[]>([])
  const [_lastResponseTime, setLastResponseTime] = useState<number>(0)
  
  // ヒント使用状態管理
  const [hintUsageMap, setHintUsageMap] = useState<Record<string, number>>({})

  // サブカテゴリーマスターデータ（格言カード表示用）
  const [subcategories, setSubcategories] = useState<Array<{subcategory_id: string, name: string}>>([])

  // サブカテゴリーマスターを取得（格言カード表示用）
  useEffect(() => {
    const fetchSubcategories = async () => {
      const { data } = await supabase
        .from('subcategories')
        .select('subcategory_id, name')
      if (data) {
        setSubcategories(data)
      }
    }
    fetchSubcategories()
  }, [])

  // 🔧 チャレンジクイズDB更新機能を一時的に無効化（フリーズ問題解決のため）
  // useEffect(() => {
  //   if (isFinished && challengeQuizUpdateData && !category) {
  //     console.log('🎯 Challenge quiz completion detected - starting DB updates...')
  //     
  //     const executeDBUpdates = async () => {
  //       try {
  //         console.log('💾 Executing DB updates with data:', challengeQuizUpdateData)
  //         const updateResult = await saveChallengeQuizProgressToDatabase(
  //           challengeQuizUpdateData.userId, 
  //           challengeQuizUpdateData.categoryResults
  //         );
  //         
  //         if (updateResult.success) {
  //           console.log('✅ Challenge quiz DB updates completed successfully:', updateResult.updatedCategories);
  //         } else {
  //           console.warn('⚠️ Some challenge quiz DB updates failed:', updateResult.errors);
  //         }
  //       } catch (error) {
  //         console.error('❌ Challenge quiz DB update failure:', error);
  //         // エラー詳細を表示
  //         if (error instanceof Error) {
  //           console.error('Error details:', error.message, error.stack);
  //         }
  //       } finally {
  //         // 更新データをクリア
  //         setChallengeQuizUpdateData(null);
  //       }
  //     }
  //     
  //     // 少し遅延をつけて画面描画を確実にする
  //     setTimeout(executeDBUpdates, 100);
  //   }
  // }, [isFinished, challengeQuizUpdateData, category]);

  // 難易度配分に基づく問題選択ヘルパー関数
  const optimizeByDistribution = useCallback((questions: Question[], distribution: Record<string, number>): Question[] => {
    const optimized: Question[] = []
    
    for (const [difficulty, count] of Object.entries(distribution)) {
      const difficultyQuestions = questions.filter(q => q.difficulty === difficulty)
      optimized.push(...getRandomQuestions(difficultyQuestions, count))
    }
    
    // 不足分をランダムで補完
    if (optimized.length < 10) {
      const remaining = questions.filter(q => !optimized.includes(q))
      optimized.push(...getRandomQuestions(remaining, 10 - optimized.length))
    }
    
    console.log(`🎯 Applied difficulty distribution:`, 
      Object.entries(distribution).map(([d, c]) => `${d}:${c}`).join(', ')
    )
    
    return optimized.slice(0, 10)
  }, [])

  // 学習履歴に基づく問題最適化関数（ランダムクイズ対応）
  const optimizeQuestionsForUser = useCallback(async (
    questions: Question[], 
    userId: string, 
    userProfile: UserProfileWithProgress | null,
    currentQuizType: UnifiedQuizType = 'business-ai'
  ): Promise<Question[]> => {
    if (!userProfile || questions.length === 0) {
      return getRandomQuestions(questions, 10)
    }

    const categoryProgress = userProfile.categoryProgress || []

    // 統合AI最適化エンジンを使用（全クイズタイプで統一）
    try {
      console.log(`🎲 ${currentQuizType} Quiz - applying unified AI optimization`)
      
      // Step 1: フィルタリング処理（統合フィルタリングシステム）
      const { filteredQuestions, learningLevelRestriction, fallbackApplied } = filterQuestionsByQuizType(
        questions,
        currentQuizType
      )
      
      console.log(`🔍 ${currentQuizType} filtering completed:`, {
        original: questions.length,
        filtered: filteredQuestions.length,
        fallbackApplied
      })

      // Step 2: 統合AI最適化エンジンを使用（フィルタリング済み問題を渡す）
      const optimizedQuestions = await optimizeQuestionsWithAI(
        filteredQuestions,
        userId,
        currentQuizType,
        userProfile,
        learningLevelRestriction
      )
      
      console.log(`✨ ${currentQuizType} AI optimization completed: ${optimizedQuestions.length} questions selected`)
      return optimizedQuestions
      
    } catch (error) {
      console.error(`❌ ${currentQuizType} AI optimization failed, falling back to basic optimization:`, error)
      
      // フォールバック: 従来の基本最適化
      const mainCategoryIds = getMainCategoryIds()
      const mainCategoryQuestions = questions.filter(q => mainCategoryIds.includes(q.category))
      
      if (mainCategoryQuestions.length === 0) {
        console.log('⚠️ No main category questions found, using all questions')
        return getRandomQuestions(questions, 10)
      }

      const overallAccuracy = calculateMainCategoryAccuracy(categoryProgress, mainCategoryIds)
      const distribution = overallAccuracy.hasData && overallAccuracy.confidence !== 'low'
        ? getDifficultyDistributionByAccuracy(overallAccuracy.accuracy)
        : getDefaultDifficultyDistribution()
        
      return optimizeByDistribution(mainCategoryQuestions, distribution)
    }

    // カテゴリー別クイズの場合（既存ロジック）
    const categoryStats = categoryProgress.find((cp: CategoryProgress) => cp.category_id === category)
    
    if (!categoryStats) {
      // 初回の場合は基礎から中級中心
      const basicQuestions = questions.filter(q => q.difficulty === '基礎')
      const intermediateQuestions = questions.filter(q => q.difficulty === '中級')
      const otherQuestions = questions.filter(q => q.difficulty && !['基礎', '中級'].includes(q.difficulty))
      
      const optimized = [
        ...getRandomQuestions(basicQuestions, 4),
        ...getRandomQuestions(intermediateQuestions, 4),
        ...getRandomQuestions(otherQuestions, 2)
      ].filter(q => q) // nullを除外
      
      // 不足分をランダムで補完
      if (optimized.length < 10) {
        const remaining = questions.filter(q => !optimized.includes(q))
        optimized.push(...getRandomQuestions(remaining, 10 - optimized.length))
      }
      
      console.log('🎯 First time quiz - using basic/intermediate focus')
      return optimized.slice(0, 10)
    }
    
    // 正答率に基づく難易度調整
    const accuracy = categoryStats!.correct_answers / Math.max(categoryStats!.total_answers, 1)
    console.log(`📈 User accuracy for ${category}: ${(accuracy * 100).toFixed(1)}%`)
    
    // 配分を計算して適用
    const difficultyDistribution = getDifficultyDistributionByAccuracy(accuracy)
    return optimizeByDistribution(questions, difficultyDistribution)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // 依存配列を空にして無限ループを防ぐ

  // Note: initializeQuizOptimized will be defined after the helper functions

  // Category Quiz: Smart Random Selection (API call)
  const handleCategoryQuizOptimized = useCallback(async (
    categoryId: string,
    difficulties: string[],
    token: string
  ): Promise<Question[]> => {
    console.log(`🎲 [Category Quiz] Smart random for ${categoryId}`)
    
    try {
      const response = await fetch('/api/quiz/category-init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categoryId,
          difficulties,
          subcategoryId: subCategory,
          questionCount: 10
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success || !data.questions) {
        throw new Error('Invalid response from category quiz API')
      }

      console.log(`✅ [Category Quiz] ${data.metadata.method} completed in ${data.metadata.performance_ms}ms`)
      return data.questions
      
    } catch (error) {
      console.error('❌ [Category Quiz] Smart selection failed:', error)
      throw error
    }
  }, [subCategory])

  // Precomputed Quiz: Business-AI, Self-Personalized, Review
  // 🚀 NEW: Review Quiz Dedicated Handler
  const handleReviewQuizOptimized = useCallback(async (
    token: string
  ): Promise<Question[]> => {
    console.log('📚 [Review Quiz] Starting review-specific initialization...')
    
    try {
      const response = await fetch('/api/review/questions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Review API error: ${errorData.error || 'Unknown error'}`)
      }
      
      const data = await response.json()
      
      if (!data.success || !data.questions || data.questions.length === 0) {
        console.log('ℹ️ [Review Quiz] No review questions available')
        return []
      }
      
      console.log(`✅ [Review Quiz] Loaded ${data.questions.length} review questions from precomputed sets`)
      return data.questions
      
    } catch (error) {
      console.error('❌ [Review Quiz] Failed to load review questions:', error)
      throw error
    }
  }, [])

  const handlePrecomputedQuizOptimized = useCallback(async (
    quizType: UnifiedQuizType,
    token: string
  ): Promise<Question[]> => {
    console.log(`📦 [Precomputed Quiz] ${quizType} instant start`)
    
    try {
      const response = await fetch('/api/quiz/quick-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quiz_type: quizType,
          count: 10
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ [Quick Start API] Error ${response.status}:`, errorData)
        throw new Error(errorData.error || errorData.details || `API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log(`✅ [Precomputed Quiz] ${data.metadata.selection_method} - ${data.questions.length} questions`)
      return data.questions
      
    } catch (error) {
      console.error(`❌ [Precomputed Quiz] ${quizType} failed:`, error)
      throw error
    }
  }, [])

  // 🚀 Optimized Quiz Initialization with Pre-computation System
  const initializeQuizOptimized = useCallback(async (): Promise<Question[]> => {
    console.log('🚀 [Quiz Init] Starting optimized initialization...')
    
    const quizType = convertToUnifiedQuizType(mode)
    console.log(`🎯 [Quiz Init] Quiz type: ${quizType}`)
    
    // Step 1: Get user activity status for 3-pattern logic
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }

    // Step 2: Route to appropriate strategy based on quiz type and user status
    if (quizType === 'category' && category) {
      // Category quizzes always use smart random selection
      return await handleCategoryQuizOptimized(category, difficulties || [], session.access_token)
    } else if (quizType === 'review') {
      // 🚀 FIXED: Review mode uses pre-loaded questions from page.tsx
      console.log('📚 [Review Quiz] Using pre-loaded questions from page.tsx, count:', questions.length)
      return questions
    } else if (quizType === 'pack') {
      // 🎯 Pack mode uses pre-loaded questions from play page
      console.log('📦 [Pack Quiz] Using pre-loaded questions from play page, count:', questions.length)
      return questions
    } else {
      // Business-AI, Self-Personalized use quick-start API
      return await handlePrecomputedQuizOptimized(quizType, session.access_token)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, category, difficulties, handleCategoryQuizOptimized, handlePrecomputedQuizOptimized, handleReviewQuizOptimized])

  // Fallback to original logic when new system fails
  const initializeFallbackQuiz = useCallback(async (): Promise<void> => {
    console.log('🔄 [Fallback] Using original initialization logic...')
    
    try {
      // Use original heavy optimization as last resort
      const fallbackQuestions = await optimizeQuestionsForUser(
        questions,
        user.id,
        profile,
        convertToUnifiedQuizType(mode)
      )
      
      setSessionQuestions(fallbackQuestions)
      setResults(prev => ({
        ...prev,
        totalQuestions: fallbackQuestions.length
      }))
      
    } catch (fallbackError) {
      console.error('❌ [Fallback] Even fallback failed:', fallbackError)
      
      // Final fallback: random selection
      const randomQuestions = getRandomQuestions(questions, 10)
      setSessionQuestions(randomQuestions)
      setResults(prev => ({
        ...prev,
        totalQuestions: randomQuestions.length
      }))
    }
  }, [questions, user.id, profile, mode, optimizeQuestionsForUser])

  useEffect(() => {
    // 🚨 クイズ進行中の場合はリセットを防ぐ（タブ切り替え対策）
    if (sessionQuestions.length > 0 && currentQuestionIndex > 0 && !isFinished) {
      console.log('⚠️ Quiz in progress - preventing reset to avoid tab-switch issues')
      return
    }
    
    // 🚨 セッション初期化済みの場合は重複実行を防ぐ
    if (sessionInitialized.current) {
      console.log('⚠️ Session already initialized - preventing duplicate execution')
      return
    }

    // クイズ開始時の状態リセット
    setIsFinished(false)
    setIsCompleting(false)
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setShowResult(false)
    setQuestionAnswers([])
    setCurrentConfidence(null)
    setShowConfidenceInput(false)
    completionInProgress.current = false
    setChallengeQuizUpdateData(null)
    
    // セッション初期化フラグ設定
    sessionInitialized.current = true

    // 🚀 NEW: Pre-computation System Integration
    initializeQuizOptimized()
      .then(selectedQuestions => {
        console.log(`✅ Quiz initialized with ${selectedQuestions.length} questions`)
        setSessionQuestions(selectedQuestions)
        setResults(prev => ({
          ...prev,
          totalQuestions: selectedQuestions.length
        }))
      })
      .catch(error => {
        console.error('❌ Quiz initialization failed:', error)
        // Fallback to original logic
        initializeFallbackQuiz()
      })

    
    // 🔥 OLD LOGIC REPLACED WITH PRE-COMPUTATION SYSTEM
    // All filtering and optimization logic moved to the new system above
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // All dependencies handled within the optimization logic to prevent infinite loops

  // Helper functions for cognitive load and flow state calculation
  const calculateCognitiveLoad = useCallback((responseTime: number, isCorrect: boolean): number => {
    // Base load on response time (0-10 scale)
    const timeLoad = Math.min(responseTime / 30 * 10, 10) // 30+ seconds = max load
    
    // Adjust for correctness (incorrect answers indicate higher load)
    const accuracyAdjustment = isCorrect ? 0 : 2
    
    return Math.min(timeLoad + accuracyAdjustment, 10)
  }, [])

  const calculateFlowState = useCallback((responseTime: number, isCorrect: boolean, difficulty: string): number => {
    // Optimal flow: correct answers in reasonable time
    if (isCorrect) {
      if (difficulty === 'basic' && responseTime <= 15) return 0.9
      if (difficulty === 'intermediate' && responseTime <= 25) return 0.8
      if (difficulty === 'advanced' && responseTime <= 35) return 0.85
      if (difficulty === 'expert' && responseTime <= 45) return 0.9
    }
    
    // Poor flow: too fast (guessing) or too slow (struggling)
    if (responseTime < 5) return 0.3 // Too fast, likely guessing
    if (responseTime > 60) return 0.2 // Too slow, cognitive overload
    
    // Moderate flow for other cases
    return isCorrect ? 0.6 : 0.4
  }, [])

  const currentQuestion = sessionQuestions[currentQuestionIndex]
  
  // Update question start time when question changes
  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartTime(Date.now())
      setCurrentConfidence(null)
      setShowConfidenceInput(false)
    }
  }, [currentQuestionIndex, currentQuestion])

  const handleAnswer = (option: number, isCorrect: boolean) => {
    const responseTime = Math.round((Date.now() - questionStartTime) / 1000) // ミリ秒→秒に変換
    setLastResponseTime(responseTime)
    
    // Calculate cognitive load based on response time and accuracy
    const cognitiveLoadScore = calculateCognitiveLoad(responseTime, isCorrect)
    setCognitiveLoadSamples(prev => [...prev, cognitiveLoadScore])
    
    // Calculate flow state based on difficulty vs performance
    const flowScore = calculateFlowState(responseTime, isCorrect, currentQuestion?.difficulty || 'basic')
    setFlowStateSamples(prev => [...prev, flowScore])
    
    setSelectedOption(option)
    setShowResult(true)
    
    // Store detailed question answer data
    const currentQuestionId = (currentQuestion.id || 0).toString()
    const maxHintLevel = hintUsageMap[currentQuestionId] || 0
    
    const questionAnswer: QuestionAnswer = {
      questionId: currentQuestionId,
      questionText: currentQuestion.question,
      selectedAnswer: currentQuestion.options[option],
      correctAnswer: currentQuestion.options[currentQuestion.correct],
      selectedOptionIndex: option,  // ユーザーが選択した選択肢のインデックス (0-3)
      isCorrect,
      responseTime,
      category: currentQuestion.category,
      subcategory: currentQuestion.subcategory,
      subcategory_id: currentQuestion.subcategory_id,
      difficulty: currentQuestion.difficulty || '未設定',
      // ヒント使用情報を含める
      maxHintLevel: maxHintLevel,
      hintUsed: maxHintLevel > 0
    }
    
    setQuestionAnswers(prev => [...prev, questionAnswer])
    setShowConfidenceInput(true) // Show confidence input after answering

    if (isCorrect) {
      setResults(prev => ({
        ...prev,
        correctAnswers: prev.correctAnswers + 1,
        score: prev.score + 100,
        categoryScores: {
          ...prev.categoryScores,
          [currentQuestion.category]: {
            correct: (prev.categoryScores[currentQuestion.category]?.correct || 0) + 1,
            total: (prev.categoryScores[currentQuestion.category]?.total || 0) + 1
          }
        }
      }))
    } else {
      setResults(prev => ({
        ...prev,
        categoryScores: {
          ...prev.categoryScores,
          [currentQuestion.category]: {
            correct: prev.categoryScores[currentQuestion.category]?.correct || 0,
            total: (prev.categoryScores[currentQuestion.category]?.total || 0) + 1
          }
        }
      }))
    }
  }

  const handleNext = async () => {
    // Update confidence for current question if provided
    if (currentConfidence !== null && questionAnswers.length > 0) {
      const lastAnswerIndex = questionAnswers.length - 1
      setQuestionAnswers(prev => 
        prev.map((qa, index) => 
          index === lastAnswerIndex 
            ? { ...qa, confidenceLevel: currentConfidence }
            : qa
        )
      )
    }
    
    if (currentQuestionIndex < sessionQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOption(null)
      setShowResult(false)
      setShowConfidenceInput(false)
      setCurrentConfidence(null)
    } else {
      // 重複実行を防ぐ（useRefを使用した確実な方法）
      if (completionInProgress.current || isFinished) {
        console.log('⚠️ Quiz completion already in progress or finished, skipping...')
        return
      }
      
      completionInProgress.current = true
      setIsCompleting(true)
      console.log('🏁 Starting quiz completion...')
      
      const endTime = Date.now()
      const sessionDuration = endTime - startTime
      
      const finalResults = {
        ...results,
        timeSpent: Math.round(sessionDuration / 1000)
      }
      
      // Create enhanced session data
      const _sessionData: QuizSession = {
        sessionId: crypto.randomUUID(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        sessionDuration,
        totalQuestions: sessionQuestions.length,
        category
      }
      
      // Save quiz result to Supabase and update progress using new system
      if (user?.id) {
        try {
          console.log('🚀 Starting quiz completion process...')
          
          // チャレンジクイズの場合、実際の問題カテゴリーを検出
          let quizCategory = category
          if (!category) {
            const categoryCount: Record<string, number> = {}
            sessionQuestions.forEach(q => {
              if (q.category) {
                categoryCount[q.category] = (categoryCount[q.category] || 0) + 1
              }
            })
            
            const categories = Object.keys(categoryCount)
            if (categories.length > 0) {
              const detectedCategory = categories.reduce((a, b) => 
                categoryCount[a] > categoryCount[b] ? a : b
              )
              
              // 有効なカテゴリー（メイン＋業界）かチェック
              if (isValidCategoryId(detectedCategory)) {
                quizCategory = detectedCategory
              } else {
                // 無効なカテゴリーの場合はデフォルトを使用
                quizCategory = 'logical_thinking_problem_solving'
                console.warn('⚠️ Invalid category detected, using fallback:', detectedCategory)
              }
            } else {
              // フォールバック: デフォルトカテゴリーを使用
              quizCategory = 'logical_thinking_problem_solving'
              console.warn('⚠️ No categories found in questions, using fallback category')
            }
            console.log('🎯 Detected quiz category:', quizCategory, categoryCount)
          }
          
          // 🚀 クイズ結果保存を非同期化（画面表示を妨げない）
          console.log('💾 Scheduling quiz result save in background...')
          
          // バックグラウンドでクイズ結果保存
          setTimeout(async () => {
            console.log('💾 Processing quiz result save in background...')
            let quizResult = null
            
            // カード関連変数を上位スコープで宣言
            let selectedCard: WisdomCardType | null = null
            let isNewCard = false
            let cardCount = 0
            
            try {
              console.log('📝 Quiz result data to save:', {
                user_id: user.id,
                category_id: quizCategory,
                subcategory_id: null,
                score: finalResults.score,
                total_questions: finalResults.totalQuestions,
                time_taken: finalResults.timeSpent,
                completed_at: new Date().toISOString()
              })
              
              console.log('🚀 Processing quiz results (new client-first approach)...')
              
              // UI応答時間測定開始
              const uiResponseStartTime = performance.now()
              console.log('🚨 CLIENT: UI PROCESSING START TIME:', new Date().toISOString())
              
              // クライアント側でカード判定・選択を即座に実行（復習モードでは除外）
              const accuracyRate = (finalResults.correctAnswers / finalResults.totalQuestions) * 100
              
              if (!isReviewMode && accuracyRate >= 70) {
                // DB版カード選択（フォールバック対応）
                try {
                  const { getRandomWisdomCardFromDB } = await import('@/lib/cards')
                  selectedCard = await getRandomWisdomCardFromDB(accuracyRate)
                  isNewCard = true // デフォルトで新規扱い
                  cardCount = 1
                  console.log('⚡ CLIENT: Card selected from DB (with fallback):', {
                    cardId: selectedCard.id,
                    author: selectedCard.author,
                    accuracy: accuracyRate,
                    isReviewMode: isReviewMode
                  })
                } catch (cardError) {
                  console.error('❌ CLIENT: DB Card selection error:', {
                    name: (cardError as Error).name,
                    message: (cardError as Error).message,
                    stack: (cardError as Error).stack,
                    errorString: String(cardError),
                    errorJSON: JSON.stringify(cardError, Object.getOwnPropertyNames(cardError))
                  })
                  
                  // カード取得エラー時はデフォルトカードを設定
                  selectedCard = null
                  isNewCard = false
                  cardCount = 0
                  console.log('🎯 Card selection failed, setting to no card')
                }
              } else if (isReviewMode) {
                console.log('🔄 Review mode: Cards excluded from rewards')
                selectedCard = null
                isNewCard = false
                cardCount = 0
              }
              
              const actualTotalQuestions = sessionQuestions.length || questionAnswers.length
              const quizSessionData = {
                user_id: user.id,
                category_id: quizCategory || category || 'logical_thinking_problem_solving',
                subcategory_id: subCategory || 'general',
                session_start_time: new Date(startTime).toISOString(),
                session_end_time: new Date().toISOString(),
                total_questions: actualTotalQuestions,
                correct_answers: finalResults.correctAnswers,
                accuracy_rate: actualTotalQuestions > 0 ? (finalResults.correctAnswers / actualTotalQuestions) * 100 : 0,
                quiz_type: quizType, // URLパラメータから取得したクイズタイプ
                answers: questionAnswers.map(qa => ({
                  question_id: qa.questionId,
                  user_answer: qa.selectedOptionIndex, // ユーザーが選択した選択肢のインデックス (0-3)
                  is_correct: qa.isCorrect,
                  time_spent: qa.responseTime,
                  is_timeout: false, // We don't track timeouts in current system
                  category_id: qa.category || quizCategory || category || 'logical_thinking_problem_solving',
                  subcategory_id: qa.subcategory_id || 'general', // Use actual subcategory_id or fallback to general
                  difficulty: qa.difficulty,
                  confidence_level: qa.confidenceLevel, // 理解度 (1-5段階、未入力時はundefined)
                  // ヒント使用情報を追加
                  max_hint_level: qa.maxHintLevel || 0,  // 使用した最大ヒントレベル (0-3)
                  hint_used: qa.hintUsed || false       // ヒント使用フラグ
                }))
              }
              
              console.log('📝 Quiz session data being sent:', {
                total_questions: quizSessionData.total_questions,
                correct_answers: quizSessionData.correct_answers,
                accuracy_rate: quizSessionData.accuracy_rate,
                answers_count: quizSessionData.answers.length,
                sessionQuestions_length: sessionQuestions.length,
                questionAnswers_length: questionAnswers.length,
                isReviewMode: isReviewMode
              })
              
              // ヒント使用データの詳細ログ
              console.log('🔍 Hint usage data in quiz session:', {
                questionAnswers: questionAnswers.map(qa => ({
                  questionId: qa.questionId,
                  maxHintLevel: qa.maxHintLevel,
                  hintUsed: qa.hintUsed
                })),
                apiData: quizSessionData.answers.map(answer => ({
                  question_id: answer.question_id,
                  max_hint_level: answer.max_hint_level,
                  hint_used: answer.hint_used
                }))
              })
              
              // 選択されたカード情報をAPIデータに含める（復習モード情報も追加）
              const quizSessionDataWithCard = {
                ...quizSessionData,
                is_review_mode: isReviewMode, // 復習モードフラグを追加
                selected_card: selectedCard ? {
                  id: selectedCard.id,
                  author: selectedCard.author,
                  quote: selectedCard.quote,
                  rarity: selectedCard.rarity,
                  accuracy_rate: accuracyRate,
                  categoryId: selectedCard.categoryId,
                  context: selectedCard.context,
                  applicationArea: selectedCard.applicationArea
                } : undefined
              }
              
              // 非同期でバックグラウンド保存（UIをブロックしない）
              saveQuizWithRetry(quizSessionDataWithCard, saveQuizSession).catch(error => {
                console.error('❌ Background save failed completely:', {
                  name: (error as Error).name,
                  message: (error as Error).message,
                  stack: (error as Error).stack,
                  errorString: String(error),
                  errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
                })
              })
              
              // 即座にクライアント側で生成したセッションIDを使用
              quizResult = {
                id: 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                success: true
              }
              
              // UI応答時間測定終了
              const uiResponseEndTime = performance.now()
              const uiResponseDuration = uiResponseEndTime - uiResponseStartTime
              console.log('🚨 CLIENT: API MOVED TO BACKGROUND')
              console.log('🚨 CLIENT: UI RESPONSE TIME:', `${uiResponseDuration.toFixed(2)}ms`)
              console.log('✅ Quiz result generated instantly:', quizResult?.id)
              
              // 最終結果をカード情報と共に設定
              const finalResultsWithCard: QuizResults = {
                ...finalResults,
                rewardedCard: selectedCard,
                isNewCard,
                cardCount
              }
              
              console.log('🚨 CLIENT: Results with card set instantly')
              setResults(finalResultsWithCard)
              
              const resultsUpdateEndTime = performance.now()
              const resultsUpdateDuration = resultsUpdateEndTime - uiResponseStartTime
              console.log('🚨 CLIENT: RESULTS UPDATE END TIME:', new Date().toISOString())
              console.log('🚨 CLIENT: RESULTS UPDATE DURATION:', `${resultsUpdateDuration.toFixed(2)}ms`)

              // Save unified learning analytics data
              try {
                console.log('📊 Saving unified learning analytics data...')
                const analyticsData = {
                  sessionId: quizResult?.id || 'quiz-' + Date.now(),
                  userId: user?.id || '',
                  sessionType: 'quiz' as const,
                  startTime: new Date(Date.now() - finalResults.timeSpent * 1000),
                  endTime: new Date(),
                  content: {
                    quizSessionId: quizResult?.id,
                    categoryId: quizCategory || 'logical_thinking_problem_solving',
                    subcategoryId: 'general',
                    difficulty: (level || 'basic') as 'basic' | 'intermediate' | 'advanced' | 'expert'
                  },
                  performance: {
                    questionsTotal: finalResults.totalQuestions,
                    questionsCorrect: finalResults.correctAnswers,
                    accuracyRate: (finalResults.correctAnswers / finalResults.totalQuestions) * 100,
                    completionRate: 1.0,
                    averageResponseTimeMs: (questionAnswers.reduce((sum, qa) => sum + qa.responseTime, 0) / questionAnswers.length) * 1000
                  },
                  categoryId: quizCategory || 'logical_thinking_problem_solving',
                  subcategoryId: 'general',
                  skillLevel: level || 'basic',
                  difficultyProgression: questionAnswers.map(qa => qa.difficulty),
                  cognitiveLoadSamples,
                  flowStateSamples,
                  cognitive: {
                    loadScore: cognitiveLoadSamples.length > 0 ? cognitiveLoadSamples[cognitiveLoadSamples.length - 1] : 5.0,
                    attentionBreaks: 0,
                    flowStateDuration: finalResults.timeSpent,
                    flowStateIndex: flowStateSamples.length > 0 ? flowStateSamples[flowStateSamples.length - 1] : 0.7
                  },
                  context: {
                    timeOfDay: new Date().getHours().toString(),
                    dayOfWeek: new Date().getDay(),
                    deviceType: 'web',
                    interruptionCount: 0,
                    energyLevelReported: 5,
                    engagementScore: questionAnswers
                      .filter(qa => qa.confidenceLevel !== undefined)
                      .reduce((sum, qa) => sum + (qa.confidenceLevel || 0), 0) / 
                      Math.max(questionAnswers.filter(qa => qa.confidenceLevel !== undefined).length, 1)
                  },
                  engagementMetrics: {
                    averageConfidence: questionAnswers
                      .filter(qa => qa.confidenceLevel !== undefined)
                      .reduce((sum, qa) => sum + (qa.confidenceLevel || 0), 0) / 
                      Math.max(questionAnswers.filter(qa => qa.confidenceLevel !== undefined).length, 1)
                  },
                  learningOutcomes: questionAnswers.map(qa => ({
                    concept: qa.category,
                    mastery: qa.isCorrect ? 0.8 : 0.2,
                    confidence: qa.confidenceLevel || 0.5
                  }))
                }

                await analyticsEngine.recordLearningSession(analyticsData)
                console.log('✅ Unified learning analytics saved successfully')
              } catch (analyticsError) {
                console.error('❌ Failed to save unified learning analytics:', analyticsError)
              }
              
            } catch (quizSaveError) {
              const error = quizSaveError as Error
              console.error('❌ Quiz save error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                errorString: String(quizSaveError),
                errorJSON: JSON.stringify(quizSaveError, Object.getOwnPropertyNames(quizSaveError))
              })
              
              // エラー発生時でも基本的なクイズ結果は設定
              quizResult = { 
                id: 'error-fallback-' + Date.now(),
                success: false 
              }
              
              // エラーが発生してもカード表示は継続
              console.log('🎯 Error occurred, but continuing with card display...')
              
              // 最終結果をカード情報と共に設定（エラー時も実行）
              const finalResultsWithCard: QuizResults = {
                ...finalResults,
                rewardedCard: selectedCard,
                isNewCard,
                cardCount
              }
              
              console.log('🚨 CLIENT: Setting results despite error:', {
                cardSelected: !!selectedCard,
                cardId: selectedCard?.id,
                isNewCard,
                cardCount
              })
              setResults(finalResultsWithCard)
            }
            
            // Save detailed quiz data with enhanced logging
            if (quizResult && questionAnswers.length > 0) {
              console.log('📊 Saving detailed quiz data with enhanced logging...')
              try {
                const detailData = questionAnswers.map(answer => ({
                  user_id: user.id,
                  quiz_result_id: quizResult.id!,
                  question_id: answer.questionId,
                  question_text: answer.questionText,
                  selected_answer: answer.selectedAnswer,
                  correct_answer: answer.correctAnswer,
                  is_correct: answer.isCorrect,
                  response_time: answer.responseTime,
                  confidence_level: answer.confidenceLevel,
                  category: answer.category,
                  difficulty: answer.difficulty
                }))
                
                console.log('📝 Detail data sample (first item):', detailData[0])
                console.log('🚀 Calling saveDetailedQuizData...')
                // TODO: Fix detailed_quiz_data table permissions
                // await saveDetailedQuizData(detailData)
                console.log('⏭️ Detailed quiz data save temporarily disabled')
                
              } catch (detailSaveError) {
                const error = detailSaveError as Error
                console.error('❌ Detail save error:', {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                  errorString: String(detailSaveError),
                  errorJSON: JSON.stringify(detailSaveError, Object.getOwnPropertyNames(detailSaveError))
                })
              }
            }
            
            // 🔄 復習モード完了処理
            if (isReviewMode) {
              try {
                console.log('🔄 Processing review completion...')
                
                // 復習完了データの準備
                const completedAnswers = questionAnswers.map(qa => ({
                  questionId: qa.questionId,
                  questionText: qa.questionText,
                  selectedAnswer: qa.selectedAnswer,
                  correctAnswer: qa.correctAnswer,
                  selectedOptionIndex: qa.selectedOptionIndex,
                  isCorrect: qa.isCorrect,
                  responseTime: qa.responseTime,
                  category: qa.category,
                  subcategory: qa.subcategory,
                  subcategory_id: qa.subcategory_id,
                  difficulty: qa.difficulty,
                  confidenceLevel: qa.confidenceLevel,
                  maxHintLevel: qa.maxHintLevel,
                  hintUsed: qa.hintUsed
                }))

                
                const sessionId = _sessionData.sessionId
                
                // 既存のSupabaseクライアントを使用（新しいクライアント作成を避ける）
                const { supabase } = await import('@/lib/supabase')
                
                const { data: sessionData } = await supabase.auth.getSession()
                const token = sessionData.session?.access_token
                
                if (!token) {
                  console.warn('No auth token available for review completion')
                  throw new Error('Authentication required')
                }
                
                // 復習完了API呼び出し
                const response = await fetch('/api/review/complete', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    sessionId,
                    completedAnswers
                  })
                })
                
                if (response.ok) {
                  const result = await response.json()
                  console.log('✅ Review completion processed:', result)
                  
                  // 統計更新イベントを発火
                  if (result.triggerStatsUpdate) {
                    console.log('📚 Triggering review stats update')
                    window.dispatchEvent(new Event('reviewCompleted'))
                  }
                } else {
                  const errorData = await response.json().catch(() => ({}))
                  console.error('❌ Review completion failed:', response.status, errorData)
                }
                
              } catch (reviewError) {
                console.error('❌ Error in review completion:', reviewError)
              }
            }
            
          }, 75); // 75ms遅延でDB処理開始
        } catch (error) {
          console.error('❌ Error in quiz completion process:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack,
            errorString: String(error),
            errorJSON: JSON.stringify(error, Object.getOwnPropertyNames(error))
          })
          // エラーが発生してもクイズを完了状態にする
        } finally {
          setIsCompleting(false)
          completionInProgress.current = false // エラー時もリセット
        }
      } else {
        console.warn('⚠️ No user ID available, quiz results not saved')
        setIsCompleting(false)
        completionInProgress.current = false // リセット
      }
      
      // 🚀 即座に結果画面を表示（UX最優先）
      console.log('⚡ Setting completion state for instant display...')
      console.log('🔍 Debug: Setting isFinished to true for completion screen')
      console.log('📊 Final results:', finalResults)
      // setResults は カード処理内で実行するため、ここでは実行しない
      setIsFinished(true)
      completionInProgress.current = false
      onComplete(finalResults)
      
      // 🎴 格言カード処理はサーバーサイド（API）で実行されるため、クライアントでの処理は削除
      console.log('✅ Quiz completed, card processing handled by server API')
    }
  }

  if (sessionQuestions.length === 0) {
    console.log('⏳ Quiz loading state - no questions loaded yet')
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>問題を読み込んでいます...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isFinished) {
    console.log('🎯 Quiz completion screen rendering - isFinished is true')
    console.log('📊 Results for completion screen:', results)
    const accuracyRate = Math.round((results.correctAnswers / results.totalQuestions) * 100)
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
            <Trophy className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">クイズ完了！</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* SKP獲得表示 */}
          {skpGained > 0 && (
            <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Zap className="h-6 w-6 text-yellow-500" />
                <span className="text-lg font-semibold text-yellow-700">SKPポイント獲得！</span>
              </div>
              <div className="text-3xl font-bold text-yellow-600 mb-1">+{skpGained} SKP</div>
              <div className="text-sm text-yellow-700">
                正解: {results.correctAnswers}問 × 10SKP = {results.correctAnswers * 10}SKP
                {(results.totalQuestions - results.correctAnswers) > 0 && (
                  <span><br />不正解: {results.totalQuestions - results.correctAnswers}問 × 2SKP = {(results.totalQuestions - results.correctAnswers) * 2}SKP</span>
                )}
                {results.correctAnswers === results.totalQuestions && results.totalQuestions >= 3 && (
                  <span><br />+ 全問正解ボーナス: 50SKP</span>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {results.correctAnswers}/{results.totalQuestions}
              </div>
              <div className="text-sm text-blue-700">正答数</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{accuracyRate}%</div>
              <div className="text-sm text-green-700">正答率</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {Math.floor(results.timeSpent / 60)}:{(results.timeSpent % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-purple-700">所要時間</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">カテゴリ別成績</h4>
            {(() => {
              // sessionQuestionsからcategory→category_name（日本語）のマップを構築
              const catNameMap = new Map<string, string>()
              sessionQuestions.forEach(q => {
                if (q.category_name && !catNameMap.has(q.category)) {
                  catNameMap.set(q.category, q.category_name)
                }
              })
              return Object.entries(results.categoryScores).map(([cat, score]) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium">{catNameMap.get(cat) || getCategoryDisplayName(cat)}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{score.correct}/{score.total}</span>
                  <Progress
                    value={(score.correct / score.total) * 100}
                    className="w-20 h-2"
                  />
                </div>
              </div>
              ))
            })()}
          </div>

          {/* Card Reward Section */}
          {results.rewardedCard ? (
            <div className="space-y-3 border-t pt-4">
              <div className="text-center">
                <h4 className="font-semibold text-lg mb-2 flex items-center justify-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>格言カード獲得！</span>
                </h4>
                {results.isNewCard ? (
                  <p className="text-sm text-green-600 mb-4">
                    ✨ 新しい格言カードを獲得しました！
                  </p>
                ) : (
                  <p className="text-sm text-blue-600 mb-4">
                    📚 格言カードを追加で獲得しました！（×{results.cardCount}）
                  </p>
                )}
              </div>
              <div className="flex justify-center">
                <div className="w-64">
                  <WisdomCard
                    card={{...results.rewardedCard, obtained: true, count: results.cardCount}}
                    showDetails={false}
                    subcategories={subcategories}
                  />
                </div>
              </div>
              <div className="text-center">
                <Button variant="outline" size="sm" asChild>
                  <a href="/collection">コレクションで確認</a>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex space-x-4">
            <Button onClick={onExit} variant="outline" className={mode === 'review' ? 'w-full' : 'flex-1'}>
              {category ? 'カテゴリーに戻る' : 'ホームに戻る'}
            </Button>
            {mode !== 'review' && (
            <Button onClick={async () => {
              // 状態を完全リセットして新しい問題セットでクイズを再開
              setIsFinished(false)
              setIsCompleting(false)
              setCurrentQuestionIndex(0)
              setSelectedOption(null)
              setShowResult(false)
              setQuestionAnswers([])
              setCurrentConfidence(null)
              setShowConfidenceInput(false)
              setSkpGained(0)
              completionInProgress.current = false
              setChallengeQuizUpdateData(null)
              setResults({
                score: 0,
                totalQuestions: 0,
                correctAnswers: 0,
                timeSpent: 0,
                categoryScores: {}
              })
              
              console.log(`🔄 [Quiz Restart] Regenerating questions with same conditions`)
              
              try {
                let newQuestions: Question[] = []
                
                // 同じ条件で新しい問題セットを生成（新しいAPI使用）
                if (category && mode === 'category') {
                  // カテゴリークイズ: 新しいAPI経由で取得
                  const session = await supabase.auth.getSession()
                  if (session.data.session?.access_token) {
                    console.log(`🎲 [Quiz Restart] Category quiz: ${category}, difficulties: ${difficulties?.join(', ') || 'ALL'}`)
                    newQuestions = await handleCategoryQuizOptimized(category, difficulties || [], session.data.session.access_token)
                  } else {
                    throw new Error('Authentication required for category quiz restart')
                  }
                } else {
                  // その他のクイズタイプ（セルフパーソナライズ、ビジネスAI、レビュー）: 新しいAPI使用
                  const session = await supabase.auth.getSession()
                  if (session.data.session?.access_token) {
                    console.log(`🔄 [Quiz Restart] Using Quick Start API for mode: ${mode}`)
                    
                    const response = await fetch('/api/quiz/quick-start', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.data.session.access_token}`
                      },
                      body: JSON.stringify({
                        quiz_type: mode,
                        count: 10
                      })
                    })

                    if (!response.ok) {
                      throw new Error(`API error: ${response.status}`)
                    }

                    const data = await response.json()
                    if (data.success && data.questions?.length >= 10) {
                      newQuestions = data.questions.slice(0, 10)
                      console.log(`✅ [Quiz Restart] Got ${newQuestions.length} questions from Quick Start API`)
                    } else {
                      throw new Error('Insufficient questions from API')
                    }
                  } else {
                    throw new Error('Authentication required for quiz restart')
                  }
                }
                
                // 新しい問題セットを設定
                setSessionQuestions(newQuestions)
                setResults(prev => ({
                  ...prev,
                  totalQuestions: newQuestions.length
                }))
                
                console.log(`✅ [Quiz Restart] Successfully generated ${newQuestions.length} new questions`)
                
              } catch (error) {
                console.error('❌ [Quiz Restart] Failed to generate new questions:', error)
                // エラー時は既存の問題セットでランダム選択
                const fallbackQuestions = getRandomQuestions(questions, 10)
                setSessionQuestions(fallbackQuestions)
                setResults(prev => ({
                  ...prev,
                  totalQuestions: fallbackQuestions.length
                }))
                console.log(`🔄 [Quiz Restart] Using fallback: ${fallbackQuestions.length} questions`)
              }
            }} className="flex-1">
              もう一度挑戦
            </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = ((currentQuestionIndex + 1) / sessionQuestions.length) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {category ? getCategoryDisplayName(category) : 'チャレンジクイズ'}
        </h2>
        <Button variant="outline" size="sm" onClick={onExit}>
          終了
        </Button>
      </div>
      
      <Progress value={progressPercentage} className="w-full" />
      
      <QuizCard
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={sessionQuestions.length}
        onAnswer={handleAnswer}
        onNext={handleNext}
        showResult={showResult}
        selectedOption={selectedOption}
        confidenceLevel={currentConfidence}
        onConfidenceChange={setCurrentConfidence}
        showConfidenceInput={showConfidenceInput && showResult}
        hintsEnabled={hintsEnabled}
        onHintUsed={(level, hint) => {
          console.log(`🔍 Hint used: Level ${level} - ${hint}`)
          
          // 現在の問題IDに対するヒント使用レベルを記録
          const questionId = (currentQuestion.id || 0).toString()
          setHintUsageMap(prev => ({
            ...prev,
            [questionId]: Math.max(prev[questionId] || 0, level)
          }))
          
          console.log('🎯 Hint System Debug:', {
            questionId: questionId,
            hintLevel: level,
            hintText: hint,
            willApplyPenalty: true
          })
        }}
      />
    </div>
  )
}
