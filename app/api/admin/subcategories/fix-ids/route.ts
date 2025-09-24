import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

// PDFから抽出したサブカテゴリーIDマッピング（日本語ID → 英語ID）
const subcategoryIdMapping: Record<string, string> = {
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

export async function POST() {
  try {
    console.log('🔄 サブカテゴリーIDの修正を開始します...')

    // 1. 現在のサブカテゴリーを取得
    const { data: currentSubcategories, error: fetchError } = await supabase
      .from('subcategories')
      .select('*')

    if (fetchError) {
      throw new Error(`データ取得エラー: ${fetchError.message}`)
    }

    console.log(`📊 現在のサブカテゴリー数: ${currentSubcategories?.length}`)

    let updateCount = 0
    let skipCount = 0
    const results: Array<{
      oldId: string
      newId: string
      status: 'success' | 'error' | 'skipped'
      message?: string
    }> = []

    // 2. 各サブカテゴリーIDを修正
    for (const subcategory of currentSubcategories || []) {
      const correctId = subcategoryIdMapping[subcategory.subcategory_id]
      
      if (correctId && correctId !== subcategory.subcategory_id) {
        console.log(`🔄 修正中: "${subcategory.subcategory_id}" → "${correctId}"`)
        
        try {
          // 1. 新しいIDでレコードを作成
          const { error: insertError } = await supabase
            .from('subcategories')
            .insert({
              subcategory_id: correctId,
              name: subcategory.name,
              description: subcategory.description,
              parent_category_id: subcategory.parent_category_id,
              icon: subcategory.icon,
              display_order: subcategory.display_order,
              is_active: subcategory.is_active,
              is_visible: subcategory.is_visible,
              activation_date: subcategory.activation_date,
              created_at: subcategory.created_at,
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (insertError) {
            throw new Error(`挿入エラー: ${insertError.message}`)
          }

          // 2. 古いレコードを削除
          const { error: deleteError } = await supabase
            .from('subcategories')
            .delete()
            .eq('subcategory_id', subcategory.subcategory_id)

          if (deleteError) {
            // 挿入したレコードを削除してロールバック
            await supabase.from('subcategories').delete().eq('subcategory_id', correctId)
            throw new Error(`削除エラー: ${deleteError.message}`)
          }

          updateCount++
          results.push({
            oldId: subcategory.subcategory_id,
            newId: correctId,
            status: 'success'
          })
          console.log(`✅ 更新成功: "${subcategory.subcategory_id}" → "${correctId}"`)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`❌ 更新失敗 "${subcategory.subcategory_id}": ${errorMessage}`)
          results.push({
            oldId: subcategory.subcategory_id,
            newId: correctId,
            status: 'error',
            message: errorMessage
          })
        }
      } else {
        skipCount++
        results.push({
          oldId: subcategory.subcategory_id,
          newId: correctId || subcategory.subcategory_id,
          status: 'skipped',
          message: correctId ? '既に正しいID' : 'マッピングなし'
        })
        
        if (!correctId) {
          console.log(`⚠️  マッピングなし: "${subcategory.subcategory_id}"`)
        } else {
          console.log(`⏭️  スキップ: "${subcategory.subcategory_id}" (既に正しいID)`)
        }
      }
    }

    console.log(`✅ 修正完了! 更新: ${updateCount}件, スキップ: ${skipCount}件`)

    return NextResponse.json({
      message: 'サブカテゴリーIDの修正が完了しました',
      summary: {
        total: currentSubcategories?.length || 0,
        updated: updateCount,
        skipped: skipCount
      },
      results
    })

  } catch (error) {
    console.error('サブカテゴリーID修正API エラー:', error)
    return NextResponse.json(
      { 
        error: 'サブカテゴリーIDの修正に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}