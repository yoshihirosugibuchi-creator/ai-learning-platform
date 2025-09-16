/**
 * Category mapping utilities
 * Maps between category IDs and display names
 */

export const categoryDisplayNames: Record<string, string> = {
  // Main categories (English IDs to Japanese names) - 正しい10カテゴリー
  'communication_presentation': 'コミュニケーション・プレゼンテーション',
  'logical_thinking_problem_solving': '論理的思考・問題解決',
  'strategy_management': '戦略・経営',
  'finance': '財務・ファイナンス',
  'marketing_sales': 'マーケティング・営業',
  'leadership_hr': 'リーダーシップ・人事',
  'ai_digital_utilization': 'AI・デジタル活用',
  'project_operations': 'プロジェクト・業務管理',
  'business_process_analysis': 'ビジネスプロセス・業務分析',
  'risk_crisis_management': 'リスク・危機管理',

  // Industry categories (業界特化カテゴリー)
  'consulting_industry': 'コンサルティング業界',
  'si_industry': 'SI（システムインテグレーション）業界',
  'it_si_industry': 'SI（システムインテグレーション）業界', // 旧IDとの互換性
  'trading_company_industry': '商社業界',

  // Backward compatibility for migrated quiz data
  'analytical_problem_solving': '論理的思考・問題解決',
  'leadership_management': 'リーダーシップ・人事',
  'business_strategy': '戦略・経営',
  'innovation_creativity': '戦略・経営',
  'digital_technology': 'AI・デジタル活用',
  'crisis_risk_management': 'リスク・危機管理',

  // Forward mapping for wisdom card data (Japanese subcategory to main category)
  '事業戦略・企画': '戦略・経営',
  'オペレーション・業務改善': 'ビジネスプロセス・業務分析',
  'イノベーション手法': '戦略・経営',
  '新規事業開発': '戦略・経営',
  'チーム運営・人材育成': 'リーダーシップ・人事',
  '組織開発・変革': 'リーダーシップ・人事',
  'セールス・マーケティング': 'マーケティング・営業',
  '論理的思考・分析': '論理的思考・問題解決',
  '財務・会計分析': '財務・ファイナンス',
  
  // Backward compatibility for old category names
  '財務分析': '財務・ファイナンス',
  '戦略思考': '論理的思考・問題解決',
  'マーケティング': 'マーケティング・営業',
  'プロジェクト管理': 'プロジェクト・業務管理',
  'データ分析': '論理的思考・問題解決',
  'リーダーシップ': 'リーダーシップ・人事',
  'イノベーション': '戦略・経営',
  'デジタル変革': 'AI・デジタル活用',
  'サステナビリティ': '戦略・経営',
  'アジャイル経営': 'リーダーシップ・人事',
  'デジタルトランスフォーメーション': 'AI・デジタル活用',
  '行動経済学': '論理的思考・問題解決',
  'サプライチェーン': 'ビジネスプロセス・業務分析',
  '人事戦略': 'リーダーシップ・人事',
  'ファイナンス': '財務・ファイナンス',
  'ネゴシエーション': 'コミュニケーション・プレゼンテーション',
  '危機管理': 'リスク・危機管理'
}

export const subcategoryDisplayNames: Record<string, string> = {
  // Category-level questions - special handling
  'category_level': '全般',
  
  // Subcategories mapping to display names
  '収益性指標': '財務分析・企業価値評価',
  'フレームワーク': '構造化思考（MECE・ロジックツリー）',
  '顧客分析': '顧客分析・セグメンテーション',
  'リスク管理': '企業リスク管理',
  '統計解析': '定量分析・統計解析',
  'チームマネジメント': 'チームマネジメント・モチベーション',
  '創造性開発': '新事業開発・イノベーション',
  'DX戦略': 'DX戦略・デジタル変革',
  'ESG経営': 'ESG・サステナビリティ経営',
  '組織運営': '組織開発・変革リーダーシップ',
  'デジタル戦略': 'DX戦略・デジタル変革',
  '意思決定': '行動経済学・意思決定理論',
  '調達戦略': 'サプライチェーン管理',
  '新規事業': '新事業開発・イノベーション',
  'タレントマネジメント': 'タレントマネジメント・育成',
  '企業価値評価': '財務分析・企業価値評価',
  'ESG投資': 'ESG・サステナビリティ経営',
  '交渉術': '交渉・説得技術',
  'リスクマネジメント': '企業リスク管理',
  
  // Direct subcategory names that should be displayed as-is
  '結論ファースト・構造化思考': '結論ファースト・構造化思考',
  '資料作成・可視化技術': '資料作成・可視化技術',
  '会議運営・ファシリテーション': '会議運営・ファシリテーション',
  '交渉・説得技術': '交渉・説得技術',
  '構造化思考（MECE・ロジックツリー）': '構造化思考（MECE・ロジックツリー）',
  '仮説検証・本質追求': '仮説検証・本質追求',
  '定量分析・統計解析': '定量分析・統計解析',
  '行動経済学・意思決定理論': '行動経済学・意思決定理論',
  'ベンチマーキング・競合分析': 'ベンチマーキング・競合分析',
  '経営戦略・事業戦略': '経営戦略・事業戦略',
  '競争戦略・フレームワーク': '競争戦略・フレームワーク',
  '新事業開発・イノベーション': '新事業開発・イノベーション',
  'ESG・サステナビリティ経営': 'ESG・サステナビリティ経営',
  '財務分析・企業価値評価': '財務分析・企業価値評価',
  '投資判断・リスク管理': '投資判断・リスク管理',
  '事業計画・資金調達': '事業計画・資金調達',
  '管理会計・KPI設計': '管理会計・KPI設計',
  '顧客分析・セグメンテーション': '顧客分析・セグメンテーション',
  'ブランディング・ポジショニング': 'ブランディング・ポジショニング',
  'デジタルマーケティング': 'デジタルマーケティング',
  '営業戦略・CRM': '営業戦略・CRM',
  'チームマネジメント・モチベーション': 'チームマネジメント・モチベーション',
  'タレントマネジメント・育成': 'タレントマネジメント・育成',
  '組織開発・変革リーダーシップ': '組織開発・変革リーダーシップ',
  '人事戦略・働き方改革': '人事戦略・働き方改革',
  'AI・機械学習活用': 'AI・機械学習活用',
  'プロンプトエンジニアリング': 'プロンプトエンジニアリング',
  'AI基礎・業務活用': 'AI基礎・業務活用',
  'DX戦略・デジタル変革': 'DX戦略・デジタル変革',
  'データドリブン経営': 'データドリブン経営',
  'IoT・自動化技術': 'IoT・自動化技術',
  'プロジェクト設計・WBS': 'プロジェクト設計・WBS',
  'スケジュール・リソース管理': 'スケジュール・リソース管理',
  'ステークホルダー管理': 'ステークホルダー管理',
  '業務効率化・時間管理': '業務効率化・時間管理',
  '業務分析・要件定義': '業務分析・要件定義',
  'プロセス設計・最適化': 'プロセス設計・最適化',
  'サプライチェーン管理': 'サプライチェーン管理',
  '業務システム設計': '業務システム設計',
  'BPR・業務改革': 'BPR・業務改革',
  '企業リスク管理': '企業リスク管理',
  '危機管理・BCP': '危機管理・BCP',
  'コンプライアンス・内部統制': 'コンプライアンス・内部統制',
  '情報セキュリティ': '情報セキュリティ',
  'サステナビリティリスク': 'サステナビリティリスク'
}

/**
 * Convert category ID to display name
 */
export function getCategoryDisplayName(categoryId: string): string {
  return categoryDisplayNames[categoryId] || categoryId
}

/**
 * Convert subcategory to display name
 */
export function getSubcategoryDisplayName(subcategory: string): string {
  return subcategoryDisplayNames[subcategory] || subcategory
}

/**
 * Map any category (old or new, Japanese or English) to correct main category ID
 */
export function mapToMainCategoryId(categoryInput: string): string {
  // If it's already a main category ID, return it
  const mainCategoryIds = [
    'communication_presentation',
    'logical_thinking_problem_solving', 
    'strategy_management',
    'finance',
    'marketing_sales',
    'leadership_hr',
    'ai_digital_utilization',
    'project_operations',
    'business_process_analysis',
    'risk_crisis_management'
  ]
  
  if (mainCategoryIds.includes(categoryInput)) {
    return categoryInput
  }
  
  // Map display name back to ID
  const displayName = getCategoryDisplayName(categoryInput)
  const reverseMap: Record<string, string> = {
    'コミュニケーション・プレゼンテーション': 'communication_presentation',
    '論理的思考・問題解決': 'logical_thinking_problem_solving',
    '戦略・経営': 'strategy_management',
    '財務・ファイナンス': 'finance',
    'マーケティング・営業': 'marketing_sales',
    'リーダーシップ・人事': 'leadership_hr',
    'AI・デジタル活用': 'ai_digital_utilization',
    'プロジェクト・業務管理': 'project_operations',
    'ビジネスプロセス・業務分析': 'business_process_analysis',
    'リスク・危機管理': 'risk_crisis_management'
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
    '商社業界': '🌐'
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
    '商社業界': '#059669'
  }
  
  return colorMap[displayName] || '#6B7280'
}