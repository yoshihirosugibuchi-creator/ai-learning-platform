import { createClient } from '@supabase/supabase-js'
import type { Database } from './database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 開発環境でのみSupabaseログを表示
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key (first 10 chars):', supabaseAnonKey.substring(0, 10))
}

// Supabaseクライアントを作成（Database型あり）
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
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

// Database types
export interface User {
  id: string
  email: string
  name: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
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