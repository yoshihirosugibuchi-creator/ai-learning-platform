/**
 * Category mapping utilities
 *
 * サブカテゴリー名はDBから動的に取得されます（subcategory-cache.ts経由）
 * ハードコードはフォールバック用として保持
 */

import { getSubcategoryNameFromCache, isSubcategoryCacheInitialized } from './subcategory-cache'

export const categoryDisplayNames: Record<string, string> = {
  'consulting_industry': 'コンサルティング業界',
  'education_training_industry': '教育・研修業界',
  'energy_infrastructure_industry': 'エネルギー・インフラ業界',
  'financial_services_industry': '金融・保険業界',
  'healthcare_industry': 'ヘルスケア・医療業界',
  'logistics_transportation_industry': '物流・運輸業界',
  'manufacturing_industry': '製造業界',
  'media_entertainment_industry': 'メディア・エンタメ業界',
  'public_sector_industry': '公共・行政業界',
  'real_estate_construction_industry': '不動産・建設業界',
  'retail_consumer_industry': '小売・消費財業界',
  'saas_product_industry': 'SaaS・プロダクト業界',
  'si_industry': 'SI（システムインテグレーション）業界',
  'trading_company_industry': '商社業界',
  'ai_digital_utilization': 'AI・デジタル活用',
  'business_process_analysis': 'ビジネスプロセス・業務分析',
  'communication_presentation': 'コミュニケーション・プレゼンテーション',
  'finance': '財務・ファイナンス',
  'leadership_hr': 'リーダーシップ・人事',
  'logical_thinking_problem_solving': '論理的思考・問題解決',
  'marketing_sales': 'マーケティング・営業',
  'project_operations': 'プロジェクト・業務管理',
  'risk_crisis_management': 'リスク・危機管理',
  'strategy_management': '戦略・経営',
}

export const subcategoryDisplayNames: Record<string, string> = {
  'ai_overview': 'AI概論',
  'ai_ml_utilization': 'AI・機械学習活用',
  'data_driven_management': 'データドリブン経営',
  'dx_strategy_transformation': 'DX戦略・デジタル変革',
  'iot_automation': 'IoT・自動化技術',
  'prompt_engineering': 'プロンプトエンジニアリング',
  'bpr_business_reform': 'BPR・業務改革',
  'business_analysis_requirements': '業務分析・要件定義',
  'business_system_design': '業務システム設計',
  'process_design_optimization': 'プロセス設計・最適化',
  'supply_chain_management': 'サプライチェーン管理',
  'conclusion_first_structured_thinking': '結論ファースト・構造化思考',
  'document_visualization_tech': '資料作成・可視化技術',
  'meeting_facilitation': '会議運営・ファシリテーション',
  'negotiation_persuasion': '交渉・説得技術',
  'business_issue_hearing': '経営課題ヒアリング・課題設定',
  'case_interview_structured': 'ケース面接・構造化思考',
  'continuous_sales_strategy': '継続案件獲得・拡販戦略',
  'digital_transformation_support': 'デジタル変革支援',
  'executive_presentation': '経営層プレゼン',
  'hypothesis_thinking_issue': '仮説思考・イシューツリー',
  'industry_best_practices': '業界ベストプラクティス活用',
  'industry_trend_analysis': '業界動向・競合分析',
  'ma_pmi_support': 'M&A・PMI支援',
  'multi_stakeholder_coordination': '複数ステークホルダー調整',
  'operation_reform': 'オペレーション改革',
  'project_recovery': 'プロジェクト炎上対応・リカバリー',
  'regulated_industry': '規制業界対応（金融・製薬等）',
  'rfp_proposal': 'RFP対応・提案書作成',
  'stakeholder_analysis': 'ステークホルダー分析',
  'storyline_construction': 'ストーリーライン構築',
  'transformation_leadership': '変革リーダーシップ',
  'corporate_training': '企業研修・人材育成',
  'educational_assessment': '教育評価・アセスメント',
  'educational_management': '教育機関運営・管理',
  'educational_program_design': '教育プログラム設計',
  'learning_technology': '学習技術・EdTech',
  'energy_strategy': 'エネルギー戦略・政策',
  'infrastructure_investment': 'インフラ投資・事業開発',
  'infrastructure_management': 'インフラ運営・管理',
  'renewable_energy': '再生可能エネルギー',
  'smart_grid': 'スマートグリッド・IoT',
  'business_planning_funding': '事業計画・資金調達',
  'financial_analysis_valuation': '財務分析・企業価値評価',
  'investment_risk_management': '投資判断・リスク管理',
  'management_accounting_kpi': '管理会計・KPI設計',
  'credit_risk_management': '与信・リスク管理',
  'financial_products': '金融商品・サービス設計',
  'fintech_innovation': 'フィンテック・デジタル化',
  'insurance_underwriting': '保険・アンダーライティング',
  'regulatory_compliance': '金融規制・コンプライアンス',
  'clinical_operations': '医療業務・臨床オペレーション',
  'healthcare_it': '医療IT・電子カルテ',
  'healthcare_management': '医療経営・病院管理',
  'medical_devices': '医療機器・メドテック',
  'pharmaceutical_development': '医薬品開発・薬事',
  'hr_strategy_workstyle': '人事戦略・働き方改革',
  'organizational_development_leadership': '組織開発・変革リーダーシップ',
  'talent_management_development': 'タレントマネジメント・育成',
  'team_management_motivation': 'チームマネジメント・モチベーション',
  'behavioral_economics': '行動経済学・意思決定理論',
  'benchmarking_competitive_analysis': 'ベンチマーキング・競合分析',
  'hypothesis_verification': '仮説検証・本質追求',
  'quantitative_analysis_statistics': '定量分析・統計解析',
  'structured_thinking_mece': '構造化思考（MECE・ロジックツリー）',
  'global_logistics': '国際物流・貿易',
  'logistics_optimization': '物流最適化・効率化',
  'logistics_technology': '物流テック・DX',
  'transportation_planning': '輸送計画・ネットワーク設計',
  'warehouse_management': '倉庫管理・自動化',
  'lean_manufacturing': 'リーン生産・改善活動',
  'manufacturing_strategy': '製造戦略・事業企画',
  'production_management': '生産管理・計画',
  'quality_management': '品質管理・保証',
  'smart_factory': 'スマートファクトリー・IoT',
  'branding_positioning': 'ブランディング・ポジショニング',
  'customer_analysis_segmentation': '顧客分析・セグメンテーション',
  'digital_marketing': 'デジタルマーケティング',
  'sales_strategy_crm': '営業戦略・CRM',
  'advertising_media': '広告・メディアプランニング',
  'content_production': 'コンテンツ制作・企画',
  'digital_media': 'デジタルメディア・配信',
  'entertainment_business': 'エンタメ事業・興行',
  'ip_management': 'IP・著作権管理',
  'business_efficiency_time': '業務効率化・時間管理',
  'project_design_wbs': 'プロジェクト設計・WBS',
  'schedule_resource_management': 'スケジュール・リソース管理',
  'stakeholder_management': 'ステークホルダー管理',
  'digital_government': 'デジタル行政・DX',
  'public_finance': '公共財政・予算管理',
  'public_policy': '政策立案・行政企画',
  'public_service_delivery': '公共サービス提供',
  'regional_development': '地域振興・まちづくり',
  'construction_management': '建設プロジェクト管理',
  'property_management': '不動産管理・運営',
  'proptech_innovation': 'プロップテック・建設DX',
  'real_estate_development': '不動産開発・企画',
  'real_estate_finance': '不動産ファイナンス・投資',
  'brand_management': 'ブランド管理・マーケティング',
  'consumer_insights': '消費者インサイト・市場調査',
  'merchandising': 'マーチャンダイジング',
  'omnichannel_strategy': 'オムニチャネル戦略',
  'retail_operations': '店舗運営・小売業務',
  'compliance_internal_control': 'コンプライアンス・内部統制',
  'corporate_risk_management': '企業リスク管理',
  'crisis_management_bcp': '危機管理・BCP',
  'information_security': '情報セキュリティ',
  'sustainability_risk': 'サステナビリティリスク',
  'customer_success': 'カスタマーサクセス',
  'growth_marketing': 'グロースマーケティング',
  'product_management': 'プロダクトマネジメント',
  'subscription_business': 'サブスクリプション事業運営',
  'user_experience_design': 'UX・UI設計',
  'contract_pricing': '契約形態・価格設定戦略',
  'customer_requirement': '顧客要求分析',
  'dx_promotion_support': 'DX推進支援',
  'it_strategy_planning': 'IT戦略立案',
  'legacy_integration': 'レガシーシステム連携',
  'long_term_partnership': '長期パートナーシップ構築',
  'multi_tier_vendor': '多階層ベンダー管理',
  'requirements_business_analysis': '要件定義・業務分析',
  'rfp_vendor_management': 'RFP作成・ベンダー管理',
  'risk_quality_management': 'リスク管理・品質管理',
  'si_project_management': 'SIプロジェクト管理',
  'system_migration': 'システム導入・移行管理',
  'technical_feasibility': '技術的実現性評価',
  'technical_sales': '技術営業・提案活動',
  'business_strategy': '経営戦略・事業戦略',
  'competitive_strategy_frameworks': '競争戦略・フレームワーク',
  'esg_sustainability': 'ESG・サステナビリティ経営',
  'new_business_innovation': '新事業開発・イノベーション',
  'commodity_derivatives': '商品先物・デリバティブ活用',
  'commodity_market_analysis': '商品知識・市場分析',
  'country_risk_analysis': 'カントリーリスク分析',
  'cross_cultural_communication': '異文化コミュニケーション',
  'fx_interest_rate_risk': '為替・金利リスク管理',
  'investment_participation': '出資先企業経営参画',
  'local_subsidiary_management': '現地法人運営',
  'multilateral_trade': '多国間三国間取引',
  'new_business_development': '新規事業開拓',
  'overseas_market_development': '海外市場開拓',
  'portfolio_management': '事業ポートフォリオ管理',
  'price_negotiation_hedge': '価格交渉・リスクヘッジ',
  'quality_inspection_insurance': '品質管理・検査・保険',
  'trade_finance': '貿易ファイナンス',
  'trade_finance_structuring': 'トレードファイナンス組成',
}

/**
 * Convert category ID to display name
 */
export function getCategoryDisplayName(categoryId: string): string {
  return categoryDisplayNames[categoryId] || categoryId
}

/**
 * Convert subcategory to display name
 * キャッシュ（DBから取得）を優先し、なければハードコードをフォールバック
 */
export function getSubcategoryDisplayName(subcategory: string): string {
  // キャッシュが初期化されていればキャッシュから取得
  if (isSubcategoryCacheInitialized()) {
    const cachedName = getSubcategoryNameFromCache(subcategory)
    if (cachedName) {
      return cachedName
    }
  }

  // フォールバック: ハードコードされたマッピング
  return subcategoryDisplayNames[subcategory] || subcategory
}

/**
 * Map any category (old or new, Japanese or English) to correct main category ID
 */
export function mapToMainCategoryId(categoryInput: string): string {
  // If it's already a main category ID, return it
  const mainCategoryIds = [
    'ai_digital_utilization',
    'business_process_analysis',
    'communication_presentation',
    'finance',
    'leadership_hr',
    'logical_thinking_problem_solving',
    'marketing_sales',
    'project_operations',
    'risk_crisis_management',
    'strategy_management',
  ]
  
  if (mainCategoryIds.includes(categoryInput)) {
    return categoryInput
  }
  
  // Map display name back to ID
  const displayName = getCategoryDisplayName(categoryInput)
  const reverseMap: Record<string, string> = {
    'AI・デジタル活用': 'ai_digital_utilization',
    'ビジネスプロセス・業務分析': 'business_process_analysis',
    'コミュニケーション・プレゼンテーション': 'communication_presentation',
    '財務・ファイナンス': 'finance',
    'リーダーシップ・人事': 'leadership_hr',
    '論理的思考・問題解決': 'logical_thinking_problem_solving',
    'マーケティング・営業': 'marketing_sales',
    'プロジェクト・業務管理': 'project_operations',
    'リスク・危機管理': 'risk_crisis_management',
    '戦略・経営': 'strategy_management',
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
- Categories: 24 (Main: 10, Industry: 14)
- Subcategories: 145
- Last updated: 2025-09-24T13:12:03.706Z
*/