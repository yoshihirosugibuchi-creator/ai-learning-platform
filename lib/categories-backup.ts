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

// メインカテゴリー定義
export const mainCategories: MainCategory[] = [
  {
    id: 'communication_presentation',
    name: 'コミュニケーション・プレゼン',
    description: '効果的な情報伝達と説得技術',
    type: 'main',
    displayOrder: 1,
    subcategories: [
      'プレゼンテーション',
      'セールス・マーケティング',
      '交渉・調整'
    ],
    icon: '💬',
    color: '#3B82F6'
  },
  {
    id: 'analytical_problem_solving',
    name: '分析的問題解決',
    description: '論理的思考力と問題解決能力を活用した分析スキル',
    type: 'main',
    displayOrder: 2,
    subcategories: [
      '論理的思考・分析',
      '財務・会計分析',
      'データ分析・解釈'
    ],
    icon: '🧠',
    color: '#8B5CF6'
  },
  {
    id: 'leadership_management',
    name: 'リーダーシップ・マネジメント',
    description: 'チームを率い、組織を発展させる統率力',
    type: 'main',
    displayOrder: 3,
    subcategories: [
      'チーム運営・人材育成',
      'プロジェクトマネジメント',
      '組織開発・変革'
    ],
    icon: '👑',
    color: '#10B981'
  },
  {
    id: 'business_strategy',
    name: 'ビジネス戦略・企画',
    description: '戦略的思考による事業の方向性決定',
    type: 'main',
    displayOrder: 4,
    subcategories: [
      '事業戦略・企画',
      'オペレーション・業務改善',
      '市場分析・競合調査'
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
      'customer_analysis',
      'branding_positioning',
      'digital_marketing',
      'sales_strategy'
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
      'team_management',
      'talent_management',
      'organizational_development',
      'hr_strategy'
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
      'ai_basics',
      'dx_strategy',
      'data_driven',
      'iot_automation'
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
      'project_design',
      'schedule_resource',
      'stakeholder_management',
      'operational_efficiency'
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
      'business_analysis',
      'process_optimization',
      'supply_chain',
      'system_design',
      'business_reform'
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
      'enterprise_risk',
      'crisis_bcp',
      'compliance',
      'information_security',
      'sustainability_risk'
    ],
    icon: '🛡️',
    color: '#DC2626'
  }
]

// サブカテゴリー定義（例：論理的思考・問題解決）
export const subcategories: Subcategory[] = [
  // コミュニケーション・プレゼン
  {
    id: 'conclusion_first_structure',
    name: '結論ファースト・構造化思考',
    type: 'subcategory',
    parentId: 'communication_presentation',
    displayOrder: 1
  },
  {
    id: 'document_visualization',
    name: '資料作成・可視化技術', 
    type: 'subcategory',
    parentId: 'communication_presentation',
    displayOrder: 2
  },
  // 論理的思考・問題解決
  {
    id: 'structured_thinking',
    name: '構造化思考（MECE・ロジックツリー）',
    type: 'subcategory',
    parentId: 'logical_thinking_problem_solving',
    displayOrder: 1
  },
  {
    id: 'hypothesis_verification',
    name: '仮説検証・本質追求',
    type: 'subcategory', 
    parentId: 'logical_thinking_problem_solving',
    displayOrder: 2
  },
  {
    id: 'quantitative_analysis',
    name: '定量分析・統計解析',
    type: 'subcategory',
    parentId: 'logical_thinking_problem_solving',
    displayOrder: 3
  },
  {
    id: 'behavioral_economics',
    name: '行動経済学・意思決定理論',
    type: 'subcategory',
    parentId: 'logical_thinking_problem_solving', 
    displayOrder: 4
  },
  // 他のサブカテゴリーも同様に定義...
]

// 業界別カテゴリー定義
export const industryCategories: IndustryCategory[] = [
  {
    id: 'consulting',
    name: 'コンサルティング業界',
    description: 'コンサルタント特化スキル',
    type: 'industry',
    displayOrder: 1,
    subcategories: [
      'advanced_analysis',
      'client_management',
      'industry_frameworks',
      'thought_leadership'
    ],
    icon: '🎓',
    color: '#6366F1'
  },
  {
    id: 'it_si',
    name: 'IT・SI業界',
    description: 'ITシステム開発・運用特化',
    type: 'industry', 
    displayOrder: 2,
    subcategories: [
      'system_architecture',
      'agile_devops',
      'cloud_infrastructure', 
      'security_governance'
    ],
    icon: '💻',
    color: '#0EA5E9'
  },
  {
    id: 'manufacturing',
    name: '製造業',
    description: '製造業界特有の知識・スキル',
    type: 'industry',
    displayOrder: 3,
    subcategories: [
      'industry_four_zero',
      'quality_safety',
      'circular_economy',
      'global_supply_chain'
    ],
    icon: '🏭',
    color: '#059669'
  }
]

// ヘルパー関数
export function getMainCategoryById(id: MainCategoryId): MainCategory | undefined {
  return mainCategories.find(cat => cat.id === id)
}

export function getIndustryCategoryById(id: IndustryCategoryId): IndustryCategory | undefined {
  return industryCategories.find(cat => cat.id === id)
}

export function getSubcategoriesByParent(parentId: string): Subcategory[] {
  return subcategories.filter(sub => sub.parentId === parentId)
}

export function getAllCategories() {
  return [
    ...mainCategories,
    ...industryCategories, 
    ...subcategories
  ]
}

export function getCategoryIcon(categoryId: string): string {
  const mainCat = mainCategories.find(cat => cat.id === categoryId)
  if (mainCat) return mainCat.icon || '📚'
  
  const industryCat = industryCategories.find(cat => cat.id === categoryId)
  if (industryCat) return industryCat.icon || '🏢'
  
  return '📖'
}