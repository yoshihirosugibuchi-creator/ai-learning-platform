/**
 * 学習コンテンツとカテゴリーシステムの統合機能
 */

import { getCategoryByIdSync } from '@/lib/categories'
import { LearningCourse, LearningGenre } from '@/lib/types/learning'
import { MainCategory } from '@/lib/types/category'
import { getSubcategoryDisplayNameSync } from '@/lib/category-cache-simple'

// ジャンルからカテゴリー情報を取得
// キャッシュ優先（DB→JSON→静的フォールバック）
export function getCategoryInfoForGenre(genre: { categoryId: string; subcategoryId?: string }): {
  mainCategory: MainCategory | null
  subcategory: string | null
} {
  // getCategoryByIdSyncはキャッシュがあればキャッシュを使用
  const category = getCategoryByIdSync(genre.categoryId)
  const mainCategory = category?.type === 'main' ? category as MainCategory : null
  // subcategoryIdを日本語表示名に変換（シンプルキャッシュ使用）
  const subcategory = genre.subcategoryId ? getSubcategoryDisplayNameSync(genre.subcategoryId) : null

  return {
    mainCategory: mainCategory || null,
    subcategory
  }
}

// テーマからサブカテゴリー情報を取得
// ルール: テーマのsubcategoryId優先 → なければジャンルのsubcategoryIdを継承
export function getSubcategoryForTheme(
  theme: { subcategoryId?: string },
  genre: { subcategoryId?: string }
): string | null {
  // テーマのsubcategoryIdを優先
  const effectiveSubcategoryId = theme.subcategoryId || genre.subcategoryId
  if (!effectiveSubcategoryId) return null

  return getSubcategoryDisplayNameSync(effectiveSubcategoryId)
}

// テーマからカテゴリー情報を取得（ジャンル情報も必要）
export function getCategoryInfoForTheme(
  theme: { subcategoryId?: string },
  genre: { categoryId: string; subcategoryId?: string }
): {
  mainCategory: MainCategory | null
  subcategory: string | null
} {
  // カテゴリーはジャンルから取得
  const category = getCategoryByIdSync(genre.categoryId)
  const mainCategory = category?.type === 'main' ? category as MainCategory : null

  // サブカテゴリーはテーマ優先、なければジャンルから継承
  const subcategory = getSubcategoryForTheme(theme, genre)

  return {
    mainCategory: mainCategory || null,
    subcategory
  }
}

// 共通のカテゴリー参照型
interface CategoryReference {
  categoryId: string
  subcategoryId?: string
  id?: string
  title?: string
}

// コースのすべてのジャンルのカテゴリー情報を取得
export function getCategoryInfoForCourse<T extends { genres?: CategoryReference[] }>(course: T): {
  categories: Array<{
    genreId: string
    genreTitle: string
    mainCategory: MainCategory | null
    subcategory: string | null
  }>
  uniqueMainCategories: MainCategory[]
} {
  if (!course.genres) {
    return { categories: [], uniqueMainCategories: [] }
  }
  
  const categories = course.genres.map(genre => ({
    genreId: genre.id || genre.categoryId,
    genreTitle: genre.title || genre.categoryId,
    ...getCategoryInfoForGenre({
      categoryId: genre.categoryId,
      subcategoryId: genre.subcategoryId
    })
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
  _progressData: unknown[], // 実際の進捗データ型に応じて後で更新
  _courses: LearningCourse[]
): Record<string, {
  categoryName: string
  totalSessions: number
  completedSessions: number
  completionRate: number
}> {
  // TODO: 学習進捗機能実装時に詳細を実装
  return {}
}