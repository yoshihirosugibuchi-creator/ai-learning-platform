/**
 * Server-side Category Data Access Service
 * 
 * This service provides database-direct category access for server-side code
 * without relying on client-side fetch patterns that fail in server context.
 * 
 * Use this service in:
 * - API routes (/app/api/*)
 * - Server components
 * - Background processes
 * 
 * Key Features:
 * - Direct database access via supabaseAdmin
 * - Fallback to static data when DB is unavailable
 * - No HTTP fetch dependencies
 * - Optimized for server-side performance
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// Import static fallback data
import categoriesJson from '@/public/data/categories-fallback.json'

// Server-side category data structures
interface ServerCategory {
  id: string
  category_id: string
  name: string
  description?: string | null
  type: string
  display_order?: number
  icon?: string | null
  color?: string | null
  is_active?: boolean
  is_visible?: boolean
}

interface ProcessedCategory {
  id: string
  name: string
  type: string
  isActive: boolean
}

let categoryCache: ProcessedCategory[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

/**
 * Get categories directly from database with fallback to static data
 * Designed specifically for server-side use
 */
export async function getServerCategories(options?: {
  type?: 'main' | 'industry'
  activeOnly?: boolean
}): Promise<ProcessedCategory[]> {
  console.log('🔄 [Server Category Service] Fetching categories...')
  
  // Check cache first
  const now = Date.now()
  if (categoryCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📦 [Server Category Service] Using cached data')
    return filterServerCategories(categoryCache, options)
  }

  // Try database first
  try {
    console.log('🗄️ [Server Category Service] Attempting database access...')
    
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('id, category_id, name, description, type, display_order, icon, color, is_active, is_visible')
      .order('display_order', { ascending: true })

    if (!error && categories && categories.length > 0) {
      console.log(`✅ [Server Category Service] Database success: ${categories.length} categories`)
      
      const processed = categories.map(processServerCategory)
      categoryCache = processed
      cacheTimestamp = now
      
      return filterServerCategories(processed, options)
    } else {
      console.warn('⚠️ [Server Category Service] Database query failed or empty:', error)
    }
  } catch (error) {
    console.warn('⚠️ [Server Category Service] Database access error:', error)
  }

  // Fallback to static JSON data
  console.log('📄 [Server Category Service] Using static fallback data')
  try {
    const staticCategories = categoriesJson.categories as ServerCategory[]
    const processed = staticCategories.map(processServerCategory)
    
    // Cache the fallback data too
    categoryCache = processed
    cacheTimestamp = now
    
    console.log(`✅ [Server Category Service] Static fallback success: ${processed.length} categories`)
    return filterServerCategories(processed, options)
  } catch (error) {
    console.error('❌ [Server Category Service] Static fallback failed:', error)
    return []
  }
}

/**
 * Get only main category IDs (for business AI quiz generation)
 * This is the server-side replacement for the failing client-side getMainCategoryIds()
 */
export async function getMainCategoryIds(): Promise<string[]> {
  const categories = await getServerCategories({ type: 'main', activeOnly: true })
  const ids = categories.map(cat => cat.id)
  
  console.log(`🎯 [Server Category Service] Main category IDs: [${ids.join(', ')}]`)
  return ids
}

/**
 * Check if a category ID belongs to the 'main' type
 */
export async function isMainCategory(categoryId: string): Promise<boolean> {
  const mainCategories = await getServerCategories({ type: 'main', activeOnly: false })
  return mainCategories.some(cat => cat.id === categoryId)
}

/**
 * Get all active category IDs (both main and industry)
 */
export async function getAllActiveCategoryIds(): Promise<string[]> {
  const categories = await getServerCategories({ activeOnly: true })
  return categories.map(cat => cat.id)
}

/**
 * Process raw category data from DB/JSON into consistent format
 */
function processServerCategory(category: ServerCategory): ProcessedCategory {
  return {
    id: category.category_id,
    name: category.name,
    type: category.type,
    isActive: category.is_active ?? true
  }
}

/**
 * Filter categories based on options
 */
function filterServerCategories(
  categories: ProcessedCategory[],
  options?: { type?: 'main' | 'industry'; activeOnly?: boolean }
): ProcessedCategory[] {
  let filtered = categories

  // Filter by type
  if (options?.type) {
    filtered = filtered.filter(cat => cat.type === options.type)
  }

  // Filter by active status (default: true)
  if (options?.activeOnly !== false) {
    filtered = filtered.filter(cat => cat.isActive)
  }

  return filtered
}

/**
 * Clear the server-side category cache
 * Useful for development or when category data changes
 */
export function clearServerCategoryCache(): void {
  categoryCache = null
  cacheTimestamp = 0
  console.log('🔄 [Server Category Service] Cache cleared')
}

/**
 * Get category details by ID
 */
export async function getServerCategoryById(categoryId: string): Promise<ProcessedCategory | null> {
  const categories = await getServerCategories({ activeOnly: false })
  return categories.find(cat => cat.id === categoryId) || null
}

/**
 * Validate if category ID exists and is active
 */
export async function validateCategoryId(categoryId: string): Promise<boolean> {
  const category = await getServerCategoryById(categoryId)
  return category !== null && category.isActive
}