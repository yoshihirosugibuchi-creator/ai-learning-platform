import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role keyを使用してRLSをバイパス
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log(`🔧 FORCE resetting ALL data for user ${userId} (RLS bypass)`)

    const deletedTables: string[] = []
    const errors: string[] = []

    // すべてのテーブルを強制削除（RLSバイパス）
    const tablesToReset = [
      'learning_progress',
      'user_badges', 
      'user_xp_stats',
      'user_xp_stats_v2',
      'user_category_xp_stats', // v1テーブル（正しい名前）
      'user_category_xp_stats_v2',
      'user_subcategory_xp_stats_v2',
      'course_session_completions',
      'course_theme_completions', 
      'course_completions',
      'user_progress',
      'quiz_results',
      'detailed_quiz_data',
      'knowledge_card_collection',
      'wisdom_card_collection',
      'user_settings',
      'skp_transactions',
      'daily_xp_records',
      'quiz_sessions'
      // quiz_answers は quiz_sessions 削除時に自動削除されるため除外
    ]

    for (const tableName of tablesToReset) {
      try {
        const { error, count } = await supabaseAdmin
          .from(tableName)
          .delete()
          .eq('user_id', userId)

        if (error) {
          console.warn(`⚠️ Error deleting ${tableName}:`, error)
          errors.push(`${tableName}: ${error.message}`)
        } else {
          console.log(`✅ ${tableName} deleted (count: ${count})`)
          deletedTables.push(tableName)
        }
      } catch (err) {
        console.warn(`⚠️ Exception deleting ${tableName}:`, err)
        errors.push(`${tableName}: ${(err as Error).message}`)
      }
    }

    // quiz_answers は quiz_sessions 削除時に外部キー制約で自動削除される
    // 手動削除は不要（user_id カラムも存在しない）
    console.log('ℹ️ quiz_answers は quiz_sessions 削除時に自動削除されます')

    // 最終確認クエリ
    const verificationResults: Record<string, number | string> = {}
    for (const tableName of tablesToReset) {
      try {
        const { count } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        
        verificationResults[tableName] = count || 0
      } catch (_err) {
        verificationResults[tableName] = 'error'
      }
    }

    console.log('🎉 Force reset completed')
    console.log('Deleted from tables:', deletedTables)
    console.log('Verification results:', verificationResults)
    
    if (errors.length > 0) {
      console.log('Errors encountered:', errors)
    }

    return NextResponse.json({
      success: true,
      message: `Force reset completed for user ${userId}`,
      deletedTables,
      errors: errors.length > 0 ? errors : null,
      verification: verificationResults,
      totalTablesProcessed: tablesToReset.length
    })

  } catch (error) {
    console.error('❌ Force reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}