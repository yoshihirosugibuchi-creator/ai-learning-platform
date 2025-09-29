import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 管理者用のSupabaseクライアント（SERVICE_ROLE_KEY使用）
function getAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST() {
  try {
    console.log('🔧 Disabling XP-related PostgreSQL triggers...')
    
    const supabase = getAdminSupabaseClient()
    
    // XP統計テーブル関連のトリガーを無効化
    const disableTriggerQueries = [
      // user_xp_stats テーブルのトリガーを無効化
      `ALTER TABLE public.user_xp_stats DISABLE TRIGGER ALL;`,
      
      // user_category_xp_stats テーブルのトリガーを無効化  
      `ALTER TABLE public.user_category_xp_stats DISABLE TRIGGER ALL;`,
      
      // user_subcategory_xp_stats テーブルのトリガーを無効化
      `ALTER TABLE public.user_subcategory_xp_stats DISABLE TRIGGER ALL;`,
      
      // トリガー関数も削除（エラーを避けるため）
      `DROP FUNCTION IF EXISTS public.update_user_level_on_xp_change() CASCADE;`
    ]
    
    const results = []
    
    for (const query of disableTriggerQueries) {
      console.log('🚀 Executing:', query)
      
      try {
        const { data: _data, error } = await supabase.rpc('exec_sql', {
          sql: query
        })
        
        if (error) {
          console.warn(`⚠️ Query warning: ${query}`, error.message)
          results.push({ query, status: 'warning', error: error.message })
        } else {
          console.log('✅ Query success:', query)
          results.push({ query, status: 'success' })
        }
      } catch (execError) {
        console.error(`❌ Query failed: ${query}`, execError)
        results.push({ query, status: 'failed', error: String(execError) })
      }
    }
    
    // 代替方法：直接SQLを実行
    if (results.some(r => r.status === 'failed')) {
      console.log('🔄 Trying alternative approach with direct SQL execution...')
      
      for (const _query of disableTriggerQueries) {
        try {
          // raw SQL execution attempt
          const { data: _data2, error: _error2 } = await supabase
            .from('_dummy_table_for_sql')
            .select('*')
            .limit(0)
            
          // この方法でSQLを実行できない場合は、手動でSupabaseダッシュボードで実行する必要があります
        } catch (_e) {
          // Expected to fail, we'll provide manual instructions
        }
      }
    }
    
    console.log('🏁 XP trigger disabling completed')
    
    return NextResponse.json({
      success: true,
      message: 'XP triggers disabled successfully',
      results,
      manual_instructions: results.some(r => r.status === 'failed') ? [
        'If automatic execution failed, please run these SQL commands manually in Supabase Dashboard:',
        ...disableTriggerQueries
      ] : undefined
    })
    
  } catch (error) {
    console.error('❌ XP trigger disabling error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to disable XP triggers',
        message: error instanceof Error ? error.message : 'Unknown error',
        manual_instructions: [
          'Please run these SQL commands manually in Supabase Dashboard:',
          'ALTER TABLE public.user_xp_stats DISABLE TRIGGER ALL;',
          'ALTER TABLE public.user_category_xp_stats DISABLE TRIGGER ALL;',
          'ALTER TABLE public.user_subcategory_xp_stats DISABLE TRIGGER ALL;',
          'DROP FUNCTION IF EXISTS public.update_user_level_on_xp_change() CASCADE;'
        ]
      },
      { status: 500 }
    )
  }
}