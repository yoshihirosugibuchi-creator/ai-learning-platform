'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X, 
  Star,
  Clock,
  BookOpen,
  Award,
  ChevronRight
} from 'lucide-react'
import { LearningSession as LearningSessionType, SessionTypeLabels } from '@/lib/types/learning'
import { saveLearningProgress } from '@/lib/learning/data'
import { saveLearningSession, updateLearningSession, LearningSession as LearningSessionData } from '@/lib/storage'
import { addKnowledgeCardToCollection } from '@/lib/knowledge-cards'
import { useUserContext } from '@/contexts/UserContext'

interface LearningSessionProps {
  courseId: string
  genreId: string
  themeId: string
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
  session,
  totalSessions,
  currentSessionIndex,
  themeRewardCard,
  onComplete,
  onNext,
  onPrevious,
  onExit
}: LearningSessionProps) {
  const router = useRouter()
  const { user } = useUserContext()
  const [viewState, setViewState] = useState<ViewState>('content')
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: string }>({})
  const [quizResults, setQuizResults] = useState<{ [key: number]: boolean }>({})
  const [showQuizResult, setShowQuizResult] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [cardAcquired, setCardAcquired] = useState(false)
  const [startTime] = useState(new Date())
  const [currentSessionData, setCurrentSessionData] = useState<LearningSessionData | null>(null)

  const hasQuiz = session.quiz && session.quiz.length > 0
  const isLastSession = currentSessionIndex === totalSessions - 1
  
  // Initialize learning session tracking on component mount
  useEffect(() => {
    if (user?.id && !currentSessionData) {
      const sessionData: LearningSessionData = {
        id: crypto.randomUUID(),
        userId: user.id,
        courseId,
        genreId,
        themeId,
        sessionId: session.id,
        startTime: startTime.toISOString(),
        completed: false
      }
      setCurrentSessionData(sessionData)
      saveLearningSession(sessionData)
    }
  }, [user?.id, courseId, genreId, themeId, session.id, startTime, currentSessionData])

  const handleStartQuiz = () => {
    if (hasQuiz) {
      setViewState('quiz')
      setCurrentQuizIndex(0)
      setQuizAnswers({})
      setQuizResults({})
      setShowQuizResult(false)
    } else {
      completeSession()
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

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex < session.quiz!.length - 1) {
      setCurrentQuizIndex(prev => prev + 1)
      setShowQuizResult(false)
    } else {
      completeSession()
    }
  }

  const completeSession = () => {
    if (user?.id && !sessionCompleted) {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()
      
      // Save learning progress
      saveLearningProgress(user.id, courseId, genreId, themeId, session.id, true)
      
      // Update learning session with completion data
      if (currentSessionData) {
        updateLearningSession(currentSessionData.id, {
          endTime: endTime.toISOString(),
          duration,
          completed: true,
          quizScore: hasQuiz ? getQuizScore() : undefined
        })
      }
      
      // 最後のセッション完了時にナレッジカードを獲得
      console.log('Session completion debug:', {
        isLastSession,
        themeRewardCard,
        sessionCompleted,
        userId: user.id
      })
      
      if (isLastSession && themeRewardCard) {
        console.log('🎉 ATTEMPTING TO ACQUIRE CARD:', themeRewardCard.id, 'for user:', user.id)
        console.log('Card details:', themeRewardCard)
        
        const result = addKnowledgeCardToCollection(themeRewardCard.id, user.id)
        setCardAcquired(result.isNew)
        
        console.log('🎯 CARD ACQUISITION RESULT:', result, 'for card:', themeRewardCard.id)
        
        // LocalStorage の状態をデバッグ出力（ユーザー別）
        const userKey = `ale_knowledge_card_collection_${user.id}`
        const currentCollection = JSON.parse(localStorage.getItem(userKey) || '[]')
        console.log(`💾 CURRENT KNOWLEDGE CARD COLLECTION for user ${user.id}:`, currentCollection)
        
        // 全てのlocalStorageキーを確認
        console.log('🗺️ ALL localStorage keys:', Object.keys(localStorage))
      } else {
        console.log('⚠️ Card acquisition skipped:', {
          isLastSession,
          hasThemeRewardCard: !!themeRewardCard,
          sessionCompleted
        })
      }
      
      setSessionCompleted(true)
      setViewState('completed')
      onComplete(session.id)
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
              <div className="text-2xl">{session.icon}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none space-y-6">
            {session.content.map((contentItem: any, index: number) => (
              <div key={contentItem.id || index} className="space-y-3">
                {contentItem.title && (
                  <h3 className="text-lg font-semibold text-primary">
                    {contentItem.title}
                  </h3>
                )}
                
                {contentItem.type === 'text' && (
                  <div className="space-y-3">
                    {contentItem.content.split('\n').map((paragraph: string, pIndex: number) => (
                      paragraph.trim() && (
                        <p key={pIndex} className="leading-relaxed text-gray-700">
                          {paragraph.trim()}
                        </p>
                      )
                    ))}
                  </div>
                )}
                
                {contentItem.type === 'key_points' && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <div className="space-y-2">
                      {contentItem.content.split('\n').map((point: string, pIndex: number) => (
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
                
                {contentItem.type === 'example' && (
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                    <div className="space-y-2">
                      {contentItem.content.split('\n').map((line: string, pIndex: number) => (
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
            ))}
          </div>


          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleStartQuiz}
              size="lg"
              className="flex items-center space-x-2"
            >
              {hasQuiz ? (
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
                  <Button onClick={handleNextQuizQuestion}>
                    {currentQuizIndex === session.quiz!.length - 1 ? (
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
                <div className="text-3xl font-bold text-primary">
                  {getQuizScore()}点
                </div>
                <div className="text-sm text-muted-foreground">
                  {session.quiz!.length}問中 {Object.values(quizResults).filter(r => r).length}問正解
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reward Card */}
        {isLastSession && themeRewardCard && (
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

        {isLastSession && (
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