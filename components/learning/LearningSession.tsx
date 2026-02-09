'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { getLearningCourseDetails } from '@/lib/learning/data'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  Star,
  Clock,
  BookOpen,
  Award
} from 'lucide-react'
import { LearningSession as LearningSessionType, SessionTypeLabels, UserBadge, LearningCourse } from '@/lib/types/learning'
import { useAuth } from '@/components/auth/AuthProvider'
import MermaidRenderer, { parseContentWithMermaid } from './MermaidRenderer'
import { useXPStats } from '@/hooks/useXPStats'
import { supabase } from '@/lib/supabase'
import { acquireKnowledgeCard } from '@/lib/knowledge-cards-v2'

interface LearningSessionProps {
  courseId: string
  genreId: string
  themeId: string
  categoryId: string
  subcategoryId: string
  session: LearningSessionType
  totalSessions: number
  currentSessionIndex: number
  themeRewardCard?: {
    id: string
    title: string
    description?: string
    icon?: string
  }
  onComplete: (sessionId: string) => void
  onNext: () => void
  onPrevious: () => void
  onExit: () => void
}

type ViewState = 'content' | 'quiz' | 'completed'

// 新設計: セッション完了APIレスポンス型
interface CourseSessionResponse {
  success: boolean
  session_id?: string
  session_xp?: number
  completion_bonus_xp?: number
  total_earned_xp?: number
  is_first_completion?: boolean
  quiz_correct?: boolean
  theme_completed?: boolean
  course_completed?: boolean
  streak_bonus?: {
    skpGained: number
    breakdown: {
      base: number
      bonus: number
      description: string
    }
  } | null
  message?: string
  error?: string
}

export default function LearningSession({
  courseId,
  genreId,
  themeId,
  categoryId,
  subcategoryId,
  session,
  totalSessions,
  currentSessionIndex,
  themeRewardCard,
  onComplete,
  onNext,
  onPrevious: _onPrevious,
  onExit
}: LearningSessionProps) {
  const _router = useRouter()
  const { user } = useAuth()
  const { saveCourseSession: _saveCourseSession } = useXPStats()
  const [viewState, setViewState] = useState<ViewState>('content')
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({})
  const [quizAnswerIndices, setQuizAnswerIndices] = useState<{ [key: number]: number }>({})
  const [quizResults, setQuizResults] = useState<{ [key: number]: boolean }>({})
  const [showQuizResult, setShowQuizResult] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [_cardAcquired, setCardAcquired] = useState(false)
  const [_badgeAwarded, _setBadgeAwarded] = useState<UserBadge | null>(null)
  const [startTime] = useState(new Date())
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null)
  const [isCompletingSession, setIsCompletingSession] = useState(false)
  const [_courseName, setCourseName] = useState<string>('Learning Course')
  const [isFirstCompletion, setIsFirstCompletion] = useState<boolean | null>(null)
  const [isFirstCourseCompletion, setIsFirstCourseCompletion] = useState<boolean | null>(null)
  const [isFirstThemeCompletion, setIsFirstThemeCompletion] = useState<boolean | null>(null)
  const [_isThemeCompleted, setIsThemeCompleted] = useState<boolean>(false)

  const hasQuiz = session.quiz && session.quiz.length > 0
  const _isLastSession = currentSessionIndex === totalSessions - 1
  
  // 完了状態
  const [showThemeCompletion, setShowThemeCompletion] = useState(false)
  const [showCourseCompletion, setShowCourseCompletion] = useState(false)
  const [sessionXP, setSessionXP] = useState(0)
  const [courseCompletionBonusXP, setCourseCompletionBonusXP] = useState(0)
  const [totalEarnedXP, setTotalEarnedXP] = useState(0)
  // Client-side completion tracking
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set())
  const [completedThemes, setCompletedThemes] = useState<Set<string>>(new Set())
  const [courseData, setCourseData] = useState<LearningCourse | null>(null)
  
  // Fetch course data and load completion status
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const courseDetails = await getLearningCourseDetails(courseId)
        if (courseDetails) {
          setCourseName(courseDetails.title)
          setCourseData(courseDetails)
          
          // Load existing completions from database
          if (user?.id) {
            const { data: sessionCompletions } = await supabase
              .from('course_session_completions')
              .select('session_id')
              .eq('user_id', user.id)
              .eq('course_id', courseId)
              .eq('is_first_completion', true)
            
            console.log('🔍 Loading completed sessions from database:', sessionCompletions)
            
            if (sessionCompletions) {
              setCompletedSessions(new Set(sessionCompletions.map(s => s.session_id)))
            }
            
            const { data: themeCompletions } = await supabase
              .from('course_theme_completions')
              .select('theme_id')
              .eq('user_id', user.id)
              .eq('course_id', courseId)
            
            console.log('🔍 Loading completed themes from database:', themeCompletions)
            
            if (themeCompletions) {
              setCompletedThemes(new Set(themeCompletions.map(t => t.theme_id)))
            }
          }
        }
      } catch (error) {
        console.error('Error fetching course details:', error)
      }
    }
    fetchCourseData()
  }, [courseId, user?.id])

  // 初回完了判定
  useEffect(() => {
    const checkFirstCompletion = async () => {
      if (!user?.id) return
      
      try {
        console.log('🔍 Checking if this is first completion...', {
          userId: user.id.substring(0, 8) + '...',
          sessionId: session.id,
          courseId
        })
        
        const { data: existingCompletion, error } = await supabase
          .from('course_session_completions')
          .select('id, is_first_completion')
          .eq('user_id', user.id)
          .eq('session_id', session.id)
          .eq('is_first_completion', true)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error checking first completion:', error)
          return
        }
        
        const isFirst = !existingCompletion
        setIsFirstCompletion(isFirst)
        
        // Check first course completion (use course_completions table)
        const { data: existingCourseCompletion, error: courseError } = await supabase
          .from('course_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single()
        
        if (courseError && courseError.code !== 'PGRST116') {
          console.error('❌ Error checking first course completion:', courseError)
          return
        }
        
        const isFirstCourse = !existingCourseCompletion
        setIsFirstCourseCompletion(isFirstCourse)
        
        // Check first theme completion
        const { data: existingThemeCompletion, error: themeError } = await supabase
          .from('course_theme_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('theme_id', themeId)
          .eq('course_id', courseId)
          .single()
        
        if (themeError && themeError.code !== 'PGRST116') {
          console.error('❌ Error checking first theme completion:', themeError)
          return
        }
        
        const isFirstTheme = !existingThemeCompletion
        setIsFirstThemeCompletion(isFirstTheme)
        
        console.log(`✅ First completion determination:`, {
          session: isFirst,
          course: isFirstCourse,
          theme: isFirstTheme,
          details: {
            sessionId: session.id,
            courseId,
            themeId
          }
        })
      } catch (error) {
        console.error('❌ Error in checkFirstCompletion:', error)
      }
    }
    
    checkFirstCompletion()
  }, [user?.id, session.id, courseId, themeId])

  const renderProgressBar = () => {
    const progress = ((currentSessionIndex + 1) / totalSessions) * 100
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>学習進捗</span>
          <span>{currentSessionIndex + 1}/{totalSessions} セッション</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    )
  }

  const handleStartQuiz = async () => {
    // 初回完了判定が完了するまで待機
    if (isFirstCompletion === null || isFirstThemeCompletion === null || isFirstCourseCompletion === null) {
      console.log('⏳ Waiting for first completion determination...')
      return
    }
    
    // Prevent scroll jump by not changing focus
    if (hasQuiz) {
      setQuizStartTime(new Date()) // 理解度チェック開始時間記録
      setViewState('quiz')
      setCurrentQuizIndex(0)
      setQuizAnswers({})
      setQuizAnswerIndices({})
      setQuizResults({})
      setShowQuizResult(false)
    } else {
      await completeSession()
    }
  }

  const handleQuizAnswer = (answerIndex: number) => {
    const currentQuiz = session.quiz![currentQuizIndex]
    const isCorrect = answerIndex === currentQuiz.correct
    
    setQuizAnswers(prev => ({
      ...prev,
      [currentQuizIndex]: currentQuiz.options[answerIndex]
    }))
    
    setQuizAnswerIndices(prev => ({
      ...prev,
      [currentQuizIndex]: answerIndex
    }))
    
    setQuizResults(prev => ({
      ...prev,
      [currentQuizIndex]: isCorrect
    }))
    
    setShowQuizResult(true)
  }

  const handleNextQuizQuestion = async () => {
    if (currentQuizIndex < session.quiz!.length - 1) {
      setCurrentQuizIndex(prev => prev + 1)
      setShowQuizResult(false)
    } else {
      await completeSession()
    }
  }

  // 新設計: session_quiz_correctの計算
  const calculateQuizCorrect = () => {
    if (!hasQuiz) {
      return true // クイズがない場合は正解扱い
    }
    
    const correctCount = Object.values(quizResults).filter(result => result).length
    const totalQuestions = session.quiz!.length
    const accuracy = correctCount / totalQuestions
    
    return accuracy >= 0.7 // 70%以上で正解扱い
  }

  // 新設計: コース学習セッション完了API呼び出し（クライアント判定結果付き）
  const saveSessionProgress = async (clientThemeCompleted = false, clientCourseCompleted = false): Promise<CourseSessionResponse> => {
    if (!user) {
      throw new Error('Authentication required')
    }

    const endTime = new Date()
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
    const quizCorrect = calculateQuizCorrect()
    
    // クイズの解答時間を計算（クイズ開始時間から終了まで）
    let quizTimeSpent: number | undefined
    if (hasQuiz && quizStartTime) {
      quizTimeSpent = Math.floor((endTime.getTime() - quizStartTime.getTime()) / 1000)
    }
    
    // 選択した回答のインデックスを取得（クイズがある場合のみ）
    let quizUserAnswer: number | null = null
    if (hasQuiz && quizAnswerIndices[0] !== undefined) {
      quizUserAnswer = quizAnswerIndices[0] // コース確認クイズは1問のみ
    }

    const requestBody = {
      session_id: session.id,
      course_id: courseId,
      theme_id: themeId,
      genre_id: genreId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      session_quiz_correct: quizCorrect,
      completion_time: endTime.toISOString(),
      session_start_time: startTime.toISOString(),
      session_end_time: endTime.toISOString(),
      duration_seconds: durationSeconds,
      quiz_time_spent: quizTimeSpent, // 実際のクイズ解答時間
      quiz_user_answer: quizUserAnswer, // 選択した回答のインデックス
      // クライアント側完了判定結果を追加
      client_theme_completed: clientThemeCompleted,
      client_course_completed: clientCourseCompleted
    }

    console.log('💾 Saving course session progress:', requestBody)
    console.log('🎯 Quiz debug info:', {
      hasQuiz,
      quizStartTime,
      quizTimeSpent,
      quizAnswerIndices,
      quizUserAnswer,
      quizCorrect
    })

    // Supabaseセッションからトークンを取得
    const { data: { session: authSession } } = await supabase.auth.getSession()
    
    const response = await fetch('/api/xp-save/course', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession?.access_token || ''}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    const result: CourseSessionResponse = await response.json()
    console.log('✅ Course session API response:', result)

    return result
  }

  // Client-side completion detection functions
  const checkThemeCompletion = (sessionId: string): boolean => {
    if (!courseData) {
      console.log('❌ Theme completion check: No course data')
      return false
    }
    
    // Find the theme for this session
    let currentTheme = null
    for (const genre of courseData.genres) {
      for (const theme of genre.themes) {
        if (theme.sessions.some((s) => s.id === sessionId)) {
          currentTheme = theme
          break
        }
      }
      if (currentTheme) break
    }
    
    if (!currentTheme) {
      console.log(`❌ Theme completion check: No theme found for session ${sessionId}`)
      return false
    }
    
    // Add current session to completed sessions
    const updatedCompletedSessions = new Set(completedSessions)
    updatedCompletedSessions.add(sessionId)
    
    // Check if all sessions in this theme are completed
    const themeSessionIds = currentTheme.sessions.map((s) => s.id)
    const allThemeSessionsCompleted = themeSessionIds.every((sid: string) => 
      updatedCompletedSessions.has(sid)
    )
    
    console.log('🎯 Theme completion check (DETAILED):', {
      themeId: currentTheme.id,
      sessionId,
      totalSessions: themeSessionIds.length,
      themeSessionIds,
      currentCompletedSessions: Array.from(completedSessions),
      updatedCompletedSessions: Array.from(updatedCompletedSessions),
      completedInTheme: themeSessionIds.filter((sid: string) => updatedCompletedSessions.has(sid)),
      missingInTheme: themeSessionIds.filter((sid: string) => !updatedCompletedSessions.has(sid)),
      isComplete: allThemeSessionsCompleted
    })
    
    return allThemeSessionsCompleted
  }
  
  const checkCourseCompletion = (completingSessionId: string): boolean => {
    if (!courseData) return false
    
    // Add current session to completed sessions
    const updatedCompletedSessions = new Set(completedSessions)
    updatedCompletedSessions.add(completingSessionId)
    
    // Get all session IDs in the course
    const allSessionIds: string[] = []
    for (const genre of courseData.genres) {
      for (const theme of genre.themes) {
        for (const session of theme.sessions) {
          allSessionIds.push(session.id)
        }
      }
    }
    
    // Check if all sessions are completed
    const allSessionsCompleted = allSessionIds.every((sid: string) => 
      updatedCompletedSessions.has(sid)
    )
    
    console.log('🏆 Course completion check:', {
      courseId,
      totalSessions: allSessionIds.length,
      completedSessions: allSessionIds.filter((sid: string) => updatedCompletedSessions.has(sid)).length,
      isComplete: allSessionsCompleted
    })
    
    return allSessionsCompleted
  }

  const completeSession = async () => {
    if (!user?.id || sessionCompleted || isCompletingSession) {
      console.error('❌ Cannot complete session: missing user or session already completed or in progress')
      return
    }

    console.log('🚀 Starting session completion...')
    setIsCompletingSession(true)

    try {
      // 🚀 DETAILED DEBUG: Check current state before completion detection
      console.log('🔍 COMPLETION DEBUG - Current state:', {
        sessionId: session.id,
        themeId,
        courseId,
        completedSessions: Array.from(completedSessions),
        completedThemes: Array.from(completedThemes),
        isFirstCompletion,
        isFirstThemeCompletion,
        isFirstCourseCompletion,
        courseData: courseData ? {
          totalGenres: courseData.genres.length,
          totalThemes: courseData.genres.reduce((t, g) => t + g.themes.length, 0),
          currentTheme: courseData.genres.flatMap(g => g.themes).find(t => t.id === themeId)?.title
        } : null
      })
      
      // 🚀 Client-side completion detection BEFORE API call
      const willCompleteTheme = checkThemeCompletion(session.id)
      let willCompleteCourse = false
      
      // セッション完了数ベースでコース完了判定
      willCompleteCourse = checkCourseCompletion(session.id)
      
      console.log('🎯 Client-side completion predictions:', {
        sessionId: session.id,
        themeId,
        willCompleteTheme,
        willCompleteCourse,
        firstCompletionStates: {
          session: isFirstCompletion,
          theme: isFirstThemeCompletion,
          course: isFirstCourseCompletion
        }
      })
      
      // ⚡ Client-side XP calculation for instant display (0ms delay)
      let predictedSessionXP = 0
      if (isFirstCompletion && calculateQuizCorrect()) {
        try {
          console.log('⚡ Calculating session XP on client-side for instant display...')
          
          // Import XP calculation functions dynamically
          const { loadXPSettings, calculateCourseXP } = await import('@/lib/xp-settings')
          const { mapDifficultyToEnglish } = await import('@/lib/xp-level-system')
          
          // Load XP settings from same source as API
          const xpSettings = await loadXPSettings()
          
          // Get course difficulty (same logic as API)
          const courseDifficulty = courseData?.difficulty || 'basic'
          const unifiedDifficulty = mapDifficultyToEnglish(courseDifficulty)
          
          // Calculate session XP using same function as API
          predictedSessionXP = calculateCourseXP(unifiedDifficulty, xpSettings)
          
          console.log('⚡ Client-side session XP prediction completed:', {
            courseDifficulty,
            unifiedDifficulty,
            predictedSessionXP,
            isFirstCompletion,
            quizCorrect: calculateQuizCorrect(),
            settingsSource: 'xp_level_skp_settings (via loadXPSettings)'
          })
        } catch (error) {
          console.warn('⚠️ Client-side session XP calculation failed, will rely on API result:', error)
          predictedSessionXP = 0
        }
      }

      // 🚀 Immediate UI updates based on client-side detection
      setSessionCompleted(true)
      setViewState('completed')
      onComplete(session.id)
      
      // ⚡ Show predicted session XP immediately (0ms delay for better UX)
      if (predictedSessionXP > 0) {
        setSessionXP(predictedSessionXP)
        console.log(`⚡ Session XP displayed instantly: ${predictedSessionXP} (predicted from xp_level_skp_settings)`)
      }
      
      // Update local completion tracking
      const updatedSessions = new Set(completedSessions)
      updatedSessions.add(session.id)
      setCompletedSessions(updatedSessions)
      
      if (willCompleteTheme) {
        const updatedThemes = new Set(completedThemes)
        updatedThemes.add(themeId)
        setCompletedThemes(updatedThemes)
        
        // Show theme completion UI only for first THEME completion (not session completion)
        if (isFirstThemeCompletion === true) {
          setShowThemeCompletion(true)
          setCardAcquired(true)
          console.log('🎯 Theme completion UI shown for first THEME completion')
        } else {
          console.log('🎯 Theme completed but not first time - no completion UI shown (theme already completed before)')
        }
        setIsThemeCompleted(true)
        
        // Knowledge card acquisition (V2: use first THEME completion status)
        if (isFirstThemeCompletion) {
          try {
            const result = await acquireKnowledgeCard(user.id, themeId, true)
            if (result.success && result.isNew) {
              console.log(`🎉 New knowledge card acquired: ${result.card?.title}`)
            } else {
              console.log(`📚 ${result.message}`)
            }
          } catch (cardError) {
            console.warn('⚠️ Failed to acquire knowledge card:', cardError)
          }
        } else {
          console.log('📚 Knowledge card not acquired - not first THEME completion')
        }
      }
      
      // ⚡ Client-side course completion bonus XP calculation
      let predictedBonusXP = 0
      if (willCompleteCourse && isFirstCourseCompletion) {
        try {
          console.log('⚡ Calculating course completion bonus XP on client-side...')
          
          // Use same XP settings already loaded above
          const { loadXPSettings } = await import('@/lib/xp-settings')
          const xpSettings = await loadXPSettings()
          
          // Course completion bonus from same settings as API
          predictedBonusXP = xpSettings.xp_bonus.course_completion || 0
          setCourseCompletionBonusXP(predictedBonusXP)
          
          console.log('⚡ Course completion bonus XP predicted:', {
            sessionXP: predictedSessionXP,
            bonusXP: predictedBonusXP,
            totalPredictedXP: predictedSessionXP + predictedBonusXP,
            settingsSource: 'xp_level_skp_settings (course_completion bonus)'
          })
          
          // Set individual XP values and total
          const totalPredicted = predictedSessionXP + predictedBonusXP
          setTotalEarnedXP(totalPredicted)
          console.log(`⚡ Total XP with bonus displayed instantly: ${totalPredicted} (session: ${predictedSessionXP} + bonus: ${predictedBonusXP})`)
        } catch (error) {
          console.warn('⚠️ Course completion bonus XP calculation failed:', error)
        }
        
        setShowCourseCompletion(true)
        console.log('🏆 Course completion UI shown for first completion')
      } else if (willCompleteCourse && !isFirstCourseCompletion) {
        console.log('🏆 Course completed but not first time - no completion UI shown')
      }
      
      console.log('⚡ UI updated immediately with client-side completion detection')
      
      // Parallel API call for database updates with client judgments
      Promise.resolve().then(async () => {
        try {
          const apiResult = await saveSessionProgress(willCompleteTheme, willCompleteCourse)

          if (apiResult.success) {
            // Verify XP prediction accuracy and update if different using new API structure
            if (apiResult.session_xp !== undefined || apiResult.completion_bonus_xp !== undefined || apiResult.total_earned_xp !== undefined) {
              const apiSessionXP = apiResult.session_xp || 0
              const apiBonusXP = apiResult.completion_bonus_xp || 0
              const apiTotalXP = apiResult.total_earned_xp || 0
              
              console.log('🔍 API vs Client XP comparison:', {
                api: { session: apiSessionXP, bonus: apiBonusXP, total: apiTotalXP },
                client: { session: predictedSessionXP, bonus: predictedBonusXP, total: predictedSessionXP + predictedBonusXP }
              })
              
              // Update with API values if different from predictions
              if (apiSessionXP !== predictedSessionXP) {
                console.warn(`⚠️ Session XP prediction mismatch: predicted ${predictedSessionXP}, actual ${apiSessionXP}`)
                setSessionXP(apiSessionXP)
              }
              
              if (apiBonusXP !== predictedBonusXP) {
                console.warn(`⚠️ Bonus XP prediction mismatch: predicted ${predictedBonusXP}, actual ${apiBonusXP}`)
                setCourseCompletionBonusXP(apiBonusXP)
              }
              
              if (apiTotalXP !== (predictedSessionXP + predictedBonusXP)) {
                console.warn(`⚠️ Total XP prediction mismatch: predicted ${predictedSessionXP + predictedBonusXP}, actual ${apiTotalXP}`)
                setTotalEarnedXP(apiTotalXP)
              }
              
              // Fallback: if prediction failed completely, use API values
              if (predictedSessionXP === 0 && apiSessionXP > 0) {
                setSessionXP(apiSessionXP)
                console.log(`✅ Session XP displayed from API result: ${apiSessionXP}`)
              }
              
              if (predictedBonusXP === 0 && apiBonusXP > 0) {
                setCourseCompletionBonusXP(apiBonusXP)
                console.log(`✅ Bonus XP displayed from API result: ${apiBonusXP}`)
              }
              
              if ((predictedSessionXP + predictedBonusXP) === 0 && apiTotalXP > 0) {
                setTotalEarnedXP(apiTotalXP)
                console.log(`✅ Total XP displayed from API result: ${apiTotalXP}`)
              }
              
              if (apiSessionXP === predictedSessionXP && apiBonusXP === predictedBonusXP) {
                console.log(`✅ XP prediction accurate: session ${apiSessionXP}, bonus ${apiBonusXP}, total ${apiTotalXP}`)
              }
            }
            
            console.log('✅ Database updates completed in background')
          } else {
            console.error('❌ API returned error:', apiResult.error)
          }
        } catch (error) {
          console.error('❌ Background API error:', error)
        }
      })
      
    } catch (error) {
      console.error('❌ Error in session completion:', error)
    } finally {
      setIsCompletingSession(false)
    }
  }

  const getQuizScore = () => {
    const correct = Object.values(quizResults).filter(r => r).length
    const total = session.quiz?.length || 1
    return Math.round((correct / total) * 100)
  }

  const handleContinue = () => {
    onNext()
  }

  const renderContentView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onExit}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>コースに戻る</span>
        </Button>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{session.estimatedMinutes}分</span>
        </div>
      </div>

      {renderProgressBar()}

      {/* Session Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{session.title}</CardTitle>
              <Badge variant="outline">
                {SessionTypeLabels[session.type]}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-2xl">{(session as { icon?: string }).icon || '📚'}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="prose max-w-none space-y-6">
            {session.content && session.content.length > 0 ? (
              session.content.map((contentItem: { id?: string; title?: string; type?: string; content?: string }, index: number) => {
                const item = contentItem
                return (
                <div key={item.id || index} className="space-y-3">
                  {item.title && (
                    <h3 className="text-lg font-semibold text-primary">
                      {item.title}
                    </h3>
                  )}
                  
                  {item.type === 'text' && item.content && (
                    <div className="space-y-3">
                      {parseContentWithMermaid(item.content).map((segment, segIndex) => (
                        segment.type === 'mermaid' ? (
                          <MermaidRenderer
                            key={`mermaid-${segIndex}`}
                            chart={segment.content}
                            className="my-4"
                          />
                        ) : (
                          <div key={`text-${segIndex}`}>
                            {segment.content.split('\n').map((paragraph: string, pIndex: number) => (
                              paragraph.trim() && (
                                <p key={pIndex} className="leading-relaxed text-gray-700">
                                  {paragraph.trim()}
                                </p>
                              )
                            ))}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  
                  {item.type === 'key_points' && item.content && (
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                      <div className="space-y-2">
                        {parseContentWithMermaid(item.content).map((segment, segIndex) => (
                          segment.type === 'mermaid' ? (
                            <MermaidRenderer
                              key={`mermaid-kp-${segIndex}`}
                              chart={segment.content}
                              className="my-4 bg-white"
                            />
                          ) : (
                            segment.content.split('\n').map((point: string, pIndex: number) => (
                              point.trim() && (
                                <div key={`kp-${segIndex}-${pIndex}`} className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-sm text-blue-800">{point.trim().replace(/^[•\-]\s*/, '')}</span>
                                </div>
                              )
                            ))
                          )
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'example' && item.content && (
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <div className="space-y-2">
                        {parseContentWithMermaid(item.content).map((segment, segIndex) => (
                          segment.type === 'mermaid' ? (
                            <MermaidRenderer
                              key={`mermaid-ex-${segIndex}`}
                              chart={segment.content}
                              className="my-4 bg-white"
                            />
                          ) : (
                            segment.content.split('\n').map((line: string, pIndex: number) => (
                              line.trim() && (
                                <p key={`ex-${segIndex}-${pIndex}`} className="text-sm text-green-800 leading-relaxed">
                                  {line.trim()}
                                </p>
                              )
                            ))
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">コンテンツを読み込んでいます...</p>
              </div>
            )}
          </div>

          {/* Action Button - Fixed at bottom with proper spacing */}
          <div className="sticky bottom-0 bg-background pt-4 mt-6 border-t">
            <div className="flex justify-center">
              <Button 
                onClick={handleStartQuiz}
                size="lg"
                className="flex items-center space-x-2"
                disabled={isCompletingSession}
              >
                {isCompletingSession ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>処理中...</span>
                  </>
                ) : hasQuiz ? (
                  <>
                    <BookOpen className="h-4 w-4" />
                    <span>理解度チェック</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>学習完了</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderQuizView = () => {
    if (!hasQuiz) return null

    const currentQuiz = session.quiz![currentQuizIndex]
    const isAnswered = currentQuizIndex in quizAnswers

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setViewState('content')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>コンテンツに戻る</span>
          </Button>
          <Badge variant="secondary">
            理解度チェック {currentQuizIndex + 1}/{session.quiz!.length}
          </Badge>
        </div>

        {renderProgressBar()}

        {/* Quiz Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{currentQuiz.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {currentQuiz.options.map((option, index) => {
                let buttonVariant: "default" | "outline" | "destructive" | "secondary" = "outline"
                let icon = null

                if (showQuizResult && isAnswered) {
                  if (index === currentQuiz.correct) {
                    buttonVariant = "default"
                    icon = <Check className="h-4 w-4 flex-shrink-0" />
                  } else if (quizAnswers[currentQuizIndex] === option && index !== currentQuiz.correct) {
                    buttonVariant = "destructive"
                    icon = <X className="h-4 w-4 flex-shrink-0" />
                  }
                }

                return (
                  <Button
                    key={index}
                    variant={buttonVariant}
                    className="justify-start h-auto p-4 text-left whitespace-normal min-h-[auto]"
                    onClick={() => !showQuizResult && handleQuizAnswer(index)}
                    disabled={showQuizResult}
                  >
                    <div className="flex items-start justify-between w-full gap-2">
                      <span className="break-words overflow-wrap-anywhere flex-1">{option}</span>
                      {icon}
                    </div>
                  </Button>
                )
              })}
            </div>

            {/* 正解不正解のパネルは取り除く（要求通り） */}
            {showQuizResult && (
              <div className="flex justify-center">
                <Button 
                  onClick={handleNextQuizQuestion}
                  disabled={isCompletingSession}
                >
                  {isCompletingSession && currentQuizIndex === session.quiz!.length - 1 ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      処理中...
                    </>
                  ) : currentQuizIndex === session.quiz!.length - 1 ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      セッション完了
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      次の問題
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderCompletedView = () => (
    <div className="space-y-6">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Award className="h-10 w-10 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">セッション完了！</h2>
          <p className="text-muted-foreground">
            「{session.title}」を完了しました
          </p>
        </div>

        {(sessionXP > 0 || totalEarnedXP > 0) && (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-lg font-semibold">{totalEarnedXP || sessionXP} XP</span>
                <span className="text-gray-600">獲得</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz Score */}
        {hasQuiz && (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                {session.quiz!.length === 1 ? (
                  // 1問の場合は正解/不正解で表示
                  <div className={`text-3xl font-bold ${
                    Object.values(quizResults).filter(r => r).length > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Object.values(quizResults).filter(r => r).length > 0 ? '正解' : '不正解'}
                  </div>
                ) : (
                  // 複数問の場合は点数で表示
                  <div className="text-3xl font-bold text-primary">
                    {getQuizScore()}点
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {session.quiz!.length}問中 {Object.values(quizResults).filter(r => r).length}問正解
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* テーマ完了表示 */}
        {showThemeCompletion && themeRewardCard && (
          <Card className="max-w-md mx-auto bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>ナレッジカードを獲得！</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-2xl">{themeRewardCard.icon || '🎯'}</div>
              <div className="font-semibold">{themeRewardCard.title}</div>
              <div className="text-sm text-muted-foreground">
                {themeRewardCard.description || 'テーマ完了の証として獲得'}
              </div>
              <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
                🎉 新しいナレッジカードを獲得しました！<br/>
                コレクションで確認できます。
              </div>
            </CardContent>
          </Card>
        )}

        {/* コース完了表示 */}
        {showCourseCompletion && (
          <Card className="max-w-md mx-auto bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Award className="h-5 w-5 text-purple-500" />
                <span>修了証を獲得！</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-4xl">🏆</div>
              <div className="font-semibold text-purple-800">コース修了証</div>
              <div className="text-sm text-purple-700">
                コース完了の証として獲得
              </div>
              
              {/* XP獲得詳細表示（修正版：新しいstate変数使用） */}
              {(sessionXP > 0 || courseCompletionBonusXP > 0 || totalEarnedXP > 0) && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                  <div className="text-lg font-bold text-orange-800 mb-2">
                    🌟 獲得XP: {totalEarnedXP || (sessionXP + courseCompletionBonusXP)} XP
                  </div>
                  {/* セッションXPとボーナスXPの内訳表示 */}
                  <div className="text-sm space-y-1 text-orange-700">
                    {sessionXP > 0 && (
                      <div className="flex justify-between items-center">
                        <span>📚 セッション完了:</span>
                        <span className="font-semibold">{sessionXP} XP</span>
                      </div>
                    )}
                    {courseCompletionBonusXP > 0 && (
                      <div className="flex justify-between items-center">
                        <span>🎉 コース完了ボーナス:</span>
                        <span className="font-semibold text-purple-700">{courseCompletionBonusXP} XP</span>
                      </div>
                    )}
                    {(sessionXP > 0 || courseCompletionBonusXP > 0) && (
                      <div className="border-t border-orange-200 pt-1 mt-2">
                        <div className="flex justify-between items-center font-bold">
                          <span>合計:</span>
                          <span className="text-orange-800">{totalEarnedXP || (sessionXP + courseCompletionBonusXP)} XP</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-3 p-3 bg-purple-100 rounded text-sm text-purple-800">
                🎉 コース完了おめでとうございます！<br/>修了証はコレクションで確認できます。
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-center space-x-4">
          {currentSessionIndex < totalSessions - 1 && (
            <Button onClick={handleContinue} size="lg">
              <ArrowRight className="h-4 w-4 mr-2" />
              次のセッション
            </Button>
          )}
          <Button onClick={onExit} variant="outline" size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            コースに戻る
          </Button>
        </div>

        {showThemeCompletion && (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-green-800 font-semibold mb-2">
                🎉 テーマ完了おめでとうございます！
              </div>
              <div className="text-sm text-green-700">
                すべてのセッションを完了しました
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  switch (viewState) {
    case 'content':
      return renderContentView()
    case 'quiz':
      return renderQuizView()
    case 'completed':
      return renderCompletedView()
    default:
      return renderContentView()
  }
}