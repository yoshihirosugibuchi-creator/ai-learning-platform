// 管理者権限でXP統計を取得するAPI（開発用）
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    console.log('📊 Admin XP Stats API Request (No RLS)')
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    // 管理者権限でユーザー統計取得
    const { data: userStats, error: userStatsError } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('User stats result:', { userStats, userStatsError })

    if (userStatsError) {
      console.error('❌ User stats error:', userStatsError)
      return NextResponse.json({ error: userStatsError.message }, { status: 500 })
    }

    // カテゴリー統計取得
    const { data: categories, error: _categoriesError } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)

    // サブカテゴリー統計取得  
    const { data: subcategories, error: _subcategoriesError } = await supabaseAdmin
      .from('user_subcategory_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)

    // 最近の活動取得
    const { data: recentActivity, error: _activityError } = await supabaseAdmin
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30)

    // Convert categories array to object with category_id as key
    const categoriesObject: Record<string, {category_id: string; total_xp: number; quiz_xp: number; course_xp: number; current_level: number; quiz_sessions_completed: number; course_sessions_completed: number; quiz_average_accuracy: number}> = {}
    if (categories) {
      for (const category of categories) {
        categoriesObject[category.category_id] = {
          category_id: category.category_id,
          total_xp: category.total_xp,
          current_level: category.current_level,
          quiz_xp: category.quiz_xp,
          course_xp: category.course_xp,
          quiz_sessions_completed: category.quiz_sessions_completed,
          course_sessions_completed: category.course_sessions_completed,
          quiz_average_accuracy: category.quiz_average_accuracy
        }
      }
    }

    // Convert subcategories array to object with composite key
    const subcategoriesObject: Record<string, {category_id: string; subcategory_id: string; total_xp: number; quiz_xp: number; course_xp: number; current_level: number; quiz_sessions_completed: number; course_sessions_completed: number; quiz_average_accuracy: number}> = {}
    if (subcategories) {
      for (const subcategory of subcategories) {
        const key = `${subcategory.category_id}:${subcategory.subcategory_id}`
        subcategoriesObject[key] = {
          category_id: subcategory.category_id,
          subcategory_id: subcategory.subcategory_id,
          total_xp: subcategory.total_xp,
          current_level: subcategory.current_level,
          quiz_xp: subcategory.quiz_xp,
          course_xp: subcategory.course_xp,
          quiz_sessions_completed: subcategory.quiz_sessions_completed,
          course_sessions_completed: subcategory.course_sessions_completed,
          quiz_average_accuracy: subcategory.quiz_average_accuracy
        }
      }
    }

    // Calculate learning streak (since daily_xp_records is empty, use quiz_sessions)
    let learningStreak = 0
    try {
      const { getUserLearningStreak } = await import('@/lib/supabase-learning')
      learningStreak = await getUserLearningStreak(userId)
    } catch (streakError) {
      console.warn('Failed to calculate learning streak:', streakError)
    }

    const response = {
      user: {
        ...(userStats || {
          total_xp: 0,
          current_level: 1,
          quiz_xp: 0,
          course_xp: 0,
          bonus_xp: 0,
          total_skp: 0,
          quiz_skp: 0,
          course_skp: 0,
          bonus_skp: 0,
          streak_skp: 0,
          quiz_sessions_completed: 0,
          course_sessions_completed: 0,
          quiz_average_accuracy: 0,
          wisdom_cards_total: 0,
          knowledge_cards_total: 0,
          badges_total: 0
        }),
        learning_streak: learningStreak
      },
      categories: categoriesObject,
      subcategories: subcategoriesObject,
      recent_activity: recentActivity || []
    }

    console.log('✅ Admin XP Stats API Success:', {
      totalXP: response.user.total_xp,
      categoriesCount: Object.keys(response.categories).length,
      subcategoriesCount: Object.keys(response.subcategories).length,
      // 学習時間フィールドの確認
      quiz_time_seconds: response.user.quiz_learning_time_seconds,
      course_time_seconds: response.user.course_learning_time_seconds,
      total_learning_time_seconds: response.user.total_learning_time_seconds
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Admin XP Stats API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}