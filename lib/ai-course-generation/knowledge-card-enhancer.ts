/**
 * ナレッジカード・修了証バッジ自動強化システム
 * AIで生成されたコース・テーマ・バッジデータの品質向上
 */

// アイコンとカラーのマッピング（カテゴリ別）
const CATEGORY_MAPPINGS = {
  finance: {
    icons: ['💰', '💸', '📊', '📈', '📉', '⚖️', '🎯'],
    colors: ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4']
  },
  technology: {
    icons: ['🤖', '💻', '🚀', '⚙️', '🔧', '💡', '🌐'],
    colors: ['#7C3AED', '#3B82F6', '#10B981', '#059669', '#8B5CF6']
  },
  business: {
    icons: ['📊', '📈', '🎯', '💼', '👥', '🏆', '📋'],
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444']
  },
  general: {
    icons: ['📚', '🎓', '✨', '🌟', '🎯', '💡', '🔥'],
    colors: ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4']
  },
  marketing: {
    icons: ['📱', '📈', '🎯', '📊', '🗺️', '👥', '💬'],
    colors: ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EF4444']
  },
  ai_digital: {
    icons: ['🤖', '🧠', '💬', '⚙️', '🎯', '🚀', '⚡'],
    colors: ['#7C3AED', '#DC2626', '#059669', '#3B82F6', '#8B5CF6']
  }
}

// カテゴリマッピング関数
function getCategoryFromId(categoryId: string): keyof typeof CATEGORY_MAPPINGS {
  if (categoryId.includes('finance')) return 'finance'
  if (categoryId.includes('ai') || categoryId.includes('digital')) return 'ai_digital'
  if (categoryId.includes('marketing')) return 'marketing'
  if (categoryId.includes('technology') || categoryId.includes('tech')) return 'technology'
  if (categoryId.includes('business') || categoryId.includes('strategy')) return 'business'
  return 'general'
}

// ランダム選択関数
function selectRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// キーワードからアイコンマッピング
function getIconFromKeywords(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase()
  
  const iconMappings: Record<string, string> = {
    'ai': '🤖',
    'プロンプト': '💬',
    'ワークフロー': '⚙️',
    '評価': '📊',
    '金融': '💰',
    '数字': '📊',
    '計数': '📈',
    '損益': '📈',
    '貸借': '⚖️',
    'キャッシュフロー': '💸',
    '現場': '🎯',
    'マーケティング': '📱',
    'ソーシャル': '📱',
    'コンテンツ': '📝',
    'セグメント': '🎯',
    'ペルソナ': '👤',
    'ジャーニー': '🗺️',
    '思考': '🧩',
    '論理': '🎯',
    '分析': '🎪',
    'フレームワーク': '🎯',
    '結論': '🎯',
    'mece': '📊'
  }
  
  for (const [keyword, icon] of Object.entries(iconMappings)) {
    if (text.includes(keyword)) {
      return icon
    }
  }
  
  return '📚' // デフォルトアイコン
}

// 色選択（カテゴリとキーワードベース）
function getColorFromContext(categoryId: string, title: string): string {
  const category = getCategoryFromId(categoryId)
  const colors = CATEGORY_MAPPINGS[category].colors
  
  // タイトルベースの色マッピング
  const text = title.toLowerCase()
  if (text.includes('基礎') || text.includes('基本')) return colors[0]
  if (text.includes('実践') || text.includes('応用')) return colors[1]
  if (text.includes('マスター') || text.includes('エキスパート')) return colors[2]
  if (text.includes('分析')) return colors[3] || colors[0]
  
  return selectRandom(colors)
}

// テーマのナレッジカードデータ強化
export interface EnhancedRewardCardData {
  id: string
  icon: string
  color: string
  title: string
  summary: string
  keyPoints: string[]
  card_type?: string
}

export function enhanceThemeRewardCard(
  themeId: string,
  themeTitle: string,
  themeDescription: string,
  categoryId: string = 'general'
): EnhancedRewardCardData {
  
  const icon = getIconFromKeywords(themeTitle, themeDescription)
  const color = getColorFromContext(categoryId, themeTitle)
  
  // サマリー生成（テーマタイトルとディスクリプションから）
  let summary = themeDescription
  if (summary.length > 80) {
    summary = themeDescription.substring(0, 77) + '...'
  }
  
  // キーポイント生成（テーマの内容から推測）
  const keyPoints = generateKeyPointsFromTheme(themeTitle, themeDescription)
  
  return {
    id: `${themeId}_card`,
    icon,
    color,
    title: themeTitle,
    summary,
    keyPoints,
    card_type: 'knowledge'
  }
}

// コース・ジャンル修了証バッジ強化
export interface EnhancedBadgeData {
  id: string
  icon: string
  color: string
  title: string
  description: string
  badgeImageUrl?: string
  validityPeriodMonths?: number | null
  category?: string
  target_audience?: string
  learning_objectives?: string[]
  estimated_completion?: string
}

export function enhanceCourseBadge(
  courseId: string,
  courseTitle: string,
  courseDescription: string,
  categoryId: string = 'general',
  estimatedDays: number = 7
): EnhancedBadgeData {
  
  const icon = '🏆'
  const color = getColorFromContext(categoryId, courseTitle)
  
  // バッジタイトル生成
  const title = `${courseTitle} 修了証`
  
  // バッジ説明生成
  const description = `${courseDescription}の知識・スキルを習得`
  
  return {
    id: `badge_${courseId}`,
    icon,
    color,
    title,
    description,
    badgeImageUrl: `/badges/${courseId}.svg`,
    validityPeriodMonths: estimatedDays > 14 ? 24 : estimatedDays > 7 ? 12 : null,
    category: categoryId,
    target_audience: '学習者',
    learning_objectives: [courseDescription],
    estimated_completion: `${estimatedDays}日`
  }
}

export function enhanceGenreBadge(
  genreId: string,
  genreTitle: string,
  genreDescription: string,
  categoryId: string = 'general'
): EnhancedBadgeData {
  
  const icon = getIconFromKeywords(genreTitle, genreDescription)
  const color = getColorFromContext(categoryId, genreTitle)
  
  return {
    id: `${genreId}_badge`,
    icon,
    color,
    title: `${genreTitle}実践者`,
    description: `${genreDescription}を実践的に活用するスキル`,
    category: categoryId,
    target_audience: '学習者',
    learning_objectives: [genreDescription],
    estimated_completion: '実践レベル'
  }
}

// キーポイント自動生成
function generateKeyPointsFromTheme(title: string, description: string): string[] {
  const text = (title + ' ' + description).toLowerCase()
  
  // パターンマッチングによるキーポイント生成
  const defaultKeyPoints = [
    `${title}の基本概念と重要性`,
    '実践的な活用方法',
    '応用事例と効果的な実装'
  ]
  
  // 特定分野のキーポイントパターン
  if (text.includes('ai') || text.includes('プロンプト')) {
    return [
      'AI技術の基礎理解と活用方法',
      'プロンプト設計の最適化技術',
      'ビジネス現場での実践的な導入'
    ]
  }
  
  if (text.includes('金融') || text.includes('計数') || text.includes('数字')) {
    return [
      '金融・会計の基本概念理解',
      '数値分析と意思決定への活用',
      '実際のビジネス現場での応用'
    ]
  }
  
  if (text.includes('マーケティング')) {
    return [
      'マーケティング戦略の基本フレームワーク',
      'データに基づく顧客分析手法',
      '効果的な施策実行と改善'
    ]
  }
  
  if (text.includes('思考') || text.includes('論理')) {
    return [
      '論理的思考の基本原則',
      '構造化された問題解決手法',
      '実践的なフレームワーク活用'
    ]
  }
  
  return defaultKeyPoints
}

// 全体統合関数：AIで生成されたコースデータを強化
export interface CourseEnhancementResult {
  enhancedCourse: {
    badge_data: EnhancedBadgeData
  }
  enhancedGenres: Array<{
    id: string
    badge_data: EnhancedBadgeData
  }>
  enhancedThemes: Array<{
    id: string
    reward_card_data: EnhancedRewardCardData
  }>
}

export function enhanceAIGeneratedCourse(courseData: {
  course: {
    id: string
    title: string
    description: string
    estimated_days: number
  }
  genres: Array<{
    id: string
    title: string
    description: string
    category_id: string
  }>
  themes: Array<{
    id: string
    title: string
    description: string
    category_id?: string
  }>
}): CourseEnhancementResult {
  
  const { course, genres, themes } = courseData
  
  // コース修了証強化
  const enhancedCourse = {
    badge_data: enhanceCourseBadge(
      course.id,
      course.title,
      course.description,
      genres[0]?.category_id || 'general',
      course.estimated_days
    )
  }
  
  // ジャンル修了証強化
  const enhancedGenres = genres.map(genre => ({
    id: genre.id,
    badge_data: enhanceGenreBadge(
      genre.id,
      genre.title,
      genre.description,
      genre.category_id
    )
  }))
  
  // テーマナレッジカード強化
  const enhancedThemes = themes.map(theme => ({
    id: theme.id,
    reward_card_data: enhanceThemeRewardCard(
      theme.id,
      theme.title,
      theme.description,
      theme.category_id || genres[0]?.category_id || 'general'
    )
  }))
  
  return {
    enhancedCourse,
    enhancedGenres,
    enhancedThemes
  }
}