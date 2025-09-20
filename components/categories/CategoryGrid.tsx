'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CategoryCard from './CategoryCard'
import { mainCategories, industryCategories, skillLevels } from '@/lib/categories'
import { MainCategory, IndustryCategory, SkillLevel } from '@/lib/types/category'
import { Search, Filter, Users, Building2, TrendingUp, BookOpen } from 'lucide-react'
import { useUserContext } from '@/contexts/UserContext'
import { getUserQuizResults } from '@/lib/storage'
import { getAllQuestions } from '@/lib/questions'

interface CategoryGridProps {
  showSearch?: boolean
  showFilter?: boolean
  showStats?: boolean
  onCategoryClick?: (categoryId: string) => void
  title?: string
  description?: string
  // Mock stats data - in real implementation, this would come from API
  categoryStats?: Record<string, {
    totalContents: number
    completedContents: number
    averageScore: number
    learningTime: number
  }>
}

export default function CategoryGrid({
  showSearch = true,
  showFilter = true,
  showStats = true,
  onCategoryClick,
  title = 'カテゴリー一覧',
  description = '学習したいカテゴリーを選択してください',
  categoryStats
}: CategoryGridProps) {
  const { user } = useUserContext()
  const [allQuestions, setAllQuestions] = useState<Array<Record<string, unknown>>>([])
  
  // Load all questions on component mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const questions = await getAllQuestions()
        setAllQuestions(questions)
      } catch (error) {
        console.error('Error loading questions:', error)
        setAllQuestions([])
      }
    }
    loadQuestions()
  }, [])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<SkillLevel | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'main' | 'industry'>('main')

  // Filter categories based on search and skill level
  const filterCategories = (categories: (MainCategory | IndustryCategory)[]) => {
    return categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      // For now, show all categories regardless of skill level
      // In real implementation, this would filter based on available content for that skill level
      return matchesSearch
    })
  }

  const filteredMainCategories = filterCategories(mainCategories)
  const filteredIndustryCategories = filterCategories(industryCategories)

  // Calculate real category stats based on user's quiz results and available questions
  const realStats = useMemo(() => {
    if (!user || allQuestions.length === 0) {
      return {}
    }
    
    const userQuizResults = getUserQuizResults(user.id)
    
    // Group questions by category to get total available questions per category
    const questionsByCategory = allQuestions.reduce((acc, question) => {
      if (!acc[question.category]) {
        acc[question.category] = []
      }
      acc[question.category].push(question)
      return acc
    }, {} as Record<string, Array<Record<string, unknown>>>)
    
    // Calculate stats for each category
    const categoryStats: Record<string, Record<string, unknown>> = {}
    
    // First, initialize all categories with zero stats
    const allCategoryIds = [...mainCategories, ...industryCategories].map(cat => cat.id)
    allCategoryIds.forEach(categoryId => {
      const totalQuestions = questionsByCategory[categoryId]?.length || 0
      categoryStats[categoryId] = {
        totalContents: totalQuestions,
        completedContents: 0,
        averageScore: 0,
        learningTime: 0
      }
    })
    
    // Then update with actual user progress
    Object.keys(questionsByCategory).forEach(categoryId => {
      const totalQuestions = questionsByCategory[categoryId].length
      
      // Get user's quiz results for this category
      const categoryResults = userQuizResults.filter(result => 
        result.categoryScores && result.categoryScores[categoryId]
      )
      
      // Calculate completed questions and average score
      let totalAnswered = 0
      let totalCorrect = 0
      let totalTime = 0
      
      categoryResults.forEach(result => {
        const categoryScore = result.categoryScores[categoryId]
        if (categoryScore) {
          totalAnswered += categoryScore.total
          totalCorrect += categoryScore.correct
          totalTime += result.timeSpent || 0
        }
      })
      
      const averageScore = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
      const completionRate = totalQuestions > 0 ? Math.min(totalAnswered / totalQuestions, 1) : 0
      const completedContents = totalQuestions > 0 ? Math.round(totalQuestions * completionRate) : 0
      const learningTimeMinutes = totalTime > 0 ? Math.round(totalTime / 1000 / 60) : 0
      
      // Ensure all values are valid numbers
      const safeStats = {
        totalContents: Math.max(0, totalQuestions || 0),
        completedContents: Math.max(0, completedContents || 0),
        averageScore: Math.max(0, averageScore || 0),
        learningTime: Math.max(0, learningTimeMinutes || 0)
      }
      
      categoryStats[categoryId] = safeStats
      
      // Debug logging for all categories
      console.log(`📊 Category ${categoryId}:`, {
        totalQuestions: safeStats.totalContents,
        completedContents: safeStats.completedContents,
        averageScore: safeStats.averageScore,
        learningTime: safeStats.learningTime,
        userAnswered: totalAnswered,
        completionRate: Math.round(completionRate * 100) + '%'
      })
    })
    
    return categoryStats
  }, [user, allQuestions])
  
  const statsToUse = categoryStats || realStats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Search and Filter */}
      {(showSearch || showFilter) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>検索・フィルター</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="カテゴリー名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            
            {showFilter && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-sm font-medium">レベル:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSkillLevel === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSkillLevel('all')}
                  >
                    すべて
                  </Button>
                  {skillLevels.map((level) => (
                    <Button
                      key={level.id}
                      variant={selectedSkillLevel === level.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSkillLevel(level.id)}
                    >
                      {level.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <div className="text-2xl font-bold">{mainCategories.length}</div>
              </div>
              <p className="text-sm text-muted-foreground">基本スキル</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Building2 className="h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold">{industryCategories.length}</div>
              </div>
              <p className="text-sm text-muted-foreground">業界特化</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Users className="h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold">
                  {mainCategories.reduce((total, cat) => total + cat.subcategories.length, 0) + 
                   industryCategories.reduce((total, cat) => total + cat.subcategories.length, 0)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">サブカテゴリー総数</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div className="text-2xl font-bold">
                  {(() => {
                    const validStats = Object.values(statsToUse).filter(stat => stat && stat.totalContents > 0)
                    if (validStats.length === 0) return '0'
                    
                    const totalProgress = validStats.reduce((acc, stat) => {
                      const rate = stat.totalContents > 0 ? (stat.completedContents / stat.totalContents) : 0
                      return acc + rate
                    }, 0)
                    
                    const averageRate = totalProgress / validStats.length
                    return Math.round(averageRate * 100)
                  })()}%
                </div>
              </div>
              <p className="text-sm text-muted-foreground">クイズ消化率</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Grid */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'main' | 'industry')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>基本スキル ({filteredMainCategories.length})</span>
          </TabsTrigger>
          <TabsTrigger value="industry" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>業界特化 ({filteredIndustryCategories.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="mt-6">
          {filteredMainCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMainCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  stats={statsToUse[category.id]}
                  showProgress={showStats}
                  onClick={() => onCategoryClick?.(category.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>検索条件に一致するカテゴリーが見つかりませんでした</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="industry" className="mt-6">
          {filteredIndustryCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIndustryCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  stats={statsToUse[category.id]}
                  showProgress={showStats}
                  onClick={() => onCategoryClick?.(category.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>検索条件に一致する業界特化カテゴリーが見つかりませんでした</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}