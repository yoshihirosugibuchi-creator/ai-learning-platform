'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile, getOrCreateUserProfile, debugDatabaseAccess } from '@/lib/supabase-user'

type AuthContextType = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: unknown }>
  signUp: (email: string, password: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  const loadUserProfile = async (user: User | null) => {
    if (user) {
      console.log('👤 Loading user profile for:', user.email)
      
      // Create fallback profile immediately to prevent blocking
      const fallbackProfile = {
        id: user.id,
        email: user.email!,
        name: user.email?.split('@')[0] || 'User',
        skill_level: 'beginner' as const,
        learning_style: 'mixed' as const,
        experience_level: 'beginner',
        total_xp: 0,
        current_level: 1,
        streak: 0,
        last_active: new Date().toISOString()
      }
      
      // Set fallback profile immediately for responsive UX
      setProfile(fallbackProfile)
      console.log('✅ Fallback profile set immediately for responsive UX')
      
      // Try to load/create actual profile in background (non-blocking)
      try {
        console.log('🔄 Attempting to load actual profile in background...')
        
        // Much shorter timeout for background operation
        const profileTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Background profile loading timeout')), 5000)
        )
        
        const userProfilePromise = getOrCreateUserProfile(user)
        const userProfile = await Promise.race([userProfilePromise, profileTimeout])
        
        if (userProfile) {
          console.log('✅ Actual user profile loaded successfully, updating...')
          setProfile(userProfile)
        } else {
          console.log('⚠️ No actual profile returned, keeping fallback')
        }
      } catch (error) {
        console.warn('⚠️ Background profile loading failed, keeping fallback profile:', error)
        // Keep the fallback profile - don't update state
      }
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    let isMounted = true
    
    console.log('🔧 AuthProvider: Initializing auth...')
    
    // Set a shorter timeout to prevent long loading states
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Auth loading timeout - stopping loading state')
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }, 3000) // 3秒タイムアウト（本番環境用短縮）

    // Get initial session with faster error handling
    const initializeAuth = async () => {
      try {
        console.log('🔍 AuthProvider: Getting initial session...')
        setIsHydrated(true)
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Auth session error:', error)
          // セッションエラーの場合は自動的にログアウト状態にする
          setUser(null)
          setProfile(null)
          setLoading(false)
          clearTimeout(loadingTimeout)
          return
        }
        
        if (!isMounted) return
        
        // セッションの有効性を確認
        let currentSession = session
        if (currentSession) {
          const now = Math.floor(Date.now() / 1000)
          const expiresAt = currentSession.expires_at || 0
          
          console.log('🕐 Session expires at:', new Date(expiresAt * 1000).toLocaleString())
          console.log('🕐 Current time:', new Date().toLocaleString())
          
          if (expiresAt && now >= expiresAt) {
            console.warn('⚠️ Session expired, attempting refresh...')
            
            try {
              // タイムアウト付きでリフレッシュを試行
              const refreshPromise = supabase.auth.refreshSession()
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Refresh timeout')), 5000)
              )
              
              const { data: refreshData, error: refreshError } = await Promise.race([
                refreshPromise,
                timeoutPromise
              ]) as { data: { session: unknown }, error: unknown }
              
              if (refreshError || !refreshData.session) {
                console.error('❌ Session refresh failed, redirecting to login:', refreshError?.message)
                setUser(null)
                setProfile(null)
                setLoading(false)
                clearTimeout(loadingTimeout)
                // ログインページへリダイレクト
                window.location.href = '/login'
                return
              }
              
              console.log('✅ Session refreshed successfully')
              currentSession = refreshData.session
            } catch (refreshErr) {
              console.error('❌ Session refresh exception, redirecting to login:', refreshErr)
              setUser(null)
              setProfile(null)
              setLoading(false)
              clearTimeout(loadingTimeout)
              // ログインページへリダイレクト
              window.location.href = '/login'
              return
            }
          }
        }
        
        const user = currentSession?.user ?? null
        console.log('👤 AuthProvider: Session loaded, user:', user ? user.email : 'null')
        setUser(user)
        
        // Load user profile without blocking the loading state
        if (user) {
          console.log('📖 AuthProvider: Loading user profile...')
          loadUserProfile(user).catch(error => {
            console.error('❌ Error loading user profile during init:', error)
          })
        }
        
        setLoading(false)
        clearTimeout(loadingTimeout)
        console.log('✅ AuthProvider: Initialization complete')
      } catch (error) {
        if (isMounted) {
          console.error('❌ Auth initialization error:', error)
          setUser(null)
          setProfile(null)
          setIsHydrated(true)
          setLoading(false)
          clearTimeout(loadingTimeout)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthProvider: Auth state change:', event, session?.user?.email || 'null')
        
        // セッション期限切れを検知
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed automatically')
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
        }
        
        try {
          const user = session?.user ?? null
          setUser(user)
          
          if (user) {
            await loadUserProfile(user)
          } else {
            setProfile(null)
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    // 定期的なセッション健全性チェック（10分毎、本番負荷軽減）
    const sessionHealthCheck = setInterval(async () => {
      try {
        // タイムアウト付きでセッション確認
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as { data: { session: unknown }, error: unknown }
        
        if (error) {
          console.error('⚠️ Session health check failed:', error)
          return
        }
        
        if (session && session.expires_at) {
          const now = Math.floor(Date.now() / 1000)
          const expiresAt = session.expires_at
          const timeUntilExpiry = expiresAt - now
          
          // 5分以内に期限切れになる場合は事前リフレッシュ
          if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
            console.log('🔄 Pre-emptive session refresh (expires in', timeUntilExpiry, 'seconds)')
            try {
              await Promise.race([
                supabase.auth.refreshSession(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Refresh timeout')), 5000)
                )
              ])
            } catch (refreshError) {
              console.error('❌ Pre-emptive refresh failed:', refreshError)
            }
          }
        }
      } catch (error) {
        console.error('❌ Session health check error:', error)
      }
    }, 10 * 60 * 1000) // 10分毎（本番負荷軽減）

    return () => {
      console.log('🧹 AuthProvider: Cleanup')
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
      clearInterval(sessionHealthCheck)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthProvider: Starting signIn process...')
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - request took too long')), 15000)
      )
      
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('⏳ AuthProvider: Sending login request to Supabase...')
      const { error } = await Promise.race([signInPromise, timeoutPromise])
      
      console.log('📨 AuthProvider: Login response received')
      
      if (error) {
        // ユーザー入力エラーは詳細ログを出さない
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Email not confirmed') ||
            error.status === 400) {
          console.log('ℹ️ Login failed: Invalid credentials or unconfirmed email')
        } else {
          // システムエラーのみ詳細ログ
          console.error('❌ System authentication error:', error.message)
        }
      } else {
        console.log('✅ AuthProvider: Login successful')
      }
      
      return { error }
    } catch (err) {
      console.error('❌ Authentication system error:', err)
      
      // If it's a timeout, provide specific error message
      if (err instanceof Error && err.message.includes('timeout')) {
        return { error: { message: 'ログインリクエストがタイムアウトしました。再度お試しください。' } }
      }
      
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}