'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile, getOrCreateUserProfile, debugDatabaseAccess } from '@/lib/supabase-user'

type AuthContextType = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
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
      try {
        const userProfile = await getOrCreateUserProfile(user)
        setProfile(userProfile)
      } catch (error) {
        console.error('❌ Error loading user profile:', error)
        // Set a fallback profile to keep the app working
        setProfile({
          id: user.id,
          email: user.email!,
          name: user.email?.split('@')[0] || 'User',
          skill_level: 'beginner',
          learning_style: 'mixed',
          experience_level: 'beginner',
          total_xp: 0,
          current_level: 1,
          streak: 0,
          last_active: new Date().toISOString()
        })
      }
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    let isMounted = true
    
    // Set a shorter timeout to prevent long loading states
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Auth loading timeout - stopping loading state')
        setLoading(false)
      }
    }, 3000) // Reduced to 3 second timeout

    // Get initial session with faster error handling
    const initializeAuth = async () => {
      try {
        setIsHydrated(true) // Mark as hydrated first
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        const user = session?.user ?? null
        setUser(user)
        
        // Load user profile without blocking the loading state
        if (user) {
          loadUserProfile(user).catch(error => {
            console.error('❌ Error loading user profile during init:', error)
          })
        }
        
        setLoading(false)
        clearTimeout(loadingTimeout)
      } catch (error) {
        if (isMounted) {
          console.error('❌ Auth session error:', error)
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
        try {
          const user = session?.user ?? null
          setUser(user)
          await loadUserProfile(user)
        } catch (error) {
          console.error('❌ Auth state change error:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('🔄 SignIn started with email:', email)
    
    try {
      // Normal Supabase authentication
      console.log('🌐 Attempting Supabase authentication...')
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Supabase authentication error:', error)
      } else {
        console.log('✅ Supabase authentication successful')
      }
      
      return { error }
    } catch (err) {
      console.error('❌ SignIn exception:', err)
      return { error: err }
    }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
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