/**
 * ⚠️ **DEPRECATED - 使用非推奨**
 * 
 * 🚨 **重要な警告**: このコンポーネントは静的データを使用しており、
 * 実際のデータベースの内容と乖離する可能性があります。
 * 
 * **問題点**:
 * - 管理画面での更新が反映されない
 * - サブカテゴリー数が実データと異なる（静的91個 vs 実145個）
 * - 並び順がDB設定と異なる
 * - メンテナンスが必要（手動更新）
 * 
 * **推奨代替案**: `CategoryGrid` を使用してください
 * - DB → FB JSON → 静的データの4層フォールバック
 * - 常に最新データを表示
 * - 管理画面の更新が即座に反映
 * 
 * **使用する場合の条件**:
 * - 🔴 緊急時のみ（システム障害など）
 * - 🔴 使用前に静的データの最新化が必須
 * - 🔴 使用後は速やかに CategoryGrid に戻す
 * 
 * @deprecated Use CategoryGrid instead for dynamic data
 */

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CategoryCard from './CategoryCard'
import { mainCategories, industryCategories } from '@/lib/categories'
import { Users, Building2, BookOpen } from 'lucide-react'

interface FastCategoryGridProps {
  title?: string
  description?: string
  onCategoryClick?: (categoryId: string) => void
}

export default function FastCategoryGrid({
  title = 'カテゴリー一覧',
  description = '学習したいカテゴリーを選択してください',
  onCategoryClick
}: FastCategoryGridProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'industry'>('main')
  
  // Use static data for instant loading
  const filteredMainCategories = mainCategories.filter(cat => cat.isVisible !== false)
  const filteredIndustryCategories = industryCategories.filter(cat => cat.isVisible !== false)

  // Simple placeholder stats for fast rendering
  const statsToUse: Record<string, {
    totalContents: number
    completedContents: number
    averageScore: number
    learningTime: number
  }> = {}

  // Initialize placeholder stats
  const allCategories = [...filteredMainCategories, ...filteredIndustryCategories]
  allCategories.forEach(category => {
    statsToUse[category.id] = {
      totalContents: 10,
      completedContents: 0,
      averageScore: 0,
      learningTime: 0
    }
  })

  console.warn('⚠️ DEPRECATED FastCategoryGrid: Using static data - Consider using CategoryGrid for dynamic data')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
      </div>

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
                  showProgress={false} // Disable progress for faster rendering
                  onClick={() => onCategoryClick?.(category.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>カテゴリーが見つかりませんでした</p>
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
                  showProgress={false} // Disable progress for faster rendering
                  onClick={() => onCategoryClick?.(category.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>業界特化カテゴリーが見つかりませんでした</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}