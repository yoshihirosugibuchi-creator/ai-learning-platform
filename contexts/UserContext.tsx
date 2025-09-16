'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useUser } from '@/hooks/useUser'
import { StorageUser } from '@/lib/storage'

interface UserContextType {
  user: StorageUser | null
  isLoading: boolean
  updateUser: (updates: Partial<StorageUser>) => void
  updateProgress: (questionsAnswered: number, correctAnswers: number, xpGained: number, categoryScores?: Record<string, { correct: number; total: number }>) => number
  updateStreak: () => void
  logout: () => void
  refreshUser: () => void // 強制的にユーザーデータを再読み込み
  updateTrigger: number // 強制再レンダリング用
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const userHook = useUser()

  return (
    <UserContext.Provider value={userHook}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return context
}