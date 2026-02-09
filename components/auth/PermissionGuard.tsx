'use client'

import { ReactNode, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'

interface PermissionGuardProps {
  children: ReactNode
  requiredRole?: 'admin' | 'system_admin'
  allowedRoles?: ('user' | 'admin' | 'system_admin')[]
  fallback?: ReactNode
  redirectTo?: string
}

export default function PermissionGuard({
  children,
  requiredRole,
  allowedRoles,
  fallback,
  redirectTo = '/'
}: PermissionGuardProps) {
  const router = useRouter()
  const { userRole, loading, error, retry: retryUserRole } = useUserRole()
  const [retryCount, setRetryCount] = useState(0)
  const [showError, setShowError] = useState(false)

  // エラー表示を遅延させる（一時的なエラーを無視）
  useEffect(() => {
    if (error || (!loading && !userRole)) {
      // 3秒待ってからエラー表示（その間にリフレッシュが完了する可能性あり）
      const timer = setTimeout(() => {
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1)
          // リトライをトリガー（ページをリロードせずに状態を更新）
          console.log('🔄 PermissionGuard: Retrying permission check...', retryCount + 1)
          retryUserRole()
        } else {
          setShowError(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setShowError(false)
      setRetryCount(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, loading, userRole, retryCount])

  const handleRetry = useCallback(() => {
    setRetryCount(0)
    setShowError(false)
    // まずuseUserRoleのリトライを試行
    retryUserRole()
  }, [retryUserRole])

  // Show loading state while checking permissions
  if (loading || (!showError && !userRole && retryCount < 2)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {retryCount > 0 ? '再確認中...' : '権限を確認中...'}
          </p>
        </div>
      </div>
    )
  }

  // Handle errors (only after retries exhausted)
  if (showError || (!loading && !userRole)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">アクセスエラー</h2>
          <p className="text-muted-foreground">
            ユーザー情報を取得できませんでした。
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              再試行
            </button>
            <button
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // この時点でuserRoleはnullではないことが保証されている
  if (!userRole) {
    return null
  }

  // Check specific role requirement
  if (requiredRole) {
    if (requiredRole === 'system_admin' && userRole.role !== 'system_admin') {
      if (fallback) {
        return <>{fallback}</>
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-600">アクセス拒否</h2>
            <p className="text-muted-foreground">
              このページにアクセスするにはシステム管理者権限が必要です。
            </p>
            <p className="text-sm text-muted-foreground">
              現在の権限: {userRole.role || 'なし'}
            </p>
            <button 
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      )
    }

    if (requiredRole === 'admin' && !userRole.permissions.can_access_admin) {
      if (fallback) {
        return <>{fallback}</>
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-600">アクセス拒否</h2>
            <p className="text-muted-foreground">
              このページにアクセスするには管理者権限が必要です。
            </p>
            <p className="text-sm text-muted-foreground">
              現在の権限: {userRole.role || 'なし'}
            </p>
            <button 
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      )
    }
  }

  // Check allowed roles list
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.includes(userRole.role as 'user' | 'admin' | 'system_admin')
    
    if (!hasRequiredRole) {
      if (fallback) {
        return <>{fallback}</>
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-600">アクセス拒否</h2>
            <p className="text-muted-foreground">
              このページにアクセスする権限がありません。
            </p>
            <p className="text-sm text-muted-foreground">
              現在の権限: {userRole.role || 'なし'}
            </p>
            <p className="text-sm text-muted-foreground">
              必要な権限: {allowedRoles.join(', ')}
            </p>
            <button 
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      )
    }
  }

  // Permission granted, render children
  return <>{children}</>
}