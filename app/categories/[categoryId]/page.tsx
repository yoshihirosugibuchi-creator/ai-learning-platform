'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import CategorySelector from '@/components/categories/CategorySelector'
import { 
  mainCategories, 
  industryCategories, 
  getSubcategoriesByParent,
  skillLevels 
} from '@/lib/categories'
import { SkillLevel } from '@/lib/types/category'
import { Question } from '@/lib/types'
import { getAllQuestions } from '@/lib/questions'
import { useUserContext } from '@/contexts/UserContext'
import { getUserCardCollection } from '@/lib/storage'
import { 
  ArrowLeft, 
  BookOpen, 
  Trophy, 
  Clock, 
  Target,
  TrendingUp,
  Users,
  CheckCircle,
  Play
} from 'lucide-react'

export default function CategoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUserContext()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])

  const categoryId = params.categoryId as string
  const category = [...mainCategories, ...industryCategories]
    .find(cat => cat.id === categoryId)
  
  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">カテゴリーが見つかりません</h1>
            <Button onClick={() => router.back()}>戻る</Button>
          </div>
        </main>
      </div>
    )
  }

  const subcategories = getSubcategoriesByParent(categoryId)

  // Load questions data
  useEffect(() => {
    const loadData = async () => {
      try {
        const questionsData = await getAllQuestions()
        setQuestions(questionsData)
      } catch (error) {
        console.error('Failed to load questions:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Calculate real stats based on actual data
  const categoryQuestions = questions.filter(q => q.category === categoryId)
  const questionsByDifficulty = {
    '基礎': categoryQuestions.filter(q => q.difficulty === '基礎').length,
    '中級': categoryQuestions.filter(q => q.difficulty === '中級').length,
    '上級': categoryQuestions.filter(q => q.difficulty === '上級').length,
    'エキスパート': categoryQuestions.filter(q => q.difficulty === 'エキスパート').length
  }
  
  // Get user's category progress
  const userCategoryProgress = user?.categoryProgress?.find(cp => cp.categoryId === categoryId)
  const userCompletionRate = userCategoryProgress 
    ? Math.round((userCategoryProgress.correctAnswers / Math.max(userCategoryProgress.totalAnswers, 1)) * 100)
    : 0
  const userLearningTime = userCategoryProgress 
    ? Math.floor(Math.random() * 120 + 30) // Mock learning time in minutes for now
    : 0
  
  // Get user's card collection for this category using the new categoryId field
  const userCards = getUserCardCollection().filter(userCard => {
    // Find the actual card data to check its categoryId
    const { wisdomCards } = require('@/lib/cards')
    const cardData = wisdomCards.find((card: any) => card.id === userCard.cardId)
    return cardData && cardData.categoryId === categoryId
  })
  
  const realStats = {
    totalQuizzes: categoryQuestions.length,
    totalCards: userCards.length,
    completionRate: userCompletionRate,
    learningTime: userLearningTime,
    correctAnswers: userCategoryProgress?.correctAnswers || 0,
    totalAnswers: userCategoryProgress?.totalAnswers || 0
  }

  // 難易度選択の処理
  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties(prev => 
      prev.includes(difficulty) 
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    )
  }

  // クイズ開始処理
  const startQuiz = () => {
    const params = new URLSearchParams()
    params.set('category', categoryId)
    if (selectedDifficulties.length > 0) {
      params.set('difficulties', selectedDifficulties.join(','))
    }
    // カテゴリー詳細に戻るためのリファラー情報を追加
    params.set('returnTo', `/categories/${categoryId}`)
    router.push(`/quiz?${params.toString()}`)
  }



  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
        showBackButton={true}
        onBackClick={() => router.back()}
      />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Category Header */}
          <div className="flex items-center space-x-4">
            <div 
              className="text-4xl p-4 rounded-xl"
              style={{ 
                backgroundColor: `${category.color}20`,
                border: `2px solid ${category.color}40`
              }}
            >
              {category.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 leading-tight">{category.name}</h1>
              {category.description && (
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">{category.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-3">
                <Badge 
                  variant={category.type === 'main' ? 'default' : 'secondary'}
                >
                  {category.type === 'main' ? '基本スキル' : '業界特化'}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {subcategories.length} サブカテゴリー
                </div>
              </div>
            </div>
          </div>


          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 h-auto">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>概要</span>
              </TabsTrigger>
              <TabsTrigger value="subcategories" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>学習分野</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>学習目標</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      このカテゴリーでは以下のスキルを体系的に身に付けることができます：
                    </p>
                    <ul className="space-y-2">
                      {category.subcategories.slice(0, 4).map((subcat, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{subcat}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>チャレンジクイズ</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 難易度選択 */}
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">難易度選択（複数選択可）</div>
                        <div className="grid grid-cols-2 gap-2">
                          {skillLevels.map((level) => {
                            const difficultyMapping = {
                              'basic': '基礎',
                              'intermediate': '中級', 
                              'advanced': '上級',
                              'expert': 'エキスパート'
                            }
                            const difficulty = difficultyMapping[level.id as keyof typeof difficultyMapping]
                            const count = questionsByDifficulty[difficulty] || 0
                            const isSelected = selectedDifficulties.includes(difficulty)
                            
                            return (
                              <Button
                                key={level.id}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleDifficulty(difficulty)}
                                disabled={count === 0}
                                className={`text-xs justify-between ${isSelected ? 'bg-primary text-primary-foreground' : ''}`}
                              >
                                <span>{level.name}</span>
                                <Badge 
                                  variant={isSelected ? "secondary" : "outline"} 
                                  className="ml-1 text-xs"
                                >
                                  {count}
                                </Badge>
                              </Button>
                            )
                          })}
                        </div>
                        
                        {selectedDifficulties.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            選択中: {selectedDifficulties.join(', ')} 
                            {' '}({selectedDifficulties.reduce((sum, diff) => sum + (questionsByDifficulty[diff] || 0), 0)}問)
                          </div>
                        )}
                      </div>
                      
                      {/* 総問題数を表示 */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/5">
                        <div>
                          <div className="font-medium text-primary">総問題数</div>
                          <div className="text-sm text-muted-foreground">このカテゴリーの全問題</div>
                        </div>
                        <Badge className="bg-primary text-primary-foreground">
                          {realStats.totalQuizzes}問
                        </Badge>
                      </div>
                      
                      {/* クイズ開始ボタン */}
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <Button 
                          onClick={startQuiz}
                          className="w-full"
                          disabled={realStats.totalQuizzes === 0}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {selectedDifficulties.length > 0 
                            ? `選択した難易度でクイズに挑戦 (${selectedDifficulties.reduce((sum, diff) => sum + (questionsByDifficulty[diff] || 0), 0)}問)`
                            : realStats.totalQuizzes > 0 ? 'このカテゴリーのクイズに挑戦（全難易度）' : '問題準備中'
                          }
                        </Button>
                        
                        {selectedDifficulties.length > 0 && (
                          <Button 
                            variant="outline"
                            onClick={() => setSelectedDifficulties([])}
                            className="w-full text-xs"
                          >
                            難易度選択をクリア
                          </Button>
                        )}
                        
                        {realStats.totalQuizzes > 0 && (
                          <p className="text-xs text-muted-foreground text-center">
                            {selectedDifficulties.length > 0 
                              ? '選択した難易度で不足する場合は他の難易度も含めて出題されます'
                              : 'あなたの学習履歴に基づいて最適化された問題を出題します'
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="subcategories">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subcategories.length > 0 ? subcategories.map((subcat) => (
                  <Card key={subcat.id}>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2">{subcat.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {subcat.description || `${subcat.name}に関する専門知識とスキルを学習します。`}
                      </p>
                      <div className="flex justify-start items-center">
                        <Badge variant="outline">サブカテゴリー</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <Card className="col-span-2">
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">
                        このカテゴリーのサブカテゴリー詳細はまもなく追加されます。
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </div>
  )
}