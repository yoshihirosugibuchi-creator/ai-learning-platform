'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/layout/LoadingScreen'
import CaseStudySession from '@/components/case-study/CaseStudySession'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import type { CaseStudyProblemRow, CaseStudyStepRow } from '@/lib/types/case-study'

export default function CaseStudySessionPage({
  params
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [problem, setProblem] = useState<CaseStudyProblemRow | null>(null)
  const [steps, setSteps] = useState<CaseStudyStepRow[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [existingResponses, setExistingResponses] = useState<{ step_number: number, selected_choices: string[], reasoning_text: string, hint_used: boolean }[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const fetchSession = async () => {
      if (!user) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token

        if (!accessToken) {
          router.push('/login')
          return
        }

        setToken(accessToken)

        // APIルート経由でセッション情報を取得
        const response = await fetch(`/api/case-study/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Session fetch failed:', response.status, errorData)
          toast({
            title: errorData.error || 'セッションが見つかりません',
            variant: 'destructive'
          })
          router.push('/case-study')
          return
        }

        const data = await response.json()

        if (!data.success) {
          toast({
            title: data.error || 'セッションの読み込みに失敗しました',
            variant: 'destructive'
          })
          router.push('/case-study')
          return
        }

        // 完了済みセッションの場合はリダイレクト
        if (data.redirect) {
          router.push(data.redirect)
          return
        }

        setProblem(data.problem as CaseStudyProblemRow)
        setSteps(data.steps as CaseStudyStepRow[])
        setCurrentStep(data.session.current_step || 1)
        setExistingResponses(data.existingResponses || [])

      } catch (error) {
        console.error('Failed to fetch session:', error)
        toast({
          title: 'セッションの読み込みに失敗しました',
          variant: 'destructive'
        })
        router.push('/case-study')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchSession()
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
    return <LoadingScreen message="セッションを読み込み中..." />
  }

  if (!problem || !token || steps.length === 0) {
    return <LoadingScreen message="データの準備中..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <CaseStudySession
          sessionId={sessionId}
          problem={problem}
          steps={steps}
          initialStep={currentStep}
          token={token}
          initialResponses={existingResponses}
        />
      </main>
    </div>
  )
}
