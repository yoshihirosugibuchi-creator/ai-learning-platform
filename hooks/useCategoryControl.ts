/**
 * カテゴリー制御用Reactフック
 * 
 * 非アクティブカテゴリーの処理とユーザー通知を管理
 */

import { useState, useEffect, useCallback } from 'react'
import { getActiveCategories, getCategoryControlDebugInfo } from '@/lib/category-control'

export interface CategoryControlState {
  activeCategories: string[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export interface CategoryValidationResult {
  isValid: boolean
  isBlocked: boolean
  message?: string
  suggestedCategories?: string[]
}

/**
 * カテゴリー制御状態管理フック
 */
export function useCategoryControl() {
  const [state, setState] = useState<CategoryControlState>({
    activeCategories: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  // アクティブカテゴリー情報を取得
  const fetchActiveCategories = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const categories = await getActiveCategories()
      const categoryIds = categories.map(cat => cat.category_id)
      
      setState({
        activeCategories: categoryIds,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'カテゴリー情報の取得に失敗しました'
      }))
    }
  }, [])

  // 初回読み込み
  useEffect(() => {
    fetchActiveCategories()
  }, [fetchActiveCategories])

  // カテゴリーの有効性チェック
  const validateCategory = useCallback((categoryId: string): CategoryValidationResult => {
    if (state.isLoading) {
      return {
        isValid: false,
        isBlocked: false,
        message: 'カテゴリー情報を読み込み中です...'
      }
    }

    if (state.error) {
      return {
        isValid: false,
        isBlocked: false,
        message: 'カテゴリー情報の取得でエラーが発生しました'
      }
    }

    const isActive = state.activeCategories.includes(categoryId)
    
    if (!isActive) {
      return {
        isValid: false,
        isBlocked: true,
        message: 'このカテゴリーは現在利用できません',
        suggestedCategories: state.activeCategories.slice(0, 3) // 最初の3つを提案
      }
    }

    return {
      isValid: true,
      isBlocked: false
    }
  }, [state])

  // 複数カテゴリーの一括チェック
  const validateCategories = useCallback((categoryIds: string[]): Record<string, CategoryValidationResult> => {
    const results: Record<string, CategoryValidationResult> = {}
    
    categoryIds.forEach(categoryId => {
      results[categoryId] = validateCategory(categoryId)
    })
    
    return results
  }, [validateCategory])

  // 利用可能なカテゴリーのフィルタリング
  const filterAvailableCategories = useCallback((categoryIds: string[]): string[] => {
    return categoryIds.filter(categoryId => 
      state.activeCategories.includes(categoryId)
    )
  }, [state.activeCategories])

  return {
    ...state,
    validateCategory,
    validateCategories,
    filterAvailableCategories,
    refetch: fetchActiveCategories
  }
}

/**
 * カテゴリーブロック通知管理フック
 */
export function useCategoryBlockNotification() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    message: string
    categoryId: string
    timestamp: Date
  }>>([])

  // 通知を追加
  const addBlockNotification = useCallback((categoryId: string, message: string) => {
    const notification = {
      id: `${categoryId}-${Date.now()}`,
      message,
      categoryId,
      timestamp: new Date()
    }
    
    setNotifications(prev => [...prev, notification])
    
    // 5秒後に自動削除
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }, [])

  // 通知をクリア
  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // 特定カテゴリーの通知を削除
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  return {
    notifications,
    addBlockNotification,
    clearNotifications,
    removeNotification
  }
}

/**
 * 管理者向けカテゴリー制御状態フック
 */
export function useAdminCategoryControl() {
  const [debugInfo, setDebugInfo] = useState<{
    totalCategories: number
    activeCategories: number
    inactiveCategories: number
    categoriesWithQuizzes: number
    categoriesInCourses: number
  } | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const info = await getCategoryControlDebugInfo()
        setDebugInfo(info)
      } catch (error) {
        console.error('Error fetching category debug info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDebugInfo()
  }, [])

  return {
    debugInfo,
    isLoading
  }
}

/**
 * カテゴリー制御用コンテキスト向けの型定義
 */
export interface CategoryControlContextType {
  activeCategories: string[]
  isLoading: boolean
  error: string | null
  validateCategory: (categoryId: string) => CategoryValidationResult
  refetch: () => Promise<void>
}