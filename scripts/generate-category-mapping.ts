#!/usr/bin/env tsx

/**
 * DBからカテゴリー・サブカテゴリーマッピングを自動生成
 * デプロイ前に実行してハードコードを最新化
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// .env.local ファイルから環境変数を直接読み込み
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=')
        }
      }
    }
  }
  
  return env
}

const envVars = loadEnvFile()
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CategoryData {
  category_id: string
  name: string
  type: string
}

interface SubcategoryData {
  subcategory_id: string
  name: string
  parent_category_id: string
}

async function generateCategoryMapping() {
  console.log('🔄 DBからカテゴリー・サブカテゴリーマッピング生成開始...\n')

  try {
    // カテゴリー取得
    console.log('📋 カテゴリーデータ取得中...')
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('category_id, name, type')
      .order('type, category_id')

    if (categoryError) {
      console.error('❌ カテゴリー取得エラー:', categoryError)
      process.exit(1)
    }

    // サブカテゴリー取得
    console.log('📋 サブカテゴリーデータ取得中...')
    const { data: subcategories, error: subcategoryError } = await supabase
      .from('subcategories')  
      .select('subcategory_id, name, parent_category_id')
      .order('parent_category_id, subcategory_id')

    if (subcategoryError) {
      console.error('❌ サブカテゴリー取得エラー:', subcategoryError)
      process.exit(1)
    }

    if (!categories || !subcategories) {
      console.error('❌ データが取得できませんでした')
      process.exit(1)
    }

    console.log(`✅ カテゴリー: ${categories.length}件`)
    console.log(`✅ サブカテゴリー: ${subcategories.length}件`)

    // TypeScriptファイル生成
    console.log('📝 TypeScriptマッピングファイル生成中...')

    const timestamp = new Date().toISOString()
    const categoriesData = categories as CategoryData[]
    const subcategoriesData = subcategories as SubcategoryData[]

    // カテゴリーマッピング生成
    const categoryMappingLines: string[] = []
    const mainCategories: string[] = []
    const industryCategories: string[] = []

    categoriesData.forEach(cat => {
      categoryMappingLines.push(`  '${cat.category_id}': '${cat.name}',`)
      if (cat.type === 'main') {
        mainCategories.push(cat.category_id)
      } else if (cat.type === 'industry') {
        industryCategories.push(cat.category_id)
      }
    })

    // サブカテゴリーマッピング生成
    const subcategoryMappingLines: string[] = []
    subcategoriesData.forEach(sub => {
      subcategoryMappingLines.push(`  '${sub.subcategory_id}': '${sub.name}',`)
    })

    // TypeScriptファイル内容生成
    const fileContent = `/**
 * Category mapping utilities
 * Auto-generated from database on ${timestamp}
 * DO NOT EDIT MANUALLY - Run 'npm run generate:category-mapping' to update
 */

export const categoryDisplayNames: Record<string, string> = {
${categoryMappingLines.join('\n')}
}

export const subcategoryDisplayNames: Record<string, string> = {
${subcategoryMappingLines.join('\n')}
}

/**
 * Convert category ID to display name
 */
export function getCategoryDisplayName(categoryId: string): string {
  return categoryDisplayNames[categoryId] || categoryId
}

/**
 * Convert subcategory to display name
 */
export function getSubcategoryDisplayName(subcategory: string): string {
  return subcategoryDisplayNames[subcategory] || subcategory
}

/**
 * Map any category (old or new, Japanese or English) to correct main category ID
 */
export function mapToMainCategoryId(categoryInput: string): string {
  // If it's already a main category ID, return it
  const mainCategoryIds = [
${mainCategories.map(id => `    '${id}',`).join('\n')}
  ]
  
  if (mainCategoryIds.includes(categoryInput)) {
    return categoryInput
  }
  
  // Map display name back to ID
  const displayName = getCategoryDisplayName(categoryInput)
  const reverseMap: Record<string, string> = {
${categoriesData.filter(c => c.type === 'main').map(c => `    '${c.name}': '${c.category_id}',`).join('\n')}
  }
  
  return reverseMap[displayName] || 'strategy_management' // default fallback
}

/**
 * Get category icon based on category ID or name
 */
export function getCategoryIcon(categoryId: string): string {
  const displayName = getCategoryDisplayName(categoryId)
  
  const iconMap: Record<string, string> = {
    // Main categories
    'コミュニケーション・プレゼンテーション': '💬',
    '論理的思考・問題解決': '🧠',
    '戦略・経営': '🎯',
    '財務・ファイナンス': '💰',
    'マーケティング・営業': '📈',
    'リーダーシップ・人事': '👥',
    'AI・デジタル活用': '🤖',
    'プロジェクト・業務管理': '📋',
    'ビジネスプロセス・業務分析': '🔄',
    'リスク・危機管理': '🛡️',
    // Industry categories  
    'コンサルティング業界': '🎩',
    'SI（システムインテグレーション）業界': '🖥️',
    '商社業界': '🌐',
    '教育・研修業界': '📚',
    'エネルギー・インフラ業界': '⚡',
    '金融・保険業界': '🏦',
    'ヘルスケア・医療業界': '🏥',
    '物流・運輸業界': '🚚',
    '製造業界': '🏭',
    'メディア・エンタメ業界': '🎬',
    '公共・行政業界': '🏛️',
    '不動産・建設業界': '🏢',
    '小売・消費財業界': '🛒',
    'SaaS・プロダクト業界': '💻'
  }
  
  return iconMap[displayName] || '📚'
}

/**
 * Get category color based on category ID or name
 */
export function getCategoryColor(categoryId: string): string {
  const displayName = getCategoryDisplayName(categoryId)
  
  const colorMap: Record<string, string> = {
    // Main categories
    'コミュニケーション・プレゼンテーション': '#3B82F6',
    '論理的思考・問題解決': '#8B5CF6', 
    '戦略・経営': '#10B981',
    '財務・ファイナンス': '#F59E0B',
    'マーケティング・営業': '#EF4444',
    'リーダーシップ・人事': '#06B6D4',
    'AI・デジタル活用': '#8B5CF6',
    'プロジェクト・業務管理': '#84CC16',
    'ビジネスプロセス・業務分析': '#F97316',
    'リスク・危機管理': '#DC2626',
    // Industry categories
    'コンサルティング業界': '#6366F1',
    'SI（システムインテグレーション）業界': '#0EA5E9',
    '商社業界': '#059669',
    '教育・研修業界': '#7C3AED',
    'エネルギー・インフラ業界': '#DC2626',
    '金融・保険業界': '#059669',
    'ヘルスケア・医療業界': '#DC2626',
    '物流・運輸業界': '#F59E0B',
    '製造業界': '#6B7280',
    'メディア・エンタメ業界': '#EC4899',
    '公共・行政業界': '#6366F1',
    '不動産・建設業界': '#78716C',
    '小売・消費財業界': '#EF4444',
    'SaaS・プロダクト業界': '#8B5CF6'
  }
  
  return colorMap[displayName] || '#6B7280'
}

// DB統計情報（コメントとして）
/*
Generated from database:
- Categories: ${categories.length} (Main: ${categoriesData.filter(c => c.type === 'main').length}, Industry: ${categoriesData.filter(c => c.type === 'industry').length})
- Subcategories: ${subcategories.length}
- Last updated: ${timestamp}
*/`

    // ファイル書き込み
    const outputPath = resolve(process.cwd(), 'lib/category-mapping-generated.ts')
    writeFileSync(outputPath, fileContent, 'utf-8')

    console.log('✅ マッピングファイル生成完了!')
    console.log(`📄 出力先: ${outputPath}`)
    console.log(`📊 統計:`)
    console.log(`   - カテゴリー: ${categories.length}件 (メイン: ${mainCategories.length}, 業界: ${industryCategories.length})`)
    console.log(`   - サブカテゴリー: ${subcategories.length}件`)

    // 既存ファイルとの差分チェック
    const existingPath = resolve(process.cwd(), 'lib/category-mapping.ts')
    if (existsSync(existingPath)) {
      const existingContent = readFileSync(existingPath, 'utf-8')
      if (existingContent !== fileContent) {
        console.log('\n⚠️ 既存ファイルとの差分が検出されました')
        console.log('デプロイ前に lib/category-mapping.ts を更新してください:')
        console.log(`cp ${outputPath} ${existingPath}`)
      } else {
        console.log('\n✅ 既存ファイルと一致しています')
      }
    }

  } catch (error) {
    console.error('❌ マッピング生成エラー:', error)
    process.exit(1)
  }
}

generateCategoryMapping().catch(console.error)