/**
 * 学習コンテンツ関連の型定義
 */

export interface LearningCourse {
  id: string
  title: string
  description: string
  estimatedDays: number
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  icon: string
  color: string
  genres: LearningGenre[]
  displayOrder: number
}

export interface LearningGenre {
  id: string
  title: string
  description: string
  categoryId: string // メインカテゴリーID
  subcategoryId?: string // サブカテゴリーID（任意）
  themes: LearningTheme[]
  estimatedDays: number
  badge: LearningBadge
  displayOrder: number
}

export interface LearningTheme {
  id: string
  title: string
  description: string
  sessions: LearningSession[]
  estimatedMinutes: number
  rewardCard: LearningRewardCard
  displayOrder: number
}

export interface LearningSession {
  id: string
  title: string
  estimatedMinutes: number
  type: 'knowledge' | 'practice' | 'case_study'
  content: SessionContent[]
  quiz: SessionQuiz[]
  displayOrder: number
}

export interface SessionContent {
  id: string
  type: 'text' | 'image' | 'video' | 'example' | 'key_points'
  content: string
  title?: string
  duration?: number // 分
  displayOrder: number
}

export interface SessionQuiz {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
  type: 'single_choice' | 'multiple_choice'
}

export interface LearningBadge {
  id: string
  title: string
  description: string
  icon: string
  color: string
  badgeImageUrl?: string // 勲章画像URL
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  validityPeriodMonths?: number // 有効期限（月数）、未設定は永続
}

export interface UserBadge {
  id: string
  badge: LearningBadge
  earnedAt: Date
  expiresAt?: Date // 有効期限がある場合
  isExpired: boolean
  courseId: string
  courseName: string
}

export interface LearningRewardCard {
  id: string
  title: string
  summary: string
  keyPoints: string[]
  icon: string
  color: string
}

// 学習進捗管理
export interface LearningProgress {
  userId: string
  courseId: string
  genreId?: string
  themeId?: string
  sessionId?: string
  status: 'not_started' | 'in_progress' | 'completed'
  completedAt?: Date
  score?: number
  timeSpent: number // 秒
}

export interface UserLearningStats {
  totalCoursesCompleted: number
  totalGenresCompleted: number
  totalThemesCompleted: number
  totalSessionsCompleted: number
  totalTimeSpent: number // 分
  badges: UserBadge[] // 獲得したバッジ（修了証）
  rewardCards: LearningRewardCard[]
  currentStreak: number
  longestStreak: number
  lastLearningDate?: Date
}

// セッション形式の定義
export type SessionType = 'knowledge' | 'practice' | 'case_study'

export const SessionTypeLabels: Record<SessionType, string> = {
  knowledge: '知識定着型',
  practice: '実践応用型',
  case_study: '事例学習型'
}

export const SessionTypeDescriptions: Record<SessionType, string> = {
  knowledge: '概念説明 + 事例 + 確認問題',
  practice: '演習問題 + 解答プロセス + 応用ヒント',
  case_study: '実際の企業事例 + 分析視点 + 教訓'
}

// 難易度ラベル（DB統一スキルレベルに対応）
export const DifficultyLabels: Record<LearningCourse['difficulty'], string> = {
  basic: '基礎',
  intermediate: '中級',
  advanced: '上級',
  expert: 'エキスパート'
}

export const DifficultyColors: Record<LearningCourse['difficulty'], string> = {
  basic: '#10B981',
  intermediate: '#F59E0B', 
  advanced: '#EF4444',
  expert: '#8B5CF6'
}