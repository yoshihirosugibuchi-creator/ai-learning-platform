import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

/**
 * プロフィール取得API
 * RLS回避でサーバーサイドから直接usersテーブルにアクセス
 */
export async function GET(request: NextRequest) {
  try {
    // 🚨 CRITICAL: CLAUDE.mdの認証基準に従い、getCurrentUserRoleを使用
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('👤 Profile API Request for user:', userId)

    // サーバーサイドでusersテーブルから直接取得（RLS回避）
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching user profile:', error)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('✅ Profile fetched successfully:', {
      userId: profile.id,
      email: profile.email,
      hasSelectedCategories: !!profile.selected_categories,
      hasLearningGoals: !!profile.learning_goals,
      role: profile.role
    })

    return NextResponse.json({ profile })

  } catch (error) {
    console.error('❌ Profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * プロフィール更新API
 * RLS回避でサーバーサイドから直接usersテーブルを更新
 */
export async function PUT(request: NextRequest) {
  try {
    // 🚨 CRITICAL: CLAUDE.mdの認証基準に従い、getCurrentUserRoleを使用
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    console.log('🔄 Profile update request:', { userId, updateData: Object.keys(body) })

    // サーバーサイドでusersテーブルを更新（RLS回避）
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('users')
      .update({
        name: body.name,
        display_name: body.displayName,
        industry: body.industry,
        job_title: body.jobTitle,
        position_level: body.positionLevel,
        learning_level: body.learningLevel,
        experience_years: body.experienceYears,
        interested_industries: body.interestedIndustries,
        learning_goals: body.learningGoals,
        selected_categories: body.selectedCategories,
        selected_industry_categories: body.selectedIndustryCategories,
        weekly_goal: body.weeklyGoal,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating user profile:', error)
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
    }

    console.log('✅ Profile updated successfully')
    return NextResponse.json({ profile: updatedProfile })

  } catch (error) {
    console.error('❌ Profile update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}