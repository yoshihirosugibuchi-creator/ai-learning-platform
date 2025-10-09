'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

export interface UserPermissions {
  can_view_users: boolean
  can_edit_roles: boolean
  can_access_admin: boolean
}

export interface UserRoleData {
  id: string
  email: string | null
  role: string | null
  permissions: UserPermissions
}

// キャッシュ用のグローバル変数
let cachedUserRole: UserRoleData | null = null
let cacheExpiry: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分間キャッシュ

export function useUserRole() {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState<UserRoleData | null>(cachedUserRole)
  const [loading, setLoading] = useState(!cachedUserRole)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setUserRole(null)
        setLoading(false)
        cachedUserRole = null
        return
      }

      // キャッシュが有効かチェック
      const now = Date.now()
      if (cachedUserRole && now < cacheExpiry && cachedUserRole.id === user.id) {
        console.log('✅ Using cached user role:', cachedUserRole.role)
        setUserRole(cachedUserRole)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        console.log('🔄 Fetching fresh user role from API...')

        // Get session token from Supabase directly
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('No session token available')
        }

        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch user role: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success && data.user) {
          const newUserRole = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            permissions: data.permissions
          }
          
          // キャッシュに保存
          cachedUserRole = newUserRole
          cacheExpiry = now + CACHE_DURATION
          console.log('✅ User role cached:', newUserRole.role, 'expires at:', new Date(cacheExpiry).toLocaleTimeString())
          
          setUserRole(newUserRole)
        } else {
          throw new Error('Invalid user data received')
        }
      } catch (err) {
        console.error('Error fetching user role:', err)
        
        // ユーザーフレンドリーなエラーメッセージを設定
        let userMessage = 'ユーザー権限の取得に失敗しました。'
        
        if (err instanceof Error) {
          const errorMsg = err.message.toLowerCase()
          
          if (errorMsg.includes('permission denied') || errorMsg.includes('insufficient_privilege')) {
            userMessage = 'このページにアクセスする権限がありません。'
          } else if (errorMsg.includes('authentication') || errorMsg.includes('token')) {
            userMessage = 'ログインセッションが無効です。再度ログインしてください。'
          } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
            userMessage = 'ネットワークエラーが発生しました。'
          }
        }
        
        setError(userMessage)
        setUserRole(null)
        cachedUserRole = null
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  return {
    userRole,
    loading,
    error,
    // Helper functions for common permission checks
    isAdmin: userRole?.permissions.can_access_admin || false,
    isSystemAdmin: userRole?.role === 'system_admin',
    canViewUsers: userRole?.permissions.can_view_users || false,
    canEditRoles: userRole?.permissions.can_edit_roles || false
  }
}