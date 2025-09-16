import { supabase } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  name?: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic'
  experience_level: number
  total_xp: number
  current_level: number
  streak: number
  last_active: string
  created_at: string
  updated_at: string
}

// ユーザープロファイルを取得
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

// ユーザープロファイルを作成
export async function createUserProfile(user: SupabaseUser): Promise<UserProfile | null> {
  const profile: Partial<UserProfile> = {
    id: user.id,
    email: user.email!,
    name: user.email?.split('@')[0], // メールのローカル部分を名前として使用
    skill_level: 'beginner',
    learning_style: 'visual',
    experience_level: 0,
    total_xp: 0,
    current_level: 1,
    streak: 0,
    last_active: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('users')
    .insert([profile])
    .select()
    .single()

  if (error) {
    console.error('Error creating user profile:', error)
    return null
  }

  return data
}

// ユーザープロファイルを更新
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }

  return data
}

// ユーザープロファイルを取得または作成
export async function getOrCreateUserProfile(user: SupabaseUser): Promise<UserProfile | null> {
  // まず既存のプロファイルを取得
  let profile = await getUserProfile(user.id)
  
  // プロファイルが存在しない場合は作成
  if (!profile) {
    profile = await createUserProfile(user)
  }

  return profile
}