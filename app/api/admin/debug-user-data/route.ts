import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Debugging user data for user ${userId}`)

    const results: Record<string, unknown> = {}

    // Check all relevant tables for remaining data
    const tables = [
      'user_xp_stats_v2',
      'user_xp_stats', // v1テーブルもチェック
      'user_category_xp_stats_v2',
      'user_subcategory_xp_stats_v2',
      'category_xp_stats', // v1テーブルもチェック
      'daily_xp_records',
      'quiz_sessions',
      'skp_transactions',
      'user_badges',
      'learning_progress',
      'quiz_results',
      'user_progress'
    ]

    for (const tableName of tables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .eq('user_id', userId)

        if (error) {
          results[tableName] = { error: error.message, exists: false }
        } else {
          results[tableName] = { 
            count: count || 0, 
            data: data || [],
            exists: true 
          }
        }
      } catch (err) {
        results[tableName] = { 
          error: (err as Error).message, 
          exists: false 
        }
      }
    }

    // Get detailed user_xp_stats_v2 data if it exists
    const userXpStats = results.user_xp_stats_v2 as { count: number; data: unknown[] } | undefined
    if (userXpStats?.count && userXpStats.count > 0) {
      const userStats = userXpStats.data[0] as Record<string, unknown>
      console.log('📊 Found user_xp_stats_v2 data:', {
        total_xp: userStats.total_xp,
        quiz_xp: userStats.quiz_xp,
        total_skp: userStats.total_skp,
        quiz_sessions_completed: userStats.quiz_sessions_completed
      })
    }

    return NextResponse.json({
      success: true,
      userId,
      tableData: results,
      summary: {
        tablesWithData: Object.keys(results).filter(table => 
          (results[table] as { count?: number })?.count && (results[table] as { count: number }).count > 0
        ),
        totalTables: tables.length,
        existingTables: Object.keys(results).filter(table => 
          (results[table] as { exists?: boolean })?.exists
        )
      }
    })

  } catch (error) {
    console.error('❌ Debug user data error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}