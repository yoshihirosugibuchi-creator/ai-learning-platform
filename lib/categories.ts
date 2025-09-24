import { 
  MainCategory, 
  IndustryCategory, 
  Subcategory,
  SkillLevelDefinition, 
  MainCategoryId,
  IndustryCategoryId 
} from './types/category'

// フロントエンド用APIクライアント（クライアントサイドで使用）
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'

// DB APIレスポンス型定義
interface DBCategory {
  category_id: string
  name: string
  description?: string
  type: 'main' | 'industry'
  display_order?: number
  icon?: string
  color?: string
  is_active?: boolean
  is_visible?: boolean
}

interface DBSkillLevel {
  id: string
  name: string
  description?: string
  target_experience?: string
  display_order?: number
  color?: string
}

interface DBSubcategory {
  subcategory_id: string
  name: string
  description?: string
  parent_category_id: string
  display_order?: number
  icon?: string
}

// DBから取得したデータをキャッシュ
let cachedCategories: (MainCategory | IndustryCategory)[] | null = null
const cachedSubcategories: Subcategory[] | null = null
let cachedSkillLevels: SkillLevelDefinition[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分間キャッシュ

/**
 * DB APIクライアント関数
 */
async function fetchFromAPI<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`)
    if (!response.ok) {
      console.warn(`API request failed: ${endpoint} - ${response.status}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.warn(`API request error: ${endpoint}`, error)
    return null
  }
}

// 🔄 DB同期済み: 静的フォールバック用スキルレベル定義
// Last sync: 2025-09-21T00:47:35.406Z
const staticSkillLevels: SkillLevelDefinition[] = [
  {
    "id": "basic",
    "name": "基礎",
    "description": "基本的な知識とスキルレベル",
    "targetExperience": "新人〜入社3年目",
    "displayOrder": 1
  },
  {
    "id": "intermediate",
    "name": "中級",
    "description": "実践的な知識とスキルレベル",
    "targetExperience": "入社3-7年目、チームリーダー",
    "displayOrder": 2
  },
  {
    "id": "advanced",
    "name": "上級",
    "description": "専門的な知識とスキルレベル",
    "targetExperience": "マネージャー、専門家",
    "displayOrder": 3
  },
  {
    "id": "expert",
    "name": "エキスパート",
    "description": "高度な専門知識とスキルレベル",
    "targetExperience": "シニアマネージャー、業界専門家",
    "displayOrder": 4
  }
]

// 🔄 DB同期済み: 静的フォールバック用メインカテゴリー定義  
// Last sync: 2025-09-21T00:47:35.406Z
const staticMainCategories: MainCategory[] = [
  {
    "id": "communication_presentation",
    "name": "コミュニケーション・プレゼンテーション",
    "description": "効果的な情報伝達と説得技術",
    "type": "main",
    "displayOrder": 1,
    "subcategories": [
      "結論ファースト・構造化思考",
      "資料作成・可視化技術",
      "会議運営・ファシリテーション",
      "交渉・説得技術"
    ],
    "icon": "💬",
    "color": "#3B82F6"
  },
  {
    "id": "logical_thinking_problem_solving",
    "name": "論理的思考・問題解決",
    "description": "体系的な思考法と分析技術",
    "type": "main",
    "displayOrder": 2,
    "subcategories": [
      "構造化思考（MECE・ロジックツリー）",
      "仮説検証・本質追求",
      "定量分析・統計解析",
      "行動経済学・意思決定理論",
      "ベンチマーキング・競合分析"
    ],
    "icon": "🧠",
    "color": "#8B5CF6"
  },
  {
    "id": "strategy_management",
    "name": "戦略・経営",
    "description": "企業戦略と経営の基礎知識",
    "type": "main",
    "displayOrder": 3,
    "subcategories": [
      "経営戦略・事業戦略",
      "競争戦略・フレームワーク",
      "新事業開発・イノベーション",
      "ESG・サステナビリティ経営"
    ],
    "icon": "🎯",
    "color": "#10B981"
  },
  {
    "id": "finance",
    "name": "財務・ファイナンス",
    "description": "財務分析と資金管理の知識",
    "type": "main",
    "displayOrder": 4,
    "subcategories": [
      "財務分析・企業価値評価",
      "投資判断・リスク管理",
      "事業計画・資金調達",
      "管理会計・KPI設計"
    ],
    "icon": "💰",
    "color": "#F59E0B"
  },
  {
    "id": "marketing_sales",
    "name": "マーケティング・営業",
    "description": "顧客価値創造と市場戦略",
    "type": "main",
    "displayOrder": 5,
    "subcategories": [
      "顧客分析・セグメンテーション",
      "ブランディング・ポジショニング",
      "デジタルマーケティング",
      "営業戦略・CRM"
    ],
    "icon": "📈",
    "color": "#EF4444"
  },
  {
    "id": "leadership_hr",
    "name": "リーダーシップ・人事",
    "description": "人材マネジメントと組織運営",
    "type": "main",
    "displayOrder": 6,
    "subcategories": [
      "チームマネジメント・モチベーション",
      "タレントマネジメント・育成",
      "組織開発・変革リーダーシップ",
      "人事戦略・働き方改革"
    ],
    "icon": "👥",
    "color": "#06B6D4"
  },
  {
    "id": "ai_digital_utilization",
    "name": "AI・デジタル活用",
    "description": "AI時代のデジタル技術活用",
    "type": "main",
    "displayOrder": 7,
    "subcategories": [
      "AI・機械学習活用",
      "AI基礎・業務活用",
      "プロンプトエンジニアリング", 
      "DX戦略・デジタル変革",
      "データドリブン経営",
      "IoT・自動化技術"
    ],
    "icon": "🤖",
    "color": "#8B5CF6"
  },
  {
    "id": "project_operations",
    "name": "プロジェクト・業務管理",
    "description": "プロジェクト運営と業務効率化",
    "type": "main",
    "displayOrder": 8,
    "subcategories": [
      "プロジェクト設計・WBS",
      "スケジュール・リソース管理",
      "ステークホルダー管理",
      "業務効率化・時間管理"
    ],
    "icon": "📋",
    "color": "#84CC16"
  },
  {
    "id": "business_process_analysis",
    "name": "ビジネスプロセス・業務分析",
    "description": "業務の理解と改善設計",
    "type": "main",
    "displayOrder": 9,
    "subcategories": [
      "業務分析・要件定義",
      "プロセス設計・最適化",
      "サプライチェーン管理",
      "業務システム設計",
      "BPR・業務改革"
    ],
    "icon": "🔄",
    "color": "#F97316"
  },
  {
    "id": "risk_crisis_management",
    "name": "リスク・危機管理",
    "description": "リスクの予防と危機対応",
    "type": "main",
    "displayOrder": 10,
    "subcategories": [
      "企業リスク管理",
      "危機管理・BCP",
      "コンプライアンス・内部統制",
      "情報セキュリティ",
      "サステナビリティリスク"
    ],
    "icon": "🛡️",
    "color": "#DC2626"
  }
]

// 🔄 DB同期済み: 静的フォールバック用業界カテゴリー定義
// Last sync: 2025-09-21T00:47:35.406Z
const staticIndustryCategories: IndustryCategory[] = [
  {
    "id": "consulting_industry" as IndustryCategoryId,
    "name": "コンサルティング業界",
    "description": "コンサルティング業界特有の知識とスキル",
    "type": "industry",
    "displayOrder": 1,
    "subcategories": [
      "ケース面接・構造化思考",
      "仮説思考・イシューツリー",
      "ストーリーライン構築",
      "ステークホルダー分析",
      "複数ステークホルダー調整",
      "プロジェクト炎上対応・リカバリー",
      "変革リーダーシップ",
      "デジタル変革支援",
      "M&A・PMI支援",
      "オペレーション改革",
      "規制業界対応（金融・製薬等）",
      "業界ベストプラクティス活用",
      "業界動向・競合分析",
      "RFP対応・提案書作成",
      "経営層プレゼン",
      "経営課題ヒアリング・課題設定",
      "継続案件獲得・拡販戦略"
    ],
    "icon": "🎩",
    "color": "#6366F1"
  },
  {
    "id": "si_industry" as IndustryCategoryId,
    "name": "SI（システムインテグレーション）業界",
    "description": "SI業界特有のプロジェクト管理と技術コンサルティング",
    "type": "industry",
    "displayOrder": 2,
    "subcategories": [
      "要件定義・業務分析",
      "IT戦略立案",
      "RFP作成・ベンダー管理",
      "SIプロジェクト管理",
      "多階層ベンダー管理",
      "リスク管理・品質管理",
      "システム導入・移行管理",
      "DX推進支援",
      "技術的実現性評価",
      "レガシーシステム連携",
      "技術営業・提案活動",
      "顧客要求分析",
      "長期パートナーシップ構築",
      "契約形態・価格設定戦略"
    ],
    "icon": "🖥️",
    "color": "#0EA5E9"
  },
  {
    "id": "trading_company_industry" as IndustryCategoryId,
    "name": "商社業界",
    "description": "商社特有のトレーディング・事業投資・グローバル展開スキル",
    "type": "industry",
    "displayOrder": 3,
    "subcategories": [
      "商品知識・市場分析",
      "商品先物・デリバティブ活用",
      "価格交渉・リスクヘッジ",
      "品質管理・検査・保険",
      "新規事業開拓",
      "出資先企業経営参画",
      "事業ポートフォリオ管理",
      "海外市場開拓",
      "多国間三国間取引",
      "異文化コミュニケーション",
      "現地法人運営",
      "貿易ファイナンス",
      "トレードファイナンス組成",
      "為替・金利リスク管理",
      "カントリーリスク分析"
    ],
    "icon": "🌐",
    "color": "#059669"
  },
  {
    "id": "financial_services_industry" as IndustryCategoryId,
    "name": "金融・保険業界",
    "description": "銀行、証券、保険、フィンテック企業特有の知識とスキル",
    "type": "industry",
    "displayOrder": 4,
    "subcategories": [],
    "icon": "🏦",
    "color": "#1E40AF"
  },
  {
    "id": "manufacturing_industry" as IndustryCategoryId,
    "name": "製造業界",
    "description": "製造業特有の生産管理、品質管理、サプライチェーン知識とスキル",
    "type": "industry",
    "displayOrder": 5,
    "subcategories": [],
    "icon": "🏭",
    "color": "#DC2626"
  },
  {
    "id": "saas_product_industry" as IndustryCategoryId,
    "name": "SaaS・プロダクト業界",
    "description": "SaaS企業、プロダクト開発、テックスタートアップ特有の事業運営スキル",
    "type": "industry",
    "displayOrder": 6,
    "subcategories": [],
    "icon": "💻",
    "color": "#7C3AED"
  },
  {
    "id": "healthcare_industry" as IndustryCategoryId,
    "name": "ヘルスケア・医療業界",
    "description": "医療機関、製薬、医療機器、ヘルステック企業の専門知識とスキル",
    "type": "industry",
    "displayOrder": 7,
    "subcategories": [],
    "icon": "🏥",
    "color": "#059669"
  },
  {
    "id": "retail_consumer_industry" as IndustryCategoryId,
    "name": "小売・消費財業界",
    "description": "小売、EC、消費財メーカー特有のマーケティング・販売戦略スキル",
    "type": "industry",
    "displayOrder": 8,
    "subcategories": [],
    "icon": "🛍️",
    "color": "#EA580C"
  },
  {
    "id": "real_estate_construction_industry" as IndustryCategoryId,
    "name": "不動産・建設業界",
    "description": "不動産開発、建設、不動産サービス業界の専門知識とスキル",
    "type": "industry",
    "displayOrder": 9,
    "subcategories": [],
    "icon": "🏗️",
    "color": "#92400E"
  },
  {
    "id": "energy_infrastructure_industry" as IndustryCategoryId,
    "name": "エネルギー・インフラ業界",
    "description": "エネルギー、電力、ガス、水道、交通インフラ業界の専門知識とスキル",
    "type": "industry",
    "displayOrder": 10,
    "subcategories": [],
    "icon": "⚡",
    "color": "#0F766E"
  },
  {
    "id": "education_training_industry" as IndustryCategoryId,
    "name": "教育・研修業界",
    "description": "教育機関、研修会社、EdTech企業の教育サービス提供スキル",
    "type": "industry",
    "displayOrder": 11,
    "subcategories": [],
    "icon": "📚",
    "color": "#7C2D12"
  },
  {
    "id": "media_entertainment_industry" as IndustryCategoryId,
    "name": "メディア・エンタメ業界",
    "description": "メディア、広告、エンターテインメント、コンテンツ業界の専門スキル",
    "type": "industry",
    "displayOrder": 12,
    "subcategories": [],
    "icon": "🎬",
    "color": "#BE185D"
  },
  {
    "id": "logistics_transportation_industry" as IndustryCategoryId,
    "name": "物流・運輸業界",
    "description": "物流、運送、倉庫、航空・海運業界の物流最適化とサプライチェーン管理",
    "type": "industry",
    "displayOrder": 13,
    "subcategories": [],
    "icon": "🚛",
    "color": "#365314"
  },
  {
    "id": "public_sector_industry" as IndustryCategoryId,
    "name": "公共・行政業界",
    "description": "官公庁、自治体、公共機関における行政運営と公共サービス提供スキル",
    "type": "industry",
    "displayOrder": 14,
    "subcategories": [],
    "icon": "🏛️",
    "color": "#374151"
  }
]

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
    
    const response = await fetchFromAPI<{categories: DBCategory[]}>(`/categories?${queryParams}`)
    
    if (response?.categories) {
      // サブカテゴリー情報も一緒に取得
      const allSubcategoriesResponse = await fetchFromAPI<{subcategories: DBSubcategory[]}>('/subcategories')
      const subcategoriesMap = new Map<string, string[]>()
      
      if (allSubcategoriesResponse?.subcategories) {
        allSubcategoriesResponse.subcategories.forEach(sub => {
          if (!subcategoriesMap.has(sub.parent_category_id)) {
            subcategoriesMap.set(sub.parent_category_id, [])
          }
          subcategoriesMap.get(sub.parent_category_id)!.push(sub.name)
        })
      }
      
      // DB APIから取得したデータを変換（サブカテゴリー情報付き）
      const categories = response.categories.map(dbCategory => 
        transformDBCategoryToLocal(dbCategory, subcategoriesMap.get(dbCategory.category_id) || [])
      )
      cachedCategories = categories
      cacheTimestamp = now
      return filterCategories(categories, options)
    }
  } catch (error) {
    console.warn('DB category fetch failed, using static fallback:', error)
  }

  // フォールバック: 静的データを使用（すべて有効として扱う）
  const staticCategories = [...staticMainCategories, ...staticIndustryCategories].map(cat => ({
    ...cat,
    isActive: true,
    isVisible: true
  }))
  return filterCategories(staticCategories, options)
}

/**
 * DBから取得したカテゴリーデータを内部形式に変換
 */
function transformDBCategoryToLocal(dbCategory: DBCategory, subcategories: string[] = []): MainCategory | IndustryCategory {
  return {
    id: dbCategory.category_id as MainCategoryId | IndustryCategoryId,
    name: dbCategory.name,
    description: dbCategory.description || '',
    type: dbCategory.type,
    displayOrder: dbCategory.display_order || 1,
    subcategories: subcategories, // 実際のサブカテゴリー情報を設定
    icon: dbCategory.icon || '📚',
    color: dbCategory.color || '#6B7280',
    isActive: dbCategory.is_active ?? true,
    isVisible: dbCategory.is_visible ?? true
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
    const response = await fetchFromAPI<{skill_levels: DBSkillLevel[]}>('/skill-levels')
    
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
function transformDBSkillLevelToLocal(dbSkillLevel: DBSkillLevel): SkillLevelDefinition {
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
    
    const response = await fetchFromAPI<{subcategories: DBSubcategory[]}>(`/subcategories?${queryParams}`)
    
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
function transformDBSubcategoryToLocal(dbSubcategory: DBSubcategory): Subcategory {
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
 * 英語の難易度IDを日本語の表示名に変換
 */
export function getDifficultyDisplayName(difficultyId: string): string {
  // 既に日本語の場合はそのまま返す
  if (['基礎', '中級', '上級', 'エキスパート'].includes(difficultyId)) {
    return difficultyId
  }
  
  // 英語IDを日本語名に変換
  const skillLevel = staticSkillLevels.find(level => level.id === difficultyId)
  if (skillLevel) {
    return skillLevel.name
  }
  
  // フォールバック: 英語のままでも判別可能な場合
  const fallbackMap: Record<string, string> = {
    'basic': '基礎',
    'beginner': '基礎', // 旧システム互換
    'intermediate': '中級',
    'advanced': '上級',
    'expert': 'エキスパート'
  }
  
  return fallbackMap[difficultyId.toLowerCase()] || difficultyId
}

/**
 * 日本語の難易度表示名を英語IDに変換
 */
export function getDifficultyId(displayName: string): string {
  // 既に英語IDの場合はそのまま返す
  if (['basic', 'intermediate', 'advanced', 'expert'].includes(displayName.toLowerCase())) {
    return displayName.toLowerCase()
  }
  
  // 日本語名を英語IDに変換
  const skillLevel = staticSkillLevels.find(level => level.name === displayName)
  if (skillLevel) {
    return skillLevel.id
  }
  
  // フォールバック
  const fallbackMap: Record<string, string> = {
    '基礎': 'basic',
    '中級': 'intermediate',
    '上級': 'advanced',
    'エキスパート': 'expert'
  }
  
  return fallbackMap[displayName] || displayName
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
  'AI・機械学習活用': 'ai_機械学習活用',
  'AI基礎・業務活用': 'ai_基礎_業務活用',
  'プロンプトエンジニアリング': 'プロンプトエンジニアリング',
  'DX戦略・デジタル変革': 'dx戦略_デジタル変革',
  'データドリブン経営': 'データドリブン経営',
  'IoT・自動化技術': 'iot_自動化技術',
  '業務分析・要件定義': '業務分析_要件定義',
  'プロセス設計・最適化': 'プロセス設計_最適化',
  'BPR・業務改革': 'bpr_業務改革',
  // 重複エントリを削除 - 正規版は上部で定義済み
  '仮説思考・イシューツリー': '仮説思考_イシューツリー',
  'ストーリーライン構築': 'ストーリーライン構築',
  'ステークホルダー分析': 'ステークホルダー分析',
  '複数ステークホルダー調整': '複数ステークホルダー調整',
  'プロジェクト炎上対応・リカバリー': 'プロジェクト炎上対応_リカバリー',
  '変革リーダーシップ': '変革リーダーシップ',
  'デジタル変革支援': 'デジタル変革支援',
  'M&A・PMI支援': 'manda_pmi支援',
  'オペレーション改革': 'オペレーション改革',
  '規制業界対応（金融・製薬等）': '規制業界対応金融_製薬等',
  '業界ベストプラクティス活用': '業界ベストプラクティス活用',
  '業界動向・競合分析': '業界動向_競合分析',
  'RFP対応・提案書作成': 'rfp対応_提案書作成',
  '経営層プレゼン': '経営層プレゼン',
  '経営課題ヒアリング・課題設定': '経営課題ヒアリング_課題設定',
  '継続案件獲得・拡販戦略': '継続案件獲得_拡販戦略',
  'チームマネジメント・モチベーション': 'チームマネジメント_モチベーション',
  'タレントマネジメント・育成': 'タレントマネジメント_育成',
  '組織開発・変革リーダーシップ': '組織開発_変革リーダーシップ',
  '人事戦略・働き方改革': '人事戦略_働き方改革',
  '構造化思考（MECE・ロジックツリー）': '構造化思考mece_ロジックツリー',
  '仮説検証・本質追求': '仮説検証_本質追求',
  '定量分析・統計解析': '定量分析_統計解析',
  '行動経済学・意思決定理論': '行動経済学_意思決定理論',
  'ベンチマーキング・競合分析': 'ベンチマーキング_競合分析',
  '顧客分析・セグメンテーション': '顧客分析_セグメンテーション',
  'ブランディング・ポジショニング': 'ブランディング_ポジショニング',
  'デジタルマーケティング': 'デジタルマーケティング',
  '営業戦略・CRM': '営業戦略_crm',
  'プロジェクト設計・WBS': 'プロジェクト設計_wbs',
  'スケジュール・リソース管理': 'スケジュール_リソース管理',
  'ステークホルダー管理': 'ステークホルダー管理',
  '業務効率化・時間管理': '業務効率化_時間管理',
  '企業リスク管理': '企業リスク管理',
  '危機管理・BCP': '危機管理_bcp',
  // 重複削除: 'コンプライアンス・内部統制' は上部で定義済み
  '情報セキュリティ': '情報セキュリティ',
  'サステナビリティリスク': 'サステナビリティリスク',
  '要件定義・業務分析': '要件定義_業務分析',
  'IT戦略立案': 'it戦略立案',
  'RFP作成・ベンダー管理': 'rfp作成_ベンダー管理',
  'SIプロジェクト管理': 'siプロジェクト管理',
  '多階層ベンダー管理': '多階層ベンダー管理',
  'リスク管理・品質管理': 'リスク管理_品質管理',
  'システム導入・移行管理': 'システム導入_移行管理',
  'DX推進支援': 'dx推進支援',
  '技術的実現性評価': '技術的実現性評価',
  'レガシーシステム連携': 'レガシーシステム連携',
  '技術営業・提案活動': '技術営業_提案活動',
  '顧客要求分析': '顧客要求分析',
  '長期パートナーシップ構築': '長期パートナーシップ構築',
  '契約形態・価格設定戦略': '契約形態_価格設定戦略',
  '経営戦略・事業戦略': '経営戦略_事業戦略',
  '競争戦略・フレームワーク': '競争戦略_フレームワーク',
  '新事業開発・イノベーション': '新事業開発_イノベーション',
  'ESG・サステナビリティ経営': 'esg_サステナビリティ経営',
  '商品知識・市場分析': '商品知識_市場分析',
  '商品先物・デリバティブ活用': '商品先物_デリバティブ活用',
  '価格交渉・リスクヘッジ': '価格交渉_リスクヘッジ',
  '品質管理・検査・保険': '品質管理_検査_保険',
  '新規事業開拓': '新規事業開拓',
  '出資先企業経営参画': '出資先企業経営参画',
  '事業ポートフォリオ管理': '事業ポートフォリオ管理',
  '海外市場開拓': '海外市場開拓',
  '多国間三国間取引': '多国間三国間取引',
  '現地法人運営': '現地法人運営',
  '貿易ファイナンス': '貿易ファイナンス',
  'トレードファイナンス組成': 'トレードファイナンス組成',
  '為替・金利リスク管理': '為替_金利リスク管理',
  'カントリーリスク分析': 'カントリーリスク分析'
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
    id: subName.toLowerCase().replace(/[・・]/g, '_').replace(/\s+/g, '_'),
    name: subName,
    description: `${subName}に関する専門知識とスキル`,
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
