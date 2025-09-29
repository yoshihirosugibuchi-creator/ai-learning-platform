import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// XP Stats APIと同じ認証方法を使用してデバッグ
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

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging XP Stats API with same auth method')
    
    // XP Stats APIと同じ認証方法を使用
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

    const debugResults: Record<string, unknown> = {}

    // 1. XP Stats APIが使用する正確な同じクエリを実行
    console.log('🔍 Testing user_xp_stats_v2 query...')
    try {
      const { data: userStats, error: userStatsError } = await supabase
        .from('user_xp_stats_v2')
        .select('*')
        .single()

      debugResults.user_xp_stats_v2_query = {
        data: userStats,
        error: userStatsError?.message || null,
        code: userStatsError?.code || null
      }
      
      if (userStats) {
        console.log('📊 Found user_xp_stats_v2 data:', {
          total_xp: userStats.total_xp,
          quiz_xp: userStats.quiz_xp,
          quiz_sessions_completed: userStats.quiz_sessions_completed
        })
      }
    } catch (err) {
      debugResults.user_xp_stats_v2_query = {
        error: (err as Error).message,
        exception: true
      }
    }

    // 2. カテゴリー統計のクエリ
    console.log('🔍 Testing user_category_xp_stats_v2 query...')
    try {
      const { data: categoryStats, error: categoryStatsError } = await supabase
        .from('user_category_xp_stats_v2')
        .select('*')
        .order('total_xp', { ascending: false })

      debugResults.user_category_xp_stats_v2_query = {
        data: categoryStats,
        count: categoryStats?.length || 0,
        error: categoryStatsError?.message || null
      }
    } catch (err) {
      debugResults.user_category_xp_stats_v2_query = {
        error: (err as Error).message,
        exception: true
      }
    }

    // 3. サブカテゴリー統計のクエリ
    console.log('🔍 Testing user_subcategory_xp_stats_v2 query...')
    try {
      const { data: subcategoryStats, error: subcategoryStatsError } = await supabase
        .from('user_subcategory_xp_stats_v2')
        .select('*')
        .order('total_xp', { ascending: false })

      debugResults.user_subcategory_xp_stats_v2_query = {
        data: subcategoryStats,
        count: subcategoryStats?.length || 0,
        error: subcategoryStatsError?.message || null
      }
    } catch (err) {
      debugResults.user_subcategory_xp_stats_v2_query = {
        error: (err as Error).message,
        exception: true
      }
    }

    // 4. 日別XP記録のクエリ
    console.log('🔍 Testing daily_xp_records query...')
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: recentActivity, error: activityError } = await supabase
        .from('daily_xp_records')
        .select('*')
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: false })
        .limit(30)

      debugResults.daily_xp_records_query = {
        data: recentActivity,
        count: recentActivity?.length || 0,
        error: activityError?.message || null,
        query_date_from: thirtyDaysAgo
      }
    } catch (err) {
      debugResults.daily_xp_records_query = {
        error: (err as Error).message,
        exception: true
      }
    }

    // 5. RLSポリシーが正しく適用されているかテスト
    console.log('🔍 Testing RLS policy with manual user_id filter...')
    try {
      const { data: manualQuery, error: manualError } = await supabase
        .from('user_xp_stats_v2')
        .select('*')
        .eq('user_id', userId)

      debugResults.manual_user_id_filter = {
        data: manualQuery,
        count: manualQuery?.length || 0,
        error: manualError?.message || null
      }
    } catch (err) {
      debugResults.manual_user_id_filter = {
        error: (err as Error).message,
        exception: true
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      debugResults,
      summary: {
        has_user_stats: !!(debugResults.user_xp_stats_v2_query as { data?: unknown })?.data,
        user_stats_xp: ((debugResults.user_xp_stats_v2_query as { data?: { total_xp?: number } })?.data?.total_xp) || 0,
        category_count: (debugResults.user_category_xp_stats_v2_query as { count?: number })?.count || 0,
        subcategory_count: (debugResults.user_subcategory_xp_stats_v2_query as { count?: number })?.count || 0,
        activity_count: (debugResults.daily_xp_records_query as { count?: number })?.count || 0
      }
    })

  } catch (error) {
    console.error('❌ Debug XP Stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    )
  }
}