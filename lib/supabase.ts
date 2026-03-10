import { createClient } from '@supabase/supabase-js'
import type { Database } from './database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 開発環境でのみSupabaseログを表示
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key (first 10 chars):', supabaseAnonKey.substring(0, 10))
}

// ネイティブアプリ判定（Capacitor）
const isCapacitorNative = typeof window !== 'undefined' &&
  !!(window as unknown as Record<string, unknown>).Capacitor &&
  (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.() === true

/**
 * ネイティブアプリ用ストレージアダプター
 * WKWebView の localStorage は終了時にディスクに書かれないことがあるため、
 * UserDefaults（ALESimpleStorage）に保存する
 */
function createNativeStorage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pluginInstance: any = null

  const getPlugin = async () => {
    if (!pluginInstance) {
      const { registerPlugin } = await import('@capacitor/core')
      pluginInstance = registerPlugin('ALESimpleStorage')
    }
    return pluginInstance
  }

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const plugin = await getPlugin()
        const { value } = await plugin.getItem({ key })
        return value ?? null
      } catch {
        // フォールバック: localStorage
        return localStorage.getItem(key)
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        const plugin = await getPlugin()
        await plugin.setItem({ key, value })
      } catch {
        // フォールバック: localStorage
        localStorage.setItem(key, value)
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        const plugin = await getPlugin()
        await plugin.removeItem({ key })
      } catch {
        // フォールバック: localStorage
        localStorage.removeItem(key)
      }
    },
  }
}

// ストレージ選択: ネイティブ → UserDefaults、ブラウザ → localStorage（デフォルト）
const storage = isCapacitorNative ? createNativeStorage() : undefined

// Supabaseクライアントを作成（Database型あり）
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    ...(storage ? { storage } : {}),
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js'
    }
  },
  // リアルタイム接続のログを無効化
  realtime: {
    params: {
      log_level: 'silent'
    }
  }
})

// グローバル認証エラーハンドラー
supabase.auth.onAuthStateChange((event, session) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 Auth state change:', event, session?.user?.email || 'no user')
  }

  // Refresh Token エラーの処理
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('⚠️ Token refresh failed, clearing session')
    supabase.auth.signOut()
  }
})

// エラーハンドリング用のラッパー関数
export const handleSupabaseError = async (error: unknown) => {
  // Refresh Token エラーの場合は自動ログアウト
  const errorMessage = (error as Error)?.message || ''
  if (errorMessage.includes('Invalid Refresh Token') ||
      errorMessage.includes('Refresh Token Not Found')) {
    console.warn('🔄 Invalid refresh token detected, signing out...')
    await supabase.auth.signOut()
    // ページリロードして認証状態をクリア
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }
  throw error
}

// Database types
export interface User {
  id: string
  email: string
  name: string
  skill_level: 'basic' | 'intermediate' | 'advanced'
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic'
  experience_level: number
  created_at: string
  updated_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  category_id: string
  subcategory_id?: string
  correct_answers: number
  total_attempts: number
  last_accessed: string
  created_at: string
}

export interface QuizResult {
  id: string
  user_id: string
  category_id: string
  subcategory_id?: string
  questions: Record<string, unknown>[]
  answers: Record<string, unknown>[]
  score: number
  total_questions: number
  time_taken: number
  completed_at: string
}
