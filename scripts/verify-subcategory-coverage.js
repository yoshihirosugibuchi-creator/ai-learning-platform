/**
 * wisdom_cardsのsubcategory_idがlib/cards.tsのフォールバックでカバーされているか確認
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// lib/cards.tsのフォールバックマッピング（更新後）
const subcategoryDisplayNames = {
  // Communication & Presentation
  'conclusion_first_structured_thinking': '結論ファースト・構造化思考',
  'document_visualization': '資料作成・可視化技術',
  'meeting_facilitation': '会議運営・ファシリテーション',
  'negotiation_persuasion': '交渉・説得技術',
  'executive_presentation': 'プレゼンテーション技術',
  'storyline_construction': 'ストーリーテリング',

  // Logical Thinking & Problem Solving
  'mece_logic_tree': '構造化思考（MECE・ロジックツリー）',
  'structured_thinking_mece': '構造化思考（MECE・ロジックツリー）',
  'hypothesis_verification': '仮説検証・本質追求',
  'quantitative_analysis': '定量分析・統計解析',
  'behavioral_economics': '行動経済学・意思決定理論',
  'benchmarking_competitor_analysis': 'ベンチマーキング・競合分析',
  'hypothesis_thinking_issue': '問題発見・課題設定',

  // Strategy & Management
  'business_strategy': '経営戦略・事業戦略',
  'competitive_strategy': '競争戦略・フレームワーク',
  'competitive_strategy_frameworks': '競争戦略・フレームワーク',
  'new_business_innovation': '新事業開発・イノベーション',
  'esg_sustainability': 'ESG・サステナビリティ経営',
  'industry_trend_analysis': '業界分析・提言',
  'portfolio_management': '事業ポートフォリオ管理',

  // Finance
  'financial_analysis_valuation': '財務分析・企業価値評価',
  'investment_risk_management': '投資判断・リスク管理',
  'business_planning_funding': '事業計画・資金調達',
  'management_accounting_kpi': '管理会計・KPI設計',

  // Marketing & Sales
  'customer_analysis_segmentation': '顧客分析・セグメンテーション',
  'branding_positioning': 'ブランディング・ポジショニング',
  'digital_marketing': 'デジタルマーケティング',
  'sales_strategy_crm': '営業戦略・CRM',
  'customer_success': '顧客体験・サービス設計',

  // Leadership & HR
  'team_management_motivation': 'チームマネジメント・モチベーション',
  'talent_management_development': 'タレントマネジメント・育成',
  'organizational_development_leadership': '組織開発・変革リーダーシップ',
  'hr_strategy_workstyle': '人事戦略・働き方改革',

  // AI & Digital
  'ai_basics_business': 'AI基礎・業務活用',
  'ai_ml_utilization': 'AI・機械学習活用',
  'dx_strategy_transformation': 'DX戦略・デジタル変革',
  'data_driven_management': 'データドリブン経営',
  'iot_automation': 'IoT・自動化技術',

  // Project Management
  'project_design_wbs': 'プロジェクト設計・WBS',
  'schedule_resource_management': 'スケジュール・リソース管理',
  'stakeholder_management': 'ステークホルダー管理',
  'business_efficiency_time': '業務効率化・時間管理',

  // Business Analysis
  'requirements_business_analysis': '業務分析・要件定義',
  'process_design_optimization': 'プロセス設計・最適化',
  'supply_chain_management': 'サプライチェーン管理',
  'business_system_design': '業務システム設計',
  'bpr_business_reform': 'BPR・業務改革',
  'operation_reform': 'オペレーション戦略',
  'quality_management': '品質管理・継続改善',

  // Risk Management
  'corporate_risk_management': '企業リスク管理',
  'crisis_management_bcp': '危機管理・BCP',
  'compliance_internal_control': 'コンプライアンス・内部統制',
  'information_security': '情報セキュリティ',
  'sustainability_risk': 'サステナビリティリスク',

  // Consulting
  'business_issue_hearing': '課題解決アプローチ',
  'client_communication': 'クライアント対応',

  // SI/Engineering
  'technical_feasibility': 'システム設計・アーキテクチャ',
}

async function verify() {
  // wisdom_cardsの全subcategory_idを取得
  const { data: cards } = await supabase
    .from('wisdom_cards')
    .select('subcategory_id')

  const uniqueIds = [...new Set(cards?.map(c => c.subcategory_id).filter(Boolean))]

  console.log('=== カバレッジ確認 ===')
  console.log(`wisdom_cards内のユニークID数: ${uniqueIds.length}`)
  console.log(`フォールバックマッピング数: ${Object.keys(subcategoryDisplayNames).length}`)

  const notCovered = uniqueIds.filter(id => !subcategoryDisplayNames[id])

  if (notCovered.length === 0) {
    console.log('\n✅ 全てのsubcategory_idがフォールバックでカバーされています')
  } else {
    console.log(`\n❌ カバーされていないID: ${notCovered.length}件`)
    notCovered.forEach(id => console.log(`  - ${id}`))
  }

  // 変換結果サンプル
  console.log('\n=== 変換結果サンプル ===')
  uniqueIds.slice(0, 10).forEach(id => {
    const name = subcategoryDisplayNames[id] || id
    console.log(`  ${id} → ${name}`)
  })
}

verify().catch(console.error)
