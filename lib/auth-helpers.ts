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
import { cookies } from 'next/headers'
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
    // 🧪 開発環境限定：テスト用認証バイパス
    if (process.env.NODE_ENV === 'development') {
      const testUserId = request.headers.get('x-test-user-id')
      const testRole = request.headers.get('x-test-role')
      
      if (testUserId && testRole) {
        console.log(`🧪 [TEST AUTH] Bypassing auth: ${testUserId} (${testRole})`)
        return {
          userId: testUserId,
          role: testRole
        }
      }
    }

    // Supabaseクライアント作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let user = null
    let authError = null

    // 1. Authorizationヘッダーから取得を試行
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: headerError } = await supabase.auth.getUser(token)
      if (authUser && !headerError) {
        user = authUser
      } else {
        authError = headerError
      }
    }

    // 2. Cookieから取得を試行（Authorizationヘッダーが無い/失敗した場合）
    if (!user) {
      try {
        // Next.js cookies からアクセストークン取得
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('sb-bddqkmnbbvllpvsynklr-auth-token')?.value
        
        if (accessToken) {
          try {
            const parsedToken = JSON.parse(accessToken)
            if (parsedToken?.access_token) {
              const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser(parsedToken.access_token)
              if (cookieUser && !cookieError) {
                user = cookieUser
              } else {
                authError = cookieError
              }
            }
          } catch (parseError) {
            authError = parseError
          }
        }
      } catch (cookieAuthError) {
        authError = cookieAuthError
      }
    }

    // 3. どちらの方法でも認証に失敗した場合
    if (!user) {
      return { 
        userId: null, 
        role: null, 
        error: `Authentication failed: ${authError && typeof authError === 'object' && 'message' in authError ? String(authError.message) : 'No auth header or cookie'}` 
      }
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