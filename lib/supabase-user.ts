import { supabase } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { CategoryProgress } from './supabase-learning'

// ヘルパー関数: フォールバックプロフィール作成
function createFallbackProfile(userId: string): UserProfile {
  return {
    id: userId,
    email: '',
    name: 'User',
    role: 'user',
    skill_level: 'basic',
    learning_style: 'mixed',
    experience_level: 'basic',
    total_xp: 0,
    current_level: 1,
    streak: 0,
    last_active: new Date().toISOString()
  }
}

// ヘルパー関数: API レスポンスをUserProfile形式に変換
function convertApiProfileToUserProfile(apiProfile: Record<string, unknown>): UserProfile {
  console.log('🔄 Converting API profile to UserProfile:', apiProfile)
  
  const converted = {
    id: apiProfile.id as string,
    email: (apiProfile.email as string) || '',
    name: (apiProfile.name as string) || undefined,
    role: (apiProfile.role as string) || 'user',
    skill_level: (apiProfile.skill_level as 'basic' | 'intermediate' | 'advanced') || 'basic',
    learning_style: (apiProfile.learning_style as 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed') || 'mixed',
    experience_level: (apiProfile.experience_level as string) || 'basic',
    total_xp: (apiProfile.total_xp as number) || 0,
    current_level: (apiProfile.current_level as number) || 1,
    streak: (apiProfile.streak as number) || 0,
    last_active: (apiProfile.last_active as string) || new Date().toISOString(),
    selected_industry_categories: (apiProfile.selected_industry_categories as string[]) || undefined,
    created_at: (apiProfile.created_at as string) || undefined,
    updated_at: (apiProfile.updated_at as string) || undefined,
    // 🚨 プロフィールページで使用される拡張フィールドも追加
    display_name: (apiProfile.display_name as string) || undefined,
    job_title: (apiProfile.job_title as string) || undefined,
    position_level: (apiProfile.position_level as string) || undefined,
    learning_level: (apiProfile.learning_level as string) || undefined,
    industry: (apiProfile.industry as string) || undefined,
    experience_years: (apiProfile.experience_years as number) || undefined,
    interested_industries: (apiProfile.interested_industries as string[]) || undefined,
    learning_goals: (apiProfile.learning_goals as string[]) || undefined,
    selected_categories: (apiProfile.selected_categories as string[]) || undefined,
    weekly_goal: (apiProfile.weekly_goal as string) || undefined,
    profile_completed_at: (apiProfile.profile_completed_at as string) || undefined,
    last_profile_update: (apiProfile.last_profile_update as string) || undefined
  } as UserProfile & Record<string, unknown>
  
  console.log('✅ Converted profile:', converted)
  return converted
}

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
  role?: string // 権限管理用
  skill_level?: 'basic' | 'intermediate' | 'advanced'
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


// ユーザープロファイルを取得（AuthProvider用 - API経由でRLS権限回避）
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('🔄 Fetching user profile via API for user:', userId)
    
    // 🚨 CRITICAL: CLAUDE.mdに従い、クライアントサイドからは直接usersテーブルにアクセスしない
    // 代わりに/api/profileエンドポイントを使用してRLS問題を回避
    
    // まずセッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.warn('⚠️ No valid session for API call:', sessionError?.message)
      return createFallbackProfile(userId)
    }
    
    try {
      // API経由でプロフィール取得（RLS回避）
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.warn(`⚠️ Profile API error: ${response.status} ${response.statusText}`)
        return createFallbackProfile(userId)
      }
      
      const { profile } = await response.json()
      
      if (!profile) {
        console.warn('⚠️ No profile data from API')
        return createFallbackProfile(userId)
      }
      
      // APIから取得したデータをUserProfile形式に変換
      console.log('✅ Profile fetched successfully via API')
      return convertApiProfileToUserProfile(profile)
      
    } catch (apiError) {
      console.warn('⚠️ API call failed:', apiError)
      return createFallbackProfile(userId)
    }
  } catch (error) {
    console.error('❌ Error fetching user profile:', error)
    return createFallbackProfile(userId)
  }
}

// ユーザープロファイルを作成
export async function createUserProfile(user: SupabaseUser): Promise<UserProfile | null> {
  try {
    const profile = {
      id: user.id,
      email: user.email || '',
      name: user.email?.split('@')[0], // メールのローカル部分を名前として使用
      skill_level: 'basic',
      learning_style: 'mixed',
      experience_level: 'basic',
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
          skill_level: 'basic',
          learning_style: 'mixed',
          experience_level: 'basic',
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
      skill_level: data.skill_level as 'basic' | 'intermediate' | 'advanced' | undefined,
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
    skill_level: data.skill_level as 'basic' | 'intermediate' | 'advanced' | undefined,
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
  
  // まずは即座にフォールバックプロファイルを準備（全フィールド含む）
  const fallbackProfile: UserProfile = {
    id: user.id,
    email: user.email!,
    name: user.email?.split('@')[0] || 'User',
    role: 'user', // 🚨 CRITICAL: role フィールドを追加
    skill_level: 'basic',
    learning_style: 'mixed',
    experience_level: 'basic',
    total_xp: 0,
    current_level: 1,
    streak: 0,
    last_active: new Date().toISOString()
  } as UserProfile & Record<string, unknown>
  
  try {
    // 延長されたタイムアウトで既存プロファイルを取得試行（AuthProviderと整合）
    const fetchTimeout = new Promise<UserProfile | null>((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 6000)
    )
    
    let profile: UserProfile | null = null
    
    try {
      const fetchOperation = getUserProfile(user.id)
      profile = await Promise.race([fetchOperation, fetchTimeout])
      
      if (profile) {
        console.log('✅ Existing profile found:', profile)
        // 🚨 CRITICAL: 実際のroleが取得できた場合はfallbackProfileのroleを更新
        if (profile.role && profile.role !== 'user') {
          fallbackProfile.role = profile.role
          console.log('🔐 Updated fallback role to:', profile.role)
        }
        return profile
      }
    } catch (fetchError) {
      console.warn('⚠️ Profile fetch failed or timed out:', fetchError)
      
      // 🚨 CRITICAL: プロファイル取得に失敗した場合でも権限だけは取得試行
      try {
        console.log('🔐 Attempting direct role fetch from users table...')
        const { data: roleData, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (!roleError && roleData?.role) {
          fallbackProfile.role = roleData.role
          console.log('✅ Direct role fetch successful:', roleData.role)
        }
      } catch (roleError) {
        console.warn('⚠️ Direct role fetch also failed:', roleError)
      }
    }
    
    // 🚨 RLS修正後: プロフィール作成はサーバーサイドで行う
    // クライアントサイドでのusersテーブル直接作成は停止
    console.log('👤 No existing profile found, will rely on server-side creation')
    
    // Note: プロフィール作成は必要に応じて/api/profileでサーバーサイドで実装
    
    // フォールバックプロファイルを即座に返す
    console.log('🔄 Using fallback profile for immediate use')
    return fallbackProfile
    
  } catch (error) {
    console.error('❌ Error in getOrCreateUserProfile:', error)
    console.warn('⚠️ Using fallback profile to keep app functional')
    return fallbackProfile
  }
}