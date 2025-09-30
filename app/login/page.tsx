'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Brain, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { logAuthDebugInfo, debugLoginAttempt, setupGlobalErrorHandling } from '@/lib/debug-auth'
import type { AuthError } from '@supabase/supabase-js'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Setup debugging on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setupGlobalErrorHandling()
      logAuthDebugInfo()
    }
  }, [])

  // ログインフォーム状態
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })

  // 新規登録フォーム状態
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Supabaseログインエラーを日本語メッセージに変換
  const translateAuthError = (error: { message?: string }): string => {
    if (!error?.message) return 'ログインに失敗しました'
    
    const message = error.message.toLowerCase()
    
    // よくあるSupabaseのエラーパターンをチェック
    if (message.includes('invalid login credentials') || 
        message.includes('invalid credentials') ||
        message.includes('email not confirmed') ||
        message.includes('invalid email or password')) {
      return 'メールアドレスまたはパスワードが正しくありません'
    }
    
    if (message.includes('email not confirmed')) {
      return 'メールアドレスの確認が完了していません。確認メールをご確認ください'
    }
    
    if (message.includes('too many requests')) {
      return 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワークエラーが発生しました。接続を確認して再度お試しください'
    }
    
    // その他のエラーは一般的なメッセージを表示
    return 'ログインに失敗しました。入力内容をご確認ください'
  }

  // Supabase登録エラーを日本語メッセージに変換
  const translateRegistrationError = (error: { message?: string }): string => {
    if (!error?.message) return '登録中にエラーが発生しました'
    
    const message = error.message.toLowerCase()
    
    if (message.includes('already registered') || 
        message.includes('user already registered')) {
      return 'このメールアドレスは既に登録されています'
    }
    
    if (message.includes('invalid email')) {
      return 'メールアドレスの形式が正しくありません'
    }
    
    if (message.includes('password')) {
      if (message.includes('weak') || message.includes('short')) {
        return 'パスワードが弱すぎます。より強力なパスワードを設定してください'
      }
      return 'パスワードの形式が正しくありません'
    }
    
    if (message.includes('too many requests')) {
      return '登録試行回数が上限に達しました。しばらくしてから再度お試しください'
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワークエラーが発生しました。接続を確認して再度お試しください'
    }
    
    // その他のエラーは一般的なメッセージを表示
    return '登録中にエラーが発生しました。入力内容をご確認ください'
  }

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Login form submitted')
    setIsLoading(true)
    setError('')
    
    // Create a timeout for the entire login process
    const loginTimeout = setTimeout(() => {
      setIsLoading(false)
      setError('ログイン処理がタイムアウトしました。再度お試しください。')
      console.error('❌ Login process timeout')
    }, 20000) // 20秒タイムアウト
    
    try {
      console.log('📝 Calling signIn with:', loginForm.email)
      debugLoginAttempt(loginForm.email)
      const { error } = await signIn(loginForm.email, loginForm.password)
      
      // Clear timeout if we get here
      clearTimeout(loginTimeout)
      
      if (error) {
        // ユーザー入力エラーは静かに処理（Supabaseエラーアイコン回避）
        const errorMessage = (error as AuthError)?.message || ''
        if (errorMessage.includes('Invalid login credentials') || 
            errorMessage.includes('invalid credentials') ||
            errorMessage.includes('invalid email or password')) {
          console.debug('Login failed: Invalid credentials')
        } else {
          console.error('❌ Login error:', error)
        }
        const userFriendlyMessage = translateAuthError(error)
        setError(userFriendlyMessage)
      } else {
        console.log('✅ Login successful, redirecting to home')
        router.push('/')
      }
    } catch (err) {
      clearTimeout(loginTimeout)
      console.error('❌ Login exception:', err)
      setError('ログイン中にエラーが発生しました')
    } finally {
      setIsLoading(false)
      console.log('🏁 Login process completed')
    }
  }

  // 新規登録処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    // バリデーション
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('パスワードが一致しません')
      setIsLoading(false)
      return
    }

    if (registerForm.password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await signUp(registerForm.email, registerForm.password)
      
      if (error) {
        const userFriendlyMessage = translateRegistrationError(error)
        setError(userFriendlyMessage)
      } else {
        setSuccess('確認メールを送信しました。メールをチェックしてアカウントを有効化してください。')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('登録中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Brain className="h-12 w-12 text-blue-600" />
              <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            AI学習プラットフォーム
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">ログイン</TabsTrigger>
              <TabsTrigger value="register">新規登録</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center">
                      処理中...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      ログイン <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">お名前</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="田中太郎"
                      className="pl-10"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">メールアドレス</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">パスワード</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">パスワード（確認）</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center">
                      処理中...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      新規登録 <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}