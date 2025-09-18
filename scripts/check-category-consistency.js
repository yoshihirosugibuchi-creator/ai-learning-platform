const fs = require('fs');
const path = require('path');

function checkCategoryConsistency() {
  console.log('🔍 Checking category consistency...\n');
  
  // 1. 問題データを読み込み
  const questionsPath = path.join(__dirname, '../public/questions.json');
  const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const questions = data.questions;
  
  // 2. カテゴリーマスタを読み込み（簡易的にファイルから抽出）
  const categoriesPath = path.join(__dirname, '../lib/categories.ts');
  const categoriesContent = fs.readFileSync(categoriesPath, 'utf8');
  
  // 業界カテゴリー定義を抽出
  const industryDefinitions = {
    'consulting_industry': [
      'ケース面接・構造化思考',
      '仮説思考・イシューツリー', 
      'ストーリーライン構築',
      'ステークホルダー分析',
      '複数ステークホルダー調整',
      'プロジェクト炎上対応・リカバリー',
      '変革リーダーシップ',
      'デジタル変革支援',
      'M&A・PMI支援',
      'オペレーション改革',
      '規制業界対応（金融・製薬等）'
    ],
    'si_industry': [
      '要件定義・業務分析',
      'IT戦略立案',
      'RFP作成・ベンダー管理',
      'SIプロジェクト管理',
      '多階層ベンダー管理',
      'リスク管理・品質管理',
      'システム導入・移行管理',
      'DX推進支援'
    ],
    'trading_company_industry': [
      '商品知識・市場分析',
      '商品先物・デリバティブ活用',
      '価格交渉・リスクヘッジ',
      '新規事業開拓',
      '出資先企業経営参画',
      '海外市場開拓',
      '貿易ファイナンス'
    ]
  };
  
  // 3. 実際の問題データから業界サブカテゴリーを抽出
  const actualSubcategories = {};
  questions.forEach(question => {
    if (['consulting_industry', 'si_industry', 'trading_company_industry'].includes(question.category)) {
      if (!actualSubcategories[question.category]) {
        actualSubcategories[question.category] = new Set();
      }
      if (question.subcategory) {
        actualSubcategories[question.category].add(question.subcategory);
      }
    }
  });
  
  // 4. サブカテゴリーIDマッピングをチェック
  const subcategoryIdMappings = {};
  questions.forEach(question => {
    if (question.subcategory && question.subcategory_id) {
      subcategoryIdMappings[question.subcategory] = question.subcategory_id;
    }
  });
  
  // 5. 整合性チェック結果
  console.log('📊 Category Consistency Check Results:\n');
  
  Object.keys(industryDefinitions).forEach(categoryId => {
    console.log(`\n🏢 ${categoryId.toUpperCase()}:`);
    
    const definedSubs = new Set(industryDefinitions[categoryId]);
    const actualSubs = actualSubcategories[categoryId] || new Set();
    
    console.log(`  📋 Defined in master: ${definedSubs.size} subcategories`);
    console.log(`  💾 Actual in data: ${actualSubs.size} subcategories`);
    
    // マスタにあるが実データにない
    const missingInData = [...definedSubs].filter(sub => !actualSubs.has(sub));
    if (missingInData.length > 0) {
      console.log(`  ❌ Missing in actual data: ${missingInData.length}`);
      missingInData.forEach(sub => console.log(`     - "${sub}"`));
    }
    
    // 実データにあるがマスタにない
    const extraInData = [...actualSubs].filter(sub => !definedSubs.has(sub));
    if (extraInData.length > 0) {
      console.log(`  ⚠️ Extra in actual data: ${extraInData.length}`);
      extraInData.forEach(sub => console.log(`     - "${sub}"`));
    }
    
    // サブカテゴリーIDマッピングチェック
    const missingIdMappings = [...actualSubs].filter(sub => !subcategoryIdMappings[sub]);
    if (missingIdMappings.length > 0) {
      console.log(`  🆔 Missing subcategory_id mappings: ${missingIdMappings.length}`);
      missingIdMappings.forEach(sub => console.log(`     - "${sub}"`));
    }
    
    if (missingInData.length === 0 && extraInData.length === 0 && missingIdMappings.length === 0) {
      console.log(`  ✅ Perfect consistency!`);
    }
  });
  
  console.log('\n📈 Summary:');
  console.log(`Total industry subcategories in data: ${Object.values(subcategoryIdMappings).length}`);
  console.log(`Categories checked: ${Object.keys(industryDefinitions).length}`);
}

// スクリプト実行
checkCategoryConsistency();