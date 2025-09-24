'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Clock, BookOpen, Play, Lock, Tag } from 'lucide-react'
import { DifficultyLabels, DifficultyColors } from '@/lib/types/learning'
import { getCategoryInfoForCourse } from '@/lib/learning/category-integration'
import { useState, useEffect } from 'react'
import { getSkillLevels } from '@/lib/categories'
import { SkillLevelDefinition } from '@/lib/types/category'

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    estimatedDays: number
    difficulty: 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert'
    icon: string
    color: string
    displayOrder: number
    genreCount: number
    themeCount: number
    status: 'available' | 'coming_soon' | 'draft'
    genres?: { categoryId: string; subcategoryId?: string }[]
  }
  progress?: {
    completedThemes: number
    totalThemes: number
    completedSessions: number
    totalSessions: number
  }
  onStartCourse: (courseId: string) => void
}

export default function CourseCard({ course, progress, onStartCourse }: CourseCardProps) {
  const [dbSkillLevels, setDbSkillLevels] = useState<SkillLevelDefinition[]>([])
  const isAvailable = course.status === 'available'
  const hasProgress = progress && progress.completedSessions > 0
  const progressPercentage = progress 
    ? Math.round((progress.completedSessions / progress.totalSessions) * 100)
    : 0

  // DBスキルレベルを取得
  useEffect(() => {
    const loadSkillLevels = async () => {
      try {
        const skillLevels = await getSkillLevels()
        setDbSkillLevels(skillLevels)
      } catch (error) {
        console.error('Error loading skill levels:', error)
        setDbSkillLevels([]) // Fallback to static data via DifficultyLabels
      }
    }
    loadSkillLevels()
  }, [])

  // ホバー時のプリフェッチ
  const handleMouseEnter = async () => {
    if (!isAvailable) return
    
    try {
      const { getLearningCourseDetails } = await import('@/lib/learning/data')
      // バックグラウンドでプリフェッチ（エラーは無視）
      getLearningCourseDetails(course.id).catch(() => {})
    } catch {
      // プリフェッチエラーは無視
    }
  }

  // カテゴリー情報を取得
  const categoryInfo = course.genres ? getCategoryInfoForCourse(course) : null

  // スキルレベルのラベルと色を取得（DB優先、フォールバック付き）
  const getDifficultyDisplay = () => {
    // DBスキルレベルから該当するものを検索
    const dbSkillLevel = dbSkillLevels.find(level => level.id === course.difficulty)
    if (dbSkillLevel) {
      return {
        label: dbSkillLevel.name,
        color: (DifficultyColors as Record<string, string>)[course.difficulty] || '#6B7280'
      }
    }
    
    // フォールバック: 静的データを使用
    const difficultyKey = course.difficulty === 'beginner' ? 'basic' : course.difficulty
    return {
      label: (DifficultyLabels as Record<string, string>)[difficultyKey] || course.difficulty,
      color: (DifficultyColors as Record<string, string>)[difficultyKey] || '#6B7280'
    }
  }

  const difficultyDisplay = getDifficultyDisplay()

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-200 ${
        !isAvailable ? 'opacity-60' : 'hover:scale-105'
      }`}
      style={{ borderTop: `4px solid ${course.color}` }}
      onMouseEnter={handleMouseEnter}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl p-2 rounded-full bg-opacity-10 flex items-center justify-center w-12 h-12"
              style={{ backgroundColor: `${course.color}20` }}
            >
              {course.icon}
            </div>
            <div>
              <CardTitle className="text-lg leading-tight">{course.title}</CardTitle>
              <Badge 
                variant="secondary" 
                className="mt-1"
                style={{ 
                  backgroundColor: difficultyDisplay.color,
                  color: 'white'
                }}
              >
                {difficultyDisplay.label}
              </Badge>
            </div>
          </div>
          {!isAvailable && (
            <Lock className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {course.description}
        </p>
        
        {/* カテゴリー情報表示 */}
        {categoryInfo && categoryInfo.uniqueMainCategories.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex flex-wrap gap-1">
              {(categoryInfo.categories as Array<{
                mainCategory?: { color: string; name: string; icon?: string }
                subcategory?: string
              }>).map((cat, index: number) => (
                cat.mainCategory && (
                  <Badge 
                    key={index}
                    variant="outline" 
                    className="text-xs px-2 py-0.5"
                    style={{ 
                      borderColor: cat.mainCategory.color + '40',
                      color: cat.mainCategory.color,
                      backgroundColor: cat.mainCategory.color + '10'
                    }}
                  >
                    <Tag className="h-2.5 w-2.5 mr-1" />
                    {cat.subcategory || cat.mainCategory.name}
                  </Badge>
                )
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar (if started) */}
        {hasProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">学習進捗</span>
              <span className="font-medium" style={{ color: course.color }}>
                {progressPercentage}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {progress.completedThemes}/{progress.totalThemes} テーマ完了
            </div>
          </div>
        )}

        {/* Course Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{course.estimatedDays}日間</span>
            </div>
            <div className="flex items-center space-x-1">
              <BookOpen className="h-4 w-4" />
              <span>{course.themeCount}テーマ</span>
            </div>
          </div>
          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
            {course.genreCount}ジャンル
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={() => onStartCourse(course.id)}
          disabled={!isAvailable}
          className="w-full"
          style={{ 
            backgroundColor: isAvailable ? course.color : undefined,
            borderColor: course.color
          }}
          variant={isAvailable ? "default" : "outline"}
        >
          {!isAvailable ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              近日公開
            </>
          ) : hasProgress ? (
            <>
              <Play className="h-4 w-4 mr-2" />
              続きから学習
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              学習開始
            </>
          )}
        </Button>

        {/* Coming Soon Badge */}
        {course.status === 'coming_soon' && (
          <div className="text-center">
            <Badge variant="outline" className="text-xs">
              Coming Soon
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}