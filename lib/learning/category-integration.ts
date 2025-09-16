/**
 * 学習コンテンツとカテゴリーシステムの統合機能
 */

import { mainCategories } from '@/lib/categories'
import { LearningCourse, LearningGenre } from '@/lib/types/learning'
import { MainCategory } from '@/lib/types/category'

// ジャンルからカテゴリー情報を取得
export function getCategoryInfoForGenre(genre: LearningGenre): {
  mainCategory: MainCategory | null
  subcategory: string | null
} {
  const mainCategory = mainCategories.find(cat => cat.id === genre.categoryId)
  const subcategory = genre.subcategoryId || null
  
  return {
    mainCategory: mainCategory || null,
    subcategory
  }
}

// コースのすべてのジャンルのカテゴリー情報を取得
export function getCategoryInfoForCourse(course: LearningCourse): {
  categories: Array<{
    genreId: string
    genreTitle: string
    mainCategory: MainCategory | null
    subcategory: string | null
  }>
  uniqueMainCategories: MainCategory[]
} {
  const categories = course.genres.map(genre => ({
    genreId: genre.id,
    genreTitle: genre.title,
    ...getCategoryInfoForGenre(genre)
  }))
  
  const uniqueMainCategories = Array.from(
    new Map(
      categories
        .filter(cat => cat.mainCategory)
        .map(cat => [cat.mainCategory!.id, cat.mainCategory!])
    ).values()
  )
  
  return {
    categories,
    uniqueMainCategories
  }
}

// カテゴリーIDから学習コンテンツを検索（将来の拡張用）
export function findLearningContentByCategory(
  courses: LearningCourse[],
  categoryId: string,
  subcategoryId?: string
): {
  matchingGenres: Array<{
    course: LearningCourse
    genre: LearningGenre
  }>
} {
  const matchingGenres: Array<{
    course: LearningCourse
    genre: LearningGenre
  }> = []
  
  courses.forEach(course => {
    course.genres.forEach(genre => {
      const matches = genre.categoryId === categoryId && 
        (!subcategoryId || genre.subcategoryId === subcategoryId)
      
      if (matches) {
        matchingGenres.push({ course, genre })
      }
    })
  })
  
  return { matchingGenres }
}

// カテゴリー別学習進捗の集計（将来の統計機能用）
export function aggregateLearningProgressByCategory(
  progressData: any[], // 実際の進捗データ型に応じて後で更新
  courses: LearningCourse[]
): Record<string, {
  categoryName: string
  totalSessions: number
  completedSessions: number
  completionRate: number
}> {
  // TODO: 学習進捗機能実装時に詳細を実装
  return {}
}