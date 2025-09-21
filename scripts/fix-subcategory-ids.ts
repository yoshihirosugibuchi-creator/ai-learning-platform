/**
 * ALEカテゴリー一覧PDFに基づいてサブカテゴリーIDを正しい英語IDに修正
 * 現在のDB: 日本語ID（例: "財務分析_企業価値評価"）
 * 正しいID: 英語ID（例: "financial_analysis_valuation"）
 */

import { config } from 'dotenv'
config()

import { createClient } from '@supabase/supabase-js'

// 環境変数から直接読み込み
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// PDFから抽出したサブカテゴリーIDマッピング
const subcategoryIdMapping = {
  // Communication & Presentation
  "結論ファースト_構造化思考": "conclusion_first_structured_thinking",
  "資料作成_可視化技術": "document_visualization_tech",
  "会議運営_ファシリテーション": "meeting_facilitation",
  "交渉_説得技術": "negotiation_persuasion",

  // Logical Thinking & Problem Solving  
  "構造化思考mece_ロジックツリー": "structured_thinking_mece",
  "仮説検証_本質追求": "hypothesis_verification",
  "定量分析_統計解析": "quantitative_analysis_statistics",
  "行動経済学_意思決定理論": "behavioral_economics",
  "ベンチマーキング_競合分析": "benchmarking_competitive_analysis",

  // Strategy & Management
  "経営戦略_事業戦略": "business_strategy",
  "競争戦略_フレームワーク": "competitive_strategy_frameworks",
  "新事業開発_イノベーション": "new_business_innovation",
  "esg_サステナビリティ経営": "esg_sustainability",

  // Finance
  "財務分析_企業価値評価": "financial_analysis_valuation",
  "投資判断_リスク管理": "investment_risk_management",
  "事業計画_資金調達": "business_planning_funding",
  "管理会計_kpi設計": "management_accounting_kpi",

  // Marketing & Sales
  "顧客分析_セグメンテーション": "customer_analysis_segmentation",
  "ブランディング_ポジショニング": "branding_positioning",
  "デジタルマーケティング": "digital_marketing",
  "営業戦略_crm": "sales_strategy_crm",

  // Leadership & HR
  "チームマネジメント_モチベーション": "team_management_motivation",
  "タレントマネジメント_育成": "talent_management_development",
  "組織開発_変革リーダーシップ": "organizational_development_leadership",
  "人事戦略_働き方改革": "hr_strategy_workstyle",

  // AI & Digital Utilization
  "ai_機械学習活用": "ai_ml_utilization",
  "プロンプトエンジニアリング": "prompt_engineering",
  "dx戦略_デジタル変革": "dx_strategy_transformation",
  "データドリブン経営": "data_driven_management",
  "iot_自動化技術": "iot_automation",

  // Project & Operations
  "プロジェクト設計_wbs": "project_design_wbs",
  "スケジュール_リソース管理": "schedule_resource_management",
  "ステークホルダー管理": "stakeholder_management",
  "業務効率化_時間管理": "business_efficiency_time",

  // Business Process Analysis
  "業務分析_要件定義": "business_analysis_requirements",
  "プロセス設計_最適化": "process_design_optimization",
  "サプライチェーン管理": "supply_chain_management",
  "業務システム設計": "business_system_design",
  "bpr_業務改革": "bpr_business_reform",

  // Risk & Crisis Management
  "企業リスク管理": "corporate_risk_management",
  "危機管理_bcp": "crisis_management_bcp",
  "コンプライアンス_内部統制": "compliance_internal_control",
  "情報セキュリティ": "information_security",
  "サステナビリティリスク": "sustainability_risk",

  // Consulting Industry
  "ケース面接_構造化思考": "case_interview_structured",
  "仮説思考_イシューツリー": "hypothesis_thinking_issue",
  "ストーリーライン構築": "storyline_construction",
  "ステークホルダー分析": "stakeholder_analysis",
  "複数ステークホルダー調整": "multi_stakeholder_coordination",
  "プロジェクト炎上対応_リカバリー": "project_recovery",
  "変革リーダーシップ": "transformation_leadership",
  "デジタル変革支援": "digital_transformation_support",
  "manda_pmi支援": "ma_pmi_support",
  "オペレーション改革": "operation_reform",
  "規制業界対応金融_製薬等": "regulated_industry",
  "業界ベストプラクティス活用": "industry_best_practices",
  "業界動向_競合分析": "industry_trend_analysis",
  "rfp対応_提案書作成": "rfp_proposal",
  "経営層プレゼン": "executive_presentation",
  "経営課題ヒアリング_課題設定": "business_issue_hearing",
  "継続案件獲得_拡販戦略": "continuous_sales_strategy",

  // SI Industry
  "要件定義_業務分析": "requirements_business_analysis",
  "it戦略立案": "it_strategy_planning",
  "rfp作成_ベンダー管理": "rfp_vendor_management",
  "siプロジェクト管理": "si_project_management",
  "多階層ベンダー管理": "multi_tier_vendor",
  "リスク管理_品質管理": "risk_quality_management",
  "システム導入_移行管理": "system_migration",
  "dx推進支援": "dx_promotion_support",
  "技術的実現性評価": "technical_feasibility",
  "レガシーシステム連携": "legacy_integration",
  "技術営業_提案活動": "technical_sales",
  "顧客要求分析": "customer_requirement",
  "長期パートナーシップ構築": "long_term_partnership",
  "契約形態_価格設定戦略": "contract_pricing",

  // Trading Company Industry
  "商品知識_市場分析": "commodity_market_analysis",
  "商品先物_デリバティブ活用": "commodity_derivatives",
  "価格交渉_リスクヘッジ": "price_negotiation_hedge",
  "品質管理_検査_保険": "quality_inspection_insurance",
  "新規事業開拓": "new_business_development",
  "出資先企業経営参画": "investment_participation",
  "事業ポートフォリオ管理": "portfolio_management",
  "海外市場開拓": "overseas_market_development",
  "多国間三国間取引": "multilateral_trade",
  "異文化コミュニケーション": "cross_cultural_communication",
  "現地法人運営": "local_subsidiary_management",
  "貿易ファイナンス": "trade_finance",
  "トレードファイナンス組成": "trade_finance_structuring",
  "為替_金利リスク管理": "fx_interest_rate_risk",
  "カントリーリスク分析": "country_risk_analysis"
}

async function fixSubcategoryIds() {
  console.log('🔄 サブカテゴリーIDの修正を開始します...')

  try {
    // 1. 現在のサブカテゴリーを取得
    const { data: currentSubcategories, error: fetchError } = await supabase
      .from('subcategories')
      .select('subcategory_id, name, parent_category_id')

    if (fetchError) {
      throw new Error(`データ取得エラー: ${fetchError.message}`)
    }

    console.log(`📊 現在のサブカテゴリー数: ${currentSubcategories?.length}`)

    // 2. 各サブカテゴリーIDを修正
    let updateCount = 0
    let skipCount = 0

    for (const subcategory of currentSubcategories || []) {
      const correctId = subcategoryIdMapping[subcategory.subcategory_id as keyof typeof subcategoryIdMapping]
      
      if (correctId && correctId !== subcategory.subcategory_id) {
        console.log(`🔄 修正中: "${subcategory.subcategory_id}" → "${correctId}"`)
        
        // IDを更新
        const { error: updateError } = await supabase
          .from('subcategories')
          .update({ 
            subcategory_id: correctId,
            updated_at: new Date().toISOString()
          })
          .eq('subcategory_id', subcategory.subcategory_id)

        if (updateError) {
          console.error(`❌ 更新失敗 "${subcategory.subcategory_id}": ${updateError.message}`)
        } else {
          updateCount++
        }
      } else {
        skipCount++
        if (!correctId) {
          console.log(`⚠️  マッピングなし: "${subcategory.subcategory_id}"`)
        }
      }
    }

    console.log(`✅ 修正完了! 更新: ${updateCount}件, スキップ: ${skipCount}件`)

    // 3. 修正後の状況を確認
    const { data: updatedSubcategories, error: verifyError } = await supabase
      .from('subcategories')
      .select('subcategory_id, name')
      .order('parent_category_id')
      .order('display_order')

    if (verifyError) {
      throw new Error(`確認エラー: ${verifyError.message}`)
    }

    console.log('\n📋 修正後のサブカテゴリーID一覧:')
    updatedSubcategories?.forEach(sub => {
      console.log(`  - ${sub.subcategory_id} (${sub.name})`)
    })

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

// 実行
fixSubcategoryIds()
  .then(() => {
    console.log('✅ サブカテゴリーID修正が完了しました')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 修正プロセスでエラーが発生しました:', error)
    process.exit(1)
  })