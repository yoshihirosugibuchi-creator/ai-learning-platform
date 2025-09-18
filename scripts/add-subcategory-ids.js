#!/usr/bin/env node

/**
 * クイズデータにsubcategory_idフィールドを追加するスクリプト
 */

const fs = require('fs');
const path = require('path');

// サブカテゴリー名からIDへのマッピング
const subcategoryNameToIdMap = {
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
  
  // 追加のサブカテゴリー
  '競争戦略・フレームワーク': 'competitive_strategy_frameworks',
  '経営戦略・事業戦略': 'business_strategy_management',
  '資料作成・可視化技術': 'document_visualization_skills',
  'チームマネジメント・モチベーション': 'team_management_motivation',
  'プロジェクト設計・WBS': 'project_design_wbs',
  'ブランディング・ポジショニング': 'branding_positioning',
  '会議運営・ファシリテーション': 'meeting_facilitation_management',
  '企業リスク管理': 'corporate_risk_management',
  '定量分析・統計解析': 'quantitative_analysis_statistics',
  '組織開発・変革リーダーシップ': 'organizational_development_leadership',
  'スケジュール・リソース管理': 'schedule_resource_management',
  'プロセス設計・最適化': 'process_design_optimization',
  'AI・機械学習活用': 'ai_machine_learning_application',
  '結論ファースト・構造化思考': 'conclusion_first_structured_thinking',
  '構造化思考（MECE・ロジックツリー）': 'structured_thinking_mece_logic',
  '仮説検証・本質追求': 'hypothesis_validation_essence',
  '行動経済学・意思決定理論': 'behavioral_economics_decision_theory',
  '新事業開発・イノベーション': 'new_business_development_innovation',
  'ESG・サステナビリティ経営': 'esg_sustainability_management',
  '顧客分析・セグメンテーション': 'customer_analysis_segmentation',
  'デジタルマーケティング': 'digital_marketing',
  '営業戦略・CRM': 'sales_strategy_crm',
  'タレントマネジメント・育成': 'talent_management_development',
  '人事戦略・働き方改革': 'hr_strategy_work_reform',
  'AI基礎・業務活用': 'ai_basics_business_application',
  'DX戦略・デジタル変革': 'dx_strategy_digital_transformation',
  'データドリブン経営': 'data_driven_management',
  'IoT・自動化技術': 'iot_automation_technology',
  'ステークホルダー管理': 'stakeholder_management',
  '業務効率化・時間管理': 'business_efficiency_time_management',
  '業務分析・要件定義': 'business_analysis_requirements',
  '業務システム設計': 'business_system_design',
  'BPR・業務改革': 'bpr_business_process_reengineering',
  '危機管理・BCP': 'crisis_management_bcp',
  '情報セキュリティ': 'information_security',
  'サステナビリティリスク': 'sustainability_risk',
  'ベンチマーキング・競合分析': 'benchmarking_competitive_analysis',
  'プロンプトエンジニアリング': 'prompt_engineering',
  'ケース面接・構造化思考': 'case_interview_structured_thinking',
  '仮説思考・イシューツリー': 'hypothesis_thinking_issue_tree',
  'ストーリーライン構築': 'storyline_construction',
  'ステークホルダー分析': 'stakeholder_analysis',
  '複数ステークホルダー調整': 'multi_stakeholder_coordination',
  'プロジェクト炎上対応・リカバリー': 'project_crisis_recovery',
  '変革リーダーシップ': 'transformation_leadership',
  'デジタル変革支援': 'digital_transformation_support',
  'M&A・PMI支援': 'ma_pmi_support',
  'オペレーション改革': 'operation_reform',
  '規制業界対応（金融・製薬等）': 'regulated_industry_compliance',
  '要件定義・業務分析': 'requirements_business_analysis',
  'IT戦略立案': 'it_strategy_planning',
  'RFP作成・ベンダー管理': 'rfp_vendor_management',
  'SIプロジェクト管理': 'si_project_management',
  '多階層ベンダー管理': 'multi_tier_vendor_management',
  'リスク管理・品質管理': 'risk_quality_management',
  'システム導入・移行管理': 'system_implementation_migration',
  'DX推進支援': 'dx_promotion_support',
  '商品知識・市場分析': 'product_knowledge_market_analysis',
  '商品先物・デリバティブ活用': 'commodity_futures_derivatives',
  '価格交渉・リスクヘッジ': 'price_negotiation_risk_hedge',
  '新規事業開拓': 'new_business_development',
  '出資先企業経営参画': 'portfolio_company_management',
  '海外市場開拓': 'overseas_market_development',
  '貿易ファイナンス': 'trade_finance',
  
  // category_level問題は特別処理（メインカテゴリーを使用）
  'category_level': 'category_level'
};

function processQuizData() {
  const questionsPath = path.join(__dirname, '../public/questions.json');
  
  // バックアップを作成
  const backupPath = path.join(__dirname, `../public/questions_backup_${Date.now()}.json`);
  
  try {
    // 元ファイルを読み込み
    const rawData = fs.readFileSync(questionsPath, 'utf8');
    const data = JSON.parse(rawData);
    
    // バックアップを保存
    fs.writeFileSync(backupPath, rawData, 'utf8');
    console.log(`✅ Backup created: ${backupPath}`);
    
    let updatedCount = 0;
    let unknownSubcategories = new Set();
    
    // 各問題にsubcategory_idを追加
    data.questions.forEach((question, index) => {
      if (question.subcategory) {
        const subcategoryId = subcategoryNameToIdMap[question.subcategory];
        if (subcategoryId) {
          question.subcategory_id = subcategoryId;
          updatedCount++;
          console.log(`✅ Question ${question.id}: "${question.subcategory}" -> "${subcategoryId}"`);
        } else {
          unknownSubcategories.add(question.subcategory);
          console.warn(`⚠️ Question ${question.id}: Unknown subcategory "${question.subcategory}"`);
        }
      }
    });
    
    // 更新されたデータを保存
    fs.writeFileSync(questionsPath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`\n🎉 Quiz data update completed!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total questions: ${data.questions.length}`);
    console.log(`   - Updated with subcategory_id: ${updatedCount}`);
    console.log(`   - Unknown subcategories: ${unknownSubcategories.size}`);
    
    if (unknownSubcategories.size > 0) {
      console.log(`\n⚠️ Unknown subcategories found:`);
      unknownSubcategories.forEach(sub => console.log(`   - "${sub}"`));
      console.log(`\nPlease add these to the subcategoryNameToIdMap.`);
    }
    
  } catch (error) {
    console.error('❌ Error processing quiz data:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  processQuizData();
}

module.exports = { processQuizData };