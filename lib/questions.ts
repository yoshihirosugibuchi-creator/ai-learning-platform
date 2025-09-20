import { Question } from './types'
import { globalCache } from './performance-optimizer'

// DB API使用版 - JSONフォールバック付き
export async function getAllQuestions(): Promise<Question[]> {
  const cacheKey = 'all_questions_db'
  
  // キャッシュチェック（5分間）
  const cached = globalCache.get(cacheKey)
  if (cached) {
    console.log('🚀 Questions loaded from cache')
    return cached
  }

  try {
    console.log('📡 Fetching questions from DB API')
    const response = await fetch('/api/questions')
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const questions = data.questions || []
    
    // キャッシュに保存（5分間）
    globalCache.set(cacheKey, questions, 5 * 60 * 1000)
    
    console.log(`✅ Questions loaded from DB: ${questions.length} questions`)
    return questions
    
  } catch (error) {
    console.error('❌ Error loading questions from DB:', error)
    console.log('🔄 Falling back to JSON file...')
    
    // JSONフォールバック
    return await loadQuestionsFromJSON()
  }
}

// JSONファイルからの問題読み込み（フォールバック用）
async function loadQuestionsFromJSON(): Promise<Question[]> {
  try {
    console.log('📄 Loading questions from JSON fallback')
    const response = await fetch('/questions.json')
    
    if (!response.ok) {
      throw new Error(`JSON file request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const questions = data.questions || []
    
    console.log(`✅ Questions loaded from JSON: ${questions.length} questions`)
    return questions
    
  } catch (error) {
    console.error('❌ Error loading questions from JSON:', error)
    return []
  }
}

// カテゴリー別問題取得（オーバーロード対応）
export function getQuestionsByCategory(questions: Question[], category: string): Question[]
export function getQuestionsByCategory(category: string, limit?: number): Promise<Question[]>
export function getQuestionsByCategory(questionsOrCategory: Question[] | string, categoryOrLimit?: string | number): Question[] | Promise<Question[]> {
  // 既存のシグネチャ: getQuestionsByCategory(questions, category)
  if (Array.isArray(questionsOrCategory)) {
    const questions = questionsOrCategory
    const category = categoryOrLimit as string
    return questions.filter(q => q.category === category && !q.deleted)
  }
  
  // 新しいシグネチャ: getQuestionsByCategory(category, limit) - DB API使用
  return getQuestionsByCategoryFromDB(questionsOrCategory as string, categoryOrLimit as number)
}

// DB API版のカテゴリー別問題取得（内部関数）
async function getQuestionsByCategoryFromDB(category: string, limit: number = 1000): Promise<Question[]> {
  try {
    console.log(`📡 Fetching questions for category: ${category}`)
    const response = await fetch(`/api/questions?category=${encodeURIComponent(category)}&limit=${limit}`)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.questions || []
    
  } catch (error) {
    console.error(`❌ Error loading questions for category ${category}:`, error)
    console.log('🔄 Falling back to JSON for category filtering...')
    // フォールバック: JSONから全問題取得してフィルター
    const allQuestions = await loadQuestionsFromJSON()
    return allQuestions.filter(q => q.category === category && !q.deleted).slice(0, limit)
  }
}

// ランダム問題取得（オーバーロード対応）
export function getRandomQuestions(questions: Question[], count?: number): Question[]
export function getRandomQuestions(count?: number): Promise<Question[]>
export function getRandomQuestions(questionsOrCount?: Question[] | number, count?: number): Question[] | Promise<Question[]> {
  // 既存のシグネチャ: getRandomQuestions(questions, count)
  if (Array.isArray(questionsOrCount)) {
    const questions = questionsOrCount
    const finalCount = count || 10
    const activeQuestions = questions.filter(q => !q.deleted)
    const shuffled = [...activeQuestions].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, finalCount)
  }
  
  // 新しいシグネチャ: getRandomQuestions(count) - DB API使用
  return getRandomQuestionsFromDB(questionsOrCount || 10)
}

// DB API版のランダム問題取得（内部関数）
async function getRandomQuestionsFromDB(count: number = 10): Promise<Question[]> {
  try {
    console.log(`📡 Fetching ${count} random questions from DB`)
    const response = await fetch(`/api/questions?limit=${count}&random=true`)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.questions || []
    
  } catch (error) {
    console.error('❌ Error loading random questions from DB:', error)
    console.log('🔄 Falling back to JSON for random selection...')
    // フォールバック: JSONから全問題取得してランダム選択
    const allQuestions = await loadQuestionsFromJSON()
    const activeQuestions = allQuestions.filter(q => !q.deleted)
    const shuffled = [...activeQuestions].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }
}

// ID指定問題取得（従来互換）
export function getQuestionById(questions: Question[], id: number): Question | undefined {
  return questions.find(q => q.id === id && !q.deleted)
}

// カテゴリー一覧取得（オーバーロード対応）
export function getCategories(questions: Question[]): string[]
export function getCategories(): Promise<string[]>
export function getCategories(questions?: Question[]): string[] | Promise<string[]> {
  // 既存のシグネチャ: getCategories(questions)
  if (questions) {
    const activeQuestions = questions.filter(q => !q.deleted)
    return Array.from(new Set(activeQuestions.map(q => q.category)))
  }
  
  // 新しいシグネチャ: getCategories() - 統計API使用
  return getCategoriesFromAPI()
}

// API版のカテゴリー一覧取得（内部関数）
async function getCategoriesFromAPI(): Promise<string[]> {
  try {
    console.log('📡 Fetching categories from stats API')
    const response = await fetch('/api/questions/stats')
    
    if (!response.ok) {
      throw new Error(`Stats API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return Object.keys(data.categories || {})
    
  } catch (error) {
    console.error('❌ Error loading categories:', error)
    console.log('🔄 Falling back to JSON for categories...')
    // フォールバック: JSONから全問題取得してカテゴリー抽出
    const allQuestions = await loadQuestionsFromJSON()
    const activeQuestions = allQuestions.filter(q => !q.deleted)
    return Array.from(new Set(activeQuestions.map(q => q.category)))
  }
}

// 統計情報取得（新機能）
export async function getQuestionStats() {
  try {
    const response = await fetch('/api/questions/stats')
    if (!response.ok) {
      throw new Error(`Stats API request failed: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('❌ Error loading question stats:', error)
    return {
      total: 0,
      categories: {},
      difficulties: {},
      topSubcategories: {}
    }
  }
}

// 後方互換性のための関数（既存コードで使用されている場合）
export function getQuestionsByCategoryLegacy(questions: Question[], category: string): Question[] {
  return questions.filter(q => q.category === category && !q.deleted)
}

export function getRandomQuestionsLegacy(questions: Question[], count: number = 10): Question[] {
  const activeQuestions = questions.filter(q => !q.deleted)
  const shuffled = [...activeQuestions].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}