'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'

interface ReviewQuickStatus {
  hasReviewQuestions: boolean
  totalQuestions: number
  availableSets: number
  displayText: string
  isGenerating?: boolean
  retryAfterMs?: number
  retryCount: number
  debugInfo?: {
    error?: string
    message?: string
    hasRecentTargets?: boolean
    reviewQuestionsPerSession?: number
    sets?: Array<{
      id: string
      questionCount: number
      created: string | null
      expires: string | null
      used: string | null
    }>
  }
}

interface UseReviewQuickCheckReturn {
  reviewStatus: ReviewQuickStatus | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

/**
 * 高速復習チェック用カスタムフック
 * - 高速復習判定
 * - 自動リトライ機能
 * - リアルタイム更新
 */
export function useReviewQuickCheck(): UseReviewQuickCheckReturn {
  const { user } = useAuth()
  const [reviewStatus, setReviewStatus] = useState<ReviewQuickStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchReviewStatus = useCallback(async (retryCount = 0) => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    // 前回のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 新しいAbortControllerを作成
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        setError('認証トークンが見つかりません')
        return
      }

      const url = `/api/review/quick-check${retryCount > 0 ? `?retry=${retryCount}` : ''}`
      
      console.log(`⚡ [useReviewQuickCheck] Fetching: ${url}`)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: ReviewQuickStatus = await response.json()
      
      console.log(`✅ [useReviewQuickCheck] Status received:`, {
        hasReview: data.hasReviewQuestions,
        totalQuestions: data.totalQuestions,
        isGenerating: data.isGenerating,
        retryAfter: data.retryAfterMs
      })

      setReviewStatus(data)

      // 自動リトライ機能：生成中の場合
      if (data.isGenerating && data.retryAfterMs && retryCount < 3) {
        console.log(`🔄 [useReviewQuickCheck] Auto-retry scheduled in ${data.retryAfterMs}ms`)
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchReviewStatus(retryCount + 1)
        }, data.retryAfterMs)
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🚫 [useReviewQuickCheck] Request aborted')
        return
      }
      
      console.error('❌ [useReviewQuickCheck] Error:', err)
      setError(err instanceof Error ? err.message : '復習状態の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // 手動リフレッシュ関数
  const refresh = useCallback(() => {
    // 既存のタイマーをクリア
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    fetchReviewStatus(0)
  }, [fetchReviewStatus])

  // 初回読み込みとユーザー変更時の更新
  useEffect(() => {
    if (user?.id) {
      fetchReviewStatus(0)
    } else {
      setReviewStatus(null)
    }

    // クリーンアップ
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [user?.id, fetchReviewStatus])

  // 復習完了イベントリスナー
  useEffect(() => {
    const handleReviewCompleted = () => {
      console.log('📚 [useReviewQuickCheck] Review completed event - refreshing status')
      refresh()
    }

    window.addEventListener('reviewCompleted', handleReviewCompleted)
    
    return () => {
      window.removeEventListener('reviewCompleted', handleReviewCompleted)
    }
  }, [refresh])

  // 定期更新：復習なし状態のみ（頻度を上げる）
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(() => {
      // 復習なし状態 または ローディング中でない場合のみ定期チェック
      if (!isLoading && (!reviewStatus || !reviewStatus.hasReviewQuestions)) {
        console.log('🔄 [useReviewQuickCheck] Periodic check for new review questions')
        fetchReviewStatus(0)
      }
    }, 60 * 1000) // 1分おき（従来の3分から短縮）

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading, fetchReviewStatus])

  return {
    reviewStatus,
    isLoading,
    error,
    refresh
  }
}