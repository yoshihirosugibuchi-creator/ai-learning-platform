/**
 * 🚨 AUTH TYPES: Prevent auth.users.user_metadata.role usage at type level
 */

// 🔒 Override Supabase User type to remove dangerous role access
export interface SafeUser {
  id: string
  email?: string
  user_metadata?: Omit<Record<string, string | number | boolean>, 'role'> & {
    // 🚨 Make 'role' access impossible at type level
    role?: never  // This will cause TypeScript error if accessed
  }
  app_metadata?: Record<string, string | number | boolean>
  created_at?: string
  updated_at?: string
}

// 🔒 Safe auth result type
export interface SafeAuthResult {
  user: SafeUser | null
  error: Error | null
}

// ✅ Correct role information from users table
export interface UserRoleInfo {
  userId: string
  role: 'user' | 'admin' | 'system_admin'
  email?: string
}

// ✅ Permission check result
export interface PermissionCheckResult {
  hasPermission: boolean
  userRole: string | null
  userId?: string
}

/**
 * 🚨 Type-level warning for dangerous patterns
 */
export type NEVER_USE_AUTH_USERS_ROLE = 
  "🚨 CRITICAL: Never use auth.users.user_metadata.role! Use lib/auth-helpers.ts functions instead."

/**
 * 🛡️ Type guard to prevent auth.users role access
 */
export function preventAuthUsersRoleAccess(): NEVER_USE_AUTH_USERS_ROLE {
  throw new Error(`
🚨 FORBIDDEN: Attempted to access auth.users.user_metadata.role!

Use these safe alternatives:
- getCurrentUserRole(request)
- getUserRoleFromUsersTable(userId)
- checkUserPermission(userId, roles)

See CLAUDE.md and lib/auth-helpers.ts for details.
`)
}

// 🔒 Re-export safe types only
export type { SafeUser as User }
export type { SafeAuthResult as AuthResult }