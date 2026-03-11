'use client'

import AppShell from '@/components/layout/AppShell'
import { useAuth } from '@/components/auth/AuthProvider'
import OptimizedAnalyticsPage from '@/components/analytics/OptimizedAnalyticsPage'

export default function AnalyticsPage() {
  const { loading } = useAuth()

  // 認証ガード
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8">
        <OptimizedAnalyticsPage />
      </div>
    </AppShell>
  )
}
