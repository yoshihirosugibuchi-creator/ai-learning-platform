import { 
  MainCategory, 
  IndustryCategory, 
  Subcategory,
  SkillLevel,
  SkillLevelDefinition, 
  MainCategoryId,
  IndustryCategoryId 
} from './types/category'
import type { Database } from './database-types-official'

// フロントエンド用APIクライアント（クライアントサイドで使用）
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : ''

// DB APIレスポンス型定義
interface DBCategory {
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

interface DBSkillLevel {
  id: string
  name: string
  description?: string | null
  target_experience?: string | null
  display_order?: number
  color?: string | null
}

interface DBSubcategory {
  subcategory_id: string
  name: string
  description?: string | null
  parent_category_id: string
  display_order?: number
  icon?: string | null
}

// DBから取得したデータをキャッシュ
let cachedCategories: (MainCategory | IndustryCategory)[] | null = null
const _cachedSubcategories: Subcategory[] | null = null
let cachedSkillLevels: SkillLevelDefinition[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分間キャッシュ

// キャッシュクリア関数
export function clearCategoriesCache() {
  cachedCategories = null
  cachedSkillLevels = null
  cacheTimestamp = 0
  console.log('🔄 Categories cache cleared')
}

// 強制的にキャッシュをクリア（即座に実行）
clearCategoriesCache()

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
    "name": "初級",
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
// Last sync: 2025-10-09T17:40:00.000Z - DB構造対応（isActive/isVisible追加、サブカテゴリー145個対応）
const staticMainCategories: MainCategory[] = [
  {
    "id": "logical_thinking_problem_solving",
    "name": "論理的思考・問題解決",
    "description": "体系的な思考法と分析技術",
    "type": "main",
    "displayOrder": 1,
    "isActive": true,
    "isVisible": true,
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
    "displayOrder": 2,
    "isActive": true,
    "isVisible": true,
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
    "id": "ai_digital_utilization",
    "name": "AI・デジタル活用",
    "description": "AI時代のデジタル技術活用",
    "type": "main",
    "displayOrder": 3,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "プロンプトエンジニアリング",
      "AI・機械学習活用",
      "DX戦略・デジタル変革",
      "データドリブン経営",
      "IoT・自動化技術"
    ],
    "icon": "🤖",
    "color": "#8B5CF6"
  },
  {
    "id": "business_process_analysis",
    "name": "ビジネスプロセス・業務分析",
    "description": "業務の理解と改善設計",
    "type": "main",
    "displayOrder": 4,
    "isActive": true,
    "isVisible": true,
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
    "id": "project_operations",
    "name": "プロジェクト・業務管理",
    "description": "プロジェクト運営と業務効率化",
    "type": "main",
    "displayOrder": 5,
    "isActive": true,
    "isVisible": true,
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
    "id": "communication_presentation",
    "name": "コミュニケーション・プレゼンテーション",
    "description": "効果的な情報伝達と説得技術",
    "type": "main",
    "displayOrder": 6,
    "isActive": true,
    "isVisible": true,
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
    "id": "finance",
    "name": "財務・ファイナンス",
    "description": "財務分析と資金管理の知識",
    "type": "main",
    "displayOrder": 7,
    "isActive": true,
    "isVisible": true,
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
    "displayOrder": 8,
    "isActive": true,
    "isVisible": true,
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
    "displayOrder": 9,
    "isActive": true,
    "isVisible": true,
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
    "id": "risk_crisis_management",
    "name": "リスク・危機管理",
    "description": "リスクの予防と危機対応",
    "type": "main",
    "displayOrder": 10,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "企業リスク管理",
      "危機管理・BCP",
      "コンプライアンス・内部統制",
      "情報セキュリティ",
      "サステナビリティリスク"
    ],
    "icon": "🛡️",
    "color": "#DC2626"
  },
  {
    "id": "ai_fundamentals",
    "name": "AI基礎",
    "description": "AI検定・G検定対応。人工知能の基礎概念から機械学習、ディープラーニング、生成AI、AI倫理まで体系的に学習",
    "type": "main",
    "displayOrder": 11,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "AI概論",
      "機械学習基礎",
      "ディープラーニング基礎",
      "ディープラーニング応用",
      "生成AI・LLM",
      "AI数理・統計",
      "AI社会実装",
      "AI法規・倫理"
    ],
    "icon": "🤖",
    "color": "#8B5CF6"
  },
  {
    "id": "si_basic_tech_foundation",
    "name": "SI基礎_技術基盤",
    "description": "システムアーキテクチャ、プログラミング、DB、クラウド、AI活用の基礎",
    "type": "main",
    "displayOrder": 15,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "A0 システムの全体像",
      "A1 プログラミング・開発基礎",
      "A2 データベース・SQL",
      "A3 クラウド・インフラ基礎",
      "A4 AI・データ活用リテラシー"
    ],
    "icon": "🏗️",
    "color": "#3B82F6"
  },
  {
    "id": "si_basic_dev_methodology",
    "name": "SI基礎_開発手法",
    "description": "ウォーターフォール、アジャイル、要件定義・設計技法",
    "type": "main",
    "displayOrder": 16,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "B1 ウォーターフォール・V字モデル",
      "B2 アジャイル・スクラム実践",
      "B3 要件定義・設計技法"
    ],
    "icon": "📊",
    "color": "#10B981"
  },
  {
    "id": "si_basic_testing",
    "name": "SI基礎_テスト技法",
    "description": "テスト計画、テストレベル別技法、テスト自動化",
    "type": "main",
    "displayOrder": 17,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "C1 テスト全体論・テスト計画",
      "C2 テストレベル別技法",
      "C3 テスト自動化・AI活用"
    ],
    "icon": "🧪",
    "color": "#8B5CF6"
  },
  {
    "id": "si_basic_eng_practice",
    "name": "SI基礎_エンジニアリング実務",
    "description": "Git/CI/CD、セキュリティ、障害対応",
    "type": "main",
    "displayOrder": 18,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "D1 Git・バージョン管理・CI/CD",
      "D2 セキュリティ基礎",
      "D3 障害対応・インシデント管理"
    ],
    "icon": "🔧",
    "color": "#F59E0B"
  },
  {
    "id": "si_basic_business_skills",
    "name": "SI基礎_ビジネス・ソフトスキル",
    "description": "ドキュメンテーション、PM、労務管理、経営リテラシー",
    "type": "main",
    "displayOrder": 19,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "E1 技術ドキュメンテーション",
      "E2 プロジェクトマネジメント基礎",
      "E3 SI労務管理・働き方",
      "E4 ベンチャー経営リテラシー"
    ],
    "icon": "💼",
    "color": "#EF4444"
  },
  {
    "id": "si_basic_ai_collab",
    "name": "SI基礎_AI協働プログラミング",
    "description": "AIコーディングツール活用、AI生成コードレビュー、AI活用設計",
    "type": "main",
    "displayOrder": 20,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "M1 AIコーディングツール基礎",
      "M2 プロンプトエンジニアリング for コード",
      "M3 AI生成コードのレビュー力",
      "M4 AI活用の設計・アーキテクチャ判断",
      "M5 テスト・デバッグのAI活用"
    ],
    "icon": "🤖",
    "color": "#06B6D4"
  }
]

// 🔄 DB同期済み: 静的フォールバック用業界カテゴリー定義
// Last sync: 2025-10-09T17:40:00.000Z - DB構造対応（isActive/isVisible追加、サブカテゴリー145個対応）
const staticIndustryCategories: IndustryCategory[] = [
  {
    "id": "consulting_industry",
    "name": "コンサルティング業界",
    "description": "コンサルティング業界特有の知識とスキル",
    "type": "industry",
    "displayOrder": 1,
    "isActive": true,
    "isVisible": true,
    "subcategories": [
      "仮説思考・イシューツリー",
      "ケース面接・構造化思考",
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
    "id": "si_industry",
    "name": "SI（システムインテグレーション）業界",
    "description": "SI業界特有のプロジェクト管理と技術コンサルティング",
    "type": "industry",
    "displayOrder": 2,
    "isActive": true,
    "isVisible": true,
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
    "id": "trading_company_industry",
    "name": "商社業界",
    "description": "商社特有のトレーディング・事業投資・グローバル展開スキル",
    "type": "industry",
    "displayOrder": 3,
    "isActive": true,
    "isVisible": true,
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
    "id": "saas_product_industry",
    "name": "SaaS・プロダクト業界",
    "description": "SaaS企業、プロダクト開発、テックスタートアップ特有の事業運営スキル",
    "type": "industry",
    "displayOrder": 4,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "プロダクトマネジメント",
      "UX・UI設計",
      "グロースマーケティング",
      "カスタマーサクセス",
      "サブスクリプション事業運営"
    ],
    "icon": "💻",
    "color": "#7C3AED"
  },
  {
    "id": "manufacturing_industry",
    "name": "製造業界",
    "description": "製造業特有の生産管理、品質管理、サプライチェーン知識とスキル",
    "type": "industry",
    "displayOrder": 5,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "生産管理・計画",
      "品質管理・保証",
      "リーン生産・改善活動",
      "スマートファクトリー・IoT",
      "製造戦略・事業企画"
    ],
    "icon": "🏭",
    "color": "#F59E0B"
  },
  {
    "id": "financial_services_industry",
    "name": "金融業界",
    "description": "銀行、証券、フィンテック企業特有の知識とスキル",
    "type": "industry",
    "displayOrder": 6,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "金融商品・サービス設計",
      "金融規制・コンプライアンス",
      "フィンテック・デジタル化",
      "与信・リスク管理"
    ],
    "icon": "🏦",
    "color": "#1E40AF"
  },
  {
    "id": "life_insurance_industry",
    "name": "生命保険業界",
    "description": "生命保険会社の商品体系、業務プロセス、資産運用、法規制など業界固有の専門知識",
    "type": "industry",
    "displayOrder": 15,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "生保市場・業界構造",
      "保険商品体系・ビジネスモデル",
      "保険業務プロセス",
      "保険資産運用・ALM",
      "保険情報システム",
      "保険DX・インシュアテック",
      "保険法規制・コンプライアンス",
      "保険経営戦略・課題"
    ],
    "icon": "🛡️",
    "color": "#0D9488"
  },
  {
    "id": "healthcare_industry",
    "name": "ヘルスケア・医療業界",
    "description": "医療機関、製薬、医療機器、ヘルステック企業の専門知識とスキル",
    "type": "industry",
    "displayOrder": 7,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "医療業務・臨床オペレーション",
      "医療IT・電子カルテ",
      "医薬品開発・薬事",
      "医療経営・病院管理",
      "医療機器・メドテック"
    ],
    "icon": "🏥",
    "color": "#059669"
  },
  {
    "id": "retail_consumer_industry",
    "name": "小売・消費財業界",
    "description": "小売、EC、消費財メーカー特有のマーケティング・販売戦略スキル",
    "type": "industry",
    "displayOrder": 8,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "店舗運営・小売業務",
      "オムニチャネル戦略",
      "マーチャンダイジング",
      "消費者インサイト・市場調査",
      "ブランド管理・マーケティング"
    ],
    "icon": "🛍️",
    "color": "#EA580C"
  },
  {
    "id": "real_estate_construction_industry",
    "name": "不動産・建設業界",
    "description": "不動産開発、建設、不動産サービス業界の専門知識とスキル",
    "type": "industry",
    "displayOrder": 9,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "不動産開発・企画",
      "建設プロジェクト管理",
      "不動産管理・運営",
      "不動産ファイナンス・投資",
      "プロップテック・建設DX"
    ],
    "icon": "🏗️",
    "color": "#92400E"
  },
  {
    "id": "energy_infrastructure_industry",
    "name": "エネルギー・インフラ業界",
    "description": "エネルギー、電力、ガス、水道、交通インフラ業界の専門知識とスキル",
    "type": "industry",
    "displayOrder": 10,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "エネルギー戦略・政策",
      "再生可能エネルギー",
      "インフラ運営・管理",
      "スマートグリッド・IoT",
      "インフラ投資・事業開発"
    ],
    "icon": "⚡",
    "color": "#0F766E"
  },
  {
    "id": "education_training_industry",
    "name": "教育・研修業界",
    "description": "教育機関、研修会社、EdTech企業の教育サービス提供スキル",
    "type": "industry",
    "displayOrder": 11,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "教育プログラム設計",
      "学習技術・EdTech",
      "企業研修・人材育成",
      "教育評価・アセスメント",
      "教育機関運営・管理"
    ],
    "icon": "📚",
    "color": "#7C2D12"
  },
  {
    "id": "media_entertainment_industry",
    "name": "メディア・エンタメ業界",
    "description": "メディア、広告、エンターテインメント、コンテンツ業界の専門スキル",
    "type": "industry",
    "displayOrder": 12,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "コンテンツ制作・企画",
      "デジタルメディア・配信",
      "広告・メディアプランニング",
      "IP・著作権管理",
      "エンタメ事業・興行"
    ],
    "icon": "🎬",
    "color": "#BE185D"
  },
  {
    "id": "logistics_transportation_industry",
    "name": "物流・運輸業界",
    "description": "物流、運送、倉庫、航空・海運業界の物流最適化とサプライチェーン管理",
    "type": "industry",
    "displayOrder": 13,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "物流最適化・効率化",
      "倉庫管理・自動化",
      "輸送計画・ネットワーク設計",
      "物流テック・DX",
      "国際物流・貿易"
    ],
    "icon": "🚛",
    "color": "#365314"
  },
  {
    "id": "public_sector_industry",
    "name": "公共・行政業界",
    "description": "官公庁、自治体、公共機関における行政運営と公共サービス提供スキル",
    "type": "industry",
    "displayOrder": 14,
    "isActive": false,
    "isVisible": true,
    "subcategories": [
      "政策立案・行政企画",
      "公共サービス提供",
      "デジタル行政・DX",
      "公共財政・予算管理",
      "地域振興・まちづくり"
    ],
    "icon": "🏛️",
    "color": "#374151"
  }
]

/**
 * JSONファイルからカテゴリーを読み込み（フォールバック用）
 */
async function loadCategoriesFromJSON(): Promise<(MainCategory | IndustryCategory)[]> {
  try {
    console.log('📄 Loading categories from JSON fallback')
    const response = await fetch('/data/categories-fallback.json')
    
    if (!response.ok) {
      throw new Error(`JSON file request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const categories = data.categories || []
    
    console.log(`✅ Categories loaded from JSON: ${categories.length} categories`)
    
    // DB形式からローカル形式に変換
    return categories.map((dbCategory: Database['public']['Tables']['categories']['Row']) => 
      transformDBCategoryToLocal({
        category_id: dbCategory.category_id,
        name: dbCategory.name,
        description: dbCategory.description,
        type: dbCategory.type,
        display_order: dbCategory.display_order,
        icon: dbCategory.icon,
        color: dbCategory.color,
        is_active: dbCategory.is_active,
        is_visible: dbCategory.is_visible
      }, [])
    )
    
  } catch (error) {
    console.error('❌ Error loading categories from JSON:', error)
    return []
  }
}

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
    if (options?.activeOnly !== false) queryParams.set('active_only', 'true') // デフォルトはactiveのみ
    
    const response = await fetchFromAPI<{categories: DBCategory[]}>(`/categories?${queryParams}`)
    
    if (response?.categories && response.categories.length > 0) {
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
    console.warn('DB category fetch failed, trying JSON fallback:', error)
  }

  // JSONフォールバック層を追加
  try {
    const jsonCategories = await loadCategoriesFromJSON()
    if (jsonCategories.length > 0) {
      cachedCategories = jsonCategories
      cacheTimestamp = now
      return filterCategories(jsonCategories, options)
    }
  } catch (error) {
    console.warn('JSON category fetch failed, using static fallback:', error)
  }

  // 最終フォールバック: 静的データを使用（すべて有効として扱う）
  console.log('🔄 Using static categories fallback')
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
  const baseCategory = {
    id: dbCategory.category_id as MainCategoryId | IndustryCategoryId,
    name: dbCategory.name,
    description: dbCategory.description || '',
    type: dbCategory.type,
    displayOrder: dbCategory.display_order || 1,
    subcategories: subcategories,
    icon: dbCategory.icon || '📚',
    color: dbCategory.color || '#6B7280',
    isActive: dbCategory.is_active ?? true,
    isVisible: dbCategory.is_visible ?? true
  } as const
  
  return baseCategory as MainCategory | IndustryCategory
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
  
  // activeOnlyフィルター - デフォルトはtrue（アクティブのみ）
  if (options?.activeOnly !== false) {
    filtered = filtered.filter(cat => {
      // isActiveフィールドがある場合（DBデータ）はそれを使用
      if ('isActive' in cat && cat.isActive !== undefined) {
        return cat.isActive
      }
      // 静的データの場合は全て有効とみなす
      return true
    })
  }
  
  return filtered
}

/**
 * JSONファイルからスキルレベルを読み込み（フォールバック用）
 */
async function loadSkillLevelsFromJSON(): Promise<SkillLevelDefinition[]> {
  try {
    console.log('📄 Loading skill levels from JSON fallback')
    const response = await fetch('/data/skill-levels-fallback.json')
    
    if (!response.ok) {
      throw new Error(`JSON file request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const skillLevels = data.skillLevels || []
    
    console.log(`✅ Skill levels loaded from JSON: ${skillLevels.length} skill levels`)
    
    // DB形式からローカル形式に変換
    return skillLevels.map((dbSkillLevel: Database['public']['Tables']['skill_levels']['Row']) => 
      transformDBSkillLevelToLocal({
        id: dbSkillLevel.id,
        name: dbSkillLevel.name,
        description: dbSkillLevel.description,
        target_experience: dbSkillLevel.target_experience,
        display_order: dbSkillLevel.display_order,
        color: dbSkillLevel.color
      })
    )
    
  } catch (error) {
    console.error('❌ Error loading skill levels from JSON:', error)
    return []
  }
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
    console.warn('DB skill levels fetch failed, trying JSON fallback:', error)
  }

  // JSONフォールバック層を追加
  try {
    const jsonSkillLevels = await loadSkillLevelsFromJSON()
    if (jsonSkillLevels.length > 0) {
      cachedSkillLevels = jsonSkillLevels
      cacheTimestamp = now
      return jsonSkillLevels
    }
  } catch (error) {
    console.warn('JSON skill levels fetch failed, using static fallback:', error)
  }

  // 最終フォールバック: 静的データを使用
  console.log('🔄 Using static skill levels fallback')
  return staticSkillLevels
}

/**
 * DBから取得したスキルレベルデータを内部形式に変換
 */
function transformDBSkillLevelToLocal(dbSkillLevel: DBSkillLevel): SkillLevelDefinition {
  return {
    id: dbSkillLevel.id as SkillLevel,
    name: dbSkillLevel.name,
    description: dbSkillLevel.description || '',
    targetExperience: dbSkillLevel.target_experience || '',
    displayOrder: dbSkillLevel.display_order || 1
  }
}

/**
 * JSONファイルからサブカテゴリーを読み込み（フォールバック用）
 */
async function loadSubcategoriesFromJSON(parentCategoryId?: string): Promise<Subcategory[]> {
  try {
    console.log('📄 Loading subcategories from JSON fallback')
    const response = await fetch('/data/subcategories-fallback.json')
    
    if (!response.ok) {
      throw new Error(`JSON file request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const subcategories = data.subcategories || []
    
    console.log(`✅ Subcategories loaded from JSON: ${subcategories.length} subcategories`)
    
    // DB形式からローカル形式に変換
    let transformed = subcategories.map((dbSubcategory: Database['public']['Tables']['subcategories']['Row']) => 
      transformDBSubcategoryToLocal({
        subcategory_id: dbSubcategory.id,
        name: dbSubcategory.name,
        description: dbSubcategory.description,
        parent_category_id: dbSubcategory.parent_category_id,
        display_order: dbSubcategory.display_order,
        icon: dbSubcategory.icon
      })
    )
    
    // 特定の親カテゴリーIDでフィルター
    if (parentCategoryId) {
      transformed = transformed.filter((sub: Subcategory) => sub.parentId === parentCategoryId)
    }
    
    return transformed
    
  } catch (error) {
    console.error('❌ Error loading subcategories from JSON:', error)
    return []
  }
}

/**
 * サブカテゴリーを取得（DB API + フォールバック）
 */
export async function getSubcategories(parentCategoryId?: string, activeOnly = false): Promise<Subcategory[]> {
  const _now = Date.now()
  
  try {
    const queryParams = new URLSearchParams()
    if (parentCategoryId) queryParams.set('parent_category_id', parentCategoryId)
    if (activeOnly) queryParams.set('active_only', 'true')
    
    const response = await fetchFromAPI<{subcategories: DBSubcategory[]}>(`/subcategories?${queryParams}`)
    
    if (response?.subcategories) {
      const transformed = response.subcategories.map(transformDBSubcategoryToLocal)
      console.log(`✅ getSubcategories success: ${transformed.length} items`)
      return transformed
    }
  } catch (error) {
    console.warn('🚨 DB subcategories fetch failed, trying JSON fallback:', error)
  }

  // JSONフォールバック層を追加
  try {
    const jsonSubcategories = await loadSubcategoriesFromJSON(parentCategoryId)
    if (jsonSubcategories.length > 0) {
      return jsonSubcategories
    }
  } catch (error) {
    console.warn('JSON subcategories fetch failed, using static fallback:', error)
  }

  // 最終フォールバック: 静的データから生成
  if (parentCategoryId) {
    return getSubcategoriesByParent(parentCategoryId)
  }
  
  // parentCategoryIdが未指定の場合、全カテゴリーのサブカテゴリーを返す（フォールバック用）
  console.warn('🔄 Using static subcategories fallback for all categories')
  const allCategories = [...staticMainCategories, ...staticIndustryCategories]
  const allSubcategories: Subcategory[] = []
  
  allCategories.forEach(category => {
    const subcats = getSubcategoriesByParent(category.id)
    allSubcategories.push(...subcats)
  })
  
  return allSubcategories
}

/**
 * DBから取得したサブカテゴリーデータを内部形式に変換
 */
function transformDBSubcategoryToLocal(dbSubcategory: DBSubcategory): Subcategory {
  return {
    id: dbSubcategory.subcategory_id,
    name: dbSubcategory.name,
    description: dbSubcategory.description || '',
    type: 'subcategory' as const,
    parentId: dbSubcategory.parent_category_id,
    displayOrder: dbSubcategory.display_order || 1
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

// type='main'のカテゴリーIDのみを取得（ランダムクイズ用）
export function getMainCategoryIds(): string[] {
  return staticMainCategories
    .filter(cat => cat.isVisible !== false) // 非表示カテゴリーを除外
    .map(cat => cat.id)
}

// カテゴリーIDがtype='main'かどうかを判定
export function isMainCategory(categoryId: string): boolean {
  return staticMainCategories.some(cat => cat.id === categoryId)
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
export function getDifficultyDisplayName(difficultyId: string | null): string {
  // nullの場合は未設定を返す
  if (difficultyId === null) {
    return '未設定'
  }
  
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
 * キャッシュがあればキャッシュを使用、なければ静的データ
 */
export function getAllCategoriesSync(): (MainCategory | IndustryCategory)[] {
  // キャッシュがあればキャッシュを優先
  if (cachedCategories && cachedCategories.length > 0) {
    return cachedCategories
  }
  // フォールバック：静的データ
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
 * キャッシュがあればキャッシュを使用、なければ静的データ
 */
export function getCategoryByIdSync(id: string): MainCategory | IndustryCategory | undefined {
  // キャッシュがあればキャッシュを優先
  if (cachedCategories && cachedCategories.length > 0) {
    const found = cachedCategories.find(cat => cat.id === id)
    if (found) return found
    // キャッシュにない場合（非アクティブカテゴリー等）は静的データにフォールバック
  }
  // フォールバック：静的データ（非アクティブカテゴリーも含む）
  return [...staticMainCategories, ...staticIndustryCategories].find(cat => cat.id === id)
}

export function getSubcategoriesByParent(parentId: string): Subcategory[] {
  const category = getCategoryByIdSync(parentId)
  if (!category) return []
  
  return category.subcategories.map((subName, index) => ({
    id: subName.toLowerCase().replace(/[・・]/g, '_').replace(/\s+/g, '_'),
    name: subName,
    description: `${subName}に関する専門知識とスキル`,
    type: 'subcategory' as const,
    parentId: parentId,
    displayOrder: index + 1
  }))
}

function _getSubcategoryIcon(subcategoryName: string): string {
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
    type: 'subcategory',
    parentId: 'communication_presentation',
    displayOrder: 1
  },
  {
    id: 'sales_marketing',
    name: 'セールス・マーケティング',
    description: 'セールスとマーケティングの実践スキル',
    type: 'subcategory',
    parentId: 'communication_presentation',
    displayOrder: 2
  },
  {
    id: 'negotiation_coordination',
    name: '交渉・調整',
    description: '交渉術と利害関係者の調整スキル',
    type: 'subcategory',
    parentId: 'communication_presentation',
    displayOrder: 3
  },

  // 分析的問題解決
  {
    id: 'logical_thinking_analysis',
    name: '論理的思考・分析',
    description: '論理的思考と分析的問題解決',
    type: 'subcategory',
    parentId: 'analytical_problem_solving',
    displayOrder: 1
  },
  {
    id: 'financial_accounting_analysis',
    name: '財務・会計分析',
    description: '財務データの分析と解釈',
    type: 'subcategory',
    parentId: 'analytical_problem_solving',
    displayOrder: 2
  },
  {
    id: 'data_analysis_interpretation',
    name: 'データ分析・解釈',
    description: 'データを活用した洞察の獲得',
    type: 'subcategory',
    parentId: 'analytical_problem_solving',
    displayOrder: 3
  },

  // リーダーシップ・マネジメント
  {
    id: 'team_management_development',
    name: 'チーム運営・人材育成',
    description: 'チームマネジメントと人材開発',
    type: 'subcategory',
    parentId: 'leadership_management',
    displayOrder: 1
  },
  {
    id: 'project_management',
    name: 'プロジェクトマネジメント',
    description: 'プロジェクトの計画・実行・管理',
    type: 'subcategory',
    parentId: 'leadership_management',
    displayOrder: 2
  },
  {
    id: 'organizational_development_transformation',
    name: '組織開発・変革',
    description: '組織の成長と変革の推進',
    type: 'subcategory',
    parentId: 'leadership_management',
    displayOrder: 3
  },

  // ビジネス戦略・企画
  {
    id: 'business_strategy_planning',
    name: '事業戦略・企画',
    description: '事業戦略の立案と企画',
    type: 'subcategory',
    parentId: 'business_strategy',
    displayOrder: 1
  },
  {
    id: 'operations_improvement',
    name: 'オペレーション・業務改善',
    description: '業務効率化とオペレーション改善',
    type: 'subcategory',
    parentId: 'business_strategy',
    displayOrder: 2
  },
  {
    id: 'market_competitive_analysis',
    name: '市場分析・競合調査',
    description: '市場動向分析と競合戦略',
    type: 'subcategory',
    parentId: 'business_strategy',
    displayOrder: 3
  }
]
