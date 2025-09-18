import { supabase } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// デバッグ用: データベース接続とテーブル存在確認
export async function debugDatabaseAccess(): Promise<void> {
  console.log('🔍 DEBUGGING DATABASE ACCESS')
  
  try {
    // Check if we can access the users table
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(0)
    
    if (tableError) {
      console.error('❌ Users table access error:', tableError)
    } else {
      console.log('✅ Users table accessible')
    }
    
    // Check current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('❌ Auth user error:', authError)
    } else {
      console.log('✅ Auth user:', authUser?.id, authUser?.email)
    }
    
    // Check existing users in the table
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .limit(5)
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log('📊 Existing users in database:', existingUsers)
    }
    
  } catch (error) {
    console.error('❌ Database debug error:', error)
  }
}

export interface UserProfile {
  id: string
  email: string
  name?: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  learning_style: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed'
  experience_level: string | number // Allow both for compatibility
  total_xp: number
  current_level: number
  streak: number
  last_active: string
  selected_industry_categories?: string[] // 業界カテゴリー選択
  created_at?: string
  updated_at?: string
}

// ユーザープロファイルを取得
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // If profile doesn't exist, don't treat it as an error
      if (error.code === 'PGRST116') { // No rows returned
        return null
      }
      
      // If the table doesn't exist, return null to trigger profile creation
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('⚠️ Users table does not exist')
        return null
      }
      
      console.error('❌ Error fetching user profile:', error.message)
      return null
    }

    return data
  } catch (error) {
    console.error('❌ Exception in getUserProfile:', error)
    return null
  }
}

// ユーザープロファイルを作成
export async function createUserProfile(user: SupabaseUser): Promise<UserProfile | null> {
  try {
    const profile: Partial<UserProfile> = {
      id: user.id,
      email: user.email!,
      name: user.email?.split('@')[0], // メールのローカル部分を名前として使用
      skill_level: 'beginner',
      learning_style: 'mixed',
      experience_level: 'beginner',
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
      // If the profile already exists, try to fetch it
      if (error.code === '23505') { // Unique constraint violation
        return await getUserProfile(user.id)
      }
      
      // If the table doesn't exist, create a mock profile for development
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('⚠️ Users table does not exist, using mock profile')
        return {
          id: user.id,
          email: user.email!,
          name: user.email?.split('@')[0] || 'User',
          skill_level: 'beginner',
          learning_style: 'mixed',
          experience_level: 'beginner',
          total_xp: 0,
          current_level: 1,
          streak: 0,
          last_active: new Date().toISOString()
        }
      }
      
      console.error('❌ Error creating user profile:', error.message)
      return null
    }

    return data
  } catch (error) {
    console.error('❌ Exception in createUserProfile:', error)
    return null
  }
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
  console.log('🔄 Getting or creating user profile for:', user.id, user.email)
  
  try {
    // まず既存のプロファイルを取得
    let profile = await getUserProfile(user.id)
    
    // プロファイルが存在しない場合は作成
    if (!profile) {
      console.log('👤 No existing profile found, creating new one...')
      profile = await createUserProfile(user)
    } else {
      console.log('✅ Existing profile found:', profile)
    }

    return profile
  } catch (error) {
    console.error('❌ Error in getOrCreateUserProfile:', error)
    
    // If all else fails, return a basic profile to keep the app working
    console.warn('⚠️ Using fallback profile to keep app functional')
    return {
      id: user.id,
      email: user.email!,
      name: user.email?.split('@')[0] || 'User',
      skill_level: 'beginner',
      learning_style: 'mixed',
      experience_level: 'beginner',
      total_xp: 0,
      current_level: 1,
      streak: 0,
      last_active: new Date().toISOString()
    }
  }
}