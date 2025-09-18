// ID 1-20の古いクイズ問題のカテゴリー・サブカテゴリーを修正するスクリプト

const fs = require('fs');
const path = require('path');

// 現在のカテゴリー体系
const categoryMapping = {
  // 旧カテゴリー -> 新カテゴリーのマッピング
  'analytical_problem_solving': {
    // 財務・会計関連
    '財務・会計分析': {
      category: 'finance',
      subcategory: '財務分析・企業価値評価'
    },
    // 論理的思考関連
    '論理的思考・分析': {
      category: 'logical_thinking_problem_solving',
      subcategory: '構造化思考（MECE・ロジックツリー）'
    },
    // データ分析関連
    'データ分析・解釈': {
      category: 'logical_thinking_problem_solving',
      subcategory: '定量分析・統計解析'
    }
  },
  'communication_presentation': {
    // プレゼンテーション関連
    'プレゼンテーション': {
      category: 'communication_presentation',
      subcategory: '資料作成・可視化技術'
    },
    // セールス・マーケティング関連
    'セールス・マーケティング': {
      category: 'marketing_sales',
      subcategory: 'ブランディング・ポジショニング'
    },
    // 交渉・調整関連
    '交渉・調整': {
      category: 'communication_presentation',
      subcategory: '交渉・説得技術'
    }
  },
  'leadership_management': {
    // チーム運営関連
    'チーム運営・人材育成': {
      category: 'leadership_hr',
      subcategory: 'チームマネジメント・モチベーション'
    },
    // プロジェクトマネジメント関連
    'プロジェクトマネジメント': {
      category: 'project_operations',
      subcategory: 'プロジェクト設計・WBS'
    },
    // 組織開発関連
    '組織開発・変革': {
      category: 'leadership_hr',
      subcategory: '組織開発・変革リーダーシップ'
    }
  },
  'business_strategy': {
    // 事業戦略関連
    '事業戦略・企画': {
      category: 'strategy_management',
      subcategory: '経営戦略・事業戦略'
    },
    // オペレーション関連
    'オペレーション・業務改善': {
      category: 'business_process_analysis',
      subcategory: 'プロセス設計・最適化'
    },
    // 市場分析関連
    '市場分析・競合調査': {
      category: 'strategy_management',
      subcategory: '競争戦略・フレームワーク'
    }
  }
};

// 問題内容に基づく個別マッピング（より正確な分類のため）
const questionSpecificMapping = {
  1: { // ROE関連
    category: 'finance',
    subcategory: '財務分析・企業価値評価'
  },
  2: { // 3C分析
    category: 'strategy_management',
    subcategory: '競争戦略・フレームワーク'
  },
  3: { // SWOT分析
    category: 'strategy_management',
    subcategory: '経営戦略・事業戦略'
  },
  4: { // プレゼンテーション
    category: 'communication_presentation',
    subcategory: '資料作成・可視化技術'
  },
  5: { // チームマネジメント
    category: 'leadership_hr',
    subcategory: 'チームマネジメント・モチベーション'
  },
  6: { // DCF法
    category: 'finance',
    subcategory: '投資判断・リスク管理'
  },
  7: { // PDCA
    category: 'project_operations',
    subcategory: 'プロジェクト設計・WBS'
  },
  8: { // マーケティングミックス
    category: 'marketing_sales',
    subcategory: 'ブランディング・ポジショニング'
  },
  9: { // 損益分岐点
    category: 'finance',
    subcategory: '管理会計・KPI設計'
  },
  10: { // コミュニケーション
    category: 'communication_presentation',
    subcategory: '会議運営・ファシリテーション'
  },
  11: { // リスク管理
    category: 'risk_crisis_management',
    subcategory: '企業リスク管理'
  },
  12: { // データ分析
    category: 'logical_thinking_problem_solving',
    subcategory: '定量分析・統計解析'
  },
  13: { // 組織変革
    category: 'leadership_hr',
    subcategory: '組織開発・変革リーダーシップ'
  },
  14: { // 競合分析
    category: 'strategy_management',
    subcategory: '競争戦略・フレームワーク'
  },
  15: { // プロジェクト管理
    category: 'project_operations',
    subcategory: 'スケジュール・リソース管理'
  },
  16: { // 財務指標
    category: 'finance',
    subcategory: '財務分析・企業価値評価'
  },
  17: { // ブランド戦略
    category: 'marketing_sales',
    subcategory: 'ブランディング・ポジショニング'
  },
  18: { // 業務プロセス
    category: 'business_process_analysis',
    subcategory: 'プロセス設計・最適化'
  },
  19: { // 交渉術
    category: 'communication_presentation',
    subcategory: '交渉・説得技術'
  },
  20: { // AI活用
    category: 'ai_digital_utilization',
    subcategory: 'AI・機械学習活用'
  }
};

function fixLegacyQuestions() {
  console.log('🔧 Starting to fix legacy questions (ID 1-20)...');
  
  // questions.jsonを読み込み
  const questionsPath = path.join(__dirname, '../public/questions.json');
  
  if (!fs.existsSync(questionsPath)) {
    console.error('❌ questions.json file not found');
    return;
  }
  
  const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  let fixedCount = 0;
  
  // ID 1-20の問題を修正
  questionsData.questions = questionsData.questions.map(question => {
    if (question.id >= 1 && question.id <= 20) {
      const mapping = questionSpecificMapping[question.id];
      
      if (mapping) {
        const oldCategory = question.category;
        const oldSubcategory = question.subcategory;
        
        question.category = mapping.category;
        question.subcategory = mapping.subcategory;
        
        console.log(`✅ Fixed Question ${question.id}:`);
        console.log(`   Category: ${oldCategory} → ${question.category}`);
        console.log(`   Subcategory: ${oldSubcategory} → ${question.subcategory}`);
        
        fixedCount++;
      } else {
        console.log(`⚠️  No mapping found for Question ${question.id}`);
      }
    }
    
    return question;
  });
  
  // バックアップを作成
  const backupPath = path.join(__dirname, '../backups', `questions-backup-before-fix-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, fs.readFileSync(questionsPath, 'utf8'));
  console.log(`📦 Backup created: ${backupPath}`);
  
  // 修正されたデータを保存
  fs.writeFileSync(questionsPath, JSON.stringify(questionsData, null, 2));
  
  console.log(`🎯 Fixed ${fixedCount} questions successfully!`);
  console.log('✅ Legacy questions update completed.');
}

// スクリプト実行
fixLegacyQuestions();