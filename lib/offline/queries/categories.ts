/**
 * カテゴリー・サブカテゴリー データ取得
 * ローカルDB優先 → Supabaseフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import { resolveData } from '../data-source'

// ========== 共通型定義 ==========

export interface CategoryRecord {
  category_id: string
  name: string
  description: string | null
  type: string
  display_order: number
  icon: string | null
  color: string | null
  is_active: boolean
  is_visible: boolean
}

export interface SubcategoryRecord {
  subcategory_id: string
  parent_category_id: string
  name: string
  description: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  is_visible: boolean
}

export interface CategoryData {
  categories: CategoryRecord[]
  subcategories: SubcategoryRecord[]
}

// ========== 共通処理ロジック（データソースに依存しない） ==========

/** 表示可能なカテゴリーのみフィルタ */
export function filterVisibleCategories(categories: CategoryRecord[]): CategoryRecord[] {
  return categories.filter(c => c.is_visible)
}

/** アクティブなカテゴリーのみフィルタ */
export function filterActiveCategories(categories: CategoryRecord[]): CategoryRecord[] {
  return categories.filter(c => c.is_active)
}

/** カテゴリーIDから名前を取得 */
export function getCategoryNameById(categoryId: string, categories: CategoryRecord[]): string {
  return categories.find(c => c.category_id === categoryId)?.name ?? categoryId
}

/** サブカテゴリーIDから名前を取得 */
export function getSubcategoryNameById(subcategoryId: string, subcategories: SubcategoryRecord[]): string {
  return subcategories.find(s => s.subcategory_id === subcategoryId)?.name ?? subcategoryId
}

/** 特定カテゴリーに属するサブカテゴリーを取得 */
export function getSubcategoriesForCategory(categoryId: string, subcategories: SubcategoryRecord[]): SubcategoryRecord[] {
  return subcategories.filter(s => s.parent_category_id === categoryId)
}

// ========== データソース: ローカルDB ==========

async function loadFromLocalDB(db: WMDatabase): Promise<CategoryData | null> {
  const [categoriesRaw, subcategoriesRaw] = await Promise.all([
    db.get('categories').query().fetch(),
    db.get('subcategories').query().fetch(),
  ])

  if (categoriesRaw.length === 0) return null

  const categories: CategoryRecord[] = categoriesRaw.map(record => {
    const raw = (record as { _raw: Record<string, unknown> })._raw
    return {
      category_id: String(raw.category_id || raw.id || ''),
      name: String(raw.name || ''),
      description: raw.description ? String(raw.description) : null,
      type: String(raw.type || 'main'),
      display_order: Number(raw.display_order) || 0,
      icon: raw.icon ? String(raw.icon) : null,
      color: raw.color ? String(raw.color) : null,
      is_active: raw.is_active !== false,
      is_visible: raw.is_visible !== false,
    }
  })

  const subcategories: SubcategoryRecord[] = subcategoriesRaw.map(record => {
    const raw = (record as { _raw: Record<string, unknown> })._raw
    return {
      subcategory_id: String(raw.subcategory_id || raw.id || ''),
      parent_category_id: String(raw.parent_category_id || ''),
      name: String(raw.name || ''),
      description: raw.description ? String(raw.description) : null,
      icon: raw.icon ? String(raw.icon) : null,
      display_order: Number(raw.display_order) || 0,
      is_active: raw.is_active !== false,
      is_visible: raw.is_visible !== false,
    }
  })

  console.log(`✅ Local DB: ${categories.length} categories, ${subcategories.length} subcategories loaded`)
  return { categories, subcategories }
}

// ========== データソース: サーバー ==========

async function loadFromServer(): Promise<CategoryData> {
  const { supabase } = await import('@/lib/supabase')

  const [catResult, subResult] = await Promise.all([
    supabase.from('categories').select('*').order('display_order'),
    supabase.from('subcategories').select('*').order('display_order'),
  ])

  const categories: CategoryRecord[] = (catResult.data ?? []).map(row => ({
    category_id: row.category_id,
    name: row.name,
    description: row.description ?? null,
    type: row.type ?? 'main',
    display_order: row.display_order ?? 0,
    icon: row.icon ?? null,
    color: row.color ?? null,
    is_active: row.is_active !== false,
    is_visible: row.is_visible !== false,
  }))

  const subcategories: SubcategoryRecord[] = (subResult.data ?? []).map(row => ({
    subcategory_id: row.subcategory_id,
    parent_category_id: row.parent_category_id,
    name: row.name,
    description: row.description ?? null,
    icon: row.icon ?? null,
    display_order: row.display_order ?? 0,
    is_active: row.is_active !== false,
    is_visible: row.is_visible !== false,
  }))

  console.log(`✅ Server: ${categories.length} categories, ${subcategories.length} subcategories loaded`)
  return { categories, subcategories }
}

// ========== エントリポイント ==========

/**
 * カテゴリー＋サブカテゴリーを取得
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 */
export async function getCategoryData(database: WMDatabase | null): Promise<CategoryData> {
  return resolveData({ loadFromLocal: loadFromLocalDB, loadFromServer }, database)
}
