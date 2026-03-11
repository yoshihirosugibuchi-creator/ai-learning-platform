'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Brain, Menu, ArrowLeft, User, Bookmark, Bell, Flame, Zap, Home, BookOpen, GraduationCap, LogOut, Settings, Shield, Trophy, Sparkles, RefreshCw, Briefcase, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserSKPBalance } from '@/lib/supabase-learning'
import { useXPStats } from '@/hooks/useXPStats'
import { useUserRole } from '@/hooks/useUserRole'
import { useReviewQuickCheck } from '@/hooks/useReviewQuickCheck'

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
  const { isAdmin } = useUserRole()
  const { reviewStatus } = useReviewQuickCheck()
  const [showReviewTooltip, setShowReviewTooltip] = useState(false)

  // モバイル用ボトムシートの開閉状態
  const [notifSheetOpen, setNotifSheetOpen] = useState(false)
  const [userSheetOpen, setUserSheetOpen] = useState(false)

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

  // 初回読み込み
  useEffect(() => {
    loadUserData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // 復習問題が見つかった時のツールチップ表示
  useEffect(() => {
    if (reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0) {
      setShowReviewTooltip(true)
      setTimeout(() => setShowReviewTooltip(false), 5000)
    }
  }, [reviewStatus?.hasReviewQuestions, reviewStatus?.totalQuestions])

  const handleLogout = async () => {
    setUserSheetOpen(false)
    await signOut()
    router.push('/login')
  }

  // DBから直接レベルと連続学習日数を取得
  const currentLevel = xpStats?.user.current_level || 1
  const learningStreak = xpStats?.user.learning_streak || 0

  // 通知ベルのアイコン部分（共通）
  const bellIcon = (
    <>
      <Bell className={`h-4 w-4 ${
        reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0
          ? 'animate-pulse'
          : reviewStatus?.isGenerating ? 'animate-bounce' : ''
      }`} />
      {(reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0) && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center animate-bounce"
        >
          {reviewStatus.totalQuestions > 99 ? '99+' : reviewStatus.totalQuestions}
        </Badge>
      )}
      {reviewStatus?.isGenerating && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-blue-500 text-white"
        >
          <RefreshCw className="h-3 w-3 animate-spin" />
        </Badge>
      )}
    </>
  )

  // 通知の中身（共通）
  const notifContent = (
    <>
      {reviewStatus?.isGenerating ? (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="font-medium text-sm text-blue-900">復習問題準備中</span>
          </div>
          <p className="text-sm text-blue-800">
            新しい復習問題を準備しています。少々お待ちください...
          </p>
        </div>
      ) : reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0 ? (
        <>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm text-orange-900">復習推奨</span>
              </div>
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                新着
              </Badge>
            </div>
            <p className="text-sm text-orange-800">
              {reviewStatus.displayText}の復習が推奨されています
            </p>
          </div>

          <Link
            href="/quiz?mode=review"
            className="flex items-center p-4 rounded-lg hover:bg-orange-50 transition-colors"
            onClick={() => { setNotifSheetOpen(false); setShowReviewTooltip(false) }}
          >
            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mr-3">
              <RefreshCw className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">復習クイズを開始</div>
              <div className="text-xs text-gray-600 mt-1">
                不正解・ヒント使用・苦手問題を分析して選定
              </div>
            </div>
            <div className="text-xs text-orange-600 font-medium">
              開始 →
            </div>
          </Link>

          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <div className="text-xs text-gray-500">
              復習による学習効率: 平均+65%向上
            </div>
          </div>
        </>
      ) : (
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">通知なし</span>
          </div>
          <p className="text-xs text-muted-foreground">
            復習が必要な問題があれば、ここに表示されます
          </p>
        </div>
      )}
    </>
  )

  // ユーザーメニューの中身（共通）
  const userMenuItems = (
    <div className="flex flex-col">
      <Link
        href="/profile"
        className="flex items-center px-4 py-3 hover:bg-accent rounded-lg transition-colors"
        onClick={() => setUserSheetOpen(false)}
      >
        <User className="mr-3 h-5 w-5" />
        <span className="text-sm">マイページ</span>
      </Link>
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center px-4 py-3 hover:bg-accent rounded-lg transition-colors"
          onClick={() => setUserSheetOpen(false)}
        >
          <Shield className="mr-3 h-5 w-5" />
          <span className="text-sm">管理者</span>
        </Link>
      )}
      <Link
        href="/settings"
        className="flex items-center px-4 py-3 hover:bg-accent rounded-lg transition-colors"
        onClick={() => setUserSheetOpen(false)}
      >
        <Settings className="mr-3 h-5 w-5" />
        <span className="text-sm">設定</span>
      </Link>
      <div className="border-t my-1" />
      <button
        className="flex items-center px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-red-600 w-full text-left"
        onClick={handleLogout}
      >
        <LogOut className="mr-3 h-5 w-5" />
        <span className="text-sm">ログアウト</span>
      </button>
    </div>
  )

  const bellButtonClass = `relative transition-colors ${
    reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0
      ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
      : reviewStatus?.isGenerating
        ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
        : ''
  }`

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
            <div className="flex items-center space-x-2">
              <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
              <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ) : user ? (
            <>
              {/* Learning Streak - デスクトップのみ */}
              <div className="hidden md:flex items-center space-x-1 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{learningStreak}</span>
                <span className="text-muted-foreground">日連続</span>
              </div>

              {/* デスクトップ用ナビゲーション */}
              <div className="hidden md:flex items-center space-x-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/" prefetch={true}>
                    <Home className="h-4 w-4" />
                    <span className="ml-1">ホーム</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/learning" prefetch={true}>
                    <GraduationCap className="h-4 w-4" />
                    <span className="ml-1">コース</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/categories" prefetch={true}>
                    <BookOpen className="h-4 w-4" />
                    <span className="ml-1">カテゴリー</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/case-study" prefetch={true}>
                    <Briefcase className="h-4 w-4" />
                    <span className="ml-1">ケーススタディ</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/quiz-packs" prefetch={true}>
                    <Package className="h-4 w-4" />
                    <span className="ml-1">クイズ</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/profile" prefetch={true}>
                    <User className="h-4 w-4" />
                    <span className="ml-1">マイページ</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/analytics" prefetch={true}>
                    <Brain className="h-4 w-4" />
                    <span className="ml-1">分析</span>
                  </Link>
                </Button>
              </div>

              {/* コレクション - 共通 */}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/collection" prefetch={true}>
                  <Bookmark className="h-4 w-4" />
                  <span className="hidden md:inline ml-1">コレクション</span>
                </Link>
              </Button>

              {/* === 通知ベル === */}
              {/* モバイル: ボトムシート */}
              <Button
                variant="ghost"
                size="sm"
                className={`md:hidden ${bellButtonClass}`}
                onClick={() => setNotifSheetOpen(true)}
              >
                {bellIcon}
              </Button>

              {/* デスクトップ: ドロップダウン */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`hidden md:flex ${bellButtonClass}`}
                    onMouseEnter={() => {
                      if (reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0) {
                        setShowReviewTooltip(true)
                      }
                    }}
                    onMouseLeave={() => setShowReviewTooltip(false)}
                  >
                    {bellIcon}
                    {showReviewTooltip && reviewStatus && (
                      <div className="absolute top-8 right-0 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                        {reviewStatus.isGenerating ? '復習問題生成中...' :
                         reviewStatus.hasReviewQuestions ? `復習推奨: ${reviewStatus.displayText} (${reviewStatus.availableSets}セット)` :
                         '復習問題なし'}
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {reviewStatus?.isGenerating ? (
                    <div className="p-4 border-b bg-blue-50">
                      <div className="flex items-center space-x-2 mb-2">
                        <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                        <span className="font-medium text-sm text-blue-900">復習問題準備中</span>
                      </div>
                      <p className="text-sm text-blue-800">
                        新しい復習問題を準備しています。少々お待ちください...
                      </p>
                    </div>
                  ) : reviewStatus?.hasReviewQuestions && reviewStatus.totalQuestions > 0 ? (
                    <>
                      <div className="p-4 border-b bg-orange-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-sm text-orange-900">復習推奨</span>
                          </div>
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700">
                            新着
                          </Badge>
                        </div>
                        <p className="text-sm text-orange-800">
                          {reviewStatus.displayText}の復習が推奨されています
                        </p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/quiz?mode=review"
                          className="flex items-center p-4 hover:bg-orange-50"
                          onClick={() => setShowReviewTooltip(false)}
                        >
                          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mr-3">
                            <RefreshCw className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">復習クイズを開始</div>
                            <div className="text-xs text-gray-600 mt-1">
                              不正解・ヒント使用・苦手問題を分析して選定
                            </div>
                          </div>
                          <div className="text-xs text-orange-600 font-medium">開始 →</div>
                        </Link>
                      </DropdownMenuItem>
                      <div className="p-3 border-t bg-gray-50">
                        <div className="text-xs text-gray-500 text-center">
                          復習による学習効率: 平均+65%向上
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">通知なし</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        復習が必要な問題があれば、ここに表示されます
                      </p>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Stats - デスクトップのみ */}
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
              </div>

              {/* === ユーザーアバター === */}
              {/* モバイル: ボトムシート */}
              <Button
                variant="ghost"
                className="md:hidden flex items-center h-auto p-2"
                onClick={() => setUserSheetOpen(true)}
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </Button>

              {/* デスクトップ: ドロップダウン */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden md:flex items-center space-x-2 h-auto p-2">
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
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>管理者</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
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

      {/* モバイル用ボトムシート: 通知 */}
      <Sheet open={notifSheetOpen} onOpenChange={setNotifSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>通知</span>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {notifContent}
          </div>
        </SheetContent>
      </Sheet>

      {/* モバイル用ボトムシート: ユーザーメニュー */}
      <Sheet open={userSheetOpen} onOpenChange={setUserSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-medium">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{user?.email}</div>
                <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center"><Trophy className="h-3 w-3 mr-1 text-purple-500" />Lv.{currentLevel}</span>
                  <span className="flex items-center"><Zap className="h-3 w-3 mr-1 text-blue-500" />{xpStats ? xpStats.user.total_xp.toLocaleString() : 0} XP</span>
                  <span className="flex items-center"><Flame className="h-3 w-3 mr-1 text-orange-500" />{learningStreak}日</span>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {userMenuItems}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
