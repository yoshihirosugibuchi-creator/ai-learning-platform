'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Menu, ArrowLeft, User, Bookmark, Bell, Flame, Zap, Home, BookOpen, GraduationCap, LogOut, Settings, Shield, Trophy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserSKPBalance } from '@/lib/supabase-learning'
import { useXPStats } from '@/hooks/useXPStats'

interface HeaderProps {
  onMobileMenuToggle?: () => void
  onBackClick?: () => void
  showBackButton?: boolean
}

export default function Header({
  onMobileMenuToggle,
  onBackClick,
  showBackButton = false
}: HeaderProps) {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [displaySKP, setDisplaySKP] = useState(0)
  const loadingRef = useRef(false)
  const { stats: xpStats } = useXPStats()

  // ユーザーデータ取得（SKPのみ）
  const loadUserData = useCallback(async () => {
    if (user?.id && !loadingRef.current) {
      loadingRef.current = true
      try {
        const skpBalance = await getUserSKPBalance(user.id)
        setDisplaySKP(skpBalance)
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        loadingRef.current = false
      }
    }
  }, [user?.id])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  // DBから直接レベルと連続学習日数を取得
  const currentLevel = xpStats?.user.current_level || 1
  const learningStreak = xpStats?.user.learning_streak || 0
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Back Button */}
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackClick}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Logo/Brand */}
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold">ALE</h1>
            <p className="text-xs text-muted-foreground hidden md:block">
              学習プラットフォーム
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {loading ? (
            // Loading state - show minimal loading indicator
            <div className="flex items-center space-x-2">
              <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
              <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ) : user ? (
            <>
              {/* Learning Streak */}
              <div className="hidden md:flex items-center space-x-1 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{learningStreak}</span>
                <span className="text-muted-foreground">日連続</span>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/" prefetch={true}>
                    <Home className="h-4 w-4" />
                    <span className="hidden md:inline ml-1">ホーム</span>
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" asChild>
                  <Link 
                    href="/learning" 
                    prefetch={true}
                    onClick={() => {
                      console.log('🔗 Header: Navigating to /learning')
                      console.log('👤 Header: Current user state:', { 
                        userId: user?.id, 
                        email: user?.email, 
                        loading 
                      })
                    }}
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span className="hidden md:inline ml-1">コース</span>
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/categories" prefetch={true}>
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden md:inline ml-1">カテゴリー</span>
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/profile" prefetch={true}>
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline ml-1">マイページ</span>
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/collection" prefetch={true}>
                    <Bookmark className="h-4 w-4" />
                    <span className="hidden md:inline ml-1">コレクション</span>
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/analytics" prefetch={true}>
                    <Brain className="h-4 w-4" />
                    <span className="hidden md:inline ml-1">分析</span>
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>

              {/* User Info */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-1 text-sm">
                  <Trophy className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Lv.{currentLevel}</span>
                </div>
                
                <div className="flex items-center space-x-1 text-sm">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{xpStats ? xpStats.user.total_xp.toLocaleString() : 0}</span>
                  <span className="text-muted-foreground">XP</span>
                </div>
                
                <div className="flex items-center space-x-1 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{displaySKP}</span>
                  <span className="text-muted-foreground">SKP</span>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium">{user.email}</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>マイページ</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>管理者</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>設定</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>ログアウト</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                ログイン
              </Button>
              <Button size="sm">
                無料で始める
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}