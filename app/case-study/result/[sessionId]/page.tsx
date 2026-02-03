'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import CaseStudyResult from '@/components/case-study/CaseStudyResult'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'

export default function CaseStudyResultPage({
  params
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const fromHome = searchParams.get('from') === 'home'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resultData, setResultData] = useState<{
    session: {
      id: string
      total_score: number
      max_possible_score: number
      score_percentage: number
      total_time_seconds: number
      hint_count: number
      is_retry: boolean
      xp_earned: number
      skp_earned: number
      bonus_details: unknown
    }
    problem: {
      id: string
      title: string
      difficulty: string
    }
    scoring_result: unknown
    steps_with_details: unknown[]
    rubric_axes: unknown[]
  } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const fetchResult = async () => {
      if (!user) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/case-study/sessions/${sessionId}/result`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setResultData(data)
          } else {
            toast({
              title: '結果の取得に失敗しました',
              variant: 'destructive'
            })
            router.push(fromHome ? '/' : '/case-study')
          }
        } else if (response.status === 400) {
          // セッションがまだ完了していない
          toast({
            title: 'セッションが完了していません',
            description: '先に学習を完了してください'
          })
          router.push(`/case-study/session/${sessionId}`)
        } else if (response.status === 404) {
          toast({
            title: 'セッションが見つかりません',
            variant: 'destructive'
          })
          router.push(fromHome ? '/' : '/case-study')
        }
      } catch (error) {
        console.error('Failed to fetch result:', error)
        toast({
          title: '結果の取得に失敗しました',
          variant: 'destructive'
        })
        router.push(fromHome ? '/' : '/case-study')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchResult()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId])

  if (authLoading) {
    return <LoadingScreen message="認証を確認中..." />
  }

  if (!user) {
    return <LoadingScreen message="ログインページに移動中..." />
  }

  if (loading) {
    return <LoadingScreen message="結果を読み込み中..." />
  }

  if (!resultData) {
    return <LoadingScreen message="データの準備中..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <CaseStudyResult
          session={resultData.session as Parameters<typeof CaseStudyResult>[0]['session']}
          problem={resultData.problem as Parameters<typeof CaseStudyResult>[0]['problem']}
          scoringResult={resultData.scoring_result as Parameters<typeof CaseStudyResult>[0]['scoringResult']}
          stepsWithDetails={resultData.steps_with_details as Parameters<typeof CaseStudyResult>[0]['stepsWithDetails']}
          rubricAxes={resultData.rubric_axes as Parameters<typeof CaseStudyResult>[0]['rubricAxes']}
          fromHome={fromHome}
        />
      </main>
    </div>
  )
}
