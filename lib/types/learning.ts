/**
 * 学習コンテンツ関連の型定義
 */

export interface LearningCourse {
  id: string
  title: string
  description: string
  estimatedDays: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
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
  badges: LearningBadge[]
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

// 難易度ラベル
export const DifficultyLabels: Record<LearningCourse['difficulty'], string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級'
}

export const DifficultyColors: Record<LearningCourse['difficulty'], string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B', 
  advanced: '#EF4444'
}