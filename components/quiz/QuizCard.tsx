'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, CheckCircle, XCircle, Lightbulb, Star } from 'lucide-react'
import { Question } from '@/lib/types'
import { getDifficultyDisplayName } from '@/lib/categories'
import { getSubcategoryDisplayName } from '@/lib/category-mapping'

// 難易度に応じたバッジのバリアントを取得
function getDifficultyBadgeVariant(difficulty: string): "default" | "secondary" | "destructive" | "outline" {
  switch (difficulty) {
    case '基礎': return 'outline'
    case '中級': return 'secondary' 
    case '上級': return 'destructive'
    case 'エキスパート': return 'destructive'
    default: return 'default'
  }
}

interface QuizCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  onAnswer: (selectedOption: number, isCorrect: boolean) => void
  onNext: () => void
  showResult: boolean
  selectedOption: number | null
  confidenceLevel?: number | null
  onConfidenceChange?: (level: number) => void
  showConfidenceInput?: boolean
  // ヒント機能追加
  hintsEnabled?: boolean
  onHintUsed?: (level: number, hint: string) => void
}

// ヒントデータの型定義
interface HintData {
  level1?: string
  level2?: string
  level3?: string
  available: boolean
}

// ヒント表示用のコンポーネント
interface HintDisplayProps {
  hints: string[]
  currentLevel: number
  onRequestHint: () => void
  disabled: boolean
  maxLevel: number
}

function HintDisplay({ hints, currentLevel, onRequestHint, disabled, maxLevel }: HintDisplayProps) {
  const getHintButtonText = () => {
    if (currentLevel === 0) return 'ヒント1を見る（XP -5%）'
    if (currentLevel === 1) return 'ヒント2を見る（XP -15%）'
    if (currentLevel === 2) return 'ヒント3を見る（XP -30%）'
    return 'すべてのヒントを表示済み'
  }

  const canShowMoreHints = currentLevel < maxLevel && currentLevel < 3

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center space-x-2">
        <Lightbulb className="h-5 w-5 text-yellow-600" />
        <span className="font-medium text-yellow-900">ヒント</span>
      </div>
      
      {/* 表示済みヒント */}
      {hints.map((hint, index) => (
        <div key={index} className="bg-white border border-yellow-200 rounded p-3">
          <div className="text-xs text-yellow-600 mb-1">ヒント {index + 1}</div>
          <div className="text-sm text-gray-800">{hint}</div>
        </div>
      ))}
      
      {/* 次のヒントボタン */}
      {canShowMoreHints && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRequestHint}
          disabled={disabled}
          className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
        >
          {getHintButtonText()}
        </Button>
      )}
      
      {!canShowMoreHints && hints.length > 0 && (
        <div className="text-xs text-yellow-600 text-center">
          利用可能なヒントをすべて表示しました
        </div>
      )}
    </div>
  )
}

export default function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onNext,
  showResult,
  selectedOption,
  confidenceLevel,
  onConfidenceChange,
  showConfidenceInput = false,
  hintsEnabled = false,
  onHintUsed
}: QuizCardProps) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimit)
  const [isTimeUp, setIsTimeUp] = useState(false)
  
  // ヒント関連のstate
  const [hintData, setHintData] = useState<HintData | null>(null)
  const [shownHints, setShownHints] = useState<string[]>([])
  const [currentHintLevel, setCurrentHintLevel] = useState(0)
  const [isLoadingHint, setIsLoadingHint] = useState(false)

  // Reset timer and hints when question changes
  useEffect(() => {
    setTimeLeft(question.timeLimit)
    setIsTimeUp(false)
    setHintData(null)
    setShownHints([])
    setCurrentHintLevel(0)
    setIsLoadingHint(false)
  }, [question.id, question.timeLimit])
  
  // ヒントデータ取得関数
  const loadHintData = useCallback(async () => {
    try {
      const response = await fetch(`/api/questions/${question.id}/hints`)
      if (response.ok) {
        const data = await response.json()
        setHintData(data.hints || { available: false })
      } else {
        console.warn('Failed to load hint data')
        setHintData({ available: false })
      }
    } catch (error) {
      console.error('Error loading hint data:', error)
      setHintData({ available: false })
    }
  }, [question.id])
  
  // ヒントデータを取得
  useEffect(() => {
    if (hintsEnabled && !hintData) {
      loadHintData()
    }
  }, [hintsEnabled, question.id, hintData, loadHintData])
  
  // ヒント表示処理
  const handleRequestHint = async () => {
    if (!hintData || isLoadingHint || showResult || isTimeUp) return
    
    setIsLoadingHint(true)
    
    try {
      const nextLevel = currentHintLevel + 1
      let hintText = ''
      
      if (nextLevel === 1 && hintData.level1) {
        hintText = hintData.level1
      } else if (nextLevel === 2 && hintData.level2) {
        hintText = hintData.level2
      } else if (nextLevel === 3 && hintData.level3) {
        hintText = hintData.level3
      }
      
      if (hintText) {
        setShownHints(prev => [...prev, hintText])
        setCurrentHintLevel(nextLevel)
        
        // コールバックでヒント使用を通知
        if (onHintUsed) {
          onHintUsed(nextLevel, hintText)
        }
      }
    } catch (error) {
      console.error('Error showing hint:', error)
    } finally {
      setIsLoadingHint(false)
    }
  }

  useEffect(() => {
    if (showResult || isTimeUp) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          setIsTimeUp(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showResult, isTimeUp])

  // Handle time up separately to avoid setState in render
  useEffect(() => {
    if (isTimeUp && !showResult) {
      onAnswer(-1, false) // Time up, incorrect answer
    }
  }, [isTimeUp, showResult, onAnswer])

  const handleOptionClick = (optionIndex: number) => {
    if (showResult || isTimeUp) return
    
    const isCorrect = optionIndex === question.correct
    onAnswer(optionIndex, isCorrect)
  }

  const getOptionStyle = (optionIndex: number) => {
    if (!showResult && !isTimeUp) return ''
    
    if (optionIndex === question.correct) {
      return 'border-green-500 bg-green-50 text-green-700'
    }
    
    if (selectedOption === optionIndex && selectedOption !== question.correct) {
      return 'border-red-500 bg-red-50 text-red-700'
    }
    
    return 'opacity-50'
  }

  const progressPercentage = question.timeLimit && timeLeft !== null 
    ? ((question.timeLimit - timeLeft) / question.timeLimit) * 100 
    : 0

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs w-fit">
            問題 {questionNumber} / {totalQuestions}
          </Badge>
          <Badge variant={getDifficultyBadgeVariant(getDifficultyDisplayName(question.difficulty || 'intermediate'))} className="text-xs w-fit">
            {getDifficultyDisplayName(question.difficulty || 'intermediate')}
          </Badge>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>{timeLeft}秒</span>
          </div>
          <Progress value={progressPercentage} className="flex-1" />
        </div>
        
        <CardTitle className="text-lg leading-relaxed">
          {question.question}
        </CardTitle>
        
        <div className="flex justify-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {getSubcategoryDisplayName(question.subcategory)}
          </Badge>
          
          {/* 復習理由バッジ */}
          {'reviewReason' in question && question.reviewReason && (
            <Badge 
              variant="secondary" 
              className={`text-xs ${
                question.reviewReason === 'forgetting_curve' 
                  ? 'bg-purple-100 text-purple-800 border-purple-200' 
                  : question.reviewReason === 'weak_category'
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : 'bg-orange-100 text-orange-800 border-orange-200'
              }`}
            >
              {question.reviewReason === 'forgetting_curve' && '🧠 忘却曲線'}
              {question.reviewReason === 'weak_category' && '📊 苦手分野'}
              {question.reviewReason === 'repeat_mistakes' && '🔄 繰り返しミス'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {question.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className={`h-auto p-4 text-left justify-start whitespace-normal ${getOptionStyle(index)}`}
              onClick={() => handleOptionClick(index)}
              disabled={showResult || isTimeUp}
            >
              <span className="mr-3 font-semibold">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </Button>
          ))}
        </div>
        
        {/* ヒント表示（回答前のみ） */}
        {hintsEnabled && hintData?.available && !showResult && !isTimeUp && (
          <HintDisplay
            hints={shownHints}
            currentLevel={currentHintLevel}
            onRequestHint={handleRequestHint}
            disabled={isLoadingHint}
            maxLevel={3}
          />
        )}

        {(showResult || isTimeUp) && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              {selectedOption === question.correct ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={`font-medium ${
                selectedOption === question.correct ? 'text-green-700' : 'text-red-700'
              }`}>
                {isTimeUp 
                  ? '時間切れです' 
                  : selectedOption === question.correct 
                    ? '正解です！' 
                    : '不正解です'}
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">解説</h4>
                  <p className="text-sm text-blue-800">{question.explanation}</p>
                </div>
              </div>
            </div>

            {/* Confidence Rating */}
            {showConfidenceInput && onConfidenceChange && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Star className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">この問題への自信度はいかがでしたか？</span>
                </div>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Button
                      key={level}
                      variant={confidenceLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => onConfidenceChange(level)}
                      className="text-xs px-3 py-1"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  1: 全く自信なし　→　5: 非常に自信あり
                </p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                出典: {question.source}
              </div>
              <Button onClick={onNext}>
                次の問題へ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}