'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { User, Shield, Search, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { useUserRole } from '@/hooks/useUserRole'

interface UserProfile {
  id: string
  email: string
  username?: string
  avatar_url?: string
  role: 'user' | 'admin' | 'system_admin'
  last_sign_in_at?: string
  created_at: string
  total_xp?: number
  total_skp?: number
}

export default function UserManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { canEditRoles } = useUserRole()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('unknown')

  useEffect(() => {
    if (user) {
      loadUsers()
      checkCurrentUserRole()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    filterUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchTerm, roleFilter])

  async function checkCurrentUserRole() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        setCurrentUserRole('not_authenticated')
        return
      }
      
      const response = await fetch('/api/debug/current-user-v2', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCurrentUserRole(data.user.role)
        console.log('Current user role:', data.user.role)
        console.log('Full user debug data:', data)
      } else {
        setCurrentUserRole('error')
      }
    } catch (error) {
      console.error('Failed to check current user role:', error)
      setCurrentUserRole('error')
    }
  }

  async function loadUsers() {
    try {
      setLoading(true)
      
      // Supabaseセッション取得
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }
      
      // 実際のユーザー一覧取得API（V2 - アプリテーブルベース）
      const usersResponse = await fetch('/api/admin/users-v2', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!usersResponse.ok) {
        const errorData = await usersResponse.json()
        throw new Error(errorData.message || 'ユーザー一覧の取得に失敗しました')
      }
      
      const usersData = await usersResponse.json()
      
      if (!usersData.success) {
        throw new Error(usersData.message || 'ユーザー一覧の取得に失敗しました')
      }
      
      setUsers(usersData.users)
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: "エラー",
        description: "ユーザー一覧の取得に失敗しました",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  function filterUsers() {
    let filtered = users

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 権限フィルター
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  async function updateUserRole(userId: string, newRole: 'user' | 'admin' | 'system_admin') {
    try {
      console.log('🔧 権限更新開始:', { userId, newRole })
      setUpdatingUserId(userId)
      
      // Supabaseセッション取得
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }
      
      // 実際のユーザー権限更新API（V2 - アプリテーブルベース）
      const updateResponse = await fetch(`/api/admin/users-v2/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.message || '権限の更新に失敗しました')
      }
      
      const updateData = await updateResponse.json()
      
      if (!updateData.success) {
        throw new Error(updateData.message || '権限の更新に失敗しました')
      }
      
      // ローカル状態を更新
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
      
      toast({
        title: "成功",
        description: "ユーザー権限を更新しました",
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      toast({
        title: "エラー",
        description: "権限の更新に失敗しました",
        variant: "destructive"
      })
    } finally {
      setUpdatingUserId(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'admin':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 'システム管理者'
      case 'admin':
        return '管理者'
      case 'user':
        return '一般ユーザー'
      default:
        return '不明'
    }
  }

  if (loading) {
    return <div className="p-6">読み込み中...</div>
  }

  return (
    <PermissionGuard requiredRole="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-muted-foreground">ユーザー情報と権限の管理</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">
              現在の権限: {currentUserRole}
            </Badge>
            {currentUserRole === 'user' && (
              <Badge variant="destructive">
                ⚠️ 管理者権限が必要です
              </Badge>
            )}
          </div>
        </div>

      {/* 検索・フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            検索・フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="メールアドレスまたはユーザー名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-48">
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">全ての権限</option>
                <option value="user">一般ユーザー</option>
                <option value="admin">管理者</option>
                <option value="system_admin">システム管理者</option>
              </select>
            </div>
            <Button 
              onClick={() => {
                console.log('🔄 更新ボタンがクリックされました')
                loadUsers()
              }} 
              variant="outline"
              disabled={loading}
            >
              {loading ? '読み込み中...' : '更新'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ユーザー一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            ユーザー一覧
            <Badge variant="outline">
              {filteredUsers.length}人
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2" />
              <p>条件に一致するユーザーが見つかりません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((userProfile) => (
                <div
                  key={userProfile.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {userProfile.username?.charAt(0) || userProfile.email.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{userProfile.username || 'ユーザー名未設定'}</p>
                          <Badge className={getRoleBadgeColor(userProfile.role)}>
                            {getRoleLabel(userProfile.role)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{userProfile.email}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>登録: {new Date(userProfile.created_at).toLocaleDateString('ja-JP')}</span>
                          {userProfile.last_sign_in_at && (
                            <span>最終ログイン: {new Date(userProfile.last_sign_in_at).toLocaleDateString('ja-JP')}</span>
                          )}
                          {userProfile.total_xp && (
                            <span>XP: {userProfile.total_xp.toLocaleString()}</span>
                          )}
                          {userProfile.total_skp && (
                            <span>SKP: {userProfile.total_skp.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {canEditRoles ? (
                        <>
                          <select
                            value={userProfile.role}
                            onChange={(e) => 
                              updateUserRole(userProfile.id, e.target.value as 'user' | 'admin' | 'system_admin')
                            }
                            disabled={updatingUserId === userProfile.id}
                            className="w-full sm:w-40 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                          >
                            <option value="user">一般ユーザー</option>
                            <option value="admin">管理者</option>
                            <option value="system_admin">システム管理者</option>
                          </select>
                          
                          {updatingUserId === userProfile.id && (
                            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                          )}
                        </>
                      ) : (
                        <div className="w-40 px-3 py-2 text-sm text-muted-foreground">
                          {getRoleLabel(userProfile.role)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 権限説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            権限レベルの説明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">一般ユーザー</Badge>
              </div>
              <p className="text-sm text-gray-600">
                クイズ・コース学習、統計確認、プロフィール管理が可能
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">管理者</Badge>
              </div>
              <p className="text-sm text-gray-600">
                XP設定変更、カテゴリー管理、クイズ管理、アラート対応が可能
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-red-100 text-red-800 border-red-200">システム管理者</Badge>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-sm text-gray-600">
                全権限 + ユーザー権限変更、システム監視、データベース操作が可能
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </PermissionGuard>
  )
}