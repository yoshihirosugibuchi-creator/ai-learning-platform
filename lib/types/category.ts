// カテゴリー体系の型定義

export type CategoryType = 'main' | 'industry' | 'subcategory'

export type SkillLevel = 'basic' | 'intermediate' | 'advanced' | 'expert'

export type ContentType = 'quiz' | 'card' | 'lesson'

// メインカテゴリーID
export type MainCategoryId = 
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

// 業界別カテゴリーID
export type IndustryCategoryId =
  | 'consulting'
  | 'it_si'
  | 'manufacturing'
  | 'financial'
  | 'healthcare'

// カテゴリー基本情報
export interface Category {
  id: string
  name: string
  description?: string
  type: CategoryType
  parentId?: string
  displayOrder: number
  isActive?: boolean
  isVisible?: boolean
  createdAt?: Date
  updatedAt?: Date
}

// サブカテゴリー
export interface Subcategory extends Category {
  type: 'subcategory'
  parentId: string // メインカテゴリーまたは業界カテゴリーのID
}

// メインカテゴリー詳細
export interface MainCategory extends Category {
  id: MainCategoryId
  type: 'main'
  subcategories: string[] // サブカテゴリーIDの配列
  icon?: string
  color?: string
}

// 業界別カテゴリー詳細
export interface IndustryCategory extends Category {
  id: IndustryCategoryId
  type: 'industry'
  subcategories: string[] // サブカテゴリーIDの配列
  icon?: string
  color?: string
}

// スキルレベル定義
export interface SkillLevelDefinition {
  id: SkillLevel
  name: string
  description: string
  targetExperience: string
  displayOrder: number
}

// コンテンツとカテゴリーの関連
export interface ContentCategoryMapping {
  contentId: number
  contentType: ContentType
  categoryId: string
  skillLevel: SkillLevel
  weight?: number // 重要度（1-5）
}

// 学習パス
export interface LearningPath {
  id: string
  name: string
  description: string
  categoryId: string // メインカテゴリーID
  skillLevel: SkillLevel
  prerequisites?: string[] // 前提となる学習パスID
  estimatedHours: number
  contents: LearningPathContent[]
  displayOrder: number
}

// 学習パスのコンテンツ
export interface LearningPathContent {
  id: string
  contentId: number
  contentType: ContentType
  order: number
  isRequired: boolean
  estimatedMinutes: number
}

// カテゴリー統計
export interface CategoryStats {
  categoryId: string
  totalContents: number
  completedContents: number
  averageScore: number
  totalLearningTime: number
  lastAccessDate?: Date
}

// ユーザーの学習進捗
export interface UserLearningProgress {
  userId: string
  categoryId: string
  skillLevel: SkillLevel
  completionRate: number
  averageScore: number
  totalQuizzes: number
  totalCards: number
  totalLessons: number
  lastAccessDate: Date
  achievements: string[] // 達成バッジID
}