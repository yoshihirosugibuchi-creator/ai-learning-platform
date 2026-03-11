'use client'

import { useState } from 'react'
import Header from './Header'
import MobileNav from './MobileNav'
import BottomNav from './BottomNav'

interface AppShellProps {
  children: React.ReactNode
  showBackButton?: boolean
  onBackClick?: () => void
}

/**
 * アプリ共通レイアウト
 * - 上部ヘッダー（ハンバーガー、ロゴ、コレクション、通知、ユーザー）
 * - モバイルサイドメニュー
 * - 下部タブバー（モバイルのみ: ホーム、コース、クイズ、ケース）
 * - メインコンテンツ（モバイルでは下タブ分の余白あり）
 */
export default function AppShell({ children, showBackButton, onBackClick }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
      />

      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* メインコンテンツ: モバイルでは下タブバー分の余白を確保 */}
      <main className="pb-16 md:pb-0">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
