// Browser storage utilities for user data persistence
// 動的フォールバック設定をインポート（ローカルストレージレベル計算用）
import { DATABASE_FALLBACK_SETTINGS } from './xp-settings-fallback.generated'

// Storage key constants
const USER_STORAGE_KEY = 'ai_learning_user_data'
const REGISTERED_USERS_KEY = 'ai_learning_registered_users'

// プロフィール情報の型定義
export interface UserProfile {
  industry?: string      // 業界
  jobTitle?: string      // 職種  
  experienceYears?: number // 経験年数
  company?: string       // 会社名（オプション）
  department?: string    // 部門（オプション）
  learningGoals?: string[]     // 学習目標
  preferredCategories?: string[] // 興味のあるカテゴリー
  weeklyGoal?: 'light' | 'medium' | 'heavy' // 週間学習目標
}

// 認証情報の型定義
export interface AuthInfo {
  isGuest: boolean       // ゲストユーザーかどうか
  hashedPassword?: string // 簡易ハッシュ化パスワード
  isOnboarded: boolean   // オンボーディング完了フラグ
}

// ポイント履歴エントリの型定義
export interface SkpTransaction {
  id: string
  type: 'earned' | 'spent'
  amount: number
  source: string // 'quiz_completion', 'login_bonus', 'shop_purchase', etc.
  description: string
  timestamp: string
}

// カテゴリー別進捗の型定義
export interface CategoryProgress {
  categoryId: string
  currentLevel: number
  totalXP: number
  correctAnswers: number
  totalAnswers: number
  lastAnsweredAt?: string
}

export interface StorageUser {
  id: string
  name: string
  email?: string
  auth: AuthInfo         // 認証情報
  profile?: UserProfile  // プロフィール情報
  progress: {
    currentLevel: number
    totalXP: number
    streak: number
    completedQuestions: number[]
    correctAnswers: number
    totalAnswers: number
    lastLearningDate?: string // 最後の学習日 (YYYY-MM-DD形式)
  }
  categoryProgress?: CategoryProgress[] // カテゴリー別進捗
  skpBalance: number
  skpTotalEarned?: number // 累計獲得ポイント
  skpTransactions?: SkpTransaction[] // ポイント履歴
  createdAt: string
  lastActiveAt: string
}

const STORAGE_KEYS = {
  USER_DATA: 'ale_user_data',
  QUIZ_RESULTS: 'ale_quiz_results',
  SETTINGS: 'ale_settings',
  LEARNING_SESSIONS: 'ale_learning_sessions',
  DETAILED_QUIZ_DATA: 'ale_detailed_quiz_data'
} as const

export function saveUserData(userData: StorageUser): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData))
    }
  } catch (error) {
    console.error('Failed to save user data:', error)
  }
}

export function getUserData(): StorageUser | null {
  try {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(USER_STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Failed to load user data:', error)
    return null
  }
}

export function createDefaultUser(isGuest: boolean = false): StorageUser {
  return {
    id: crypto.randomUUID(),
    name: isGuest ? 'ゲストユーザー' : '学習者',
    auth: {
      isGuest,
      isOnboarded: false
    },
    progress: {
      currentLevel: 1,
      totalXP: 0,
      streak: 0,
      completedQuestions: [],
      correctAnswers: 0,
      totalAnswers: 0
    },
    categoryProgress: [], // 初期状態では空の配列
    skpBalance: isGuest ? 0 : 100, // ゲストユーザーはSKP付与なし
    skpTotalEarned: isGuest ? 0 : 100,
    skpTransactions: isGuest ? [] : [{
      id: crypto.randomUUID(),
      type: 'earned' as const,
      amount: 100,
      source: 'account_creation',
      description: 'アカウント作成ボーナス',
      timestamp: new Date().toISOString()
    }],
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  }
}

// 認証機能
export function createRegisteredUser(email: string, password: string, name: string): StorageUser {
  const hashedPassword = simpleHash(password) // 簡易ハッシュ化
  const userId = crypto.randomUUID()
  
  // 登録済みユーザーとして保存
  const account: RegisteredUserAccount = {
    id: userId,
    email,
    name,
    hashedPassword,
    createdAt: new Date().toISOString()
  }
  saveRegisteredUser(account)
  
  return {
    id: userId,
    name,
    email,
    auth: {
      isGuest: false,
      hashedPassword,
      isOnboarded: false
    },
    progress: {
      currentLevel: 1,
      totalXP: 0,
      streak: 0,
      completedQuestions: [],
      correctAnswers: 0,
      totalAnswers: 0
    },
    categoryProgress: [], // 初期状態では空の配列
    skpBalance: 100, // 登録ボーナス
    skpTotalEarned: 100,
    skpTransactions: [{
      id: crypto.randomUUID(),
      type: 'earned' as const,
      amount: 100,
      source: 'account_creation',
      description: 'アカウント作成ボーナス',
      timestamp: new Date().toISOString()
    }],
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  }
}

// 登録済みユーザーアカウント情報の型定義
export interface RegisteredUserAccount {
  id: string
  email: string
  name: string
  hashedPassword: string
  createdAt: string
  isOnboarded?: boolean
  profile?: UserProfile
  lastActiveAt?: string
}

// 登録済みユーザーを保存
function saveRegisteredUser(account: RegisteredUserAccount): void {
  try {
    if (typeof window === 'undefined') return
    
    const registeredUsers = getRegisteredUsers()
    const existingIndex = registeredUsers.findIndex(user => user.email === account.email)
    
    if (existingIndex !== -1) {
      registeredUsers[existingIndex] = account
    } else {
      registeredUsers.push(account)
    }
    
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers))
  } catch (error) {
    console.error('Error saving registered user:', error)
  }
}

// 登録済みユーザー一覧を取得
function getRegisteredUsers(): RegisteredUserAccount[] {
  try {
    if (typeof window === 'undefined') return []
    
    const data = localStorage.getItem(REGISTERED_USERS_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading registered users:', error)
    return []
  }
}

// メールアドレスから登録済みユーザーを取得
function getRegisteredUser(email: string): RegisteredUserAccount | null {
  const registeredUsers = getRegisteredUsers()
  return registeredUsers.find(user => user.email === email) || null
}

// 簡易ハッシュ化関数（本格的な認証システムでは、より強固な方法を使用）
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit整数に変換
  }
  return hash.toString(36) // 36進数文字列に変換
}

// ログイン認証
export function authenticateUser(email: string, password: string): StorageUser | null {
  try {
    if (typeof window === 'undefined') return null
    
    // 登録済みユーザーから認証情報を取得
    const registeredUser = getRegisteredUser(email)
    if (!registeredUser) {
      return null
    }
    
    const hashedInput = simpleHash(password)
    if (registeredUser.hashedPassword !== hashedInput) {
      return null
    }
    
    // 既存のセッションデータがあるかチェック
    const existingSession = getUserData()
    if (existingSession && existingSession.id === registeredUser.id) {
      // 既存セッションを返す（lastActiveAtは更新）
      const updatedSession = {
        ...existingSession,
        lastActiveAt: new Date().toISOString()
      }
      saveUserData(updatedSession)
      return updatedSession
    }
    
    // 以前のユーザーデータを検索して復元を試みる
    try {
      const userSpecificDataExists = 
        localStorage.getItem(`ale_quiz_results_${registeredUser.id}`) ||
        localStorage.getItem(`ale_knowledge_card_collection_${registeredUser.id}`) ||
        localStorage.getItem(`ale_learning_progress_${registeredUser.id}`)
      
      if (userSpecificDataExists) {
        console.log('🔄 Restoring existing user data for:', registeredUser.email)
        // ユーザー別データの初期化（既存データは保持される）
        initializeUserSpecificData(registeredUser.id)
      }
    } catch (error) {
      console.warn('Failed to check existing user data:', error)
    }
    
    // 新しいセッションデータを作成（既存の情報があれば復元）
    return {
      id: registeredUser.id,
      name: registeredUser.name,
      email: registeredUser.email,
      auth: {
        isGuest: false,
        hashedPassword: registeredUser.hashedPassword,
        isOnboarded: registeredUser.isOnboarded || false
      },
      profile: registeredUser.profile || undefined,
      progress: {
        currentLevel: 1,
        totalXP: 0,
        streak: 0,
        completedQuestions: [],
        correctAnswers: 0,
        totalAnswers: 0
      },
      categoryProgress: [],
      skpBalance: 100,
      skpTotalEarned: 100,
      skpTransactions: [{
        id: crypto.randomUUID(),
        type: 'earned' as const,
        amount: 100,
        source: 'account_creation',
        description: 'アカウント作成ボーナス',
        timestamp: new Date().toISOString()
      }],
      createdAt: registeredUser.createdAt,
      lastActiveAt: new Date().toISOString()
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

// パスワードリセット機能（簡易版）
export function resetPassword(email: string, newPassword: string): boolean {
  try {
    if (typeof window === 'undefined') return false
    
    // 登録済みユーザー情報を更新
    const registeredUser = getRegisteredUser(email)
    if (!registeredUser) {
      console.error('Registered user not found for email:', email)
      return false
    }
    
    const hashedPassword = simpleHash(newPassword)
    const updatedAccount: RegisteredUserAccount = {
      ...registeredUser,
      hashedPassword
    }
    
    saveRegisteredUser(updatedAccount)
    
    // 現在のセッションがこのユーザーのものなら更新
    const userData = getUserData()
    if (userData && userData.email === email) {
      const updatedUser = {
        ...userData,
        auth: { ...userData.auth, hashedPassword },
        lastActiveAt: new Date().toISOString()
      }
      saveUserData(updatedUser)
    }
    
    console.log('✅ Password reset successful for user:', email)
    return true
  } catch (error) {
    console.error('Password reset error:', error)
    return false
  }
}

// ユーザー存在確認
export function checkUserExists(email: string): boolean {
  try {
    if (typeof window === 'undefined') return false
    
    // 登録済みユーザーから確認
    const registeredUser = getRegisteredUser(email)
    return !!registeredUser
  } catch (error) {
    console.error('Error checking user existence:', error)
    return false
  }
}

// プロフィール情報の更新
export function updateUserProfile(userId: string, profile: Partial<UserProfile>): boolean {
  try {
    if (typeof window === 'undefined') return false
    
    const userData = getUserData()
    if (!userData || userData.id !== userId) {
      return false
    }
    
    const updatedUser = {
      ...userData,
      profile: {
        ...userData.profile,
        ...profile
      },
      lastActiveAt: new Date().toISOString()
    }
    
    saveUserData(updatedUser)
    
    // 登録済みユーザー情報も更新
    if (userData.email) {
      const registeredUser = getRegisteredUser(userData.email)
      if (registeredUser) {
        const updatedAccount: RegisteredUserAccount = {
          ...registeredUser,
          profile: updatedUser.profile,
          lastActiveAt: updatedUser.lastActiveAt
        }
        saveRegisteredUser(updatedAccount)
      }
    }
    
    return true
  } catch (error) {
    console.error('Profile update error:', error)
    return false
  }
}

// パスワード変更機能
export function changePassword(userId: string, currentPassword: string, newPassword: string): boolean {
  try {
    if (typeof window === 'undefined') return false
    
    const userData = getUserData()
    if (!userData || userData.id !== userId) {
      return false
    }
    
    // 現在のパスワードを確認
    const currentHashedPassword = simpleHash(currentPassword)
    if (userData.auth.hashedPassword !== currentHashedPassword) {
      console.error('Current password is incorrect')
      return false
    }
    
    // 新しいパスワードをハッシュ化
    const hashedNewPassword = simpleHash(newPassword)
    
    const updatedUser = {
      ...userData,
      auth: {
        ...userData.auth,
        hashedPassword: hashedNewPassword
      },
      lastActiveAt: new Date().toISOString()
    }
    
    saveUserData(updatedUser)
    console.log('✅ Password changed successfully for user:', userId)
    return true
  } catch (error) {
    console.error('Password change error:', error)
    return false
  }
}

// ログアウト（ユーザーデータクリア）
export function logoutUser(): void {
  try {
    if (typeof window !== 'undefined') {
      // セッション情報のみをクリア（登録済みユーザー情報は保持）
      localStorage.removeItem(USER_STORAGE_KEY)
      console.log('🚪 User logged out - session cleared, registered account preserved')
    }
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// オンボーディング完了マーク
export function markOnboardingComplete(userId: string): boolean {
  try {
    if (typeof window === 'undefined') return false
    
    const userData = getUserData()
    if (!userData || userData.id !== userId) {
      return false
    }
    
    const updatedUser = {
      ...userData,
      auth: {
        ...userData.auth,
        isOnboarded: true
      },
      lastActiveAt: new Date().toISOString()
    }
    
    saveUserData(updatedUser)
    
    // 登録済みユーザー情報も更新
    if (userData.email) {
      const registeredUser = getRegisteredUser(userData.email)
      if (registeredUser) {
        const updatedAccount: RegisteredUserAccount = {
          ...registeredUser,
          isOnboarded: true,
          profile: userData.profile,
          lastActiveAt: updatedUser.lastActiveAt
        }
        saveRegisteredUser(updatedAccount)
      }
    }
    
    return true
  } catch (error) {
    console.error('Onboarding completion error:', error)
    return false
  }
}

// 既存ユーザーデータのマイグレーション
export function migrateUserData(userData: unknown): StorageUser {
  const user = userData as Record<string, unknown>
  
  // 型安全な構造でStorageUserを構築
  const migratedUser: StorageUser = {
    id: (user.id as string) || 'guest_' + Date.now(),
    name: (user.name as string) || 'Anonymous User',
    email: user.email as string | undefined,
    auth: (user.auth as AuthInfo) || {
      isGuest: false,
      isOnboarded: true // 既存ユーザーはオンボーディング済みとみなす
    },
    profile: user.profile || {},
    progress: (user.progress as {
      currentLevel: number
      totalXP: number
      streak: number
      completedQuestions: number[]
      correctAnswers: number
      totalAnswers: number
      lastLearningDate?: string
    }) || {
      currentLevel: 1,
      totalXP: 0,
      streak: 0,
      completedQuestions: [],
      correctAnswers: 0,
      totalAnswers: 0
    },
    categoryProgress: (user.categoryProgress as CategoryProgress[]) || [],
    skpBalance: (user.skpBalance as number) || 0,
    skpTotalEarned: (user.skpTotalEarned as number) || (user.skpBalance as number) || 0,
    skpTransactions: (user.skpTransactions as SkpTransaction[]) || [],
    createdAt: (user.createdAt as string) || new Date().toISOString(),
    lastActiveAt: (user.lastActiveAt as string) || new Date().toISOString()
  }
  
  // プロフィールフィールドの補完
  if (!migratedUser.profile) {
    migratedUser.profile = {}
  }
  
  // マイグレーション後のデータを保存
  saveUserData(migratedUser)
  return migratedUser
}

export function updateUserProgress(
  userData: StorageUser, 
  questionsAnswered: number, 
  correctAnswers: number, 
  xpGained: number,
  categoryScores?: Record<string, { correct: number; total: number }>
): StorageUser {
  // SKPポイント計算（正解1問につき5 SKP、ボーナスあり）
  const baseSkpPerCorrect = 5
  const perfectBonus = correctAnswers === questionsAnswered && questionsAnswered >= 3 ? 10 : 0 // 全問正解ボーナス
  const streakBonus = userData.progress.streak >= 3 ? Math.min(userData.progress.streak, 10) : 0 // 連続学習ボーナス
  const skpGained = (correctAnswers * baseSkpPerCorrect) + perfectBonus + streakBonus
  
  // ポイント履歴エントリを作成
  const newTransaction: SkpTransaction = {
    id: crypto.randomUUID(),
    type: 'earned',
    amount: skpGained,
    source: 'quiz_completion',
    description: `クイズ完了 (${correctAnswers}/${questionsAnswered}問正解)${perfectBonus > 0 ? ' + 全問正解ボーナス' : ''}${streakBonus > 0 ? ' + 連続学習ボーナス' : ''}`,
    timestamp: new Date().toISOString()
  }
  
  // 連続日数の更新
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD形式
  let updatedStreak = userData.progress.streak
  
  if (userData.progress.lastLearningDate) {
    const lastDate = new Date(userData.progress.lastLearningDate)
    const todayDate = new Date(today)
    const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === 1) {
      // 前日の継続 - ストリーク+1
      updatedStreak = userData.progress.streak + 1
      console.log(`🔥 Streak continued! ${userData.progress.streak} → ${updatedStreak} days`)
    } else if (daysDiff === 0) {
      // 同日の学習 - ストリーク維持
      updatedStreak = userData.progress.streak
      console.log(`📚 Same day learning. Streak maintained: ${updatedStreak} days`)
    } else {
      // 1日以上空いた - ストリークリセット
      updatedStreak = 1
      console.log(`💔 Streak broken after ${daysDiff} days. Reset to 1`)
    }
  } else {
    // 初回学習
    updatedStreak = 1
    console.log('🌟 First learning day! Streak started: 1 day')
  }

  // カテゴリー別進捗を更新
  const updatedCategoryProgress = [...(userData.categoryProgress || [])]
  
  if (categoryScores) {
    console.log('📊 Updating category scores:', categoryScores)
    Object.entries(categoryScores).forEach(([categoryId, scores]) => {
      const existingProgress = updatedCategoryProgress.find(p => p.categoryId === categoryId)
      const categoryXP = scores.correct * 50 // カテゴリー別XP（正解1問につき50XP）
      
      console.log(`🏷️ Category ${categoryId}: ${scores.correct}/${scores.total} correct, +${categoryXP}XP`)
      
      if (existingProgress) {
        console.log(`📈 Updating existing progress for ${categoryId}:`, existingProgress)
        existingProgress.correctAnswers += scores.correct
        existingProgress.totalAnswers += scores.total
        existingProgress.totalXP += categoryXP
        // テーブルベース設定でレベル計算（ローカルストレージ用DEFAULT値）
        existingProgress.currentLevel = Math.floor(existingProgress.totalXP / DATABASE_FALLBACK_SETTINGS.level.main_category_threshold) + 1
        existingProgress.lastAnsweredAt = new Date().toISOString()
        console.log(`📊 New progress for ${categoryId}:`, existingProgress)
      } else {
        const newProgress = {
          categoryId,
          correctAnswers: scores.correct,
          totalAnswers: scores.total,
          totalXP: categoryXP,
          currentLevel: Math.floor(categoryXP / DATABASE_FALLBACK_SETTINGS.level.main_category_threshold) + 1,
          lastAnsweredAt: new Date().toISOString()
        }
        console.log(`🆕 Creating new progress for ${categoryId}:`, newProgress)
        updatedCategoryProgress.push(newProgress)
      }
    })
  }

  const updatedUser = {
    ...userData,
    progress: {
      ...userData.progress,
      totalAnswers: userData.progress.totalAnswers + questionsAnswered,
      correctAnswers: userData.progress.correctAnswers + correctAnswers,
      totalXP: userData.progress.totalXP + xpGained,
      streak: updatedStreak,
      lastLearningDate: today
    },
    categoryProgress: updatedCategoryProgress,
    skpBalance: userData.skpBalance + skpGained,
    skpTotalEarned: (userData.skpTotalEarned || 0) + skpGained,
    skpTransactions: [...(userData.skpTransactions || []), newTransaction].slice(-50), // 最新50件を保持
    lastActiveAt: new Date().toISOString()
  }
  
  // テーブルベース設定でレベル計算（ローカルストレージ用DEFAULT値）
  updatedUser.progress.currentLevel = Math.floor(updatedUser.progress.totalXP / DATABASE_FALLBACK_SETTINGS.level.overall_threshold) + 1
  
  saveUserData(updatedUser)
  return updatedUser
}

// Enhanced quiz result interface with detailed timing and confidence data
export interface QuestionAnswer {
  questionId: string
  questionText: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  responseTime: number // milliseconds
  confidenceLevel?: number // 1-5 scale
  category: string
  difficulty?: string
}

export interface QuizSession {
  sessionId: string
  startTime: string
  endTime: string
  sessionDuration: number // milliseconds
  totalQuestions: number
  category?: string
}

export interface QuizResult {
  id: string
  timestamp: string
  category?: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  categoryScores: Record<string, { correct: number; total: number }>
  // Enhanced data for personalization
  session?: QuizSession
  questionAnswers?: QuestionAnswer[]
  averageResponseTime?: number
  averageConfidence?: number
}

export function saveQuizResult(result: Omit<QuizResult, 'id' | 'timestamp'>, userId?: string): void {
  try {
    if (typeof window === 'undefined') return
    
    const quizResult: QuizResult = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...result
    }
    
    if (userId) {
      // User-specific storage
      const existingResults = getUserQuizResults(userId)
      const updatedResults = [quizResult, ...existingResults].slice(0, 50) // Keep last 50 results
      localStorage.setItem(`${STORAGE_KEYS.QUIZ_RESULTS}_${userId}`, JSON.stringify(updatedResults))
    } else {
      // Legacy global storage for backward compatibility
      const existingResults = getQuizResults()
      const updatedResults = [quizResult, ...existingResults].slice(0, 50)
      localStorage.setItem(STORAGE_KEYS.QUIZ_RESULTS, JSON.stringify(updatedResults))
    }
  } catch (error) {
    console.error('Failed to save quiz result:', error)
  }
}

export function getQuizResults(): QuizResult[] {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEYS.QUIZ_RESULTS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load quiz results:', error)
    return []
  }
}

// User-specific quiz results functions
export function getUserQuizResults(userId: string): QuizResult[] {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(`${STORAGE_KEYS.QUIZ_RESULTS}_${userId}`)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load user quiz results:', error)
    return []
  }
}

export function getUserDetailedQuizData(userId: string): QuizResult[] {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(`${STORAGE_KEYS.DETAILED_QUIZ_DATA}_${userId}`)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load user detailed quiz data:', error)
    return []
  }
}

export function clearAllData(): void {
  try {
    if (typeof window === 'undefined') return
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Failed to clear data:', error)
  }
}

// Card Collection Management
export interface UserCardCollection {
  cardId: number
  count: number
  obtainedAt: string
  lastObtainedAt: string
}

const CARD_COLLECTION_KEY = 'ale_card_collection'

export function getUserCardCollection(userId?: string): UserCardCollection[] {
  try {
    if (typeof window === 'undefined') return []
    
    // User-specific storage if userId provided
    const storageKey = userId ? `${CARD_COLLECTION_KEY}_${userId}` : CARD_COLLECTION_KEY
    const data = localStorage.getItem(storageKey)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load card collection:', error)
    return []
  }
}

export function saveUserCardCollection(collection: UserCardCollection[], userId?: string): void {
  try {
    if (typeof window === 'undefined') return
    
    // User-specific storage if userId provided
    const storageKey = userId ? `${CARD_COLLECTION_KEY}_${userId}` : CARD_COLLECTION_KEY
    localStorage.setItem(storageKey, JSON.stringify(collection))
  } catch (error) {
    console.error('Failed to save card collection:', error)
  }
}

export function addCardToCollection(cardId: number, userId?: string): { count: number; isNew: boolean } {
  const collection = getUserCardCollection(userId)
  const existingCard = collection.find(c => c.cardId === cardId)
  const now = new Date().toISOString()
  
  if (existingCard) {
    existingCard.count += 1
    existingCard.lastObtainedAt = now
    saveUserCardCollection(collection, userId)
    return { count: existingCard.count, isNew: false }
  } else {
    const newCard: UserCardCollection = {
      cardId,
      count: 1,
      obtainedAt: now,
      lastObtainedAt: now
    }
    collection.push(newCard)
    saveUserCardCollection(collection, userId)
    return { count: 1, isNew: true }
  }
}

export function hasCard(cardId: number, userId?: string): boolean {
  const collection = getUserCardCollection(userId)
  return collection.some(c => c.cardId === cardId)
}

export function getCardCount(cardId: number, userId?: string): number {
  const collection = getUserCardCollection(userId)
  const card = collection.find(c => c.cardId === cardId)
  return card ? card.count : 0
}

export function getCollectionStats(userId?: string) {
  const collection = getUserCardCollection(userId)
  const totalObtained = collection.length
  const totalCards = collection.reduce((sum, card) => sum + card.count, 0)
  
  return {
    totalObtained,
    totalCards,
    uniqueCards: collection.length
  }
}

// Enhanced quiz data collection functions
export function saveEnhancedQuizResult(result: Omit<QuizResult, 'id' | 'timestamp'>, userId?: string): void {
  try {
    if (typeof window === 'undefined') return
    
    const enhancedResult: QuizResult = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...result
    }
    
    // Calculate average response time and confidence if question answers are provided
    if (result.questionAnswers && result.questionAnswers.length > 0) {
      const totalResponseTime = result.questionAnswers.reduce((sum, q) => sum + q.responseTime, 0)
      enhancedResult.averageResponseTime = totalResponseTime / result.questionAnswers.length
      
      const confidenceLevels = result.questionAnswers.filter(q => q.confidenceLevel !== undefined).map(q => q.confidenceLevel!)
      if (confidenceLevels.length > 0) {
        enhancedResult.averageConfidence = confidenceLevels.reduce((sum, c) => sum + c, 0) / confidenceLevels.length
      }
    }
    
    if (userId) {
      // User-specific storage
      const existingResults = getUserQuizResults(userId)
      const updatedResults = [enhancedResult, ...existingResults].slice(0, 50)
      localStorage.setItem(`${STORAGE_KEYS.QUIZ_RESULTS}_${userId}`, JSON.stringify(updatedResults))
      
      // Also save detailed data separately for analysis
      const detailedData = getUserDetailedQuizData(userId)
      const updatedDetailedData = [enhancedResult, ...detailedData].slice(0, 100) // Keep more detailed records
      localStorage.setItem(`${STORAGE_KEYS.DETAILED_QUIZ_DATA}_${userId}`, JSON.stringify(updatedDetailedData))
    } else {
      // Legacy global storage for backward compatibility
      const existingResults = getQuizResults()
      const updatedResults = [enhancedResult, ...existingResults].slice(0, 50)
      localStorage.setItem(STORAGE_KEYS.QUIZ_RESULTS, JSON.stringify(updatedResults))
      
      const detailedData = getDetailedQuizData()
      const updatedDetailedData = [enhancedResult, ...detailedData].slice(0, 100)
      localStorage.setItem(STORAGE_KEYS.DETAILED_QUIZ_DATA, JSON.stringify(updatedDetailedData))
    }
  } catch (error) {
    console.error('Failed to save enhanced quiz result:', error)
  }
}

export function getDetailedQuizData(): QuizResult[] {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEYS.DETAILED_QUIZ_DATA)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load detailed quiz data:', error)
    return []
  }
}

// Learning session tracking for content learning
export interface LearningSession {
  id: string
  userId: string
  courseId: string
  genreId: string
  themeId: string
  sessionId: string
  startTime: string
  endTime?: string
  duration?: number // milliseconds
  completed: boolean
  quizScore?: number
  contentInteractions?: {
    scrollDepth: number
    timeOnSection: Record<string, number>
    clickEvents: Array<{ element: string; timestamp: string }>
  }
}

export function saveLearningSession(session: LearningSession): void {
  try {
    if (typeof window === 'undefined') return
    
    // Save to user-specific storage
    const existingSessions = getUserLearningSessions(session.userId)
    const updatedSessions = [session, ...existingSessions].slice(0, 200) // Keep more learning session data
    localStorage.setItem(`${STORAGE_KEYS.LEARNING_SESSIONS}_${session.userId}`, JSON.stringify(updatedSessions))
    
    // Also save to global storage for backward compatibility
    const globalSessions = getLearningSessions()
    const updatedGlobalSessions = [session, ...globalSessions].slice(0, 200)
    localStorage.setItem(STORAGE_KEYS.LEARNING_SESSIONS, JSON.stringify(updatedGlobalSessions))
  } catch (error) {
    console.error('Failed to save learning session:', error)
  }
}

export function getLearningSession(sessionId: string): LearningSession | null {
  const sessions = getLearningSessions()
  return sessions.find(s => s.id === sessionId) || null
}

export function updateLearningSession(sessionId: string, updates: Partial<LearningSession>): void {
  try {
    if (typeof window === 'undefined') return
    
    // Find the session in global storage first to get userId
    const globalSessions = getLearningSessions()
    const globalSession = globalSessions.find(s => s.id === sessionId)
    
    if (globalSession && globalSession.userId) {
      // Update user-specific storage
      const userSessions = getUserLearningSessions(globalSession.userId)
      const userSessionIndex = userSessions.findIndex(s => s.id === sessionId)
      
      if (userSessionIndex >= 0) {
        userSessions[userSessionIndex] = { ...userSessions[userSessionIndex], ...updates }
        localStorage.setItem(`${STORAGE_KEYS.LEARNING_SESSIONS}_${globalSession.userId}`, JSON.stringify(userSessions))
      }
    }
    
    // Also update global storage for backward compatibility
    const sessionIndex = globalSessions.findIndex(s => s.id === sessionId)
    if (sessionIndex >= 0) {
      globalSessions[sessionIndex] = { ...globalSessions[sessionIndex], ...updates }
      localStorage.setItem(STORAGE_KEYS.LEARNING_SESSIONS, JSON.stringify(globalSessions))
    }
  } catch (error) {
    console.error('Failed to update learning session:', error)
  }
}

export function getLearningSessionsForUser(userId: string): LearningSession[] {
  // Prefer user-specific storage
  const userSessions = getUserLearningSessions(userId)
  if (userSessions.length > 0) {
    return userSessions
  }
  // Fallback to filtering global sessions
  return getLearningSessions().filter(s => s.userId === userId)
}

// User-specific learning session functions
export function getUserLearningSessions(userId: string): LearningSession[] {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(`${STORAGE_KEYS.LEARNING_SESSIONS}_${userId}`)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load user learning sessions:', error)
    return []
  }
}

export function getLearningSessions(): LearningSession[] {
  try {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEYS.LEARNING_SESSIONS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to load learning sessions:', error)
    return []
  }
}

// Analytics helper functions for personalization
export function getQuestionPerformanceStats(userId?: string): {
  averageResponseTime: number
  averageConfidence: number
  categoryPerformance: Record<string, {
    averageResponseTime: number
    averageConfidence: number
    accuracy: number
    totalQuestions: number
  }>
} {
  // Use user-specific data if userId provided
  const detailedData = userId ? getUserDetailedQuizData(userId) : getDetailedQuizData()
  
  const allQuestions = detailedData.flatMap(result => result.questionAnswers || [])
  
  if (allQuestions.length === 0) {
    return {
      averageResponseTime: 0,
      averageConfidence: 0,
      categoryPerformance: {}
    }
  }
  
  const totalResponseTime = allQuestions.reduce((sum, q) => sum + q.responseTime, 0)
  const confidenceLevels = allQuestions.filter(q => q.confidenceLevel !== undefined).map(q => q.confidenceLevel!)
  
  const categoryStats = allQuestions.reduce((acc, q) => {
    if (!acc[q.category]) {
      acc[q.category] = {
        responseTime: [],
        confidence: [],
        correct: 0,
        total: 0
      }
    }
    
    acc[q.category].responseTime.push(q.responseTime)
    if (q.confidenceLevel !== undefined) {
      acc[q.category].confidence.push(q.confidenceLevel)
    }
    acc[q.category].total += 1
    if (q.isCorrect) {
      acc[q.category].correct += 1
    }
    
    return acc
  }, {} as Record<string, {
    responseTime: number[]
    confidence: number[]
    correct: number
    total: number
  }>)
  
  const categoryPerformance = Object.entries(categoryStats).reduce((acc, [category, stats]) => {
    acc[category] = {
      averageResponseTime: stats.responseTime.reduce((sum, t) => sum + t, 0) / stats.responseTime.length,
      averageConfidence: stats.confidence.length > 0 
        ? stats.confidence.reduce((sum, c) => sum + c, 0) / stats.confidence.length 
        : 0,
      accuracy: stats.correct / stats.total,
      totalQuestions: stats.total
    }
    return acc
  }, {} as Record<string, {
    averageResponseTime: number
    averageConfidence: number
    accuracy: number
    totalQuestions: number
  }>)
  
  return {
    averageResponseTime: totalResponseTime / allQuestions.length,
    averageConfidence: confidenceLevels.length > 0 
      ? confidenceLevels.reduce((sum, c) => sum + c, 0) / confidenceLevels.length 
      : 0,
    categoryPerformance
  }
}

// Data migration for existing users
export function migrateUserDataToUserSpecific(): void {
  try {
    if (typeof window === 'undefined') return
    
    console.log('🔄 Starting user data migration to user-specific storage...')
    
    // Check if user data exists
    const currentUser = getUserData()
    if (!currentUser) {
      console.log('No current user found, skipping migration')
      return
    }
    
    const userId = currentUser.id
    console.log(`👤 Migrating data for user: ${userId}`)
    
    // Migrate quiz results
    const globalQuizResults = getQuizResults()
    if (globalQuizResults.length > 0) {
      const existingUserResults = getUserQuizResults(userId)
      if (existingUserResults.length === 0) {
        localStorage.setItem(`${STORAGE_KEYS.QUIZ_RESULTS}_${userId}`, JSON.stringify(globalQuizResults))
        console.log(`📊 Migrated ${globalQuizResults.length} quiz results`)
      }
    }
    
    // Migrate detailed quiz data
    const globalDetailedData = getDetailedQuizData()
    if (globalDetailedData.length > 0) {
      const existingUserDetailedData = getUserDetailedQuizData(userId)
      if (existingUserDetailedData.length === 0) {
        localStorage.setItem(`${STORAGE_KEYS.DETAILED_QUIZ_DATA}_${userId}`, JSON.stringify(globalDetailedData))
        console.log(`📈 Migrated ${globalDetailedData.length} detailed quiz records`)
      }
    }
    
    // Migrate learning sessions
    const globalLearningSessions = getLearningSessions()
    const userLearningSessions = globalLearningSessions.filter(s => s.userId === userId)
    if (userLearningSessions.length > 0) {
      const existingUserSessions = getUserLearningSessions(userId)
      if (existingUserSessions.length === 0) {
        localStorage.setItem(`${STORAGE_KEYS.LEARNING_SESSIONS}_${userId}`, JSON.stringify(userLearningSessions))
        console.log(`🎓 Migrated ${userLearningSessions.length} learning sessions`)
      }
    }
    
    // Migrate card collection
    const globalCardCollection = getUserCardCollection() // without userId = global
    if (globalCardCollection.length > 0) {
      const existingUserCollection = getUserCardCollection(userId)
      if (existingUserCollection.length === 0) {
        localStorage.setItem(`${CARD_COLLECTION_KEY}_${userId}`, JSON.stringify(globalCardCollection))
        console.log(`🂺 Migrated ${globalCardCollection.length} wisdom cards to user collection`)
      }
    }
    
    // Migrate knowledge card collection
    // TODO: Replace with proper import when knowledge-cards module is properly typed
    const getUserKnowledgeCardCollection = (): unknown[] => []
    const globalKnowledgeCardCollection = getUserKnowledgeCardCollection() // without userId = global
    if (globalKnowledgeCardCollection.length > 0) {
      const existingUserKnowledgeCollection = getUserKnowledgeCardCollection()
      if (existingUserKnowledgeCollection.length === 0) {
        localStorage.setItem(`ale_knowledge_card_collection_${userId}`, JSON.stringify(globalKnowledgeCardCollection))
        console.log(`📚 Migrated ${globalKnowledgeCardCollection.length} knowledge cards to user collection`)
      }
    }
    
    console.log('✅ User data migration completed successfully')
  } catch (error) {
    console.error('❌ Failed to migrate user data:', error)
  }
}

// Initialize user-specific data management for a user
export function initializeUserSpecificData(userId: string): void {
  try {
    console.log(`🚀 Initializing user-specific data management for user: ${userId}`)
    
    // Run migration to move any existing global data to user-specific storage
    migrateUserDataToUserSpecific()
    
    // Initialize personalization system with Supabase
    // TODO: Replace with proper import when supabase-personalization module is available
    const getUserQuizConfig = () => null
    const createDefaultQuizConfig = () => ({})
    const saveUserQuizConfig = () => Promise.resolve()
    
    // Use async initialization
    const quizConfig = getUserQuizConfig()
    if (quizConfig !== null) {
      Promise.resolve(quizConfig).then((config: unknown) => {
      if (!config) {
        const _defaultConfig = createDefaultQuizConfig()
        saveUserQuizConfig().then(() => {
          console.log('📝 Created default quiz personalization config')
        })
      }
      }).catch((error: unknown) => {
        console.error('Error initializing personalization:', error)
      })
    }
    
    console.log('✅ User-specific data management initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize user-specific data management:', error)
  }
}

// Clear all user-specific data (for testing or account deletion)
export function clearUserSpecificData(userId: string): void {
  try {
    if (typeof window === 'undefined') return
    
    const keysToRemove = [
      `${STORAGE_KEYS.QUIZ_RESULTS}_${userId}`,
      `${STORAGE_KEYS.DETAILED_QUIZ_DATA}_${userId}`,
      `${STORAGE_KEYS.LEARNING_SESSIONS}_${userId}`,
      `${CARD_COLLECTION_KEY}_${userId}`,
      `ale_knowledge_card_collection_${userId}`,
      `ale_quiz_config_${userId}`,
      `ale_memory_strength_${userId}`,
      `ale_learning_metrics_${userId}`,
      `ale_learning_progress_${userId}`
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    console.log(`🗑️ Cleared all user-specific data for user: ${userId}`)
  } catch (error) {
    console.error('Failed to clear user-specific data:', error)
  }
}