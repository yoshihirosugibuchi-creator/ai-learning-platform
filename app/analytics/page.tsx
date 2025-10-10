'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { useAuth } from '@/components/auth/AuthProvider'
import OptimizedAnalyticsPage from '@/components/analytics/OptimizedAnalyticsPage'

export default function AnalyticsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { loading } = useAuth()

  // 認証ガード
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-8">
        <OptimizedAnalyticsPage />
      </main>
    </div>
  )
}
