/**
 * サブカテゴリーキャッシュシステム
 * DBから動的にサブカテゴリー名を取得・キャッシュする
 */

interface SubcategoryData {
  subcategory_id: string
  name: string
  parent_category_id: string
}

// グローバルキャッシュ
let subcategoryCache: Map<string, string> = new Map()
let cacheInitialized = false
let cachePromise: Promise<void> | null = null

/**
 * サブカテゴリーキャッシュを初期化
 * APIまたはfallback.jsonからデータを取得
 */
export async function initializeSubcategoryCache(): Promise<void> {
  // 既に初期化中または初期化済みの場合は待機
  if (cachePromise) {
    return cachePromise
  }

  if (cacheInitialized) {
    return Promise.resolve()
  }

  cachePromise = (async () => {
    try {
      // まずAPIから取得を試みる
      const response = await fetch('/api/subcategories?active_only=true')

      if (response.ok) {
        const data = await response.json()
        const subcategories: SubcategoryData[] = data.subcategories || []

        subcategories.forEach((sub) => {
          subcategoryCache.set(sub.subcategory_id, sub.name)
        })

        console.log(`✅ [SubcategoryCache] Loaded ${subcategories.length} subcategories from API`)
        cacheInitialized = true
        return
      }
    } catch (error) {
      console.warn('⚠️ [SubcategoryCache] API fetch failed, trying fallback:', error)
    }

    // APIが失敗した場合、fallback.jsonを試みる
    try {
      const fallbackResponse = await fetch('/data/subcategories-fallback.json')

      if (fallbackResponse.ok) {
        const subcategories: SubcategoryData[] = await fallbackResponse.json()

        subcategories.forEach((sub) => {
          subcategoryCache.set(sub.subcategory_id, sub.name)
        })

        console.log(`✅ [SubcategoryCache] Loaded ${subcategories.length} subcategories from fallback`)
        cacheInitialized = true
        return
      }
    } catch (error) {
      console.warn('⚠️ [SubcategoryCache] Fallback fetch failed:', error)
    }

    console.error('❌ [SubcategoryCache] Failed to initialize cache')
  })()

  return cachePromise
}

/**
 * キャッシュからサブカテゴリー名を取得
 * キャッシュが初期化されていない場合はnullを返す
 */
export function getSubcategoryNameFromCache(subcategoryId: string): string | null {
  return subcategoryCache.get(subcategoryId) || null
}

/**
 * キャッシュが初期化されているかどうか
 */
export function isSubcategoryCacheInitialized(): boolean {
  return cacheInitialized
}

/**
 * キャッシュをクリア（主にテスト用）
 */
export function clearSubcategoryCache(): void {
  subcategoryCache = new Map()
  cacheInitialized = false
  cachePromise = null
}

/**
 * キャッシュに直接データを設定（主にSSR/テスト用）
 */
export function setSubcategoryCacheData(data: Record<string, string>): void {
  subcategoryCache = new Map(Object.entries(data))
  cacheInitialized = true
}
