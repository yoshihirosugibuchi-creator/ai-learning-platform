// サブカテゴリーの型定義
export type QuizSubcategory = 
  // カテゴリーレベル（統合的な問題）
  | 'category_level'
  // コミュニケーション・プレゼンテーション
  | '結論ファースト・構造化思考'
  | '資料作成・可視化技術'
  | '会議運営・ファシリテーション'
  | '交渉・説得技術'
  // 論理的思考・問題解決
  | '構造化思考（MECE・ロジックツリー）'
  | '仮説検証・本質追求'
  | '定量分析・統計解析'
  | '行動経済学・意思決定理論'
  | 'ベンチマーキング・競合分析'
  // 戦略・経営
  | '経営戦略・事業戦略'
  | '競争戦略・フレームワーク'
  | '新事業開発・イノベーション'
  | 'ESG・サステナビリティ経営'
  // 財務・ファイナンス
  | '財務分析・企業価値評価'
  | '投資判断・リスク管理'
  | '事業計画・資金調達'
  | '管理会計・KPI設計'
  // マーケティング・営業
  | '顧客分析・セグメンテーション'
  | 'ブランディング・ポジショニング'
  | 'デジタルマーケティング'
  | '営業戦略・CRM'
  // リーダーシップ・人事
  | 'チームマネジメント・モチベーション'
  | 'タレントマネジメント・育成'
  | '組織開発・変革リーダーシップ'
  | '人事戦略・働き方改革'
  // AI・デジタル活用
  | 'AI基礎・業務活用'
  | 'DX戦略・デジタル変革'
  | 'データドリブン経営'
  | 'IoT・自動化技術'
  // プロジェクト・業務管理
  | 'プロジェクト設計・WBS'
  | 'スケジュール・リソース管理'
  | 'ステークホルダー管理'
  | '業務効率化・時間管理'
  // ビジネスプロセス・業務分析
  | '業務分析・要件定義'
  | 'プロセス設計・最適化'
  | 'サプライチェーン管理'
  | '業務システム設計'
  | 'BPR・業務改革'
  // リスク・危機管理
  | '企業リスク管理'
  | '危機管理・BCP'
  | 'コンプライアンス・内部統制'
  | '情報セキュリティ'
  | 'サステナビリティリスク'
  // レガシーサブカテゴリー（後方互換性のため）
  | 'セールス・マーケティング'
  | '論理的思考・分析'
  | '財務・会計分析'
  | 'チーム運営・人材育成'
  | 'プロジェクトマネジメント'
  | '事業戦略・企画'
  | '交渉・調整'
  | '組織開発・変革'
  | '新規事業開発'
  | 'イノベーション手法'
  | 'DX・IT戦略'

// 難易度の型定義
export type QuizDifficulty = '基礎' | '中級' | '上級'

// メインカテゴリーの型定義
export type QuizMainCategory = 
  | 'communication_presentation'
  | 'logical_thinking_problem_solving'
  | 'strategy_management'
  | 'finance'
  | 'marketing_sales'
  | 'leadership_hr'
  | 'ai_digital_utilization'
  | 'project_operations'
  | 'business_process_analysis'
  | 'risk_crisis_management'
  // レガシーカテゴリー（後方互換性のため）
  | 'analytical_problem_solving'
  | 'leadership_management'
  | 'business_strategy'
  | 'innovation_creativity'
  | 'digital_technology'
  | 'crisis_risk_management'

export interface Question {
  id: number
  category: QuizMainCategory | string // string for flexibility with legacy data
  subcategory: QuizSubcategory | string // string for flexibility with legacy data
  subcategory_id?: string // サブカテゴリーの英数字ID（XP計算用）
  question: string
  options: string[]
  correct: number
  explanation: string
  difficulty: QuizDifficulty | string // string for flexibility with legacy data
  timeLimit: number
  relatedTopics: string[]
  source: string
  deleted?: boolean // 削除フラグ
}

export interface UserProgress {
  currentLevel: number
  totalXP: number
  streak: number
  completedQuestions: number[]
  correctAnswers: number
  totalAnswers: number
}

export interface User {
  id: string
  name: string
  email?: string
  avatar?: string
  progress: UserProgress
  skpBalance: number
  createdAt: Date
  lastActiveAt: Date
}