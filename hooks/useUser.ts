'use client'

import { useState, useEffect } from 'react'
import { StorageUser, getUserData, saveUserData, createDefaultUser, updateUserProgress, migrateUserData, logoutUser, initializeUserSpecificData } from '@/lib/storage'

export function useUser() {
  const [user, setUser] = useState<StorageUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updateTrigger, setUpdateTrigger] = useState(0)

  useEffect(() => {
    const loadUser = () => {
      try {
        // Only run on client side
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }

        let userData = getUserData()
        
        if (userData) {
          // 既存データのマイグレーション
          userData = migrateUserData(userData)
          setUser(userData)
        } else {
          // ユーザーデータがない場合はnullに設定（ログイン画面に誘導される）
          setUser(null)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const updateUser = (updates: Partial<StorageUser> | StorageUser) => {
    // 完全なユーザーオブジェクトが渡された場合はそれを使用
    const updatedUser: StorageUser = 'id' in updates && typeof updates.id === 'string' && typeof updates.name === 'string' && updates.auth
      ? updates as StorageUser 
      : { ...user!, ...updates } as StorageUser
    
    // 新しいユーザーの場合、ユーザー別データ管理を初期化
    if ('id' in updates && updatedUser.id && updatedUser.id !== user?.id) {
      console.log(`🚀 Initializing user-specific data for new user: ${updatedUser.id}`)
      initializeUserSpecificData(updatedUser.id)
    }
    
    setUser(updatedUser)
    saveUserData(updatedUser)
  }

  const updateProgress = (questionsAnswered: number, correctAnswers: number, xpGained: number, categoryScores?: Record<string, { correct: number; total: number }>) => {
    if (!user) return 0

    const updatedUser = updateUserProgress(user, questionsAnswered, correctAnswers, xpGained, categoryScores)
    
    // UserContextの状態を即座に更新（saveUserDataは既にupdateUserProgressで実行済み）
    setUser(updatedUser)
    setUpdateTrigger(prev => prev + 1)
    
    // 状態を同期
    setTimeout(() => {
      refreshUser()
    }, 100)
    
    // SKP獲得量を計算して返す
    const baseSkpPerCorrect = 5
    const perfectBonus = correctAnswers === questionsAnswered && questionsAnswered >= 3 ? 10 : 0
    const streakBonus = user.progress.streak >= 3 ? Math.min(user.progress.streak, 10) : 0
    const skpGained = (correctAnswers * baseSkpPerCorrect) + perfectBonus + streakBonus
    
    
    return skpGained
  }

  const updateStreak = () => {
    // updateStreak は updateProgress の一部として処理されるため無効化
    return
  }

  const logout = () => {
    logoutUser()
    setUser(null)
  }

  const refreshUser = () => {
    const latestUserData = getUserData()
    if (latestUserData) {
        setUser(latestUserData)
      setUpdateTrigger(prev => prev + 1)
    }
  }

  return {
    user,
    isLoading,
    updateUser,
    updateProgress,
    updateStreak,
    logout,
    refreshUser,
    updateTrigger // 強制再レンダリング用
  }
}