'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MainCategory, IndustryCategory } from '@/lib/types/category'
import { CheckCircle, Clock, BookOpen, TrendingUp } from 'lucide-react'

interface CategoryCardProps {
  category: MainCategory | IndustryCategory
  stats?: {
    totalContents: number
    completedContents: number
    averageScore: number
    learningTime: number // minutes
  }
  showProgress?: boolean
  onClick?: () => void
  className?: string
}

export default function CategoryCard({
  category,
  stats,
  showProgress = false,
  onClick,
  className = ''
}: CategoryCardProps) {
  // Safe completion rate calculation to prevent NaN
  const completionRate = (() => {
    if (!stats) return 0
    
    const total = Number(stats.totalContents) || 0
    const completed = Number(stats.completedContents) || 0
    
    if (total <= 0) return 0
    if (completed <= 0) return 0
    if (isNaN(total) || isNaN(completed)) return 0
    
    return Math.min(100, Math.round((completed / total) * 100))
  })()
  
  // Debug log for troubleshooting (only if there's an issue)
  if (stats && (isNaN(completionRate) || completionRate < 0)) {
    console.warn(`⚠️ CategoryCard ${category.name} NaN issue:`, {
      stats,
      completionRate,
      totalContents: stats.totalContents,
      completedContents: stats.completedContents
    })
  }

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl p-3 rounded-xl"
              style={{ 
                backgroundColor: `${category.color}20`,
                border: `1px solid ${category.color}30`
              }}
            >
              {category.icon}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold line-clamp-2">
                {category.name}
              </CardTitle>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>
          </div>
          
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Subcategories */}
        <div>
          <div className="flex flex-wrap gap-2">
            {category.subcategories.slice(0, 4).map((subcat, index) => (
              <Badge 
                key={index}
                variant="outline" 
                className="text-xs"
              >
                {typeof subcat === 'string' ? subcat : subcat}
              </Badge>
            ))}
            {category.subcategories.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{category.subcategories.length - 4}個
              </Badge>
            )}
          </div>
        </div>

        {/* Progress information */}
        {showProgress && stats && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">進捗状況</span>
              <span className="text-sm text-muted-foreground">
                {completionRate}%
              </span>
            </div>
            <Progress value={completionRate} className="h-2" />
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm font-semibold">{stats.completedContents}</div>
                <div className="text-xs text-muted-foreground">完了</div>
              </div>
              <div>
                <div className="text-sm font-semibold">{stats.totalContents}</div>
                <div className="text-xs text-muted-foreground">総問題</div>
              </div>
            </div>
            
            {stats.averageScore > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">平均スコア</span>
                <Badge variant="outline" className="text-xs">
                  {stats.averageScore}%
                </Badge>
              </div>
            )}
          </div>
        )}
        
        {/* サブカテゴリー数を表示 */}
        {!showProgress && (
          <div className="text-center py-2">
            <div className="text-lg font-semibold text-muted-foreground">
              {category.subcategories.length}
            </div>
            <div className="text-xs text-muted-foreground">サブカテゴリー</div>
          </div>
        )}

        {/* Category Type Badge */}
        <div className="flex justify-between items-center">
          <Badge 
            variant={category.type === 'main' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {category.type === 'main' ? '基本スキル' : '業界特化'}
          </Badge>
          
          {category.type === 'industry' && (
            <div className="text-xs text-muted-foreground">
              専門分野
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}