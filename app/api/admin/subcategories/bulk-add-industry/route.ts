import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 業界別カテゴリーのサブカテゴリー定義
const industrySubcategories = [
  // SaaS・プロダクト業界
  {
    subcategory_id: "product_management",
    name: "プロダクトマネジメント",
    description: "プロダクト戦略、ロードマップ、機能企画・優先順位付け",
    parent_category_id: "saas_product_industry",
    icon: "🎯",
    display_order: 1
  },
  {
    subcategory_id: "user_experience_design",
    name: "UX・UI設計",
    description: "ユーザー体験設計、インターフェース設計、ユーザビリティ向上",
    parent_category_id: "saas_product_industry",
    icon: "🎨",
    display_order: 2
  },
  {
    subcategory_id: "growth_marketing",
    name: "グロースマーケティング",
    description: "ユーザー獲得、リテンション、グロースハック手法",
    parent_category_id: "saas_product_industry",
    icon: "📈",
    display_order: 3
  },
  {
    subcategory_id: "customer_success",
    name: "カスタマーサクセス",
    description: "顧客オンボーディング、継続利用促進、チャーン防止",
    parent_category_id: "saas_product_industry",
    icon: "🤝",
    display_order: 4
  },
  {
    subcategory_id: "subscription_business",
    name: "サブスクリプション事業運営",
    description: "MRR管理、料金体系設計、収益最適化",
    parent_category_id: "saas_product_industry",
    icon: "💳",
    display_order: 5
  },

  // 製造業界
  {
    subcategory_id: "production_management",
    name: "生産管理・計画",
    description: "生産計画、工程管理、在庫最適化",
    parent_category_id: "manufacturing_industry",
    icon: "⚙️",
    display_order: 1
  },
  {
    subcategory_id: "quality_management",
    name: "品質管理・保証",
    description: "品質管理システム、ISO認証、不良品対策",
    parent_category_id: "manufacturing_industry",
    icon: "✅",
    display_order: 2
  },
  {
    subcategory_id: "lean_manufacturing",
    name: "リーン生産・改善活動",
    description: "トヨタ生産方式、カイゼン、ムダ削減",
    parent_category_id: "manufacturing_industry",
    icon: "🔄",
    display_order: 3
  },
  {
    subcategory_id: "smart_factory",
    name: "スマートファクトリー・IoT",
    description: "工場IoT、自動化、デジタル化推進",
    parent_category_id: "manufacturing_industry",
    icon: "🤖",
    display_order: 4
  },
  {
    subcategory_id: "manufacturing_strategy",
    name: "製造戦略・事業企画",
    description: "製造業の事業戦略、新製品開発、市場参入",
    parent_category_id: "manufacturing_industry",
    icon: "🎯",
    display_order: 5
  },

  // 金融業界
  {
    subcategory_id: "financial_products",
    name: "金融商品・サービス設計",
    description: "金融商品企画、リスクプライシング、商品組成",
    parent_category_id: "financial_services_industry",
    icon: "💰",
    display_order: 1
  },
  {
    subcategory_id: "regulatory_compliance",
    name: "金融規制・コンプライアンス",
    description: "金融法規制、監査対応、リスク管理",
    parent_category_id: "financial_services_industry",
    icon: "📋",
    display_order: 2
  },
  {
    subcategory_id: "fintech_innovation",
    name: "フィンテック・デジタル化",
    description: "デジタルバンキング、決済システム、ブロックチェーン活用",
    parent_category_id: "financial_services_industry",
    icon: "💻",
    display_order: 3
  },
  {
    subcategory_id: "credit_risk_management",
    name: "与信・リスク管理",
    description: "信用審査、リスクアセスメント、ポートフォリオ管理",
    parent_category_id: "financial_services_industry",
    icon: "🛡️",
    display_order: 4
  },

  // 生命保険業界
  {
    subcategory_id: "life_insurance_market",
    name: "生保市場・業界構造",
    description: "生命保険業界の市場規模、プレイヤー分類、販売チャネル構造、業界再編の歴史",
    parent_category_id: "life_insurance_industry",
    icon: "📊",
    display_order: 1
  },
  {
    subcategory_id: "insurance_products_model",
    name: "保険商品体系・ビジネスモデル",
    description: "保険商品分類、主契約・特約、保険料の仕組み（三利源）、アクチュアリー、再保険",
    parent_category_id: "life_insurance_industry",
    icon: "📦",
    display_order: 2
  },
  {
    subcategory_id: "insurance_business_process",
    name: "保険業務プロセス",
    description: "商品開発、募集・販売、新契約引受（アンダーライティング）、契約管理（保全）、保険金・給付金支払、代理店管理",
    parent_category_id: "life_insurance_industry",
    icon: "🔄",
    display_order: 3
  },
  {
    subcategory_id: "insurance_asset_management",
    name: "保険資産運用・ALM",
    description: "一般勘定・特別勘定、資産ポートフォリオ、ALM、ソルベンシー規制（ESR）、IFRS17、運用戦略",
    parent_category_id: "life_insurance_industry",
    icon: "💹",
    display_order: 4
  },
  {
    subcategory_id: "insurance_information_systems",
    name: "保険情報システム",
    description: "基幹系（新契約・契約管理・数理）、営業支援、情報系・分析基盤、レガシーモダナイゼーション",
    parent_category_id: "life_insurance_industry",
    icon: "🖥️",
    display_order: 5
  },
  {
    subcategory_id: "insurance_dx_insurtech",
    name: "保険DX・インシュアテック",
    description: "デジタル化戦略、AI-OCR・チャットボット、インシュアテック連携、組込型保険、AI引受査定・支払査定",
    parent_category_id: "life_insurance_industry",
    icon: "🤖",
    display_order: 6
  },
  {
    subcategory_id: "insurance_regulation",
    name: "保険法規制・コンプライアンス",
    description: "保険業法、募集規制、契約者保護制度、個人情報・機微情報、AML/CFT、金融庁モニタリング",
    parent_category_id: "life_insurance_industry",
    icon: "⚖️",
    display_order: 7
  },
  {
    subcategory_id: "insurance_management_strategy",
    name: "保険経営戦略・課題",
    description: "少子高齢化対応、海外事業展開、非保険領域、人材・組織変革、サステナビリティ、経営指標分析",
    parent_category_id: "life_insurance_industry",
    icon: "🎯",
    display_order: 8
  },

  // ヘルスケア・医療業界
  {
    subcategory_id: "clinical_operations",
    name: "医療業務・臨床オペレーション",
    description: "臨床業務効率化、医療安全、患者ケア向上",
    parent_category_id: "healthcare_industry",
    icon: "🏥",
    display_order: 1
  },
  {
    subcategory_id: "healthcare_it",
    name: "医療IT・電子カルテ",
    description: "電子カルテ、医療システム、デジタルヘルス",
    parent_category_id: "healthcare_industry",
    icon: "💻",
    display_order: 2
  },
  {
    subcategory_id: "pharmaceutical_development",
    name: "医薬品開発・薬事",
    description: "新薬開発、臨床試験、薬事申請",
    parent_category_id: "healthcare_industry",
    icon: "💊",
    display_order: 3
  },
  {
    subcategory_id: "healthcare_management",
    name: "医療経営・病院管理",
    description: "病院経営、医療経済、ヘルスケア政策",
    parent_category_id: "healthcare_industry",
    icon: "📊",
    display_order: 4
  },
  {
    subcategory_id: "medical_devices",
    name: "医療機器・メドテック",
    description: "医療機器開発、規制対応、医療技術革新",
    parent_category_id: "healthcare_industry",
    icon: "🔬",
    display_order: 5
  },

  // 小売・消費財業界
  {
    subcategory_id: "retail_operations",
    name: "店舗運営・小売業務",
    description: "店舗管理、在庫管理、売場づくり",
    parent_category_id: "retail_consumer_industry",
    icon: "🏪",
    display_order: 1
  },
  {
    subcategory_id: "omnichannel_strategy",
    name: "オムニチャネル戦略",
    description: "オンライン・オフライン統合、顧客体験設計",
    parent_category_id: "retail_consumer_industry",
    icon: "🌐",
    display_order: 2
  },
  {
    subcategory_id: "merchandising",
    name: "マーチャンダイジング",
    description: "商品企画、仕入れ戦略、バイイング",
    parent_category_id: "retail_consumer_industry",
    icon: "🛍️",
    display_order: 3
  },
  {
    subcategory_id: "consumer_insights",
    name: "消費者インサイト・市場調査",
    description: "消費者行動分析、トレンド分析、市場リサーチ",
    parent_category_id: "retail_consumer_industry",
    icon: "🔍",
    display_order: 4
  },
  {
    subcategory_id: "brand_management",
    name: "ブランド管理・マーケティング",
    description: "ブランド戦略、広告・販促、消費財マーケティング",
    parent_category_id: "retail_consumer_industry",
    icon: "🎯",
    display_order: 5
  },

  // 不動産・建設業界
  {
    subcategory_id: "real_estate_development",
    name: "不動産開発・企画",
    description: "開発企画、用地取得、プロジェクト管理",
    parent_category_id: "real_estate_construction_industry",
    icon: "🏗️",
    display_order: 1
  },
  {
    subcategory_id: "construction_management",
    name: "建設プロジェクト管理",
    description: "工事管理、品質管理、安全管理",
    parent_category_id: "real_estate_construction_industry",
    icon: "👷",
    display_order: 2
  },
  {
    subcategory_id: "property_management",
    name: "不動産管理・運営",
    description: "賃貸管理、ビル管理、アセットマネジメント",
    parent_category_id: "real_estate_construction_industry",
    icon: "🏢",
    display_order: 3
  },
  {
    subcategory_id: "real_estate_finance",
    name: "不動産ファイナンス・投資",
    description: "不動産投資、REIT、不動産金融",
    parent_category_id: "real_estate_construction_industry",
    icon: "💰",
    display_order: 4
  },
  {
    subcategory_id: "proptech_innovation",
    name: "プロップテック・建設DX",
    description: "不動産テック、建設業DX、スマートビル",
    parent_category_id: "real_estate_construction_industry",
    icon: "💻",
    display_order: 5
  },

  // エネルギー・インフラ業界
  {
    subcategory_id: "energy_strategy",
    name: "エネルギー戦略・政策",
    description: "エネルギー政策、電力市場、規制対応",
    parent_category_id: "energy_infrastructure_industry",
    icon: "⚡",
    display_order: 1
  },
  {
    subcategory_id: "renewable_energy",
    name: "再生可能エネルギー",
    description: "太陽光・風力発電、蓄電技術、グリーンエネルギー",
    parent_category_id: "energy_infrastructure_industry",
    icon: "🌱",
    display_order: 2
  },
  {
    subcategory_id: "infrastructure_management",
    name: "インフラ運営・管理",
    description: "インフラ設備管理、保守・メンテナンス、ライフサイクル管理",
    parent_category_id: "energy_infrastructure_industry",
    icon: "🔧",
    display_order: 3
  },
  {
    subcategory_id: "smart_grid",
    name: "スマートグリッド・IoT",
    description: "スマートグリッド、IoTインフラ、デジタル化",
    parent_category_id: "energy_infrastructure_industry",
    icon: "🌐",
    display_order: 4
  },
  {
    subcategory_id: "infrastructure_investment",
    name: "インフラ投資・事業開発",
    description: "インフラファンド、PPP/PFI、事業投資",
    parent_category_id: "energy_infrastructure_industry",
    icon: "💰",
    display_order: 5
  },

  // 教育・研修業界
  {
    subcategory_id: "educational_program_design",
    name: "教育プログラム設計",
    description: "カリキュラム設計、学習目標設定、教育効果測定",
    parent_category_id: "education_training_industry",
    icon: "📚",
    display_order: 1
  },
  {
    subcategory_id: "learning_technology",
    name: "学習技術・EdTech",
    description: "eラーニング、オンライン教育、学習管理システム",
    parent_category_id: "education_training_industry",
    icon: "💻",
    display_order: 2
  },
  {
    subcategory_id: "corporate_training",
    name: "企業研修・人材育成",
    description: "企業研修設計、スキル開発、人材教育",
    parent_category_id: "education_training_industry",
    icon: "👥",
    display_order: 3
  },
  {
    subcategory_id: "educational_assessment",
    name: "教育評価・アセスメント",
    description: "学習評価、能力測定、教育データ分析",
    parent_category_id: "education_training_industry",
    icon: "📊",
    display_order: 4
  },
  {
    subcategory_id: "educational_management",
    name: "教育機関運営・管理",
    description: "学校経営、教育事業運営、生徒・学習者管理",
    parent_category_id: "education_training_industry",
    icon: "🏫",
    display_order: 5
  },

  // メディア・エンタメ業界
  {
    subcategory_id: "content_production",
    name: "コンテンツ制作・企画",
    description: "番組・動画制作、コンテンツ企画、クリエイティブディレクション",
    parent_category_id: "media_entertainment_industry",
    icon: "🎬",
    display_order: 1
  },
  {
    subcategory_id: "digital_media",
    name: "デジタルメディア・配信",
    description: "動画配信、ストリーミング、デジタルプラットフォーム",
    parent_category_id: "media_entertainment_industry",
    icon: "📱",
    display_order: 2
  },
  {
    subcategory_id: "advertising_media",
    name: "広告・メディアプランニング",
    description: "広告企画、メディア買付、広告効果測定",
    parent_category_id: "media_entertainment_industry",
    icon: "📺",
    display_order: 3
  },
  {
    subcategory_id: "ip_management",
    name: "IP・著作権管理",
    description: "知的財産管理、ライセンス契約、著作権ビジネス",
    parent_category_id: "media_entertainment_industry",
    icon: "📄",
    display_order: 4
  },
  {
    subcategory_id: "entertainment_business",
    name: "エンタメ事業・興行",
    description: "イベント企画、興行運営、エンターテインメントビジネス",
    parent_category_id: "media_entertainment_industry",
    icon: "🎭",
    display_order: 5
  },

  // 物流・運輸業界
  {
    subcategory_id: "logistics_optimization",
    name: "物流最適化・効率化",
    description: "配送最適化、在庫管理、ラストワンマイル",
    parent_category_id: "logistics_transportation_industry",
    icon: "📦",
    display_order: 1
  },
  {
    subcategory_id: "warehouse_management",
    name: "倉庫管理・自動化",
    description: "倉庫運営、WMS、自動化・ロボティクス",
    parent_category_id: "logistics_transportation_industry",
    icon: "🏭",
    display_order: 2
  },
  {
    subcategory_id: "transportation_planning",
    name: "輸送計画・ネットワーク設計",
    description: "輸送ネットワーク設計、ルート最適化、モーダルシフト",
    parent_category_id: "logistics_transportation_industry",
    icon: "🗺️",
    display_order: 3
  },
  {
    subcategory_id: "logistics_technology",
    name: "物流テック・DX",
    description: "物流DX、IoT活用、データ分析",
    parent_category_id: "logistics_transportation_industry",
    icon: "💻",
    display_order: 4
  },
  {
    subcategory_id: "global_logistics",
    name: "国際物流・貿易",
    description: "国際輸送、通関業務、グローバルSCM",
    parent_category_id: "logistics_transportation_industry",
    icon: "🌍",
    display_order: 5
  },

  // 公共・行政業界
  {
    subcategory_id: "public_policy",
    name: "政策立案・行政企画",
    description: "政策設計、行政計画、規制・制度設計",
    parent_category_id: "public_sector_industry",
    icon: "📋",
    display_order: 1
  },
  {
    subcategory_id: "public_service_delivery",
    name: "公共サービス提供",
    description: "住民サービス、窓口業務、サービス向上",
    parent_category_id: "public_sector_industry",
    icon: "🏛️",
    display_order: 2
  },
  {
    subcategory_id: "digital_government",
    name: "デジタル行政・DX",
    description: "行政DX、電子政府、マイナンバー活用",
    parent_category_id: "public_sector_industry",
    icon: "💻",
    display_order: 3
  },
  {
    subcategory_id: "public_finance",
    name: "公共財政・予算管理",
    description: "予算編成、財政管理、公会計",
    parent_category_id: "public_sector_industry",
    icon: "💰",
    display_order: 4
  },
  {
    subcategory_id: "regional_development",
    name: "地域振興・まちづくり",
    description: "地域活性化、都市計画、まちづくり",
    parent_category_id: "public_sector_industry",
    icon: "🌆",
    display_order: 5
  }
]

export async function POST() {
  try {
    console.log('🔄 業界別カテゴリーのサブカテゴリー一括追加を開始します...')

    let successCount = 0
    let errorCount = 0
    const results: Array<{
      subcategory_id: string
      name: string
      parent_category_id: string
      status: 'success' | 'error'
      message?: string
    }> = []

    // 各サブカテゴリーを順次追加
    for (const subcategory of industrySubcategories) {
      try {
        console.log(`🔄 追加中: ${subcategory.name} (${subcategory.subcategory_id})`)
        
        const { error: createError } = await supabaseAdmin
          .from('subcategories')
          .insert({
            subcategory_id: subcategory.subcategory_id,
            name: subcategory.name,
            description: subcategory.description,
            parent_category_id: subcategory.parent_category_id,
            icon: subcategory.icon,
            display_order: subcategory.display_order,
            is_active: true,
            is_visible: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          throw new Error(createError.message)
        }

        successCount++
        results.push({
          subcategory_id: subcategory.subcategory_id,
          name: subcategory.name,
          parent_category_id: subcategory.parent_category_id,
          status: 'success'
        })
        console.log(`✅ 追加成功: ${subcategory.name}`)

      } catch (error) {
        errorCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ 追加失敗 "${subcategory.name}": ${errorMessage}`)
        results.push({
          subcategory_id: subcategory.subcategory_id,
          name: subcategory.name,
          parent_category_id: subcategory.parent_category_id,
          status: 'error',
          message: errorMessage
        })
      }
    }

    console.log(`✅ 一括追加完了! 成功: ${successCount}件, 失敗: ${errorCount}件`)

    // 業界別の追加結果サマリー
    const industrySummary: Record<string, number> = {}
    results.filter(r => r.status === 'success').forEach(r => {
      industrySummary[r.parent_category_id] = (industrySummary[r.parent_category_id] || 0) + 1
    })

    console.log('\n📋 業界別追加サマリー:')
    Object.entries(industrySummary).forEach(([industry, count]) => {
      console.log(`  - ${industry}: ${count}個`)
    })

    return NextResponse.json({
      message: '業界別サブカテゴリーの一括追加が完了しました',
      summary: {
        totalAttempted: industrySubcategories.length,
        successCount,
        errorCount,
        industryCount: Object.keys(industrySummary).length
      },
      industrySummary,
      results
    })

  } catch (error) {
    console.error('業界別サブカテゴリー一括追加API エラー:', error)
    return NextResponse.json(
      { 
        error: '業界別サブカテゴリーの一括追加に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}