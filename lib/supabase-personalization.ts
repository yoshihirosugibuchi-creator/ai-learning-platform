import { supabase } from './supabase'

// パーソナライゼーション用の型定義
export interface QuestionMemoryStrength {
  id?: string
  user_id: string
  question_id: string
  category: string
  memory_strength: number // 0-1 scale
  repetitions: number
  easiness: number // 1.3-3.0 scale
  interval: number // days until next review
  next_review_date: string
  last_review_date: string
  correct_streak: number
  incorrect_count: number
  total_attempts: number
  average_response_time: number
  difficulty_rating: number // 1-5 scale
  created_at?: string
  updated_at?: string
}

export interface PersonalizedQuizConfig {
  id?: string
  user_id: string
  preferred_difficulty: 'adaptive' | 'easy' | 'medium' | 'hard'
  focus_mode: 'review' | 'new' | 'mixed'
  session_length: number
  categories: string[]
  enable_spaced_repetition: boolean
  adaptive_difficulty: boolean
  review_priority: 'memory_strength' | 'time_since_review' | 'error_rate'
  created_at?: string
  updated_at?: string
}

export interface LearningEfficiencyMetrics {
  id?: string
  user_id: string
  optimal_session_length: number
  best_time_of_day: string
  average_focus_span: number // minutes
  category_mastery: Record<string, number>
  learning_velocity: number // questions mastered per hour
  retention_rate: number // percentage
  created_at?: string
  updated_at?: string
}

// Quiz Config Functions
export async function getUserQuizConfig(userId: string): Promise<PersonalizedQuizConfig | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('setting_key', 'quiz_config')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No data found - return null
      return null
    }
    console.error('Error fetching quiz config:', error)
    return null
  }

  return data?.setting_value as unknown as PersonalizedQuizConfig
}

export async function saveUserQuizConfig(config: PersonalizedQuizConfig): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      setting_key: 'quiz_config',
      setting_value: JSON.stringify(config)
    })

  if (error) {
    console.error('Error saving quiz config:', error)
    return false
  }

  return true
}

// Memory Strength Functions
export async function getQuestionMemoryStrength(userId: string): Promise<QuestionMemoryStrength[]> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('setting_key', 'memory_strength')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return []
    }
    console.error('Error fetching memory strength:', error)
    return []
  }

  return (data?.setting_value as unknown as QuestionMemoryStrength[]) || []
}

export async function saveQuestionMemoryStrength(userId: string, memoryData: QuestionMemoryStrength[]): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      setting_key: 'memory_strength',
      setting_value: JSON.stringify(memoryData)
    })

  if (error) {
    console.error('Error saving memory strength:', error)
    return false
  }

  return true
}

// Learning Efficiency Metrics Functions
export async function getLearningEfficiencyMetrics(userId: string): Promise<LearningEfficiencyMetrics | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('setting_key', 'learning_metrics')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching learning metrics:', error)
    return null
  }

  return data?.setting_value as unknown as LearningEfficiencyMetrics
}

export async function saveLearningEfficiencyMetrics(metrics: LearningEfficiencyMetrics): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      setting_key: 'learning_metrics',
      setting_value: JSON.stringify(metrics)
    })

  if (error) {
    console.error('Error saving learning metrics:', error)
    return false
  }

  return true
}

// Default config creation
export function createDefaultQuizConfig(userId: string): PersonalizedQuizConfig {
  return {
    user_id: userId,
    preferred_difficulty: 'adaptive',
    focus_mode: 'mixed',
    session_length: 10,
    categories: [],
    enable_spaced_repetition: true,
    adaptive_difficulty: true,
    review_priority: 'memory_strength'
  }
}

export function createDefaultLearningMetrics(userId: string): LearningEfficiencyMetrics {
  return {
    user_id: userId,
    optimal_session_length: 10,
    best_time_of_day: 'morning',
    average_focus_span: 15,
    category_mastery: {},
    learning_velocity: 0,
    retention_rate: 0
  }
}