import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A'

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key (first 10 chars):', supabaseAnonKey.substring(0, 10))

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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