'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Trophy, Target, Clock, BarChart3, Zap } from 'lucide-react'
import QuizCard from './QuizCard'
import { Question } from '@/lib/types'
import { getRandomQuestions } from '@/lib/questions'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  saveQuizResult as saveQuizResultSupabase,
  updateUserProgress
} from '@/lib/supabase-quiz'
import { UserProfile } from '@/lib/supabase-user'
import type { User } from '@supabase/supabase-js'
import { getRandomWisdomCard, WisdomCard as WisdomCardType } from '@/lib/cards'
import WisdomCard from '@/components/cards/WisdomCard'
import { getCategoryDisplayName } from '@/lib/category-mapping'
import { isValidCategoryId } from '@/lib/categories'
import { addWisdomCardToCollection } from '@/lib/supabase-cards'
import { saveSKPTransaction, saveDetailedQuizData, updateCategoryProgress } from '@/lib/supabase-learning'
import { updateProgressAfterQuiz, calculateChallengeQuizRewards, saveChallengeQuizProgressToDatabase } from '@/lib/xp-level-system'
import { getSubcategoryId } from '@/lib/categories'

interface QuizSessionProps {
  questions: Question[]
  category?: string
  level?: string | null
  difficulties?: string[]
  user: User
  profile: UserProfile | null
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

interface QuestionAnswer {
  questionId: string
  questionText: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  responseTime: number
  category: string
  difficulty: string
  confidenceLevel?: number
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
  level,
  difficulties,
  user,
  profile,
  onComplete,
  onExit
}: QuizSessionProps) {
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
  const [isCompleting, setIsCompleting] = useState(false)
  const completionInProgress = useRef(false)
  const [challengeQuizUpdateData, setChallengeQuizUpdateData] = useState<{
    userId: string;
    categoryResults: Record<string, unknown>;
  } | null>(null)

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

  useEffect(() => {
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
    
    let filteredQuestions = questions
    
    // カテゴリーでフィルタリング
    if (category) {
      filteredQuestions = filteredQuestions.filter(q => q.category === category)
    }
    
    // 難易度でフィルタリング（複数選択対応）
    if (difficulties && difficulties.length > 0) {
      filteredQuestions = filteredQuestions.filter(q => 
        difficulties.includes(q.difficulty)
      )
      console.log(`📊 Selected difficulties: ${difficulties.join(', ')} (${filteredQuestions.length} questions)`)
      
      // 選択した難易度で問題が不足している場合は他の難易度も含める
      if (filteredQuestions.length < 10) {
        console.log('⚠️ Not enough questions for selected difficulties, including all difficulties')
        let allCategoryQuestions = questions
        if (category) {
          allCategoryQuestions = allCategoryQuestions.filter(q => q.category === category)
        }
        
        // 選択した難易度を優先しつつ、他の難易度も追加
        const remainingQuestions = allCategoryQuestions.filter(q => 
          !difficulties.includes(q.difficulty)
        )
        filteredQuestions = [...filteredQuestions, ...remainingQuestions]
      }
    }
    
    // 学習履歴に基づく最適化（難易度選択なしの場合）
    let selectedQuestions: Question[]
    if (!difficulties || difficulties.length === 0) {
      selectedQuestions = optimizeQuestionsForUser(filteredQuestions, user.id, profile)
    } else {
      selectedQuestions = getRandomQuestions(filteredQuestions, 10)
    }
    
    setSessionQuestions(selectedQuestions)
    
    setResults(prev => ({
      ...prev,
      totalQuestions: selectedQuestions.length
    }))
  }, [questions, category, level, difficulties, user.id, profile])

  // 学習履歴に基づく問題最適化関数
  const optimizeQuestionsForUser = (questions: Question[], userId: string, userProfile: UserProfile | null): Question[] => {
    if (!userProfile || questions.length === 0) {
      return getRandomQuestions(questions, 10)
    }

    // ユーザーのカテゴリー別正答率を取得
    const categoryProgress = userProfile.categoryProgress || []
    const categoryStats = categoryProgress.find(cp => cp.categoryId === category)
    
    if (!categoryStats) {
      // 初回の場合は基礎から中級中心
      const basicQuestions = questions.filter(q => q.difficulty === '基礎')
      const intermediateQuestions = questions.filter(q => q.difficulty === '中級')
      const otherQuestions = questions.filter(q => !['基礎', '中級'].includes(q.difficulty))
      
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
    const accuracy = categoryStats.correctAnswers / Math.max(categoryStats.totalAnswers, 1)
    console.log(`📈 User accuracy for ${category}: ${(accuracy * 100).toFixed(1)}%`)
    
    let difficultyDistribution: Record<string, number>
    if (accuracy < 0.5) {
      // 正答率50%未満: 基礎重視
      difficultyDistribution = { '基礎': 6, '中級': 3, '上級': 1, 'エキスパート': 0 }
    } else if (accuracy < 0.7) {
      // 正答率50-70%: 中級重視
      difficultyDistribution = { '基礎': 3, '中級': 5, '上級': 2, 'エキスパート': 0 }
    } else if (accuracy < 0.85) {
      // 正答率70-85%: 上級重視
      difficultyDistribution = { '基礎': 2, '中級': 3, '上級': 4, 'エキスパート': 1 }
    } else {
      // 正答率85%以上: エキスパート重視
      difficultyDistribution = { '基礎': 1, '中級': 2, '上級': 4, 'エキスパート': 3 }
    }
    
    const optimized: Question[] = []
    for (const [difficulty, count] of Object.entries(difficultyDistribution)) {
      const difficultyQuestions = questions.filter(q => q.difficulty === difficulty)
      optimized.push(...getRandomQuestions(difficultyQuestions, count))
    }
    
    // 不足分をランダムで補完
    if (optimized.length < 10) {
      const remaining = questions.filter(q => !optimized.includes(q))
      optimized.push(...getRandomQuestions(remaining, 10 - optimized.length))
    }
    
    console.log(`🎯 Optimized quiz for accuracy ${(accuracy * 100).toFixed(1)}%:`, 
      Object.entries(difficultyDistribution).map(([d, c]) => `${d}:${c}`).join(', '))
    
    return optimized.slice(0, 10)
  }

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
      const sessionData: QuizSession = {
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
              
              console.log('🚀 Calling saveQuizResultSupabase...')
              quizResult = await saveQuizResultSupabase({
                user_id: user.id,
                category_id: quizCategory,
                subcategory_id: null,
                questions: sessionQuestions,
                answers: questionAnswers,
                score: finalResults.score,
                total_questions: finalResults.totalQuestions,
                time_taken: finalResults.timeSpent,
                completed_at: new Date().toISOString()
              })
              console.log('✅ Quiz result saved successfully:', quizResult?.id)
              
            } catch (quizSaveError) {
              console.error('❌ Quiz save error details:', {
                error: quizSaveError,
                stack: quizSaveError.stack,
                message: quizSaveError.message
              })
              quizResult = { id: 'error-fallback-' + Date.now() }
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
                await saveDetailedQuizData(detailData)
                console.log('✅ Detailed quiz data saved successfully')
                
              } catch (detailSaveError) {
                console.error('❌ Detail save error:', {
                  error: detailSaveError,
                  stack: detailSaveError.stack,
                  message: detailSaveError.message
                })
              }
            }
          }, 75); // 75ms遅延でDB処理開始
        } catch (error) {
          console.error('❌ Error in quiz completion process:', error)
          console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
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
      console.log('⚡ Setting final results immediately for instant display...')
      console.log('🔍 Debug: Setting isFinished to true for completion screen')
      console.log('📊 Final results:', finalResults)
      setResults(finalResults)
      setIsFinished(true)
      completionInProgress.current = false
      onComplete(finalResults)
      
      // 🎴 格言カード処理を非同期で実行（画面表示を妨げない）
      const accuracyRate = (finalResults.correctAnswers / finalResults.totalQuestions) * 100
      
      if (accuracyRate >= 70) {
        // バックグラウンドで格言カード処理
        setTimeout(async () => {
          try {
            console.log('🎴 Processing wisdom card reward in background...')
            const randomCard = getRandomWisdomCard(accuracyRate)
            const cardResult = await addWisdomCardToCollection(user.id, randomCard.id)
            
            // 結果を更新（カード情報付き）
            const updatedResults = {
              ...finalResults,
              rewardedCard: randomCard,
              isNewCard: cardResult.isNew,
              cardCount: cardResult.count
            }
            
            console.log(`🂺 Card processed in background:`, { cardId: randomCard.id, isNew: cardResult.isNew })
            setResults(updatedResults) // 非同期でカード情報を追加表示
          } catch (error) {
            console.error('❌ Background card processing error:', error)
            // エラーでも画面表示は既に完了しているので問題なし
          }
        }, 50) // 50ms遅延で画面描画を確実に優先
      }
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
              </div>
            </div>
          ) : null}

          <div className="flex space-x-4">
            <Button onClick={onExit} variant="outline" className="flex-1">
              {category ? 'カテゴリーに戻る' : 'ホームに戻る'}
            </Button>
            <Button onClick={() => {
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
              
              // 新しい問題セットを生成（useEffectが再実行される）
              // questionsが変更されていなくても、keyを変更することで強制的に再生成
              const now = Date.now()
              console.log(`🔄 Generating new question set at ${now}`)
              
              // 同じフィルタリング条件で新しい問題セットを生成
              let filteredQuestions = questions
              
              if (category) {
                filteredQuestions = filteredQuestions.filter(q => q.category === category)
              }
              
              if (difficulties && difficulties.length > 0) {
                filteredQuestions = filteredQuestions.filter(q => 
                  difficulties.includes(q.difficulty)
                )
                
                if (filteredQuestions.length < 10) {
                  let allCategoryQuestions = questions
                  if (category) {
                    allCategoryQuestions = allCategoryQuestions.filter(q => q.category === category)
                  }
                  const remainingQuestions = allCategoryQuestions.filter(q => 
                    !difficulties.includes(q.difficulty)
                  )
                  filteredQuestions = [...filteredQuestions, ...remainingQuestions]
                }
              }
              
              // 新しい問題セットを生成
              let newQuestions: Question[]
              if (!difficulties || difficulties.length === 0) {
                newQuestions = optimizeQuestionsForUser(filteredQuestions, user.id, profile)
              } else {
                newQuestions = getRandomQuestions(filteredQuestions, 10)
              }
              
              setSessionQuestions(newQuestions)
              setResults(prev => ({
                ...prev,
                totalQuestions: newQuestions.length
              }))
              
              console.log(`✅ New question set generated: ${newQuestions.length} questions`)
            }} className="flex-1">
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
          {category || 'チャレンジクイズ'}
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
