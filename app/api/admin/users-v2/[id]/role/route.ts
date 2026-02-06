import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// PUT: ユーザーの権限を更新（アプリケーション独自のusersテーブルベース）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    console.log('🔧 User Role V2 API - PUT Request for user:', resolvedParams.id)

    const body = await request.json()
    const { role } = body

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

    console.log('🔧 Role update permission check:', {
      user_id: authUser.id,
      email: authUser.email,
      role: currentUser.role
    })
    
    // システム管理者権限確認
    if (!currentUser.role || currentUser.role !== 'system_admin') {
      return NextResponse.json({ 
        error: 'ユーザーの権限を変更するにはシステム管理者権限が必要です',
        code: 'INSUFFICIENT_PERMISSIONS',
        user_role: currentUser.role,
        required_role: 'system_admin'
      }, { status: 403 })
    }

    // バリデーション
    if (!role || !['user', 'admin', 'system_admin'].includes(role)) {
      return NextResponse.json(
        { 
          error: '無効な権限が指定されました', 
          code: 'INVALID_ROLE',
          allowed_roles: ['user', 'admin', 'system_admin']
        },
        { status: 400 }
      )
    }

    // 自分自身の権限を変更することを防止
    if (resolvedParams.id === authUser.id) {
      return NextResponse.json(
        { 
          error: '自分自身の権限は変更できません',
          code: 'CANNOT_CHANGE_OWN_ROLE'
        },
        { status: 400 }
      )
    }

    // usersテーブルでユーザーの権限を更新（RLSバイパス）
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', resolvedParams.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Role update error: ${updateError.message}`)
    }

    // システムアラートに記録（オプション）
    try {
      await supabaseAdmin.from('system_alerts').insert({
        title: 'User Role Changed',
        alert_type: 'user_role_changed',
        message: `User role changed: ${resolvedParams.id} -> ${role}`,
        severity: 'info',
        user_id: resolvedParams.id,
        context: {
          changed_by: authUser.id,
          old_role: currentUser.role,
          new_role: role,
          timestamp: new Date().toISOString()
        }
      })
    } catch (alertError) {
      console.warn('Warning: Could not record role change alert:', alertError)
    }

    console.log('✅ User role updated:', {
      user_id: resolvedParams.id,
      new_role: role,
      changed_by: authUser.id
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User role updated to ${role}`
    })

  } catch (error) {
    console.error('❌ User Role V2 PUT API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update user role',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}