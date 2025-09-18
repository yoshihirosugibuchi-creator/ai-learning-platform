const fs = require('fs');
const path = require('path');

// サブカテゴリー名からIDへのマッピング（実際のデータに基づく）
const subcategoryNameToIdMap = {
  // コンサルティング業界
  'ケース面接・構造化思考': 'case_interview_structured_thinking',
  '仮説思考・イシューツリー': 'hypothesis_thinking_issue_tree',
  'ストーリーライン構築': 'storyline_construction',
  'ステークホルダー分析': 'stakeholder_analysis',
  'ベンチマーキング・競合分析': 'benchmarking_competitive_analysis',
  'RFP作成・ベンダー管理': 'rfp_vendor_management',
  'M&A・PMI支援': 'ma_pmi_support',
  'DX推進支援': 'dx_promotion_support',
  '仮説検証・本質追求': 'hypothesis_verification_essence_pursuit',
  '定量分析・統計解析': 'quantitative_analysis_statistical_analysis',
  
  // SI業界
  'SIプロジェクト管理': 'si_project_management',
  '業務システム設計': 'business_system_design',
  '要件定義・業務分析': 'requirements_definition_business_analysis',
  'システム導入・移行管理': 'system_implementation_migration_management',
  'リスク管理・品質管理': 'risk_management_quality_control',
  '多階層ベンダー管理': 'multi_layer_vendor_management',
  'デジタル変革支援': 'digital_transformation_support',
  '規制業界対応（金融・製薬等）': 'regulated_industry_compliance',
  '複数ステークホルダー調整': 'multiple_stakeholder_coordination',
  'コンプライアンス・内部統制': 'compliance_internal_control',
  
  // 総合商社業界
  '商品知識・市場分析': 'product_knowledge_market_analysis',
  '貿易ファイナンス': 'trade_finance',
  '商品先物・デリバティブ活用': 'commodity_futures_derivatives',
  '新規事業開拓': 'new_business_development',
  '海外市場開拓': 'overseas_market_development',
  '出資先企業経営参画': 'portfolio_company_management',
  '価格交渉・リスクヘッジ': 'price_negotiation_risk_hedge',
  'サプライチェーン管理': 'supply_chain_management',
  '投資判断・リスク管理': 'investment_decision_risk_management',
  'ESG・サステナビリティ経営': 'esg_sustainability_management'
};

function addIndustrySubcategoryIds() {
  console.log('🔧 Adding subcategory IDs to industry category questions...');
  
  const questionsPath = path.join(__dirname, '../public/questions.json');
  
  // questions.jsonを読み込み
  const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const questionsData = data.questions;
  
  let updatedCount = 0;
  let skipCount = 0;
  
  // 業界カテゴリーの問題のみ処理
  const industryCategories = ['consulting_industry', 'si_industry', 'trading_company_industry'];
  
  questionsData.forEach((question, index) => {
    if (industryCategories.includes(question.category)) {
      console.log(`🔍 Processing industry question ${index + 1}: category=${question.category}, subcategory="${question.subcategory}", has_subcategory_id=${!!question.subcategory_id}`);
      
      if (question.subcategory_id) {
        // 既にサブカテゴリーIDがある場合はスキップ
        skipCount++;
        console.log(`⏭️ Skipping question ${index + 1} - already has subcategory_id: ${question.subcategory_id}`);
        return;
      }
      
      if (question.subcategory) {
        const subcategoryId = subcategoryNameToIdMap[question.subcategory];
        if (subcategoryId) {
          question.subcategory_id = subcategoryId;
          updatedCount++;
          console.log(`✅ Updated question ${index + 1}: ${question.subcategory} -> ${subcategoryId}`);
        } else {
          console.warn(`⚠️ No mapping found for subcategory: "${question.subcategory}" in question ${index + 1}`);
        }
      } else {
        console.warn(`⚠️ No subcategory field in industry question ${index + 1}`);
      }
    }
  });
  
  // 更新されたデータを保存
  data.questions = questionsData;
  fs.writeFileSync(questionsPath, JSON.stringify(data, null, 2));
  
  console.log(`🎯 Industry subcategory ID addition completed!`);
  console.log(`📊 Summary: ${updatedCount} updated, ${skipCount} skipped`);
}

// スクリプト実行
addIndustrySubcategoryIds();