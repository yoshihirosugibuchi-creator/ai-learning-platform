import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'クイズ問題管理 | AI学習プラットフォーム',
  description: 'クイズ問題の管理・編集システム',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                管理者パネル
              </h1>
              <p className="text-sm text-gray-600">
                クイズ問題管理システム
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ← メインサイトに戻る
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="py-6">
        {children}
      </main>
    </div>
  )
}