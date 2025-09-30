import { supabase } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { CategoryProgress } from './supabase-learning'

// デバッグ用: データベース接続とテーブル存在確認
export async function debugDatabaseAccess(): Promise<void> {
  console.log('🔍 DEBUGGING DATABASE ACCESS')
  
  try {
    // Check if we can access the users table
    const { data: _tableInfo, error: tableError } = await supabase
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
  skill_level?: 'beginner' | 'intermediate' | 'advanced'
  learning_style?: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed'
  experience_level?: string | number // Allow both for compatibility
  total_xp: number
  current_level: number
  streak: number
  last_active: string
  selected_industry_categories?: string[] // 業界カテゴリー選択
  created_at?: string
  updated_at?: string
}

// 関連データを含む拡張プロファイル（QuizSession等で使用）
export interface UserProfileWithProgress extends UserProfile {
  categoryProgress?: CategoryProgress[]
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

    // DBデータをUserProfile形式に変換（NULL→未設定）
    return {
      id: data.id,
      email: data.email,
      name: data.name || undefined,
      skill_level: data.skill_level as 'beginner' | 'intermediate' | 'advanced' | undefined,
      learning_style: data.learning_style as 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed' | undefined,
      experience_level: data.experience_level || undefined,
      total_xp: data.total_xp || 0,
      current_level: data.current_level || 1,
      streak: data.streak || 0,
      last_active: data.last_active || new Date().toISOString(),
      selected_industry_categories: data.selected_industry_categories as string[] | undefined,
      created_at: data.created_at || undefined,
      updated_at: data.updated_at || undefined
    }
  } catch (error) {
    console.error('❌ Exception in getUserProfile:', error)
    return null
  }
}

// ユーザープロファイルを作成
export async function createUserProfile(user: SupabaseUser): Promise<UserProfile | null> {
  try {
    const profile = {
      id: user.id,
      email: user.email || '',
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
      .insert(profile)
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

    // DBデータをUserProfile形式に変換
    return {
      id: data.id,
      email: data.email,
      name: data.name || undefined,
      skill_level: data.skill_level as 'beginner' | 'intermediate' | 'advanced' | undefined,
      learning_style: data.learning_style as 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed' | undefined,
      experience_level: data.experience_level || undefined,
      total_xp: data.total_xp || 0,
      current_level: data.current_level || 1,
      streak: data.streak || 0,
      last_active: data.last_active || new Date().toISOString(),
      selected_industry_categories: data.selected_industry_categories as string[] | undefined,
      created_at: data.created_at || undefined,
      updated_at: data.updated_at || undefined
    }
  } catch (error) {
    console.error('❌ Exception in createUserProfile:', error)
    return null
  }
}

// ユーザープロファイルを更新
export async function updateUserProfile(userId: string, updates: Record<string, unknown>): Promise<UserProfile | null> {
  console.log('Updating user profile with data:', { userId, updates })
  
  // Create the update object with proper field mapping
  const updateData: Record<string, unknown> = {}
  
  // Map the fields from the form to database column names
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.display_name !== undefined) updateData.display_name = updates.display_name
  if (updates.industry !== undefined) updateData.industry = updates.industry
  if (updates.job_title !== undefined) updateData.job_title = updates.job_title
  if (updates.position_level !== undefined) updateData.position_level = updates.position_level
  if (updates.learning_level !== undefined) updateData.learning_level = updates.learning_level
  if (updates.experience_years !== undefined) updateData.experience_years = parseInt(String(updates.experience_years)) || 0
  if (updates.interested_industries !== undefined) updateData.interested_industries = updates.interested_industries
  if (updates.learning_goals !== undefined) updateData.learning_goals = updates.learning_goals
  if (updates.selected_categories !== undefined) updateData.selected_categories = updates.selected_categories
  if (updates.selected_industry_categories !== undefined) updateData.selected_industry_categories = updates.selected_industry_categories
  if (updates.weekly_goal !== undefined) updateData.weekly_goal = updates.weekly_goal
  
  // Always update timestamp
  updateData.updated_at = new Date().toISOString()
  
  console.log('Final update data:', updateData)
  
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    throw new Error(`Failed to update user profile: ${error.message || 'Unknown error'}`)
  }

  console.log('Profile updated successfully:', data)
  // DBデータをUserProfile形式に変換
  return {
    id: data.id,
    email: data.email,
    name: data.name || undefined,
    skill_level: data.skill_level as 'beginner' | 'intermediate' | 'advanced' | undefined,
    learning_style: data.learning_style as 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed' | undefined,
    experience_level: data.experience_level || undefined,
    total_xp: data.total_xp || 0,
    current_level: data.current_level || 1,
    streak: data.streak || 0,
    last_active: data.last_active || new Date().toISOString(),
    selected_industry_categories: data.selected_industry_categories as string[] | undefined,
    created_at: data.created_at || undefined,
    updated_at: data.updated_at || undefined
  }
}

// ユーザープロファイルを取得または作成
export async function getOrCreateUserProfile(user: SupabaseUser): Promise<UserProfile | null> {
  console.log('🔄 Getting or creating user profile for:', user.id, user.email)
  
  // まずは即座にフォールバックプロファイルを準備
  const fallbackProfile: UserProfile = {
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
  
  try {
    // 短いタイムアウトで既存プロファイルを取得試行
    const fetchTimeout = new Promise<UserProfile | null>((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
    )
    
    let profile: UserProfile | null = null
    
    try {
      const fetchOperation = getUserProfile(user.id)
      profile = await Promise.race([fetchOperation, fetchTimeout])
      
      if (profile) {
        console.log('✅ Existing profile found:', profile)
        return profile
      }
    } catch (fetchError) {
      console.warn('⚠️ Profile fetch failed or timed out:', fetchError)
    }
    
    // プロファイル作成を試行（非同期で実行、失敗してもフォールバックを返す）
    console.log('👤 No existing profile found, attempting background creation...')
    
    // バックグラウンドでプロファイル作成を試行（結果を待たない）
    createUserProfile(user).then(createdProfile => {
      if (createdProfile) {
        console.log('✅ Profile created in background:', createdProfile)
      }
    }).catch(createError => {
      console.warn('⚠️ Background profile creation failed:', createError)
    })
    
    // フォールバックプロファイルを即座に返す
    console.log('🔄 Using fallback profile for immediate use')
    return fallbackProfile
    
  } catch (error) {
    console.error('❌ Error in getOrCreateUserProfile:', error)
    console.warn('⚠️ Using fallback profile to keep app functional')
    return fallbackProfile
  }
}