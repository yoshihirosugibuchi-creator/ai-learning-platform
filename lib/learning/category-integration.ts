/**
 * 学習コンテンツとカテゴリーシステムの統合機能
 */

import { getCategoryByIdSync } from '@/lib/categories'
import { LearningCourse, LearningGenre } from '@/lib/types/learning'
import { MainCategory, IndustryCategory } from '@/lib/types/category'

// メインカテゴリーまたは業界カテゴリー（表示に必要なプロパティは同じ）
type DisplayCategory = MainCategory | IndustryCategory
import { getSubcategoryDisplayNameSync, getSubcategoryDisplayNameAsync } from '@/lib/category-cache-simple'

// ジャンルからカテゴリー情報を取得
// キャッシュ優先（DB→JSON→静的フォールバック）
// themes が渡された場合、ジャンルにsubcategoryがなければテーマから代表サブカテゴリーを取得
export function getCategoryInfoForGenre(genre: { categoryId: string; subcategoryId?: string; themes?: Array<{ subcategoryId?: string }> }): {
  mainCategory: DisplayCategory | null
  subcategory: string | null
} {
  // getCategoryByIdSyncはキャッシュがあればキャッシュを使用
  const category = getCategoryByIdSync(genre.categoryId)
  const mainCategory = category ? category as DisplayCategory : null

  // サブカテゴリー解決: ジャンル優先 → テーマからフォールバック
  let subcategory: string | null = null
  if (genre.subcategoryId) {
    subcategory = getSubcategoryDisplayNameSync(genre.subcategoryId)
  } else if (genre.themes && genre.themes.length > 0) {
    // テーマからユニークなサブカテゴリーを集約
    const themeSubcategoryIds = [...new Set(
      genre.themes
        .map(t => t.subcategoryId)
        .filter((id): id is string => Boolean(id))
    )]
    if (themeSubcategoryIds.length === 1) {
      // テーマのサブカテゴリーが全て同じ → そのサブカテゴリーを表示
      subcategory = getSubcategoryDisplayNameSync(themeSubcategoryIds[0])
    }
    // 複数の異なるサブカテゴリーがある場合はメインカテゴリー表示（ジャンルレベルでは集約しない）
  }

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
  mainCategory: DisplayCategory | null
  subcategory: string | null
} {
  // カテゴリーはジャンルから取得
  const category = getCategoryByIdSync(genre.categoryId)
  const mainCategory = category ? category as DisplayCategory : null

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
  themes?: Array<{ subcategoryId?: string }>
}

// コースのすべてのジャンル＋テーマからカテゴリー情報を集約
// ルール:
// 1. ジャンルにsubcategoryIdがある → そのサブカテゴリーを表示
// 2. ジャンルにsubcategoryIdがない → テーマのsubcategoryIdを集約して表示
// 3. どこにもsubcategoryIdがない → メインカテゴリー名をフォールバック
// 4. 重複排除（同じcategory_id + subcategory組み合わせは1つだけ）
export function getCategoryInfoForCourse<T extends { genres?: CategoryReference[] }>(course: T): {
  categories: Array<{
    genreId: string
    genreTitle: string
    mainCategory: DisplayCategory | null
    subcategory: string | null
  }>
  uniqueMainCategories: DisplayCategory[]
} {
  if (!course.genres) {
    return { categories: [], uniqueMainCategories: [] }
  }

  const categories: Array<{
    genreId: string
    genreTitle: string
    mainCategory: DisplayCategory | null
    subcategory: string | null
  }> = []

  for (const genre of course.genres) {
    const category = getCategoryByIdSync(genre.categoryId)
    const mainCategory = category ? category as DisplayCategory : null

    if (genre.subcategoryId) {
      // ジャンルにサブカテゴリーが設定済み
      categories.push({
        genreId: genre.id || genre.categoryId,
        genreTitle: genre.title || genre.categoryId,
        mainCategory,
        subcategory: getSubcategoryDisplayNameSync(genre.subcategoryId)
      })
    } else if (genre.themes && genre.themes.length > 0) {
      // テーマからユニークなサブカテゴリーを集約
      const themeSubcategoryIds = [...new Set(
        genre.themes
          .map(t => t.subcategoryId)
          .filter((id): id is string => Boolean(id))
      )]

      if (themeSubcategoryIds.length > 0) {
        for (const subId of themeSubcategoryIds) {
          categories.push({
            genreId: genre.id || genre.categoryId,
            genreTitle: genre.title || genre.categoryId,
            mainCategory,
            subcategory: getSubcategoryDisplayNameSync(subId)
          })
        }
      } else {
        // サブカテゴリーなし → メインカテゴリーのみ
        categories.push({
          genreId: genre.id || genre.categoryId,
          genreTitle: genre.title || genre.categoryId,
          mainCategory,
          subcategory: null
        })
      }
    } else {
      // テーマもない → メインカテゴリーのみ
      categories.push({
        genreId: genre.id || genre.categoryId,
        genreTitle: genre.title || genre.categoryId,
        mainCategory,
        subcategory: null
      })
    }
  }

  // カテゴリー + サブカテゴリーの組み合わせで重複排除
  const uniqueCategories = Array.from(
    new Map(
      categories
        .map(cat => {
          const key = `${cat.mainCategory?.id || 'unknown'}-${cat.subcategory || ''}`
          return [key, cat] as const
        })
    ).values()
  )

  const uniqueMainCategories = Array.from(
    new Map(
      uniqueCategories
        .filter(cat => cat.mainCategory)
        .map(cat => [cat.mainCategory!.id, cat.mainCategory!])
    ).values()
  )

  return {
    categories: uniqueCategories,
    uniqueMainCategories
  }
}

// getCategoryInfoForCourseの非同期版（確実にキャッシュロード後に表示名を解決）
export async function getCategoryInfoForCourseAsync<T extends { genres?: CategoryReference[] }>(course: T): Promise<{
  categories: Array<{
    genreId: string
    genreTitle: string
    mainCategory: DisplayCategory | null
    subcategory: string | null
  }>
  uniqueMainCategories: DisplayCategory[]
}> {
  if (!course.genres) {
    return { categories: [], uniqueMainCategories: [] }
  }

  const categories: Array<{
    genreId: string
    genreTitle: string
    mainCategory: DisplayCategory | null
    subcategory: string | null
  }> = []

  for (const genre of course.genres) {
    const category = getCategoryByIdSync(genre.categoryId)
    const mainCategory = category ? category as DisplayCategory : null

    if (genre.subcategoryId) {
      categories.push({
        genreId: genre.id || genre.categoryId,
        genreTitle: genre.title || genre.categoryId,
        mainCategory,
        subcategory: await getSubcategoryDisplayNameAsync(genre.subcategoryId)
      })
    } else if (genre.themes && genre.themes.length > 0) {
      const themeSubcategoryIds = [...new Set(
        genre.themes
          .map(t => t.subcategoryId)
          .filter((id): id is string => Boolean(id))
      )]

      if (themeSubcategoryIds.length > 0) {
        for (const subId of themeSubcategoryIds) {
          categories.push({
            genreId: genre.id || genre.categoryId,
            genreTitle: genre.title || genre.categoryId,
            mainCategory,
            subcategory: await getSubcategoryDisplayNameAsync(subId)
          })
        }
      } else {
        categories.push({
          genreId: genre.id || genre.categoryId,
          genreTitle: genre.title || genre.categoryId,
          mainCategory,
          subcategory: null
        })
      }
    } else {
      categories.push({
        genreId: genre.id || genre.categoryId,
        genreTitle: genre.title || genre.categoryId,
        mainCategory,
        subcategory: null
      })
    }
  }

  const uniqueCategories = Array.from(
    new Map(
      categories
        .map(cat => {
          const key = `${cat.mainCategory?.id || 'unknown'}-${cat.subcategory || ''}`
          return [key, cat] as const
        })
    ).values()
  )

  const uniqueMainCategories = Array.from(
    new Map(
      uniqueCategories
        .filter(cat => cat.mainCategory)
        .map(cat => [cat.mainCategory!.id, cat.mainCategory!])
    ).values()
  )

  return {
    categories: uniqueCategories,
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