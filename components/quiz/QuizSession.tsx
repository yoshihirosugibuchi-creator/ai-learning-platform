'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Trophy, Target, Clock, BarChart3, Zap } from 'lucide-react'
import QuizCard from './QuizCard'
import { Question } from '@/lib/types'
import { getRandomQuestions } from '@/lib/questions'
import { useUserContext } from '@/contexts/UserContext'
import { 
  saveQuizResult, 
  addCardToCollection,
  saveEnhancedQuizResult,
  QuestionAnswer,
  QuizSession
} from '@/lib/storage'
import { getRandomWisdomCard, WisdomCard as WisdomCardType } from '@/lib/cards'
import WisdomCard from '@/components/cards/WisdomCard'
import { getCategoryDisplayName } from '@/lib/category-mapping'

interface QuizSessionProps {
  questions: Question[]
  category?: string
  level?: string | null
  onComplete: (results: QuizResults) => void
  onExit: () => void
}

interface QuizResults {
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  categoryScores: Record<string, { correct: number; total: number }>
  rewardedCard?: WisdomCardType
  isNewCard?: boolean
  cardCount?: number
}

export default function QuizSession({
  questions,
  category,
  level,
  onComplete,
  onExit
}: QuizSessionProps) {
  const { updateProgress, updateStreak, user, updateUser, refreshUser } = useUserContext()
  const router = useRouter()
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

  useEffect(() => {
    let filteredQuestions = questions
    
    // カテゴリーでフィルタリング
    if (category) {
      filteredQuestions = filteredQuestions.filter(q => q.category === category)
    }
    
    // レベルでフィルタリング（'all'または未指定の場合はフィルタリングしない）
    if (level && level !== 'all') {
      const difficultyMap: Record<string, string> = {
        'basic': '基礎',
        'intermediate': '中級',
        'advanced': '上級'
      }
      const targetDifficulty = difficultyMap[level]
      if (targetDifficulty) {
        filteredQuestions = filteredQuestions.filter(q => q.difficulty === targetDifficulty)
      }
    }
    
    const selectedQuestions = getRandomQuestions(filteredQuestions, 10)
    setSessionQuestions(selectedQuestions)
    
    setResults(prev => ({
      ...prev,
      totalQuestions: selectedQuestions.length
    }))
  }, [questions, category, level])

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
    const responseTime = Date.now() - questionStartTime
    
    setSelectedOption(option)
    setShowResult(true)
    
    // Store detailed question answer data
    const questionAnswer: QuestionAnswer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      selectedAnswer: currentQuestion.options[option],
      correctAnswer: currentQuestion.options[currentQuestion.correct],
      isCorrect,
      responseTime,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty
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

  const handleNext = () => {
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
      const endTime = Date.now()
      const sessionDuration = endTime - startTime
      
      const finalResults = {
        ...results,
        timeSpent: Math.round(sessionDuration / 1000)
      }
      
      // Create enhanced session data
      const sessionData: QuizSession = {
        sessionId: crypto.randomUUID(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        sessionDuration,
        totalQuestions: sessionQuestions.length,
        category
      }
      
      // Update user progress
      const xpGained = finalResults.correctAnswers * 100
      console.log('🎯 Quiz completed:', {
        correctAnswers: finalResults.correctAnswers,
        totalQuestions: finalResults.totalQuestions,
        xpGained,
        categoryScores: finalResults.categoryScores
      })
      const skpEarned = updateProgress(finalResults.totalQuestions, finalResults.correctAnswers, xpGained, finalResults.categoryScores)
      console.log('📈 Progress updated:', { skpEarned, newUserData: user })
      setSkpGained(skpEarned)
      updateStreak()
      
      // 追加でrefreshUserを呼び出して確実に状態を更新
      setTimeout(() => {
        refreshUser()
      }, 200)
      
      // Save enhanced quiz result with detailed data (user-specific)
      if (user?.id) {
        saveEnhancedQuizResult({
          category,
          score: finalResults.score,
          totalQuestions: finalResults.totalQuestions,
          correctAnswers: finalResults.correctAnswers,
          timeSpent: finalResults.timeSpent,
          categoryScores: finalResults.categoryScores,
          session: sessionData,
          questionAnswers: questionAnswers
        }, user.id)
        
        // Also save to legacy format for backwards compatibility
        saveQuizResult({
          category,
          score: finalResults.score,
          totalQuestions: finalResults.totalQuestions,
          correctAnswers: finalResults.correctAnswers,
          timeSpent: finalResults.timeSpent,
          categoryScores: finalResults.categoryScores
        }, user.id)
        
        console.log(`💾 Quiz results saved for user: ${user.id}`)
      } else {
        console.warn('⚠️ No user ID available, quiz results not saved')
      }
      
      // Award wisdom card based on performance
      const accuracyRate = (finalResults.correctAnswers / finalResults.totalQuestions) * 100
      let updatedResults = finalResults
      
      if (accuracyRate >= 70) { // Only award card if 70% or better accuracy
        const randomCard = getRandomWisdomCard(accuracyRate)
        const cardResult = addCardToCollection(randomCard.id, user?.id)
        
        // Update results with card reward info
        updatedResults = {
          ...finalResults,
          rewardedCard: randomCard,
          isNewCard: cardResult.isNew,
          cardCount: cardResult.count
        }
        
        console.log(`🂺 Card added to collection for user ${user?.id}:`, { cardId: randomCard.id, isNew: cardResult.isNew })
      }
      
      // Set the updated results for display
      setResults(updatedResults)
      setIsFinished(true)
      onComplete(updatedResults)
    }
  }

  if (sessionQuestions.length === 0) {
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
                基本ポイント: {results.correctAnswers * 5} SKP
                {results.correctAnswers === results.totalQuestions && results.totalQuestions >= 3 && (
                  <span> + 全問正解ボーナス: 10 SKP</span>
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
            {Object.entries(results.categoryScores).map(([cat, score]) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium">{getCategoryDisplayName(cat)}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{score.correct}/{score.total}</span>
                  <Progress 
                    value={(score.correct / score.total) * 100} 
                    className="w-20 h-2"
                  />
                </div>
              </div>
            ))}
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
                  />
                </div>
              </div>
              <div className="text-center">
                <Button variant="outline" size="sm" asChild>
                  <a href="/collection">コレクションで確認</a>
                </Button>
              </div>
            </div>
          ) : accuracyRate < 70 ? (
            <div className="space-y-3 border-t pt-4">
              <div className="text-center">
                <h4 className="font-semibold text-lg mb-2 flex items-center justify-center space-x-2">
                  <Target className="h-5 w-5 text-gray-500" />
                  <span>もう少し頑張りましょう</span>
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  正答率70%以上で格言カードを獲得できます<br />
                  現在の正答率: {accuracyRate}%
                </p>
                <div className="text-center">
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    再挑戦する
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex space-x-4">
            <Button onClick={() => { 
              refreshUser()
              setTimeout(() => refreshUser(), 100)
              router.push('/') 
            }} variant="outline" className="flex-1">
              ホームに戻る
            </Button>
            <Button onClick={() => window.location.reload()} className="flex-1">
              もう一度挑戦
            </Button>
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
          {category || 'ランダムクイズ'}
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
      />
    </div>
  )
}