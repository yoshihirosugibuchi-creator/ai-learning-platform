'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CategoryCard from './CategoryCard'
import { mainCategories, industryCategories, skillLevels, getCategories, getSkillLevels } from '@/lib/categories'
import { MainCategory, IndustryCategory, SkillLevel, SkillLevelDefinition } from '@/lib/types/category'
import { Question } from '@/lib/types'
import { Search, Filter, Users, Building2, TrendingUp, BookOpen } from 'lucide-react'
import { useUserContext } from '@/contexts/UserContext'

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
  const [_allQuestions, setAllQuestions] = useState<Question[]>([])
  const [dbCategories, setDbCategories] = useState<(MainCategory | IndustryCategory)[]>([])
  const [dbSkillLevels, setDbSkillLevels] = useState<SkillLevelDefinition[]>([])
  const [loading, setLoading] = useState(true)
  
  // Load all questions and DB data on component mount
  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 CategoryGrid: Starting data load...')
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ CategoryGrid: Data loading timeout, using fallback')
        setAllQuestions([])
        setDbCategories([...mainCategories, ...industryCategories])
        setDbSkillLevels(skillLevels)
        setLoading(false)
      }, 10000) // 10 seconds timeout
      
      try {
        console.log('📁 CategoryGrid: Loading categories...')
        const categories = await getCategories({ activeOnly: false }) // Show all categories including coming soon
        console.log('✅ CategoryGrid: Categories loaded:', categories.length)
        
        console.log('🎯 CategoryGrid: Loading skill levels...')
        const skillLevels = await getSkillLevels()
        console.log('✅ CategoryGrid: Skill levels loaded:', skillLevels.length)
        
        clearTimeout(timeoutId)
        setAllQuestions([]) // Questions not needed for category display
        setDbCategories(categories)
        setDbSkillLevels(skillLevels)
        console.log('✅ CategoryGrid: All data loaded successfully (questions skipped for performance)')
      } catch (error) {
        console.error('❌ CategoryGrid: Error loading data:', error)
        clearTimeout(timeoutId)
        setAllQuestions([])
        setDbCategories([...mainCategories, ...industryCategories]) // Fallback to static
        setDbSkillLevels(skillLevels) // Fallback to static
        console.log('🔧 CategoryGrid: Using fallback data')
      } finally {
        console.log('🏁 CategoryGrid: Setting loading to false')
        setLoading(false)
      }
    }
    loadData()
  }, [])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<SkillLevel | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'main' | 'industry'>('main')

  // Filter categories based on search and skill level
  const filterCategories = useCallback((categories: (MainCategory | IndustryCategory)[]) => {
    return categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      // カテゴリーステータス制御:
      // - 有効: isActive=true, isVisible=true → 表示
      // - Coming Soon: isActive=false, isVisible=true → 表示（Coming Soonバッジ付き）
      // - 非表示: isActive=false, isVisible=false → 非表示
      const shouldShow = category.isVisible === true // is_visible=trueのもののみ表示
      
      // For now, show all categories regardless of skill level
      // In real implementation, this would filter based on available content for that skill level
      return matchesSearch && shouldShow
    })
  }, [searchTerm])

  // Split DB categories by type
  const dbMainCategories = dbCategories.filter(cat => cat.type === 'main')
  const dbIndustryCategories = dbCategories.filter(cat => cat.type === 'industry')
  
  const filteredMainCategories = useMemo(() => 
    filterCategories(dbMainCategories.length > 0 ? dbMainCategories : mainCategories),
    [dbMainCategories, filterCategories]
  )
  
  const filteredIndustryCategories = useMemo(() => 
    filterCategories(dbIndustryCategories.length > 0 ? dbIndustryCategories : industryCategories),
    [dbIndustryCategories, filterCategories]
  )

  // Simplified stats - for category display we don't need detailed calculations
  const realStats = useMemo(() => {
    if (!user) {
      return {}
    }
    
    // Initialize basic stats for all categories
    const categoryStats: Record<string, Record<string, unknown>> = {}
    const allCategoryIds = [...filteredMainCategories, ...filteredIndustryCategories].map(cat => cat.id)
    
    allCategoryIds.forEach(categoryId => {
      categoryStats[categoryId] = {
        totalContents: 10, // Placeholder - will be loaded asynchronously if needed
        completedContents: 0,
        averageScore: 0,
        learningTime: 0
      }
    })
    
    return categoryStats
  }, [user, filteredMainCategories, filteredIndustryCategories])
  
  const statsToUse = categoryStats || realStats

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">カテゴリーを読み込んでいます...</p>
          <p className="text-xs text-muted-foreground mt-1">
            問題が続く場合はページを再読み込みしてください
          </p>
          <div className="mt-4">
            <button 
              onClick={() => window.location.reload()} 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </div>
    )
  }

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
                  {(dbSkillLevels.length > 0 ? dbSkillLevels : skillLevels).map((level) => (
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
                <div className="text-2xl font-bold">{filteredMainCategories.length}</div>
              </div>
              <p className="text-sm text-muted-foreground">基本スキル</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Building2 className="h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold">{filteredIndustryCategories.length}</div>
              </div>
              <p className="text-sm text-muted-foreground">業界特化</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Users className="h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold">
                  {filteredMainCategories.reduce((total, cat) => total + ((cat.subcategories || []).length), 0) + 
                   filteredIndustryCategories.reduce((total, cat) => total + ((cat.subcategories || []).length), 0)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">サブカテゴリー総数</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div className="text-2xl font-bold">-</div>
              </div>
              <p className="text-sm text-muted-foreground">進捗率</p>
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
                  stats={statsToUse[category.id] as {
                    totalContents: number
                    completedContents: number
                    averageScore: number
                    learningTime: number
                  } | undefined}
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
                  stats={statsToUse[category.id] as {
                    totalContents: number
                    completedContents: number
                    averageScore: number
                    learningTime: number
                  } | undefined}
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