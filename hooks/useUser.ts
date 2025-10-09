'use client'

import { useState, useEffect } from 'react'
import { StorageUser, getUserData, saveUserData, migrateUserData, logoutUser, initializeUserSpecificData } from '@/lib/storage'

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

  // updateProgress関数は削除済み（使用されていない古いシステム）
  // 現在はapi/xp-save/quiz/route.tsとapi/xp-save/course/route.tsが正式なXP/SKPシステム

  const updateStreak = () => {
    // updateStreak は現在使用されていない（古いシステム）
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
    // updateProgress: 削除済み（古いシステム）,
    updateStreak,
    logout,
    refreshUser,
    updateTrigger // 強制再レンダリング用
  }
}