import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

interface XPStats {
  user: {
    total_xp: number
    current_level: number
    quiz_xp: number
    course_xp: number
    bonus_xp: number
    quiz_sessions_completed: number
    course_sessions_completed: number
    quiz_average_accuracy: number
    wisdom_cards_total: number
    knowledge_cards_total: number
    badges_total: number
    last_activity_at?: string
  }
  categories: {
    [categoryId: string]: {
      total_xp: number
      current_level: number
      quiz_xp: number
      course_xp: number
      quiz_sessions_completed: number
      course_sessions_completed: number
      quiz_average_accuracy: number
    }
  }
  subcategories: {
    [subcategoryId: string]: {
      category_id: string
      total_xp: number
      current_level: number
      quiz_xp: number
      course_xp: number
      quiz_sessions_completed: number
      course_sessions_completed: number
      quiz_average_accuracy: number
    }
  }
  recent_activity: {
    date: string
    total_xp_earned: number
    quiz_xp_earned: number
    course_xp_earned: number
    bonus_xp_earned: number
    quiz_sessions: number
    course_sessions: number
  }[]
}

// 統合XP統計API - RLS認証対応版
export async function GET(request: Request) {
  try {
    console.log('📊 XP Stats API Request (RLS Protected)')
    
    // 認証付きSupabaseクライアント作成
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = user.id
    console.log('👤 Authenticated user:', userId.substring(0, 8) + '...')

    // 1. ユーザー全体統計取得（RLSで自動的に現在のユーザーのみ取得）
    const { data: userStats, error: userStatsError } = await supabase
      .from('user_xp_stats')
      .select('*')
      .single()

    if (userStatsError && userStatsError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`User stats error: ${userStatsError.message}`)
    }

    // 2. カテゴリー別統計取得（RLSで自動的に現在のユーザーのみ取得）
    const { data: categoryStats, error: categoryStatsError } = await supabase
      .from('user_category_xp_stats')
      .select('*')
      .order('total_xp', { ascending: false })

    if (categoryStatsError) {
      throw new Error(`Category stats error: ${categoryStatsError.message}`)
    }

    // 3. サブカテゴリー別統計取得（RLSで自動的に現在のユーザーのみ取得）
    const { data: subcategoryStats, error: subcategoryStatsError } = await supabase
      .from('user_subcategory_xp_stats')
      .select('*')
      .order('total_xp', { ascending: false })

    if (subcategoryStatsError) {
      throw new Error(`Subcategory stats error: ${subcategoryStatsError.message}`)
    }

    // 4. 最近30日の日別活動記録取得（RLSで自動的に現在のユーザーのみ取得）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: recentActivity, error: activityError } = await supabase
      .from('daily_xp_records')
      .select('*')
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false })
      .limit(30)

    if (activityError) {
      throw new Error(`Activity records error: ${activityError.message}`)
    }

    // データ整形
    const response: XPStats = {
      user: userStats ? {
        total_xp: userStats.total_xp || 0,
        current_level: userStats.current_level || 1,
        quiz_xp: userStats.quiz_xp || 0,
        course_xp: userStats.course_xp || 0,
        bonus_xp: userStats.bonus_xp || 0,
        quiz_sessions_completed: userStats.quiz_sessions_completed || 0,
        course_sessions_completed: userStats.course_sessions_completed || 0,
        quiz_average_accuracy: userStats.quiz_average_accuracy || 0,
        wisdom_cards_total: userStats.wisdom_cards_total || 0,
        knowledge_cards_total: userStats.knowledge_cards_total || 0,
        badges_total: userStats.badges_total || 0,
        last_activity_at: userStats.last_activity_at || undefined
      } : {
        // 新規ユーザー用のデフォルト値
        total_xp: 0,
        current_level: 1,
        quiz_xp: 0,
        course_xp: 0,
        bonus_xp: 0,
        quiz_sessions_completed: 0,
        course_sessions_completed: 0,
        quiz_average_accuracy: 0,
        wisdom_cards_total: 0,
        knowledge_cards_total: 0,
        badges_total: 0
      },
      categories: {},
      subcategories: {},
      recent_activity: recentActivity?.map(activity => ({
        date: activity.date,
        total_xp_earned: activity.total_xp_earned || 0,
        quiz_xp_earned: activity.quiz_xp_earned || 0,
        course_xp_earned: activity.course_xp_earned || 0,
        bonus_xp_earned: activity.bonus_xp_earned || 0,
        quiz_sessions: activity.quiz_sessions || 0,
        course_sessions: activity.course_sessions || 0
      })) || []
    }

    // カテゴリー統計整形
    categoryStats?.forEach(stat => {
      response.categories[stat.category_id] = {
        total_xp: stat.total_xp || 0,
        current_level: stat.current_level || 1,
        quiz_xp: stat.quiz_xp || 0,
        course_xp: stat.course_xp || 0,
        quiz_sessions_completed: stat.quiz_sessions_completed || 0,
        course_sessions_completed: stat.course_sessions_completed || 0,
        quiz_average_accuracy: stat.quiz_average_accuracy || 0
      }
    })

    // サブカテゴリー統計整形
    subcategoryStats?.forEach(stat => {
      response.subcategories[stat.subcategory_id] = {
        category_id: stat.category_id,
        total_xp: stat.total_xp || 0,
        current_level: stat.current_level || 1,
        quiz_xp: stat.quiz_xp || 0,
        course_xp: stat.course_xp || 0,
        quiz_sessions_completed: stat.quiz_sessions_completed || 0,
        course_sessions_completed: stat.course_sessions_completed || 0,
        quiz_average_accuracy: stat.quiz_average_accuracy || 0
      }
    })

    const totalXP = response.user.total_xp
    const categoryCount = Object.keys(response.categories).length
    const subcategoryCount = Object.keys(response.subcategories).length
    
    console.log(`✅ XP Stats API Success: ${totalXP} total XP, ${categoryCount} categories, ${subcategoryCount} subcategories`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ XP Stats API Error:', error)
    
    // 認証エラーの場合は401を返す
    if (error instanceof Error && error.message.includes('JWT')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch XP statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}