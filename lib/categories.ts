import { 
  MainCategory, 
  IndustryCategory, 
  Subcategory,
  SkillLevelDefinition, 
  MainCategoryId,
  IndustryCategoryId 
} from './types/category'

// スキルレベル定義
export const skillLevels: SkillLevelDefinition[] = [
  {
    id: 'basic',
    name: '基礎',
    description: '基本概念の理解、基礎スキルの習得',
    targetExperience: '新人〜入社3年目',
    displayOrder: 1
  },
  {
    id: 'intermediate', 
    name: '中級',
    description: '応用スキル、複合的思考、実践的課題解決',
    targetExperience: '入社3-7年目、チームリーダー',
    displayOrder: 2
  },
  {
    id: 'advanced',
    name: '上級', 
    description: '戦略的思考、組織への影響、高度な専門性',
    targetExperience: 'マネージャー、専門家',
    displayOrder: 3
  },
  {
    id: 'expert',
    name: 'エキスパート',
    description: '業界リーダーシップ、イノベーション創出',
    targetExperience: 'シニアマネージャー、業界専門家', 
    displayOrder: 4
  }
]

// 当初設計の10カテゴリーシステム
export const mainCategories: MainCategory[] = [
  {
    id: 'communication_presentation',
    name: 'コミュニケーション・プレゼンテーション',
    description: '効果的な情報伝達と説得技術',
    type: 'main',
    displayOrder: 1,
    subcategories: [
      '結論ファースト・構造化思考',
      '資料作成・可視化技術',
      '会議運営・ファシリテーション',
      '交渉・説得技術'
    ],
    icon: '💬',
    color: '#3B82F6'
  },
  {
    id: 'logical_thinking_problem_solving',
    name: '論理的思考・問題解決',
    description: '体系的な思考法と分析技術',
    type: 'main',
    displayOrder: 2,
    subcategories: [
      '構造化思考（MECE・ロジックツリー）',
      '仮説検証・本質追求',
      '定量分析・統計解析',
      '行動経済学・意思決定理論',
      'ベンチマーキング・競合分析'
    ],
    icon: '🧠',
    color: '#8B5CF6'
  },
  {
    id: 'strategy_management',
    name: '戦略・経営',
    description: '企業戦略と経営の基礎知識',
    type: 'main',
    displayOrder: 3,
    subcategories: [
      '経営戦略・事業戦略',
      '競争戦略・フレームワーク',
      '新事業開発・イノベーション',
      'ESG・サステナビリティ経営'
    ],
    icon: '🎯',
    color: '#10B981'
  },
  {
    id: 'finance',
    name: '財務・ファイナンス',
    description: '財務分析と資金管理の知識',
    type: 'main',
    displayOrder: 4,
    subcategories: [
      '財務分析・企業価値評価',
      '投資判断・リスク管理',
      '事業計画・資金調達',
      '管理会計・KPI設計'
    ],
    icon: '💰',
    color: '#F59E0B'
  },
  {
    id: 'marketing_sales',
    name: 'マーケティング・営業',
    description: '顧客価値創造と市場戦略',
    type: 'main',
    displayOrder: 5,
    subcategories: [
      '顧客分析・セグメンテーション',
      'ブランディング・ポジショニング',
      'デジタルマーケティング',
      '営業戦略・CRM'
    ],
    icon: '📈',
    color: '#EF4444'
  },
  {
    id: 'leadership_hr',
    name: 'リーダーシップ・人事',
    description: '人材マネジメントと組織運営',
    type: 'main',
    displayOrder: 6,
    subcategories: [
      'チームマネジメント・モチベーション',
      'タレントマネジメント・育成',
      '組織開発・変革リーダーシップ',
      '人事戦略・働き方改革'
    ],
    icon: '👥',
    color: '#06B6D4'
  },
  {
    id: 'ai_digital_utilization',
    name: 'AI・デジタル活用',
    description: 'AI時代のデジタル技術活用',
    type: 'main',
    displayOrder: 7,
    subcategories: [
      'AI・機械学習活用',
      'プロンプトエンジニアリング',
      'DX戦略・デジタル変革',
      'データドリブン経営',
      'IoT・自動化技術'
    ],
    icon: '🤖',
    color: '#8B5CF6'
  },
  {
    id: 'project_operations',
    name: 'プロジェクト・業務管理',
    description: 'プロジェクト運営と業務効率化',
    type: 'main',
    displayOrder: 8,
    subcategories: [
      'プロジェクト設計・WBS',
      'スケジュール・リソース管理',
      'ステークホルダー管理',
      '業務効率化・時間管理'
    ],
    icon: '📋',
    color: '#84CC16'
  },
  {
    id: 'business_process_analysis',
    name: 'ビジネスプロセス・業務分析',
    description: '業務の理解と改善設計',
    type: 'main',
    displayOrder: 9,
    subcategories: [
      '業務分析・要件定義',
      'プロセス設計・最適化',
      'サプライチェーン管理',
      '業務システム設計',
      'BPR・業務改革'
    ],
    icon: '🔄',
    color: '#F97316'
  },
  {
    id: 'risk_crisis_management',
    name: 'リスク・危機管理',
    description: 'リスクの予防と危機対応',
    type: 'main',
    displayOrder: 10,
    subcategories: [
      '企業リスク管理',
      '危機管理・BCP',
      'コンプライアンス・内部統制',
      '情報セキュリティ',
      'サステナビリティリスク'
    ],
    icon: '🛡️',
    color: '#DC2626'
  }
]

// 業界特化カテゴリー
export const industryCategories: IndustryCategory[] = [
  {
    id: 'consulting_industry',
    name: 'コンサルティング業界',
    description: 'コンサルティング業界特有の知識とスキル',
    type: 'industry',
    displayOrder: 1,
    subcategories: [
      // 戦略コンサル基礎
      'ケース面接・構造化思考',
      '仮説思考・イシューツリー',
      'ストーリーライン構築',
      // クライアントマネジメント
      'ステークホルダー分析',
      '複数ステークホルダー調整',
      'プロジェクト炎上対応・リカバリー',
      '変革リーダーシップ',
      // 業界・機能別専門性
      'デジタル変革支援',
      'M&A・PMI支援',
      'オペレーション改革',
      '規制業界対応（金融・製薬等）',
      '業界ベストプラクティス活用',
      '業界動向・競合分析',
      // 提案・セリング
      'RFP対応・提案書作成',
      '経営層プレゼン',
      '経営課題ヒアリング・課題設定',
      '継続案件獲得・拡販戦略'
    ],
    icon: '🎩',
    color: '#6366F1'
  },
  {
    id: 'si_industry',
    name: 'SI（システムインテグレーション）業界',
    description: 'SI業界特有のプロジェクト管理と技術コンサルティング',
    type: 'industry',
    displayOrder: 2,
    subcategories: [
      // 上流工程スキル
      '要件定義・業務分析',
      'IT戦略立案',
      'RFP作成・ベンダー管理',
      // プロジェクトマネジメント
      'SIプロジェクト管理',
      '多階層ベンダー管理',
      'リスク管理・品質管理',
      'システム導入・移行管理',
      // 技術コンサルティング
      'DX推進支援',
      '技術的実現性評価',
      'レガシーシステム連携',
      // 顧客関係構築・ビジネスモデル
      '技術営業・提案活動',
      '顧客要求分析',
      '長期パートナーシップ構築',
      '契約形態・価格設定戦略'
    ],
    icon: '🖥️',
    color: '#0EA5E9'
  },
  {
    id: 'trading_company_industry',
    name: '商社業界',
    description: '商社特有のトレーディング・事業投資・グローバル展開スキル',
    type: 'industry',
    displayOrder: 3,
    subcategories: [
      // トレーディング実務
      '商品知識・市場分析',
      '商品先物・デリバティブ活用',
      '価格交渉・リスクヘッジ',
      '品質管理・検査・保険',
      // 事業投資・開発
      '新規事業開拓',
      '出資先企業経営参画',
      '事業ポートフォリオ管理',
      // グローバル展開
      '海外市場開拓',
      '多国間三国間取引',
      '異文化コミュニケーション',
      '現地法人運営',
      // 商社特有金融機能
      '貿易ファイナンス',
      'トレードファイナンス組成',
      '為替・金利リスク管理',
      'カントリーリスク分析'
    ],
    icon: '🌐',
    color: '#059669'
  }
]

// サブカテゴリー詳細定義
export const subcategories: Subcategory[] = [
  // コミュニケーション・プレゼン
  {
    id: 'presentation',
    name: 'プレゼンテーション',
    description: '効果的なプレゼンテーションスキル',
    parentCategoryId: 'communication_presentation',
    displayOrder: 1,
    icon: '🎤'
  },
  {
    id: 'sales_marketing',
    name: 'セールス・マーケティング',
    description: 'セールスとマーケティングの実践スキル',
    parentCategoryId: 'communication_presentation',
    displayOrder: 2,
    icon: '📈'
  },
  {
    id: 'negotiation_coordination',
    name: '交渉・調整',
    description: '交渉術と利害関係者の調整スキル',
    parentCategoryId: 'communication_presentation',
    displayOrder: 3,
    icon: '🤝'
  },

  // 分析的問題解決
  {
    id: 'logical_thinking_analysis',
    name: '論理的思考・分析',
    description: '論理的思考と分析的問題解決',
    parentCategoryId: 'analytical_problem_solving',
    displayOrder: 1,
    icon: '🧠'
  },
  {
    id: 'financial_accounting_analysis',
    name: '財務・会計分析',
    description: '財務データの分析と解釈',
    parentCategoryId: 'analytical_problem_solving',
    displayOrder: 2,
    icon: '💰'
  },
  {
    id: 'data_analysis_interpretation',
    name: 'データ分析・解釈',
    description: 'データを活用した洞察の獲得',
    parentCategoryId: 'analytical_problem_solving',
    displayOrder: 3,
    icon: '📊'
  },

  // リーダーシップ・マネジメント
  {
    id: 'team_management_development',
    name: 'チーム運営・人材育成',
    description: 'チームマネジメントと人材開発',
    parentCategoryId: 'leadership_management',
    displayOrder: 1,
    icon: '👥'
  },
  {
    id: 'project_management',
    name: 'プロジェクトマネジメント',
    description: 'プロジェクトの計画・実行・管理',
    parentCategoryId: 'leadership_management',
    displayOrder: 2,
    icon: '📋'
  },
  {
    id: 'organizational_development_transformation',
    name: '組織開発・変革',
    description: '組織の成長と変革の推進',
    parentCategoryId: 'leadership_management',
    displayOrder: 3,
    icon: '🔄'
  },

  // ビジネス戦略・企画
  {
    id: 'business_strategy_planning',
    name: '事業戦略・企画',
    description: '事業戦略の立案と企画',
    parentCategoryId: 'business_strategy',
    displayOrder: 1,
    icon: '🎯'
  },
  {
    id: 'operations_improvement',
    name: 'オペレーション・業務改善',
    description: '業務効率化とオペレーション改善',
    parentCategoryId: 'business_strategy',
    displayOrder: 2,
    icon: '⚙️'
  },
  {
    id: 'market_competitive_analysis',
    name: '市場分析・競合調査',
    description: '市場動向分析と競合戦略',
    parentCategoryId: 'business_strategy',
    displayOrder: 3,
    icon: '🔍'
  }
]

// ヘルパー関数
export function getCategoryById(id: string): MainCategory | IndustryCategory | undefined {
  return [...mainCategories, ...industryCategories].find(cat => cat.id === id)
}

export function getSubcategoriesByParent(parentId: string): Subcategory[] {
  const category = getCategoryById(parentId)
  if (!category) return []
  
  return category.subcategories.map((subName, index) => ({
    id: subName.toLowerCase().replace(/[・・]/g, '_').replace(/\s+/g, '_'),
    name: subName,
    description: `${subName}に関する専門知識とスキル`,
    parentCategoryId: parentId,
    displayOrder: index + 1,
    icon: getSubcategoryIcon(subName)
  }))
}

function getSubcategoryIcon(subcategoryName: string): string {
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