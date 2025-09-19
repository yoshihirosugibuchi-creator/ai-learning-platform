import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key (first 10 chars):', supabaseAnonKey.substring(0, 10))

// 認証設定でリダイレクトURLを設定
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
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
  questions: any[]
  answers: any[]
  score: number
  total_questions: number
  time_taken: number
  completed_at: string
}