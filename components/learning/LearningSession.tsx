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
import { LearningSession as LearningSessionType, SessionTypeLabels, UserBadge } from '@/lib/types/learning'
import { saveLearningProgressSupabase, saveLearningSession as saveLearningSessionSupabase, updateLearningSession, LearningSession as LearningSessionData } from '@/lib/supabase-learning'
import { addKnowledgeCardToCollection } from '@/lib/supabase-cards'
import { useAuth } from '@/components/auth/AuthProvider'
import { useXPStats } from '@/hooks/useXPStats'
import { checkAndAwardCourseBadge } from '@/lib/course-completion'
import { supabase } from '@/lib/supabase'

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
  const { saveCourseSession } = useXPStats()
  const [viewState, setViewState] = useState<ViewState>('content')
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({})
  const [quizResults, setQuizResults] = useState<{ [key: number]: boolean }>({})
  const [showQuizResult, setShowQuizResult] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [cardAcquired, setCardAcquired] = useState(false)
  const [badgeAwarded, setBadgeAwarded] = useState<UserBadge | null>(null)
  const [startTime] = useState(new Date())
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null)
  const [currentSessionData, setCurrentSessionData] = useState<LearningSessionData | null>(null)
  const [isCompletingSession, setIsCompletingSession] = useState(false)
  const [_courseName, setCourseName] = useState<string>('Learning Course')
  const [isFirstCompletion, setIsFirstCompletion] = useState<boolean | null>(null)
  const [isThemeCompleted, setIsThemeCompleted] = useState<boolean>(false)

  const hasQuiz = session.quiz && session.quiz.length > 0
  const isLastSession = currentSessionIndex === totalSessions - 1
  
  // Fetch course name
  useEffect(() => {
    const fetchCourseName = async () => {
      try {
        const courseDetails = await getLearningCourseDetails(courseId)
        if (courseDetails) {
          setCourseName(courseDetails.title)
        }
      } catch (error) {
        console.error('Error fetching course details:', error)
      }
    }
    fetchCourseName()
  }, [courseId])
  
  // Pre-determine if this is a first completion (before any user_settings updates)
  useEffect(() => {
    const checkFirstCompletion = async () => {
      if (!user?.id) return
      
      try {
        const progressKey = `${courseId}_${genreId}_${themeId}_${session.id}`
        const { data: settingData } = await supabase
          .from('user_settings')
          .select('setting_value')
          .eq('user_id', user.id)
          .eq('setting_key', `lp_${progressKey}`)
          .single()
        
        const progressData = settingData?.setting_value as { completed?: boolean } | null
        const isFirst = !progressData?.completed
        setIsFirstCompletion(isFirst)
        console.log(`🔍 Pre-determined completion status: isFirstCompletion=${isFirst}`, {
          progressKey: `lp_${progressKey}`,
          progressData
        })
      } catch (error) {
        // エラー = 記録なし = 初回完了
        setIsFirstCompletion(true)
        console.log(`🔍 Pre-determined completion status: isFirstCompletion=true (no record)`, error)
      }
    }
    
    checkFirstCompletion()
  }, [user?.id, courseId, genreId, themeId, session.id])

  // Check if all sessions in the theme are completed
  const checkThemeCompletion = async () => {
    if (!user?.id) return false
    
    try {
      // Get all sessions in the current theme
      const { data: courseData, error: courseError } = await supabase
        .from('learning_courses')
        .select(`
          genres:learning_genres!inner(
            themes:learning_themes!inner(
              sessions:learning_sessions(id)
            )
          )
        `)
        .eq('id', courseId)
        .eq('genres.themes.id', themeId)
        .single()

      if (courseError || !courseData) {
        console.error('❌ Error fetching theme sessions:', courseError)
        return false
      }

      // Extract all session IDs in this theme
      const themeSessions = courseData.genres?.[0]?.themes?.[0]?.sessions || []
      const sessionIds = themeSessions.map((s: { id: string }) => s.id)
      
      if (sessionIds.length === 0) {
        console.warn('⚠️ No sessions found in theme')
        return false
      }

      console.log(`🔍 Theme ${themeId} has ${sessionIds.length} sessions:`, sessionIds)

      // Check completion status for all sessions in the theme
      const completionChecks = await Promise.all(
        sessionIds.map(async (sessionId: string) => {
          const progressKey = `${courseId}_${genreId}_${themeId}_${sessionId}`
          const { data: settingData } = await supabase
            .from('user_settings')
            .select('setting_value')
            .eq('user_id', user.id)
            .eq('setting_key', `lp_${progressKey}`)
            .single()
          
          const progressData = settingData?.setting_value as { completed?: boolean } | null
          const isCompleted = !!progressData?.completed
          console.log(`  Session ${sessionId}: completed=${isCompleted}`)
          return isCompleted
        })
      )

      const allCompleted = completionChecks.every(completed => completed)
      console.log(`🎯 Theme completion check: ${completionChecks.filter(c => c).length}/${sessionIds.length} sessions completed (all completed: ${allCompleted})`)
      
      return allCompleted
    } catch (error) {
      console.error('❌ Error checking theme completion:', error)
      return false
    }
  }

  // Initialize learning session tracking on component mount (記録は完了時のみ)
  useEffect(() => {
    if (user?.id && !currentSessionData) {
      const sessionData: LearningSessionData = {
        user_id: user.id,
        session_id: session.id,
        course_id: courseId,
        genre_id: genreId,
        theme_id: themeId,
        start_time: startTime.toISOString(),
        completed: false
      }
      setCurrentSessionData(sessionData)
      console.log('📚 Learning session initialized (記録は完了時に実行):', sessionData)
    }
  }, [user?.id, courseId, genreId, themeId, session.id, startTime, currentSessionData])

  const handleStartQuiz = async () => {
    // 初回完了判定が完了するまで待機
    if (isFirstCompletion === null) {
      console.log('⏳ Waiting for first completion determination...')
      return
    }
    
    // Prevent scroll jump by not changing focus
    if (hasQuiz) {
      setQuizStartTime(new Date()) // 理解度チェック開始時間記録
      setViewState('quiz')
      setCurrentQuizIndex(0)
      setQuizAnswers({})
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

  const completeSession = async () => {
    if (!user?.id || sessionCompleted || isCompletingSession) {
      console.error('❌ Cannot complete session: missing user or session already completed or in progress')
      return
    }

    console.log('🚀 Starting session completion...')
    setIsCompletingSession(true)

    try {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      
      // XP system integration: Save course session data FIRST (初回・復習問わず記録）
      console.log(`💾 Saving course session to XP system... (clientSideFirstCompletion: ${isFirstCompletion})`)
      
      // デバッグ: サブカテゴリーID確認
      console.log('🔍 Course session data debug:', {
        courseId,
        genreId,
        themeId,
        categoryId,
        subcategoryId,
        subcategoryIdType: typeof subcategoryId,
        subcategoryIdLength: subcategoryId?.length || 0,
        subcategoryIdEmpty: subcategoryId === '' || subcategoryId === null || subcategoryId === undefined
      })
      
      // クイズ実行時間計算（理解度チェック開始～完了まで）
      const quizTimeSpent = hasQuiz && quizStartTime 
        ? Math.floor((endTime.getTime() - quizStartTime.getTime()) / 1000)
        : 0
      
      console.log('⏱️ コース学習時間計算:', {
        sessionStart: startTime.toISOString(),
        sessionEnd: endTime.toISOString(),
        totalDurationSeconds: Math.floor(duration / 1000),
        quizStartTime: quizStartTime?.toISOString() || 'N/A',
        quizTimeSpent,
        hasQuiz
      })
      
      const courseSessionData = {
        session_id: session.id,
        course_id: courseId,
        theme_id: themeId,
        genre_id: genreId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        session_quiz_correct: hasQuiz ? getQuizScore() === 100 : true, // Perfect score or no quiz means correct
        is_first_completion: isFirstCompletion ?? false, // 事前判定した結果を使用（nullの場合はfalse）
        session_start_time: startTime.toISOString(),
        session_end_time: endTime.toISOString(),
        duration_seconds: Math.floor(duration / 1000), // ミリ秒を秒に変換
        quiz_time_spent: quizTimeSpent // 理解度チェック実行時間
      }
      
      const xpResult = await saveCourseSession(courseSessionData)
      
      if (!xpResult.success) {
        console.error('❌ Course session save failed:', xpResult.error)
        setIsCompletingSession(false)
        alert('セッション完了の保存に失敗しました。もう一度お試しください。')
        return
      }

      console.log('✅ Course session saved:', {
        earned_xp: xpResult.earned_xp,
        session_id: xpResult.session_id,
        is_first_completion: isFirstCompletion
      })

      // 並列実行でパフォーマンス改善: 学習進捗保存とセッション更新を同時実行
      const parallelOperations = []
      
      console.log('🔍 重複問題デバッグ:', {
        currentSessionDataExists: !!currentSessionData,
        currentSessionDataHasId: !!currentSessionData?.id,
        sessionId: currentSessionData?.id,
        willCreateNew: currentSessionData && !currentSessionData.id,
        willUpdate: currentSessionData?.id
      })
      
      // 学習進捗保存
      console.log('📝 Saving learning progress...', { userId: user.id, courseId, genreId, themeId, sessionId: session.id })
      parallelOperations.push(
        saveLearningProgressSupabase(user.id, courseId, genreId, themeId, session.id, true)
          .then(result => {
            console.log('📝 Progress save result:', result)
            return { type: 'progress', result }
          })
      )
      
      // 学習セッション記録（初回記録 - 重複問題解決のため完了時のみ記録）
      if (currentSessionData && !currentSessionData.id) {
        console.log('📝 Creating complete learning session record...', { sessionData: currentSessionData })
        
        // 完了データで新規作成
        const completeSessionData: LearningSessionData = {
          ...currentSessionData,
          end_time: endTime.toISOString(),
          duration,
          completed: true,
          quiz_score: hasQuiz ? getQuizScore() : undefined,
          content_interactions: {
            scrollDepth: 100, // 完了時は100%とみなす
            timeOnSection: {}, // 学習セクションでの時間記録
            clickEvents: [], // クリックイベント履歴
            sessionType: 'course_learning',
            hasQuiz: hasQuiz,
            quizAnswers: hasQuiz ? Object.entries(quizAnswers).map(([index, answer]) => ({
              questionIndex: parseInt(index),
              selectedAnswer: answer,
              isCorrect: quizResults[parseInt(index)] || false,
              question: session.quiz?.[parseInt(index)]?.question || '',
              correctAnswer: session.quiz?.[parseInt(index)]?.options[session.quiz?.[parseInt(index)]?.correct] || ''
            })) : [],
            quizScore: hasQuiz ? getQuizScore() : undefined,
            totalQuestions: hasQuiz ? (session.quiz?.length || 0) : 0,
            correctAnswers: hasQuiz ? Object.values(quizResults).filter(r => r).length : 0,
            themeId,
            genreId,
            categoryId,
            subcategoryId,
            sessionId: session.id,
            completedAt: endTime.toISOString()
          }
        }
        
        parallelOperations.push(
          saveLearningSessionSupabase(completeSessionData).then(savedSession => {
            console.log('✅ Complete session saved:', savedSession?.id)
            return { type: 'session_create', result: savedSession }
          })
        )
      } else if (currentSessionData?.id) {
        // 既存セッションの更新（通常は実行されない想定）
        console.log('🔄 Updating existing learning session...', { sessionId: currentSessionData.id })
        parallelOperations.push(
          updateLearningSession(currentSessionData.id, {
            end_time: endTime.toISOString(),
            duration,
            completed: true,
            quiz_score: hasQuiz ? getQuizScore() : undefined
          }).then(result => {
            console.log('🔄 Session update result:', result)
            return { type: 'session_update', result }
          })
        )
      }

      // 並列実行
      await Promise.all(parallelOperations)
      
      // パフォーマンス改善: テーマ完了チェックとバッジ処理を並列実行
      const [themeCompleted] = await Promise.all([
        checkThemeCompletion(),
        // その他の処理があれば追加
      ])
      
      console.log('Session completion debug:', {
        isLastSession,
        themeRewardCard,
        sessionCompleted,
        userId: user.id,
        isFirstCompletion,
        themeCompleted
      })
      
      setIsThemeCompleted(themeCompleted && (isFirstCompletion ?? false)) // Only show on first completion
      console.log(`🎯 Theme completion status: ${themeCompleted}, showing rewards: ${themeCompleted && isFirstCompletion}`)
      
      // カード獲得処理も非同期で実行（UIブロックを避ける）
      if (themeCompleted && themeRewardCard && isFirstCompletion) {
        console.log('🎉 ATTEMPTING TO ACQUIRE CARD:', themeRewardCard.id, 'for user:', user.id)
        
        // カード獲得処理を非同期で実行（完了を待たない）
        addKnowledgeCardToCollection(user.id, themeRewardCard.id)
          .then(result => {
            setCardAcquired(result.isNew)
            console.log('🎯 CARD ACQUISITION RESULT:', {
              result,
              cardId: themeRewardCard.id,
              cardTitle: themeRewardCard.title,
              isNew: result.isNew,
              count: result.count
            })
          })
          .catch(error => {
            console.error('❌ Error acquiring knowledge card:', error)
          })
      } else {
        console.log('⚠️ Card acquisition skipped:', {
          isLastSession,
          hasThemeRewardCard: !!themeRewardCard,
          sessionCompleted
        })
      }
      
      // 修正: user_settingsベースの復習判定（UI表示と統一）
      let isReviewMode = false
      try {
        // user_settingsから現在の進捗状態を取得
        const progressKey = `${courseId}_${genreId}_${themeId}_${session.id}`
        const { data: settingData } = await supabase
          .from('user_settings')
          .select('setting_value')
          .eq('user_id', user.id)
          .eq('setting_key', `lp_${progressKey}`)
          .single()
        
        // 既存の完了記録があれば復習モード
        const progressData = settingData?.setting_value as { completed?: boolean } | null
        isReviewMode = !!progressData?.completed
        console.log(`📚 Session mode: isReviewMode=${isReviewMode} (user_settings基準・UI表示と統一)`, { 
          progressKey: `lp_${progressKey}`, 
          progressData 
        })
      } catch (error) {
        console.log(`📚 Session mode: isReviewMode=${isReviewMode} (初回実行・user_settings記録なし)`, error)
      }
      
      // 初回完了時のみコース完了チェック＆バッジ授与（現在のセッションが初回完了の場合）
      if (isFirstCompletion) {
        console.log('🏆 Checking for course completion and badge award...')
        // バッジ処理も非同期で実行（UIブロックを避ける）
        checkAndAwardCourseBadge(user.id, courseId, genreId, themeId, session.id)
          .then(badgeResult => {
            if (badgeResult.completed && badgeResult.badge) {
              console.log('🎉 Course completed! Badge awarded:', badgeResult.badge)
              setBadgeAwarded(badgeResult.badge)
            }
          })
          .catch(error => {
            console.error('❌ Error checking course badge:', error)
          })
      } else {
        console.log('📚 Review mode - skipping badge award check')
      }


      setSessionCompleted(true)
      setViewState('completed')
      onComplete(session.id)
      
      console.log('✅ Session completed successfully')
    } catch (error) {
      console.error('❌ Error completing session:', error)
      // Still allow the UI to show completion even if some operations failed
      setSessionCompleted(true)
      setViewState('completed')
      onComplete(session.id)
    } finally {
      setIsCompletingSession(false)
    }
  }

  const getQuizScore = () => {
    if (!hasQuiz) return 100
    const correctAnswers = Object.values(quizResults).filter(result => result).length
    return Math.round((correctAnswers / session.quiz!.length) * 100)
  }

  const handleContinue = () => {
    if (isLastSession) {
      onExit()
    } else {
      onNext()
    }
  }

  const renderProgressBar = () => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          セッション {currentSessionIndex + 1} / {totalSessions}
        </span>
        <span className="font-medium">
          {Math.round(((currentSessionIndex + 1) / totalSessions) * 100)}%
        </span>
      </div>
      <Progress value={((currentSessionIndex + 1) / totalSessions) * 100} className="h-2" />
    </div>
  )

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
                      {item.content.split('\n').map((paragraph: string, pIndex: number) => (
                        paragraph.trim() && (
                          <p key={pIndex} className="leading-relaxed text-gray-700">
                            {paragraph.trim()}
                          </p>
                        )
                      ))}
                    </div>
                  )}
                  
                  {item.type === 'key_points' && item.content && (
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                      <div className="space-y-2">
                        {item.content.split('\n').map((point: string, pIndex: number) => (
                          point.trim() && (
                            <div key={pIndex} className="flex items-start space-x-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-sm text-blue-800">{point.trim().replace(/^[•\-]\s*/, '')}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'example' && item.content && (
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <div className="space-y-2">
                        {item.content.split('\n').map((line: string, pIndex: number) => (
                          line.trim() && (
                            <p key={pIndex} className="text-sm text-green-800 leading-relaxed">
                              {line.trim()}
                            </p>
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
                    icon = <Check className="h-4 w-4" />
                  } else if (quizAnswers[currentQuizIndex] === option && index !== currentQuiz.correct) {
                    buttonVariant = "destructive"
                    icon = <X className="h-4 w-4" />
                  }
                }
                
                return (
                  <Button
                    key={index}
                    variant={buttonVariant}
                    className="justify-start h-auto p-4 text-left"
                    onClick={() => !showQuizResult && handleQuizAnswer(index)}
                    disabled={showQuizResult}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{option}</span>
                      {icon}
                    </div>
                  </Button>
                )
              })}
            </div>

            {/* Quiz Result */}
            {showQuizResult && (
              <div className="mt-6 p-4 rounded-lg bg-gray-50">
                <div className={`flex items-center space-x-2 mb-3 ${
                  quizResults[currentQuizIndex] ? 'text-green-600' : 'text-red-600'
                }`}>
                  {quizResults[currentQuizIndex] ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                  <span className="font-semibold">
                    {quizResults[currentQuizIndex] ? '正解！' : '不正解'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentQuiz.explanation}
                </p>
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

        {/* Reward Card */}
        {isThemeCompleted && themeRewardCard && (
          <Card className="max-w-md mx-auto bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>
                  {cardAcquired ? 'ナレッジカードを獲得！' : 'ナレッジカード獲得済み'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-2xl">{themeRewardCard.icon || '🎯'}</div>
              <div className="font-semibold">{themeRewardCard.title}</div>
              <div className="text-sm text-muted-foreground">
                {themeRewardCard.description || 'テーマ完了の証として獲得'}
              </div>
              {cardAcquired && (
                <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
                  🎉 新しいナレッジカードを獲得しました！<br/>
                  コレクションで確認できます。
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Badge Award Notification */}
        {badgeAwarded && (
          <Card className="max-w-md mx-auto bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Award className="h-5 w-5 text-purple-500" />
                <span>
                  {new Date(badgeAwarded.earnedAt).toDateString() === new Date().toDateString() 
                    ? '修了証を獲得！' 
                    : '修了証を確認'
                  }
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-4xl">🏆</div>
              <div className="font-semibold text-purple-800">{badgeAwarded.badge.title}</div>
              <div className="text-sm text-purple-700">
                {badgeAwarded.badge.description}
              </div>
              <div className="text-xs text-purple-600">
                獲得日: {badgeAwarded.earnedAt.toLocaleDateString('ja-JP')}
              </div>
              {badgeAwarded.expiresAt && (
                <div className="text-xs text-purple-600">
                  有効期限: {badgeAwarded.expiresAt.toLocaleDateString('ja-JP')}
                </div>
              )}
              <div className="mt-3 p-3 bg-purple-100 rounded text-sm text-purple-800">
                {new Date(badgeAwarded.earnedAt).toDateString() === new Date().toDateString() ? (
                  <div>🎉 コース完了おめでとうございます！<br/>修了証はコレクションで確認できます。</div>
                ) : (
                  <div>📋 既に修了済みのコースです。<br/>修了証はコレクションで確認できます。</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-center space-x-4">
          {!isLastSession && (
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

        {isThemeCompleted && (
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