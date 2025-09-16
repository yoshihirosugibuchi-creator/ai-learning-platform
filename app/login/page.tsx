'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Brain, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react'
import { 
  createRegisteredUser, 
  createDefaultUser, 
  authenticateUser, 
  saveUserData,
  resetPassword,
  checkUserExists
} from '@/lib/storage'
import { useUserContext } from '@/contexts/UserContext'

export default function LoginPage() {
  const router = useRouter()
  const { updateUser } = useUserContext()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  // パスワードリセット状態
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetForm, setResetForm] = useState({
    email: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const user = authenticateUser(loginForm.email, loginForm.password)
      
      if (user) {
        // UserContextを更新
        updateUser(user)
        
        // 即座にリダイレクト（成功メッセージなし）
        if (user.auth.isOnboarded) {
          router.push('/')
        } else {
          router.push('/onboarding')
        }
      } else {
        setError('メールアドレスまたはパスワードが正しくありません')
      }
    } catch (err) {
      setError('ログイン中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 新規登録処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

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
      const newUser = createRegisteredUser(
        registerForm.email, 
        registerForm.password, 
        registerForm.name
      )
      
      // UserContextを更新
      updateUser(newUser)
      
      // 即座にオンボーディングページにリダイレクト
      router.push('/onboarding')
    } catch (err) {
      setError('アカウント作成中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // パスワードリセット処理
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    // バリデーション
    if (resetForm.newPassword !== resetForm.confirmNewPassword) {
      setError('新しいパスワードが一致しません')
      setIsLoading(false)
      return
    }

    if (resetForm.newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setIsLoading(false)
      return
    }

    try {
      // ユーザーが存在するか確認
      if (!checkUserExists(resetForm.email)) {
        setError('指定されたメールアドレスのアカウントが見つかりません')
        setIsLoading(false)
        return
      }

      const success = resetPassword(resetForm.email, resetForm.newPassword)
      
      if (success) {
        setSuccess('パスワードを正常にリセットしました。新しいパスワードでログインしてください。')
        setShowPasswordReset(false)
        setResetForm({ email: '', newPassword: '', confirmNewPassword: '' })
        
        // ログインフォームにメールアドレスを自動入力
        setLoginForm(prev => ({ ...prev, email: resetForm.email, password: '' }))
      } else {
        setError('パスワードリセットに失敗しました')
      }
    } catch (err) {
      setError('パスワードリセット中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // ゲストモード
  const handleGuestMode = () => {
    setIsLoading(true)
    
    try {
      const guestUser = createDefaultUser(true)
      updateUser(guestUser)
      
      // 即座にホーム画面にリダイレクト
      router.push('/')
    } catch (err) {
      setError('ゲストモードの開始中にエラーが発生しました')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">AI学習プラットフォーム</h1>
          </div>
          <p className="text-gray-600 text-sm">
            ビジネススキルを効率的に学習しましょう
          </p>
        </div>

        {/* メインカード */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">ようこそ</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4" onValueChange={() => {
              setError('')
              setSuccess('')
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>

              {/* ログインタブ */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">パスワード</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '処理中...' : 'ログイン'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  {/* パスワードを忘れた場合 */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordReset(true)
                        setError('')
                        setSuccess('')
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      パスワードを忘れた方はこちら
                    </button>
                  </div>
                </form>
              </TabsContent>

              {/* 新規登録タブ */}
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">お名前</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="山田太郎"
                        className="pl-10"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">メールアドレス</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">パスワード</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">パスワード確認</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '処理中...' : 'アカウント作成'}
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* パスワードリセットモーダル */}
            {showPasswordReset && (
              <div className="mt-4 p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">パスワードリセット</h3>
                  <button
                    onClick={() => {
                      setShowPasswordReset(false)
                      setResetForm({ email: '', newPassword: '', confirmNewPassword: '' })
                      setError('')
                      setSuccess('')
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">メールアドレス</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={resetForm.email}
                        onChange={(e) => setResetForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">新しいパスワード</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={resetForm.newPassword}
                        onChange={(e) => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">新しいパスワード確認</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm-new-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={resetForm.confirmNewPassword}
                        onChange={(e) => setResetForm(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '処理中...' : 'パスワードをリセット'}
                  </Button>
                </form>
              </div>
            )}

            {/* エラー・成功メッセージ */}
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* ゲストモード */}
            <div className="mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleGuestMode}
                disabled={isLoading}
              >
                ゲストとして体験
                <span className="text-xs text-gray-500 ml-2">※学習記録は保存されません</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className="text-center text-xs text-gray-500">
          <p>アカウント作成により、利用規約に同意したものとみなします</p>
        </div>
      </div>
    </div>
  )
}