'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile, getOrCreateUserProfile } from '@/lib/supabase-user'

type AuthContextType = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: unknown }>
  signUp: (email: string, password: string) => Promise<{ error: unknown }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSessionWithToken: (refreshToken: string) => Promise<{ error: unknown }>
  getSessionRefreshToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSessionWithToken: async () => ({ error: null }),
  getSessionRefreshToken: async () => null,
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
  const [, setIsHydrated] = useState(false)
  const [lastLoadedUserId, setLastLoadedUserId] = useState<string | null>(null)

  // 最新のuser状態を追跡するref（visibilitychange等のイベントハンドラで使用）
  const userRef = useRef<User | null>(null)
  userRef.current = user

  const loadUserProfile = async (user: User | null) => {
    if (user) {
      console.log('👤 Loading user profile for:', user.email)
      
      // Create comprehensive fallback profile immediately to prevent blocking
      const fallbackProfile = {
        id: user.id,
        email: user.email!,
        name: user.email?.split('@')[0] || 'User',
        role: 'user', // 🚨 CRITICAL: role フィールドを追加
        skill_level: 'basic' as const,
        learning_style: 'mixed' as const,
        experience_level: 'basic',
        total_xp: 0,
        current_level: 1,
        streak: 0,
        last_active: new Date().toISOString(),
        // 🚨 CRITICAL: プロフィールページで必要なフィールドを追加
        display_name: user.email?.split('@')[0] || 'User',
        job_title: undefined,
        position_level: undefined,
        learning_level: undefined,
        industry: undefined,
        experience_years: undefined,
        interested_industries: undefined,
        learning_goals: undefined,
        selected_categories: undefined,
        weekly_goal: undefined,
        profile_completed_at: undefined,
        last_profile_update: undefined
      }
      
      // Set fallback profile immediately for responsive UX
      setProfile(fallbackProfile)
      console.log('✅ Fallback profile set immediately for responsive UX')
      
      // Try to load/create actual profile in background (non-blocking)
      try {
        console.log('🔄 Attempting to load actual profile in background...')
        
        // Timeout for background operation - extended for better UX
        const profileTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Background profile loading timeout')), 8000)
        )
        
        const userProfilePromise = getOrCreateUserProfile(user)
        const userProfile = await Promise.race([userProfilePromise, profileTimeout])
        
        if (userProfile) {
          console.log('✅ Actual user profile loaded successfully, updating...')
          setProfile(userProfile as UserProfile)
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

  // ネイティブアプリ: initializeAuthのUserDefaultsチェックが完了するまで
  // onAuthStateChangeがloading=falseにするのを防ぐフラグ
  const nativeCheckDoneRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    console.log('🔧 AuthProvider: Initializing auth...')
    nativeCheckDoneRef.current = false

    // Set a shorter timeout to prevent long loading states
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ Auth loading timeout - stopping loading state')
        nativeCheckDoneRef.current = true
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }, 5000) // 5秒タイムアウト（本番環境考慮）

    // Get initial session with faster error handling
    const initializeAuth = async () => {
      try {
        console.log('🔍 AuthProvider: Getting initial session...')
        setIsHydrated(true)

        // ネイティブアプリ: UserDefaultsでセッション状態を確認
        // ログアウト後はsession_activeフラグが無い → localStorageのゴーストセッションを破棄
        if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Capacitor) {
          try {
            const { isSessionActive } = await import('@/lib/native-secure-storage')
            const active = await isSessionActive()
            if (!active) {
              console.log('🚪 No active session in UserDefaults, clearing ghost session')
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
              try { localStorage.clear() } catch { /* ignore */ }
              nativeCheckDoneRef.current = true
              setUser(null)
              setProfile(null)
              setLoading(false)
              clearTimeout(loadingTimeout)
              return
            }
          } catch {
            // プラグインエラーは無視して通常フローへ
          }
        }
        nativeCheckDoneRef.current = true

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
              ]) as { data: { session: Session | null }, error: { message?: string } | null }
              
              if (refreshError || !refreshData.session) {
                const errorMessage = refreshError && typeof refreshError === 'object' && 'message' in refreshError 
                  ? (refreshError as { message: string }).message 
                  : 'Unknown error'
                console.error('❌ Session refresh failed, clearing all auth data:', errorMessage)
                
                // 🚨 CRITICAL: 完全にセッションをクリア
                await supabase.auth.signOut()
                setUser(null)
                setProfile(null)
                setLoading(false)
                clearTimeout(loadingTimeout)
                
                // localStorage/sessionStorageも強制クリア
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('supabase.auth.token')
                  sessionStorage.clear()
                }
                
                // ログインページへリダイレクト
                window.location.href = '/login'
                return
              }
              
              console.log('✅ Session refreshed successfully')
              currentSession = refreshData.session as Session
            } catch (refreshErr) {
              console.error('❌ Session refresh exception, clearing all auth data:', refreshErr)
              
              // 🚨 CRITICAL: 完全にセッションをクリア
              await supabase.auth.signOut()
              setUser(null)
              setProfile(null)
              setLoading(false)
              clearTimeout(loadingTimeout)
              
              // localStorage/sessionStorageも強制クリア
              if (typeof window !== 'undefined') {
                localStorage.removeItem('supabase.auth.token')
                sessionStorage.clear()
              }
              
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
          setLastLoadedUserId(user.id) // 初期化時にユーザーIDを設定
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

        // ネイティブアプリ: UserDefaultsチェックが完了するまでINITIAL_SESSIONを無視
        // WKWebViewがlocalStorageからゴーストセッションを復元する問題を防ぐ
        if (event === 'INITIAL_SESSION' && !nativeCheckDoneRef.current) {
          console.log('⏸️ Deferring INITIAL_SESSION until native check completes')
          return
        }

        // セッション期限切れを検知
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed automatically')
          // ネイティブアプリ: Keychainのリフレッシュトークンを更新
          if (session?.refresh_token) {
            import('@/lib/native-secure-storage').then(({ storeRefreshToken, isBiometricEnabled }) => {
              isBiometricEnabled().then((enabled) => {
                if (enabled) storeRefreshToken(session.refresh_token)
              })
            }).catch(() => { /* ブラウザ環境では無視 */ })
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
          // ネイティブアプリ: トークンのみクリア（biometric_enabledは保持）
          import('@/lib/native-secure-storage').then(({ clearAuthTokens }) => {
            clearAuthTokens()
          }).catch(() => { /* ブラウザ環境では無視 */ })
        }

        try {
          const user = session?.user ?? null
          setUser(user)

          if (user) {
            // プロファイルの再読み込みが必要な条件をより厳密にチェック
            const needsReload = (
              event === 'TOKEN_REFRESHED' ||
              !profile ||
              (event === 'SIGNED_IN' && lastLoadedUserId !== user.id)
            )

            // INITIAL_SESSIONは初期化で既に処理済みなのでスキップ
            const skipEvents = ['INITIAL_SESSION']

            if (skipEvents.includes(event)) {
              console.log('⏭️ Skipping profile reload for skip event:', event)
            } else if (needsReload) {
              console.log('🔄 Profile reload needed for event:', event, 'user changed:', lastLoadedUserId !== user.id)
              await loadUserProfile(user)
              setLastLoadedUserId(user.id)
            } else {
              console.log('⏭️ Skipping profile reload for event:', event, 'same user:', user.id)
            }
          } else {
            setProfile(null)
            setLastLoadedUserId(null)
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    // タブがアクティブになった時にセッションをリフレッシュ（タブ切り替え対策）
    // 短時間のタブ切り替えではスキップし、長時間離れた場合のみリフレッシュ
    let authTabHiddenAt: number | null = null

    const handleVisibilityChange = async () => {
      // refを使用して最新のuser状態を取得（クロージャの問題を回避）
      const currentUser = userRef.current

      if (document.visibilityState === 'hidden') {
        authTabHiddenAt = Date.now()
        return
      }

      if (document.visibilityState !== 'visible' || !currentUser) {
        return
      }

      // 短時間のタブ切り替え（60秒未満）はリフレッシュをスキップ
      const hiddenDuration = authTabHiddenAt ? Date.now() - authTabHiddenAt : 0
      authTabHiddenAt = null

      if (hiddenDuration < 60 * 1000) {
        console.log('👁️ Tab visible after', Math.round(hiddenDuration / 1000), 's, skipping refresh (< 60s)')
        return
      }

      console.log('👁️ Tab visible after', Math.round(hiddenDuration / 1000), 's, proactively refreshing session...')

      // リトライロジック付きでリフレッシュ
      let retryCount = 0
      const maxRetries = 2

      while (retryCount <= maxRetries) {
        try {
          // タイムアウト付きでリフレッシュ
          const refreshPromise = supabase.auth.refreshSession()
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Refresh timeout')), 8000)
          )

          const { data: refreshData, error: refreshError } = await Promise.race([
            refreshPromise,
            timeoutPromise
          ])

          if (!refreshError && refreshData.session) {
            const expiresAt = refreshData.session.expires_at || 0
            const now = Math.floor(Date.now() / 1000)
            console.log('✅ Session refreshed on tab focus, expires in', Math.round((expiresAt - now) / 60), 'minutes')
            setUser(refreshData.session.user)
            return // 成功したので終了
          }

          console.warn(`⚠️ Session refresh attempt ${retryCount + 1} failed:`, refreshError?.message)
          retryCount++

          if (retryCount <= maxRetries) {
            // リトライ前に少し待機
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (err) {
          console.warn(`⚠️ Session refresh attempt ${retryCount + 1} error:`, err)
          retryCount++

          if (retryCount <= maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      // 全リトライ失敗後もすぐにログアウトせず、既存セッションで継続を試みる
      console.warn('⚠️ All refresh attempts failed, but keeping current session. User may need to re-login if API calls fail.')
      // 注: ここでログアウトしない。API呼び出し時に401が返ったらuseUserRoleで処理する
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 定期的なセッション健全性チェック（5分毎）
    const sessionHealthCheck = setInterval(async () => {
      try {
        // タイムアウト付きでセッション確認（タイムアウトはnullを返す、エラーにしない）
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise: Promise<{ data: { session: null }, error: null }> = new Promise((resolve) =>
          setTimeout(() => {
            console.debug('⏱️ Health check timed out, skipping this cycle')
            resolve({ data: { session: null }, error: null })
          }, 10000)
        )

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ])

        if (error) {
          console.warn('⚠️ Session health check failed:', error)
          return
        }

        // タイムアウトでsessionがnullの場合はスキップ
        if (!session) {
          return
        }

        if ('expires_at' in session && typeof session.expires_at === 'number') {
          const now = Math.floor(Date.now() / 1000)
          const expiresAt = session.expires_at
          const timeUntilExpiry = expiresAt - now

          // 2分以内に期限切れになる場合は事前リフレッシュ
          if (timeUntilExpiry < 120 && timeUntilExpiry > 0) {
            console.log('🔄 Pre-emptive session refresh (expires in', timeUntilExpiry, 'seconds)')
            try {
              const refreshPromise = supabase.auth.refreshSession()
              const refreshTimeoutPromise: Promise<{ data: { session: null }, error: null }> = new Promise((resolve) =>
                setTimeout(() => {
                  console.debug('⏱️ Refresh timed out, will retry next cycle')
                  resolve({ data: { session: null }, error: null })
                }, 10000)
              )

              const refreshResult = await Promise.race([refreshPromise, refreshTimeoutPromise])
              if (refreshResult.data.session) {
                console.log('✅ Session refreshed successfully, profile preserved')
              }
            } catch (refreshError) {
              console.warn('⚠️ Pre-emptive refresh failed:', refreshError)
            }
          }
        }
      } catch (error) {
        // エラーは警告レベルで記録（ユーザー体験に影響しない）
        console.warn('⚠️ Session health check error:', error)
      }
    }, 5 * 60 * 1000) // 5分毎

    return () => {
      console.log('🧹 AuthProvider: Cleanup')
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
      clearInterval(sessionHealthCheck)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [lastLoadedUserId]) // eslint-disable-line react-hooks/exhaustive-deps
  // profile を依存関係から除外して無限ループを防ぐ

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
      const { error } = await Promise.race([signInPromise, timeoutPromise]) as { error: { message: string; status?: number } | null }
      
      console.log('📨 AuthProvider: Login response received')
      
      if (error) {
        // ユーザー入力エラーは詳細ログを出さない（Supabaseエラーアイコン抑制）
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Email not confirmed') ||
            error.message.includes('invalid credentials') ||
            error.message.includes('invalid email or password') ||
            error.status === 400) {
          // 認証失敗は静かに処理（エラーログアイコン回避）
          console.debug('Authentication failed: Invalid credentials')
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
    // 1. ネイティブアプリ: セッションフラグ解除 + 古いトークンクリア
    // biometric_enabledフラグは保持（再ログイン時にFace IDを使えるようにする）
    try {
      const { setSessionActiveFlag, clearAuthTokens } = await import('@/lib/native-secure-storage')
      await setSessionActiveFlag(false)
      await clearAuthTokens()
    } catch {
      // ブラウザ環境では無視
    }

    // 2. Supabaseセッション破棄（scope: 'global'でサーバー側トークンも無効化）
    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch {
      // ネットワークエラーでもローカルクリアは続行
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // 無視
      }
    }

    // 3. React状態クリア
    setUser(null)
    setProfile(null)

    // 4. JS側ストレージ全クリア
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      // 無視
    }

    // 5. ページを強制リロード
    window.location.href = '/login'
  }

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing user profile...')
      await loadUserProfile(user)
    }
  }

  /** リフレッシュトークンでセッションを復元（生体認証ログイン用） */
  const refreshSessionWithToken = async (refreshToken: string) => {
    try {
      const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
      return { error }
    } catch (err) {
      return { error: err }
    }
  }

  /** 現在のセッションのリフレッシュトークンを取得 */
  const getSessionRefreshToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession()
    return data.session?.refresh_token ?? null
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
        refreshProfile,
        refreshSessionWithToken,
        getSessionRefreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}