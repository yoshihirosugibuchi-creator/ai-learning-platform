#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync, readFileSync } from 'fs'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function syncStaticFallbackData() {
  console.log('🔄 DBから静的フォールバックデータを同期開始...\n')

  try {
    // 1. DBから全データを取得
    console.log('📊 **1. DBデータ取得**')
    console.log('='.repeat(60))

    const [categoriesResult, subcategoriesResult, skillLevelsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('is_visible', true)
        .order('type')
        .order('display_order'),
      supabase
        .from('subcategories')
        .select('*')
        .eq('is_visible', true)
        .order('parent_category_id')
        .order('display_order'),
      supabase
        .from('skill_levels')
        .select('*')
        .order('display_order')
    ])

    if (categoriesResult.error) throw categoriesResult.error
    if (subcategoriesResult.error) throw subcategoriesResult.error
    if (skillLevelsResult.error) throw skillLevelsResult.error

    const categories = categoriesResult.data || []
    const subcategories = subcategoriesResult.data || []
    const skillLevels = skillLevelsResult.data || []

    console.log(`✅ カテゴリー: ${categories.length}件`)
    console.log(`✅ サブカテゴリー: ${subcategories.length}件`)
    console.log(`✅ スキルレベル: ${skillLevels.length}件`)

    // 2. データ変換
    console.log('\n🔄 **2. データ変換**')
    console.log('='.repeat(60))

    // カテゴリーをメイン・業界に分類し、サブカテゴリーをマッピング
    const mainCategories = categories.filter(cat => cat.type === 'main')
    const industryCategories = categories.filter(cat => cat.type === 'industry')

    // サブカテゴリーを親カテゴリー別にグループ化
    const subcategoriesByParent: Record<string, string[]> = {}
    subcategories.forEach(sub => {
      if (!subcategoriesByParent[sub.parent_category_id]) {
        subcategoriesByParent[sub.parent_category_id] = []
      }
      subcategoriesByParent[sub.parent_category_id].push(sub.name)
    })

    // TypeScript形式でのデータ生成
    const generateCategoryObject = (dbCategory: any) => ({
      id: dbCategory.category_id,
      name: dbCategory.name,
      description: dbCategory.description || '',
      type: dbCategory.type,
      displayOrder: dbCategory.display_order || 1,
      subcategories: subcategoriesByParent[dbCategory.category_id] || [],
      icon: dbCategory.icon || '📚',
      color: dbCategory.color || '#6B7280'
    })

    const generateSkillLevelObject = (dbSkillLevel: any) => ({
      id: dbSkillLevel.id,
      name: dbSkillLevel.name,
      description: dbSkillLevel.description || '',
      targetExperience: dbSkillLevel.target_experience || '',
      displayOrder: dbSkillLevel.display_order || 1
    })

    console.log(`✅ メインカテゴリー変換: ${mainCategories.length}件`)
    console.log(`✅ 業界カテゴリー変換: ${industryCategories.length}件`)
    console.log(`✅ スキルレベル変換: ${skillLevels.length}件`)

    // 3. TypeScriptファイル生成
    console.log('\n📝 **3. TypeScript定義生成**')
    console.log('='.repeat(60))

    const newCategoriesContent = `import { 
  MainCategory, 
  IndustryCategory, 
  Subcategory,
  SkillLevelDefinition, 
  MainCategoryId,
  IndustryCategoryId 
} from './types/category'

// フロントエンド用APIクライアント（クライアントサイドで使用）
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'

// DBから取得したデータをキャッシュ
let cachedCategories: (MainCategory | IndustryCategory)[] | null = null
let cachedSubcategories: Subcategory[] | null = null
let cachedSkillLevels: SkillLevelDefinition[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分間キャッシュ

/**
 * DB APIクライアント関数
 */
async function fetchFromAPI<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(\`\${API_BASE_URL}/api\${endpoint}\`)
    if (!response.ok) {
      console.warn(\`API request failed: \${endpoint} - \${response.status}\`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn(\`API request error: \${endpoint}\`, error)
    return null
  }
}

// 🔄 DB同期済み: 静的フォールバック用スキルレベル定義
// Last sync: ${new Date().toISOString()}
const staticSkillLevels: SkillLevelDefinition[] = ${JSON.stringify(skillLevels.map(generateSkillLevelObject), null, 2)}

// 🔄 DB同期済み: 静的フォールバック用メインカテゴリー定義  
// Last sync: ${new Date().toISOString()}
const staticMainCategories: MainCategory[] = ${JSON.stringify(mainCategories.map(generateCategoryObject), null, 2)}

// 🔄 DB同期済み: 静的フォールバック用業界カテゴリー定義
// Last sync: ${new Date().toISOString()}
const staticIndustryCategories: IndustryCategory[] = ${JSON.stringify(industryCategories.map(generateCategoryObject), null, 2)}

/**
 * DB APIを使用してカテゴリーを取得（フォールバック付き）
 */
export async function getCategories(options?: {
  type?: 'main' | 'industry'
  activeOnly?: boolean
}): Promise<(MainCategory | IndustryCategory)[]> {
  const now = Date.now()
  
  // キャッシュが有効な場合はキャッシュを使用
  if (cachedCategories && (now - cacheTimestamp) < CACHE_DURATION) {
    return filterCategories(cachedCategories, options)
  }

  // DB APIから取得を試行
  try {
    const queryParams = new URLSearchParams()
    if (options?.type) queryParams.set('type', options.type)
    if (options?.activeOnly) queryParams.set('active_only', 'true')
    
    const response = await fetchFromAPI<{categories: any[]}>(\`/categories?\${queryParams}\`)
    
    if (response?.categories) {
      // DB APIから取得したデータを変換
      const categories = response.categories.map(transformDBCategoryToLocal)
      cachedCategories = categories
      cacheTimestamp = now
      return categories
    }
  } catch (error) {
    console.warn('DB category fetch failed, using static fallback:', error)
  }

  // フォールバック: 静的データを使用
  const staticCategories = [...staticMainCategories, ...staticIndustryCategories]
  return filterCategories(staticCategories, options)
}

/**
 * DBから取得したカテゴリーデータを内部形式に変換
 */
function transformDBCategoryToLocal(dbCategory: any): MainCategory | IndustryCategory {
  return {
    id: dbCategory.category_id,
    name: dbCategory.name,
    description: dbCategory.description || '',
    type: dbCategory.type,
    displayOrder: dbCategory.display_order || 1,
    subcategories: [], // サブカテゴリーは別途取得
    icon: dbCategory.icon || '📚',
    color: dbCategory.color || '#6B7280'
  }
}

/**
 * カテゴリーフィルタリング
 */
function filterCategories(
  categories: (MainCategory | IndustryCategory)[], 
  options?: { type?: 'main' | 'industry'; activeOnly?: boolean }
): (MainCategory | IndustryCategory)[] {
  let filtered = categories
  
  if (options?.type) {
    filtered = filtered.filter(cat => cat.type === options.type)
  }
  
  // activeOnlyの場合、静的データでは全て有効とみなす
  // DB データの場合は is_active フィールドがあることを前提とする
  
  return filtered
}

/**
 * スキルレベルを取得（DB API + フォールバック）
 */
export async function getSkillLevels(): Promise<SkillLevelDefinition[]> {
  const now = Date.now()
  
  // キャッシュが有効な場合はキャッシュを使用
  if (cachedSkillLevels && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSkillLevels
  }

  try {
    const response = await fetchFromAPI<{skill_levels: any[]}>('/skill-levels')
    
    if (response?.skill_levels) {
      // DB APIから取得したデータを変換
      const skillLevels = response.skill_levels.map(transformDBSkillLevelToLocal)
      cachedSkillLevels = skillLevels
      cacheTimestamp = now
      return skillLevels
    }
  } catch (error) {
    console.warn('DB skill levels fetch failed, using static fallback:', error)
  }

  // フォールバック: 静的データを使用
  return staticSkillLevels
}

/**
 * DBから取得したスキルレベルデータを内部形式に変換
 */
function transformDBSkillLevelToLocal(dbSkillLevel: any): SkillLevelDefinition {
  return {
    id: dbSkillLevel.id,
    name: dbSkillLevel.name,
    description: dbSkillLevel.description || '',
    targetExperience: dbSkillLevel.target_experience || '',
    displayOrder: dbSkillLevel.display_order || 1
  }
}

/**
 * サブカテゴリーを取得（DB API + フォールバック）
 */
export async function getSubcategories(parentCategoryId?: string): Promise<Subcategory[]> {
  const now = Date.now()
  
  try {
    const queryParams = new URLSearchParams()
    if (parentCategoryId) queryParams.set('parent_category_id', parentCategoryId)
    
    const response = await fetchFromAPI<{subcategories: any[]}>(\`/subcategories?\${queryParams}\`)
    
    if (response?.subcategories) {
      return response.subcategories.map(transformDBSubcategoryToLocal)
    }
  } catch (error) {
    console.warn('DB subcategories fetch failed, using static fallback:', error)
  }

  // フォールバック: 静的データから生成
  if (parentCategoryId) {
    return getSubcategoriesByParent(parentCategoryId)
  }
  
  return []
}

/**
 * DBから取得したサブカテゴリーデータを内部形式に変換
 */
function transformDBSubcategoryToLocal(dbSubcategory: any): Subcategory {
  return {
    id: dbSubcategory.subcategory_id,
    name: dbSubcategory.name,
    description: dbSubcategory.description || '',
    parentCategoryId: dbSubcategory.parent_category_id,
    displayOrder: dbSubcategory.display_order || 1,
    icon: dbSubcategory.icon || '📚'
  }
}

// 互換性のための同期版エクスポート（既存コードで使用）
export const skillLevels = staticSkillLevels
export const mainCategories = staticMainCategories  
export const industryCategories = staticIndustryCategories

// 全カテゴリー（メイン＋業界）の統一アクセス関数
export function getAllValidCategoryIds(): string[] {
  return [
    ...staticMainCategories.map(cat => cat.id),
    ...staticIndustryCategories.map(cat => cat.id)
  ]
}

/**
 * 全カテゴリーを取得（DB優先 + フォールバック）
 */
export async function getAllCategories(): Promise<(MainCategory | IndustryCategory)[]> {
  return await getCategories()
}

/**
 * 同期版：既存コードとの互換性のため
 */
export function getAllCategoriesSync(): (MainCategory | IndustryCategory)[] {
  return [...staticMainCategories, ...staticIndustryCategories]
}

/**
 * サブカテゴリー名からIDに変換するマッピング
 */
export const subcategoryNameToIdMap: Record<string, string> = {
  // 財務・ファイナンス
  '財務分析・企業価値評価': 'financial_analysis_valuation',
  '投資判断・リスク管理': 'investment_risk_management',
  '事業計画・資金調達': 'business_planning_funding',
  '管理会計・KPI設計': 'management_accounting_kpi',
  
  // コミュニケーション・プレゼンテーション
  'プレゼンテーション技術': 'presentation_skills',
  '交渉・説得技術': 'negotiation_persuasion',
  'ファシリテーション': 'facilitation',
  'ライティング・文書作成': 'writing_documentation',
  
  // 論理的思考・問題解決
  '論理的思考・批判的思考': 'logical_critical_thinking',
  '問題解決・意思決定': 'problem_solving_decision',
  'データ分析・統計': 'data_analysis_statistics',
  'プロジェクト管理': 'project_management',
  
  // マーケティング・営業
  'マーケティング戦略': 'marketing_strategy',
  '顧客分析・市場調査': 'customer_analysis_research',
  '営業技術・顧客管理': 'sales_customer_management',
  'ブランディング・広告': 'branding_advertising',
  
  // リーダーシップ・マネジメント
  'チームマネジメント': 'team_management',
  '人材育成・コーチング': 'talent_development_coaching',
  '組織運営・変革管理': 'organizational_change_management',
  '戦略立案・実行': 'strategy_execution',
  
  // IT・デジタル
  'デジタル変革・IT戦略': 'digital_transformation_strategy',
  'データ活用・AI': 'data_utilization_ai',
  'システム導入・運用': 'system_implementation_operation',
  'セキュリティ・リスク管理': 'security_risk_management',
  
  // 法務・コンプライアンス
  '契約・知的財産': 'contracts_intellectual_property',
  'コンプライアンス・内部統制': 'compliance_internal_control',
  '労働法・人事法務': 'labor_hr_legal',
  'リスク管理・危機対応': 'risk_crisis_management',
  
  // グローバル・多様性
  '異文化コミュニケーション': 'cross_cultural_communication',
  '海外事業・貿易': 'international_business_trade',
  '多様性・インクルージョン': 'diversity_inclusion',
  '語学・国際感覚': 'language_international_perspective',
  
  // 業界別 - 製造業
  '生産管理・品質管理': 'production_quality_management',
  'サプライチェーン管理': 'supply_chain_management',
  '技術開発・イノベーション': 'technical_development_innovation',
  '安全管理・環境対応': 'safety_environmental_management',
  
  // 業界別 - 金融業
  'リスク管理・規制対応': 'financial_risk_regulatory',
  '金融商品・サービス': 'financial_products_services',
  '資産運用・投資': 'asset_management_investment',
  'フィンテック・デジタル金融': 'fintech_digital_finance',
  
  // 業界別 - IT・テクノロジー
  'システム開発・エンジニアリング': 'system_development_engineering',
  'プロダクト管理・UX': 'product_management_ux',
  'データサイエンス・AI': 'data_science_ai',
  'セキュリティ・インフラ': 'security_infrastructure',
  
  // 業界別 - ヘルスケア
  '医療・ヘルスケア知識': 'medical_healthcare_knowledge',
  '薬事・規制対応': 'pharmaceutical_regulatory',
  'デジタルヘルス・医療IT': 'digital_health_medical_it',
  '医療経営・病院管理': 'healthcare_management_administration',
  
  // 業界別 - 小売・消費財
  '商品企画・マーチャンダイジング': 'product_planning_merchandising',
  '店舗運営・販売管理': 'store_operations_sales_management',
  'ECサイト・オムニチャネル': 'ecommerce_omnichannel',
  '消費者行動・市場分析': 'consumer_behavior_market_analysis',
  
  // 追加のサブカテゴリー（DBから同期）
${subcategories.map(sub => `  '${sub.name}': '${sub.subcategory_id}'`).join(',\n')}
}

/**
 * サブカテゴリー名からIDを取得
 */
export function getSubcategoryId(subcategoryName: string): string | null {
  return subcategoryNameToIdMap[subcategoryName] || null
}

export function isValidCategoryId(categoryId: string): boolean {
  return getAllValidCategoryIds().includes(categoryId)
}

// ヘルパー関数（DB優先 + フォールバック）
export async function getCategoryById(id: string): Promise<MainCategory | IndustryCategory | undefined> {
  const categories = await getCategories()
  return categories.find(cat => cat.id === id)
}

/**
 * 同期版：既存コードとの互換性のため
 */
export function getCategoryByIdSync(id: string): MainCategory | IndustryCategory | undefined {
  return [...staticMainCategories, ...staticIndustryCategories].find(cat => cat.id === id)
}

export function getSubcategoriesByParent(parentId: string): Subcategory[] {
  const category = getCategoryByIdSync(parentId)
  if (!category) return []
  
  return category.subcategories.map((subName, index) => ({
    id: subName.toLowerCase().replace(/[・・]/g, '_').replace(/\\s+/g, '_'),
    name: subName,
    description: \`\${subName}に関する専門知識とスキル\`,
    parentCategoryId: parentId,
    displayOrder: index + 1,
    icon: getSubcategoryIcon(subName)
  }))
}

function getSubcategoryIcon(subcategoryName: string): string {
  const iconMap: Record<string, string> = {
    // 共通カテゴリー
    'プレゼンテーション': '🎤',
    'セールス・マーケティング': '📈',
    '交渉・調整': '🤝',
    '論理的思考・分析': '🧠',
    '財務・会計分析': '💰',
    'データ分析・解釈': '📊',
    'チーム運営・人材育成': '👥',
    'プロジェクトマネジメント': '📋',
    '組織開発・変革': '🔄',
    '事業戦略・企画': '🎯',
    'オペレーション・業務改善': '⚙️',
    '市場分析・競合調査': '🔍',
    
    // AI・デジタル活用
    'AI・機械学習活用': '🤖',
    'プロンプトエンジニアリング': '💬',
    'DX戦略・デジタル変革': '🔄',
    'データドリブン経営': '📊',
    'IoT・自動化技術': '🔧',
    
    // コンサルティング業界
    'ケース面接・構造化思考': '🧩',
    '仮説思考・イシューツリー': '🌳',
    'ストーリーライン構築': '📖',
    'ステークホルダー分析': '🎭',
    '複数ステークホルダー調整': '⚖️',
    'プロジェクト炎上対応・リカバリー': '🚒',
    '変革リーダーシップ': '⚡',
    'デジタル変革支援': '🔄',
    'M&A・PMI支援': '🤝',
    'オペレーション改革': '⚙️',
    '規制業界対応（金融・製薬等）': '🏛️',
    '業界ベストプラクティス活用': '⭐',
    '業界動向・競合分析': '📊',
    'RFP対応・提案書作成': '📋',
    '経営層プレゼン': '👔',
    '経営課題ヒアリング・課題設定': '🎯',
    '継続案件獲得・拡販戦略': '📈',
    
    // SI業界
    '要件定義・業務分析': '📝',
    'IT戦略立案': '💻',
    'RFP作成・ベンダー管理': '📄',
    'SIプロジェクト管理': '🎛️',
    '多階層ベンダー管理': '🏗️',
    'リスク管理・品質管理': '🛡️',
    'システム導入・移行管理': '🔧',
    'DX推進支援': '🚀',
    '技術的実現性評価': '🔬',
    'レガシーシステム連携': '🔗',
    '技術営業・提案活動': '💼',
    '顧客要求分析': '🔍',
    '長期パートナーシップ構築': '🤝',
    '契約形態・価格設定戦略': '💰',
    
    // 商社業界
    '商品知識・市場分析': '📊',
    '商品先物・デリバティブ活用': '📈',
    '価格交渉・リスクヘッジ': '⚖️',
    '品質管理・検査・保険': '🔍',
    '新規事業開拓': '🚀',
    '出資先企業経営参画': '🏢',
    '事業ポートフォリオ管理': '📁',
    '海外市場開拓': '🌍',
    '多国間三国間取引': '🌐',
    '異文化コミュニケーション': '🗣️',
    '現地法人運営': '🏭',
    '貿易ファイナンス': '💱',
    'トレードファイナンス組成': '🏦',
    '為替・金利リスク管理': '📊',
    'カントリーリスク分析': '🌏'
  }
  return iconMap[subcategoryName] || '📚'
}

// サブカテゴリー詳細定義（互換性のため）
export const subcategories: Subcategory[] = [
  // コミュニケーション・プレゼン
  {
    id: 'presentation',
    name: 'プレゼンテーション',
    description: '効果的なプレゼンテーションスキル',
    parentCategoryId: 'communication_presentation',
    displayOrder: 1,
    icon: '🎤'
  },
  {
    id: 'sales_marketing',
    name: 'セールス・マーケティング',
    description: 'セールスとマーケティングの実践スキル',
    parentCategoryId: 'communication_presentation',
    displayOrder: 2,
    icon: '📈'
  },
  {
    id: 'negotiation_coordination',
    name: '交渉・調整',
    description: '交渉術と利害関係者の調整スキル',
    parentCategoryId: 'communication_presentation',
    displayOrder: 3,
    icon: '🤝'
  },

  // 分析的問題解決
  {
    id: 'logical_thinking_analysis',
    name: '論理的思考・分析',
    description: '論理的思考と分析的問題解決',
    parentCategoryId: 'analytical_problem_solving',
    displayOrder: 1,
    icon: '🧠'
  },
  {
    id: 'financial_accounting_analysis',
    name: '財務・会計分析',
    description: '財務データの分析と解釈',
    parentCategoryId: 'analytical_problem_solving',
    displayOrder: 2,
    icon: '💰'
  },
  {
    id: 'data_analysis_interpretation',
    name: 'データ分析・解釈',
    description: 'データを活用した洞察の獲得',
    parentCategoryId: 'analytical_problem_solving',
    displayOrder: 3,
    icon: '📊'
  },

  // リーダーシップ・マネジメント
  {
    id: 'team_management_development',
    name: 'チーム運営・人材育成',
    description: 'チームマネジメントと人材開発',
    parentCategoryId: 'leadership_management',
    displayOrder: 1,
    icon: '👥'
  },
  {
    id: 'project_management',
    name: 'プロジェクトマネジメント',
    description: 'プロジェクトの計画・実行・管理',
    parentCategoryId: 'leadership_management',
    displayOrder: 2,
    icon: '📋'
  },
  {
    id: 'organizational_development_transformation',
    name: '組織開発・変革',
    description: '組織の成長と変革の推進',
    parentCategoryId: 'leadership_management',
    displayOrder: 3,
    icon: '🔄'
  },

  // ビジネス戦略・企画
  {
    id: 'business_strategy_planning',
    name: '事業戦略・企画',
    description: '事業戦略の立案と企画',
    parentCategoryId: 'business_strategy',
    displayOrder: 1,
    icon: '🎯'
  },
  {
    id: 'operations_improvement',
    name: 'オペレーション・業務改善',
    description: '業務効率化とオペレーション改善',
    parentCategoryId: 'business_strategy',
    displayOrder: 2,
    icon: '⚙️'
  },
  {
    id: 'market_competitive_analysis',
    name: '市場分析・競合調査',
    description: '市場動向分析と競合戦略',
    parentCategoryId: 'business_strategy',
    displayOrder: 3,
    icon: '🔍'
  }
]
`

    // 4. ファイル書き込み
    console.log('\n💾 **4. ファイル更新**')
    console.log('='.repeat(60))
    
    const categoriesFilePath = path.join(process.cwd(), 'lib', 'categories.ts')
    
    // バックアップ作成
    const backupPath = path.join(process.cwd(), 'lib', 'categories.ts.backup')
    const originalContent = readFileSync(categoriesFilePath, 'utf8')
    writeFileSync(backupPath, originalContent)
    console.log(`📋 バックアップ作成: ${backupPath}`)
    
    // 新しいファイル書き込み
    writeFileSync(categoriesFilePath, newCategoriesContent)
    console.log(`✅ ファイル更新完了: ${categoriesFilePath}`)

    // 5. 同期結果サマリー
    console.log('\n📊 **5. 同期結果サマリー**')
    console.log('='.repeat(60))
    console.log(`✅ メインカテゴリー: ${mainCategories.length}件`)
    console.log(`✅ 業界カテゴリー: ${industryCategories.length}件`)
    console.log(`   - アクティブ: ${categories.filter(c => c.is_active).length}件`)
    console.log(`   - 非アクティブ: ${categories.filter(c => !c.is_active).length}件`)
    console.log(`✅ サブカテゴリー: ${subcategories.length}件`)
    console.log(`✅ スキルレベル: ${skillLevels.length}件`)
    console.log(`✅ 同期時刻: ${new Date().toISOString()}`)

    console.log('\n🎯 **フォールバック機能強化完了！**')
    console.log('💡 これでAPI障害時でも最新のDBデータ構造でフォールバック可能です')

  } catch (error) {
    console.error('❌ 同期エラー:', error)
    process.exit(1)
  }
}

syncStaticFallbackData().then(() => {
  console.log('\n🔄 DBから静的データへの同期完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Sync error:', error)
  process.exit(1)
})