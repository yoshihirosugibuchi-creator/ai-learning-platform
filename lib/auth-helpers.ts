/**
 * 🚨 CRITICAL: User Role Management Helpers
 * 
 * ⚠️  NEVER use auth.users.user_metadata.role directly!
 * ✅  ALWAYS use these helper functions that access users table
 * 
 * Background: auth.users.user_metadata.role cannot be removed due to Supabase limitations,
 * but ALL role checks must use the users table for accurate permissions.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

// 🔐 正しい権限取得方法: users テーブルから取得
export async function getUserRoleFromUsersTable(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('❌ Error fetching user role:', error)
    return null
  }
  
  return data?.role || 'user'
}

// 🔐 権限チェック関数
export async function checkUserPermission(
  userId: string, 
  requiredRoles: string[]
): Promise<{ hasPermission: boolean; userRole: string | null }> {
  const userRole = await getUserRoleFromUsersTable(userId)
  
  return {
    hasPermission: userRole ? requiredRoles.includes(userRole) : false,
    userRole
  }
}

// 🔐 管理者権限チェック
export async function isAdmin(userId: string): Promise<boolean> {
  const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
  return hasPermission
}

// 🔐 システム管理者権限チェック
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const { hasPermission } = await checkUserPermission(userId, ['system_admin'])
  return hasPermission
}

// 🔐 認証済みユーザーの正しい役割取得
export async function getCurrentUserRole(request: Request): Promise<{
  userId: string | null
  role: string | null
  error?: string
}> {
  try {
    // Authorizationヘッダーからトークン取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { userId: null, role: null, error: 'No authorization header' }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Supabaseクライアント作成（他の成功APIと同じパターン）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // トークンを直接渡してユーザー取得
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return { userId: null, role: null, error: 'Authentication failed' }
    }
    
    // 🚨 IMPORTANT: users テーブルから役割取得（auth.users.user_metadata.role は使用禁止）
    const role = await getUserRoleFromUsersTable(user.id)
    
    return {
      userId: user.id,
      role,
    }
    
  } catch (error) {
    return {
      userId: null,
      role: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 🚨 禁止されたパターンの警告関数
export function __NEVER_USE_AUTH_USERS_ROLE__(): never {
  throw new Error(`
🚨 CRITICAL ERROR: You attempted to use auth.users.user_metadata.role!

❌ FORBIDDEN:
  - user.user_metadata?.role
  - authUser.user_metadata.role
  - ANY access to auth.users role field

✅ REQUIRED: Use these helper functions instead:
  - getUserRoleFromUsersTable(userId)
  - checkUserPermission(userId, roles)
  - getCurrentUserRole(request)
  - isAdmin(userId)
  - isSystemAdmin(userId)

📖 See CLAUDE.md for complete guidelines.
`)
}

/**
 * 🔧 Migration Helper: Convert auth.users access to users table
 * 
 * Usage in API routes:
 * 
 * // ❌ OLD (FORBIDDEN):
 * const userRole = user.user_metadata?.role
 * 
 * // ✅ NEW (REQUIRED):
 * const { userId, role: userRole } = await getCurrentUserRole(request)
 * if (!userId) return NextResponse.json({error: 'Auth required'}, {status: 401})
 * 
 * // ✅ Permission check:
 * const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
 * if (!hasPermission) return NextResponse.json({error: 'Insufficient permissions'}, {status: 403})
 */