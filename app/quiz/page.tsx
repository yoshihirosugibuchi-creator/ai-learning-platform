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
import { MainCategory, IndustryCategory } from '@/lib/types/category'
import { getAllQuestions } from '@/lib/questions'
import { getCategories as getDbCategories, getDifficultyDisplayName } from '@/lib/categories'
import { useAuth } from '@/components/auth/AuthProvider'

export default function QuizPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const mode = searchParams.get('mode')
  const categoryParam = searchParams.get('category')
  // const levelParam = searchParams.get('level')
  // const difficultiesParam = searchParams.get('difficulties')
  const returnToParam = searchParams.get('returnTo')
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [dbCategories, setDbCategories] = useState<(MainCategory | IndustryCategory)[]>([])
  const [inactiveCategories, setInactiveCategories] = useState<(MainCategory | IndustryCategory)[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam)
  const [returnTo] = useState<string | null>(returnToParam)
  const [isQuizActive, setIsQuizActive] = useState(mode === 'random' || !!categoryParam)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const [questionsData, activeDbCategoriesData, inactiveDbCategoriesData] = await Promise.all([
          getAllQuestions(),
          getDbCategories({ activeOnly: true }), // Active categories for quiz play
          getDbCategories({ activeOnly: false }) // All categories including inactive for Coming Soon
        ])
        
        // Filter inactive categories (those that are not in active list)
        const activeCategoryIds = new Set(activeDbCategoriesData.map(cat => cat.id))
        const inactiveCategoryList = inactiveDbCategoriesData.filter(cat => !activeCategoryIds.has(cat.id))
        
        setQuestions(questionsData)
        setDbCategories(activeDbCategoriesData)
        setInactiveCategories(inactiveCategoryList)
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
    rewardedCard?: unknown
    isNewCard?: boolean
    cardCount?: number
  }) => {
    console.log('Quiz completed:', results)
    // Don't immediately close quiz - let QuizSession show completion screen
    // setIsQuizActive(false)
    // setSelectedCategory(null)
  }

  const handleQuizExit = () => {
    // returnToパラメータがある場合はそこに戻る、なければホームに戻る
    router.push(returnTo || '/')
  }

  const startQuiz = (category?: string) => {
    setSelectedCategory(category || null)
    setIsQuizActive(true)
  }

  // 認証ガード
  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    router.push('/login')
    return <LoadingScreen message="ログインページに移動中..." />
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
            user={user}
            profile={profile}
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
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">クイズに挑戦</h1>
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
                <CardTitle className="text-lg">チャレンジクイズ</CardTitle>
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

            {dbCategories
              .filter(dbCategory => {
                // Only show categories that have questions available
                const categoryQuestions = questions.filter(q => q.category === dbCategory.name || q.category === dbCategory.id)
                return categoryQuestions.length > 0
              })
              .map((dbCategory) => {
              const categoryQuestions = questions.filter(q => q.category === dbCategory.name || q.category === dbCategory.id)
              
              // 実際のデータから難易度を取得して日本語表示名で集計
              const difficultyCount: Record<string, number> = {}
              categoryQuestions.forEach(q => {
                const displayName = getDifficultyDisplayName(q.difficulty)
                difficultyCount[displayName] = (difficultyCount[displayName] || 0) + 1
              })
              
              // 表示順序を定義（スキルレベルマスタの順序に従う）
              const orderedDifficulties = ['基礎', '中級', '上級', 'エキスパート']

              return (
                <Card key={dbCategory.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span className="text-lg">{dbCategory.icon || '📚'}</span>
                        <span>{dbCategory.name}</span>
                      </CardTitle>
                      <Badge variant="outline">
                        {categoryQuestions.length}問
                      </Badge>
                    </div>
                    {dbCategory.description && (
                      <p className="text-sm text-muted-foreground">{dbCategory.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {orderedDifficulties.map(difficulty => {
                        const count = difficultyCount[difficulty]
                        if (!count || count === 0) return null
                        
                        // 難易度に応じたバッジスタイルを定義
                        const getBadgeVariant = (diff: string) => {
                          switch (diff) {
                            case '基礎': return 'outline'
                            case '中級': return 'secondary'
                            case '上級': return 'destructive'
                            case 'エキスパート': return 'destructive'
                            default: return 'default'
                          }
                        }
                        
                        const getBadgeClassName = (diff: string) => {
                          switch (diff) {
                            case 'エキスパート': return 'text-xs bg-purple-600 border-purple-600'
                            default: return 'text-xs'
                          }
                        }
                        
                        return (
                          <Badge 
                            key={difficulty}
                            variant={getBadgeVariant(difficulty)} 
                            className={getBadgeClassName(difficulty)}
                          >
                            {difficulty} {count}
                          </Badge>
                        )
                      })}
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
                      onClick={() => startQuiz(dbCategory.name)} 
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

          {/* Coming Soon Categories */}
          {inactiveCategories.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">近日公開予定のカテゴリ</h2>
                <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                  {inactiveCategories.length}カテゴリ
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveCategories.map((category) => (
                  <Card key={category.id} className="opacity-75 border-dashed border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <span className="text-lg">{category.icon || '🔜'}</span>
                          <span>{category.name}</span>
                        </CardTitle>
                        <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                          準備中
                        </Badge>
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-3xl mb-2">🚧</div>
                        <p className="text-sm text-muted-foreground">
                          現在問題を準備中です
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          公開をお楽しみに！
                        </p>
                      </div>
                      
                      <Button 
                        disabled
                        className="w-full opacity-50 cursor-not-allowed"
                        variant="outline"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        近日公開
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}