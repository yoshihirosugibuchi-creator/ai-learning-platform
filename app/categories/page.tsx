'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import CategoryGrid from '@/components/categories/CategoryGrid'

export default function CategoriesPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to category detail or learning content
    router.push(`/categories/${categoryId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <CategoryGrid
          title="学習カテゴリー"
          description="ビジネススキルを体系的に学習できるカテゴリーから選択してください"
          showSearch={false}
          showFilter={false}
          showStats={true}
          onCategoryClick={handleCategoryClick}
        />
      </main>
    </div>
  )
}