'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import CategoryGrid from '@/components/categories/CategoryGrid'
import { useAuth } from '@/components/auth/AuthProvider'

export default function CategoriesPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    // 認証ローディング中は何もしない
    if (authLoading) return
    
    // ユーザーが存在しない場合はログインページにリダイレクト
    if (!user) {
      router.push('/login')
      return
    }

    // Note: Removed learning data preloading for faster page load
    // Learning data will be loaded when actually needed
  }, [user, authLoading, router])

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to category detail or learning content
    router.push(`/categories/${categoryId}`)
  }

  // 認証ローディング中は認証完了を待つ
  if (authLoading) {
    return <LoadingScreen message="認証状態を確認しています..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <CategoryGrid
          title="学習カテゴリー"
          description="ALEで学ぶことができるスキルの一覧です"
          showSearch={false}
          showFilter={false}
          showStats={false}
          onCategoryClick={handleCategoryClick}
        />
      </main>
    </div>
  )
}