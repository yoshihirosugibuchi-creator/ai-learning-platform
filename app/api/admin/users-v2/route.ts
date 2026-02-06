import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET: ユーザー一覧を取得（アプリケーション独自のusersテーブルベース）
export async function GET(request: Request) {
  try {
    console.log('👥 Users V2 API - GET Request (App-based)')

    // 認証ヘッダーからトークン取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Supabaseクライアントでセッション確認（supabaseAdminで認証確認）
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('✅ Authenticated user:', { id: authUser.id, email: authUser.email })

    // 現在のユーザーの権限をusersテーブルから取得（RLSバイパス）
    const { data: currentUser, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (currentUserError || !currentUser) {
      console.error('❌ Current user not found in users table:', currentUserError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('👤 Current user role:', currentUser.role)

    // 管理者権限チェック
    if (!currentUser.role || !['admin', 'system_admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'このページにアクセスする権限がありません',
        code: 'INSUFFICIENT_PERMISSIONS',
        user_role: currentUser.role
      }, { status: 403 })
    }

    // usersテーブルからユーザー一覧を取得（RLSバイパスで全ユーザー取得）
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, last_active, created_at')
      .order('created_at', { ascending: false })

    if (usersError) {
      throw new Error(`Users fetch error: ${usersError.message}`)
    }

    // XP統計も含めて取得
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const { data: xpStats } = await supabaseAdmin
          .from('user_xp_stats_v2')
          .select('total_xp, total_skp')
          .eq('user_id', user.id)
          .maybeSingle()

        return {
          id: user.id,
          email: user.email,
          username: user.name || user.email?.split('@')[0] || 'User',
          avatar_url: null, // アプリレベルで管理する場合は別途実装
          role: user.role,
          last_sign_in_at: user.last_active,
          created_at: user.created_at,
          total_xp: xpStats?.total_xp || 0,
          total_skp: xpStats?.total_skp || 0
        }
      })
    )

    console.log('✅ Users retrieved:', {
      total: enrichedUsers.length,
      admins: enrichedUsers.filter(u => u.role === 'admin').length,
      system_admins: enrichedUsers.filter(u => u.role === 'system_admin').length,
      users: enrichedUsers.filter(u => u.role === 'user').length
    })

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      total: enrichedUsers.length
    })

  } catch (error) {
    console.error('❌ Users V2 GET API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}