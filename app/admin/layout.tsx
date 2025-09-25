'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isMainAdminPage = pathname === '/admin'

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
        showBackButton={!isMainAdminPage}
        onBackClick={() => router.push('/admin')}
      />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      
      {/* 管理者パネル専用ヘッダー */}
      {!isMainAdminPage && (
        <div className="border-b bg-muted/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/admin')}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                管理者パネル
              </Button>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium">
                {pathname.includes('xp-verification') && 'XPシステム検証'}
                {pathname.includes('categories') && 'カテゴリー管理'}
                {pathname.includes('subcategories') && 'サブカテゴリー管理'}
                {pathname.includes('quiz-management') && 'クイズ問題管理'}
              </span>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}