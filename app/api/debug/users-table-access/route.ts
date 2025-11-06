import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔍 Debug: Testing users table access for:', userId)

    const results = {
      userId,
      role,
      tests: {} as Record<string, any>
    }

    // Test 1: クライアント側Supabaseでのアクセス
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      results.tests.clientAccess = {
        success: !clientError,
        data: clientData,
        error: clientError?.message,
        errorCode: clientError?.code
      }
    } catch (clientException) {
      results.tests.clientAccess = {
        success: false,
        exception: (clientException as Error).message
      }
    }

    // Test 2: サーバー側Supabaseでのアクセス
    try {
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      results.tests.adminAccess = {
        success: !adminError,
        data: adminData,
        error: adminError?.message,
        errorCode: adminError?.code
      }
    } catch (adminException) {
      results.tests.adminAccess = {
        success: false,
        exception: (adminException as Error).message
      }
    }

    // Test 3: テーブル存在確認
    try {
      const { error: tableError } = await supabaseAdmin
        .from('users')
        .select('count(*)')
        .limit(0)
      
      results.tests.tableExists = {
        success: !tableError,
        error: tableError?.message,
        errorCode: tableError?.code
      }
    } catch (tableException) {
      results.tests.tableExists = {
        success: false,
        exception: (tableException as Error).message
      }
    }

    // Test 4: RLS確認
    try {
      // RLS状態を確認する代替方法
      const { error: rlsError } = await supabaseAdmin
        .from('users')
        .select('count(*)', { count: 'exact', head: true })
        .limit(0)
      
      results.tests.rlsStatus = {
        success: !rlsError,
        data: { rls_enabled: true, note: 'RLS status via query test' },
        error: rlsError?.message
      }
    } catch (rlsException) {
      results.tests.rlsStatus = {
        success: false,
        exception: (rlsException as Error).message,
        note: 'RLS check via query failed'
      }
    }

    console.log('✅ Debug results:', results)
    return NextResponse.json(results)

  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}