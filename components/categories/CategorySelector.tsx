'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mainCategories, industryCategories, skillLevels } from '@/lib/categories'
import { MainCategory, IndustryCategory, SkillLevel } from '@/lib/types/category'
import { CheckCircle, Circle, Users, Building2 } from 'lucide-react'

interface CategorySelectorProps {
  selectedCategory?: string
  selectedSkillLevel?: SkillLevel
  onCategorySelect: (categoryId: string, skillLevel: SkillLevel) => void
  showIndustryCategories?: boolean
  allowSkillLevelSelection?: boolean
  title?: string
  description?: string
}

export default function CategorySelector({
  selectedCategory,
  selectedSkillLevel = 'basic',
  onCategorySelect,
  showIndustryCategories = false,
  allowSkillLevelSelection = true,
  title = 'カテゴリーを選択',
  description = '学習したいカテゴリーとレベルを選択してください'
}: CategorySelectorProps) {
  const [currentSkillLevel, setCurrentSkillLevel] = useState<SkillLevel>(selectedSkillLevel)
  const [activeTab, setActiveTab] = useState<'main' | 'industry'>('main')

  const handleCategoryClick = (categoryId: string) => {
    onCategorySelect(categoryId, currentSkillLevel)
  }

  const handleSkillLevelChange = (level: SkillLevel) => {
    setCurrentSkillLevel(level)
    if (selectedCategory) {
      onCategorySelect(selectedCategory, level)
    }
  }

  const renderCategoryCard = (category: MainCategory | IndustryCategory, isSelected: boolean) => (
    <Card 
      key={category.id}
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected 
          ? 'ring-2 ring-primary shadow-lg' 
          : 'hover:shadow-md'
      }`}
      onClick={() => handleCategoryClick(category.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl p-2 rounded-lg"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {category.name}
              </CardTitle>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {category.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {isSelected ? (
              <CheckCircle className="h-6 w-6 text-primary" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {category.subcategories.slice(0, 3).map((subcat, index) => (
            <Badge 
              key={index}
              variant="outline" 
              className="text-xs"
            >
              {subcat}
            </Badge>
          ))}
          {category.subcategories.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{category.subcategories.length - 3}個
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Skill Level Selector */}
      {allowSkillLevelSelection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>学習レベル</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {skillLevels.map((level) => (
                <Button
                  key={level.id}
                  variant={currentSkillLevel === level.id ? 'default' : 'outline'}
                  className="flex flex-col h-auto py-3"
                  onClick={() => handleSkillLevelChange(level.id)}
                >
                  <span className="font-semibold">{level.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {level.targetExperience}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Selector */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'main' | 'industry')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="main" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>基本スキル</span>
          </TabsTrigger>
          {showIndustryCategories && (
            <TabsTrigger value="industry" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>業界特化</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="main" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mainCategories.map((category) => 
              renderCategoryCard(
                category, 
                selectedCategory === category.id
              )
            )}
          </div>
        </TabsContent>

        {showIndustryCategories && (
          <TabsContent value="industry" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {industryCategories.map((category) => 
                renderCategoryCard(
                  category, 
                  selectedCategory === category.id
                )
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Selection Summary */}
      {selectedCategory && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <span className="font-semibold">選択中:</span>
                  <span className="ml-2">
                    {[...mainCategories, ...industryCategories]
                      .find(cat => cat.id === selectedCategory)?.name}
                  </span>
                  {allowSkillLevelSelection && (
                    <Badge className="ml-2">
                      {skillLevels.find(level => level.id === currentSkillLevel)?.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}