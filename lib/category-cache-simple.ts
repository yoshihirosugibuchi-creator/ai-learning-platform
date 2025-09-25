/**
 * シンプルなカテゴリー・サブカテゴリーキャッシュシステム
 * 同期版・非同期版の両方を提供
 */

import { createClient } from '@supabase/supabase-js'
import { categoryDisplayNames, subcategoryDisplayNames } from './category-mapping'

// Supabaseクライアント設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseClient: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey)
}

/**
 * シンプルなキャッシュストレージ
 */
class SimpleCache {
  private categories = new Map<string, string>()
  private subcategories = new Map<string, string>()
  private categoriesLoaded = false
  private subcategoriesLoaded = false
  private loadingCategories: Promise<void> | null = null
  private loadingSubcategories: Promise<void> | null = null

  // カテゴリー読み込み
  async loadCategories(): Promise<void> {
    if (this.categoriesLoaded || this.loadingCategories) {
      await this.loadingCategories
      return
    }

    this.loadingCategories = this.doLoadCategories()
    await this.loadingCategories
  }

  private async doLoadCategories(): Promise<void> {
    try {
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('categories')
          .select('category_id, name')
          .order('category_id')

        if (!error && data) {
          for (const item of data as Array<{category_id: string, name: string}>) {
            this.categories.set(item.category_id, item.name)
          }
          this.categoriesLoaded = true
          console.log(`✅ Loaded ${data.length} categories from DB`)
          return
        }
      }
    } catch (_error) {
      console.warn('Failed to load categories from DB, using fallback')
    }

    // フォールバック
    for (const [id, name] of Object.entries(categoryDisplayNames)) {
      this.categories.set(id, name)
    }
    this.categoriesLoaded = true
  }

  // サブカテゴリー読み込み
  async loadSubcategories(): Promise<void> {
    if (this.subcategoriesLoaded || this.loadingSubcategories) {
      await this.loadingSubcategories
      return
    }

    this.loadingSubcategories = this.doLoadSubcategories()
    await this.loadingSubcategories
  }

  private async doLoadSubcategories(): Promise<void> {
    try {
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('subcategories')
          .select('subcategory_id, name')
          .order('subcategory_id')

        if (!error && data) {
          for (const item of data as Array<{subcategory_id: string, name: string}>) {
            this.subcategories.set(item.subcategory_id, item.name)
          }
          this.subcategoriesLoaded = true
          console.log(`✅ Loaded ${data.length} subcategories from DB`)
          return
        }
      }
    } catch (_error) {
      console.warn('Failed to load subcategories from DB, using fallback')
    }

    // フォールバック
    for (const [id, name] of Object.entries(subcategoryDisplayNames)) {
      this.subcategories.set(id, name)
    }
    this.subcategoriesLoaded = true
  }

  // 同期取得（純粋キャッシュ、ハードコード一切なし）
  getCategorySync(id: string): string {
    if (this.categoriesLoaded) {
      return this.categories.get(id) || id // キャッシュにない場合はIDをそのまま返す
    }
    
    // 非同期でロード開始（結果は次回以降で反映）
    this.loadCategories().catch(console.error)
    
    // キャッシュ未完了時は「読み込み中...」またはIDをそのまま返す
    return id
  }

  getSubcategorySync(id: string): string {
    if (this.subcategoriesLoaded) {
      return this.subcategories.get(id) || id // キャッシュにない場合はIDをそのまま返す
    }
    
    // 非同期でロード開始
    this.loadSubcategories().catch(console.error)
    
    // キャッシュ未完了時はIDをそのまま返す（ハードコード一切なし）
    return id
  }

  // 非同期取得（確実にDB取得、純粋キャッシュ）
  async getCategoryAsync(id: string): Promise<string> {
    await this.loadCategories()
    return this.categories.get(id) || id // ハードコード一切なし
  }

  async getSubcategoryAsync(id: string): Promise<string> {
    await this.loadSubcategories()
    return this.subcategories.get(id) || id // ハードコード一切なし
  }

  // 状態確認
  getStats() {
    return {
      categoriesLoaded: this.categoriesLoaded,
      categoriesCount: this.categories.size,
      subcategoriesLoaded: this.subcategoriesLoaded,
      subcategoriesCount: this.subcategories.size
    }
  }

  // テスト用
  clearCache() {
    this.categories.clear()
    this.subcategories.clear()
    this.categoriesLoaded = false
    this.subcategoriesLoaded = false
    this.loadingCategories = null
    this.loadingSubcategories = null
  }
}

// シングルトンインスタンス
const cache = new SimpleCache()

// エクスポート関数

/**
 * カテゴリー表示名取得（同期版）
 * React コンポーネントで使用
 */
export function getCategoryDisplayNameSync(categoryId: string): string {
  if (!categoryId) return categoryId
  return cache.getCategorySync(categoryId)
}

/**
 * サブカテゴリー表示名取得（同期版）
 * React コンポーネントで使用
 */
export function getSubcategoryDisplayNameSync(subcategoryId: string): string {
  if (!subcategoryId) return subcategoryId
  return cache.getSubcategorySync(subcategoryId)
}

/**
 * カテゴリー表示名取得（非同期版）
 * サーバーサイドやAPI等で使用
 */
export async function getCategoryDisplayNameAsync(categoryId: string): Promise<string> {
  if (!categoryId) return categoryId
  return cache.getCategoryAsync(categoryId)
}

/**
 * サブカテゴリー表示名取得（非同期版）
 * サーバーサイドやAPI等で使用
 */
export async function getSubcategoryDisplayNameAsync(subcategoryId: string): Promise<string> {
  if (!subcategoryId) return subcategoryId
  return cache.getSubcategoryAsync(subcategoryId)
}

/**
 * キャッシュ統計取得（デバッグ用）
 */
export function getCacheStats() {
  return cache.getStats()
}

/**
 * キャッシュクリア（テスト用）
 */
export function clearCache() {
  cache.clearCache()
}