'use client'

import IndustryTargetManagement from '@/components/admin/IndustryTargetManagement'
import { useAuth } from '@/components/auth/AuthProvider'
import LoadingScreen from '@/components/layout/LoadingScreen'

export default function IndustryTargetsPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen message="認証状態を確認しています..." />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">アクセス拒否</h1>
          <p className="text-gray-600">この機能を利用するにはログインが必要です</p>
        </div>
      </div>
    )
  }

  // 開発環境用：すべてのユーザーにアクセス許可（デモ用）
  // 本番環境では適切な権限チェックを実装してください
  const _isAdmin = true // 一時的にすべてのユーザーに管理者権限を付与

  return <IndustryTargetManagement />
}