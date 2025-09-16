'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Play, TrendingUp, Clock } from 'lucide-react'
import QuizSession from '@/components/quiz/QuizSession'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { Question } from '@/lib/types'
import { getAllQuestions, getCategories } from '@/lib/questions'

export default function QuizPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode')
  const categoryParam = searchParams.get('category')
  const levelParam = searchParams.get('level')
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(levelParam)
  const [isQuizActive, setIsQuizActive] = useState(mode === 'random' || (categoryParam && levelParam))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const questionsData = await getAllQuestions()
        setQuestions(questionsData)
        setCategories(getCategories(questionsData))
      } catch (error) {
        console.error('Failed to load questions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  const handleQuizComplete = (results: { 
    score: number
    totalQuestions: number 
    correctAnswers: number 
    timeSpent: number 
    rewardedCard?: any
    isNewCard?: boolean
    cardCount?: number
  }) => {
    console.log('Quiz completed:', results)
    // Don't immediately close quiz - let QuizSession show completion screen
    // setIsQuizActive(false)
    // setSelectedCategory(null)
  }

  const handleQuizExit = () => {
    router.push('/')
  }

  const startQuiz = (category?: string) => {
    setSelectedCategory(category || null)
    setIsQuizActive(true)
  }

  if (loading) {
    return <LoadingScreen message="問題を読み込んでいます..." />
  }

  if (isQuizActive) {
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
          <QuizSession
            questions={questions}
            category={selectedCategory || undefined}
            level={selectedLevel}
            onComplete={handleQuizComplete}
            onExit={handleQuizExit}
          />
        </main>
      </div>
    )
  }

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
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">クイズに挑戦</h1>
            <p className="text-muted-foreground">
              AIがあなたの学習レベルに合わせた問題を出題します
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">ランダムクイズ</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  全カテゴリからランダムに10問出題
                </p>
                <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    約5分
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="h-3 w-3 mr-1" />
                    10問
                  </div>
                </div>
                <Button onClick={() => startQuiz()} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  開始
                </Button>
              </CardContent>
            </Card>

            {categories.map((category) => {
              const categoryQuestions = questions.filter(q => q.category === category)
              const difficultyCount = {
                初級: categoryQuestions.filter(q => q.difficulty === '初級').length,
                中級: categoryQuestions.filter(q => q.difficulty === '中級').length,
                上級: categoryQuestions.filter(q => q.difficulty === '上級').length,
              }

              return (
                <Card key={category} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <Badge variant="outline">
                        {categoryQuestions.length}問
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {difficultyCount.初級 > 0 && (
                        <Badge variant="default" className="text-xs">
                          初級 {difficultyCount.初級}
                        </Badge>
                      )}
                      {difficultyCount.中級 > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          中級 {difficultyCount.中級}
                        </Badge>
                      )}
                      {difficultyCount.上級 > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          上級 {difficultyCount.上級}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        約8分
                      </div>
                      <div className="flex items-center">
                        <BookOpen className="h-3 w-3 mr-1" />
                        10問
                      </div>
                    </div>

                    <Button 
                      onClick={() => startQuiz(category)} 
                      className="w-full"
                      variant="outline"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      開始
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}