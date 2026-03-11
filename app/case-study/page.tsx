'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LoadingScreen from '@/components/layout/LoadingScreen'
import CaseStudyList from '@/components/case-study/CaseStudyList'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { History, Briefcase } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'

export default function CaseStudyPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <PageHeader
            icon={Briefcase}
            title="ケーススタディ"
            description="実践的なビジネスケースで思考力を鍛えましょう"
          />
        </div>

        {/* 学習履歴 */}
        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push('/case-study/history')} variant="outline" size="sm" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            学習履歴
          </Button>
        </div>

        {/* 利用可能なケーススタディ */}
        <div>
          <h2 className="text-lg font-semibold mb-4">利用可能なケーススタディ</h2>
          <CaseStudyList />
        </div>
      </div>
    </AppShell>
  )
}
