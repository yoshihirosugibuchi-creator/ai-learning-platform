'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, BookOpen, Clock, TrendingUp, Star } from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import CourseCard from '@/components/learning/CourseCard'
import { getLearningCourses, getLearningProgress, calculateLearningStats } from '@/lib/learning/data'
import { useAuth } from '@/components/auth/AuthProvider'
import { globalCache, useResourceMonitor } from '@/lib/performance-optimizer'
import { getBadgeStats } from '@/lib/supabase-badges'

export default function LearningPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [courses, setCourses] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [learningStats, setLearningStats] = useState({
    totalSessionsCompleted: 0,
    totalAvailableSessions: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
    lastLearningDate: null
  })
  const [badgeStats, setBadgeStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiringSoon: 0
  })

  // パフォーマンス監視
  useResourceMonitor()

  useEffect(() => {
    // 認証ローディング中はデータロードを待つ（最大5秒）
    if (authLoading) {
      console.log('⏳ Auth loading, waiting...')
      // タイムアウト付きで待機
      const authTimeout = setTimeout(() => {
        console.warn('⚠️ Auth loading timeout, proceeding without auth check')
        setLoading(false)
      }, 5000)
      
      return () => clearTimeout(authTimeout)
    }

    // セッション状態の詳細確認
    if (!user) {
      console.log('🚫 No user found in learning page')
      // セッション再確認を試行（タイムアウト付き）
      const recheckSession = async () => {
        try {
          const { supabase } = await import('@/lib/supabase')
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session check timeout')), 3000)
          )
          
          const { data: { session } } = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]) as any
          
          console.log('🔍 Session recheck result:', session ? session.user?.email : 'null')
          
          if (!session) {
            console.log('🔄 No session found, redirecting to login')
            router.push('/login')
            return
          }
        } catch (error) {
          console.error('❌ Session recheck failed:', error)
          router.push('/login')
          return
        }
      }
      recheckSession()
      return
    }

    const loadData = async () => {
      console.log('📚 Learning page: Starting data load')
      console.log('👤 User state:', { userId: user?.id, userEmail: user?.email })
      
      try {
        // 全体のタイムアウト設定（30秒）
        const dataTimeout = setTimeout(() => {
          console.warn('⚠️ Data loading timeout, showing error state')
          setLoading(false)
        }, 30000)
        
        // キャッシュから先に確認
        const cacheKey = 'learning_courses'
        const cachedCourses = globalCache.get(cacheKey)
        
        if (cachedCourses) {
          console.log('🎯 Using cached courses data')
          setCourses(cachedCourses)
          setLoading(false) // キャッシュデータがあれば即座に表示
          clearTimeout(dataTimeout)
        }
        
        // バックグラウンドでフレッシュデータを取得（タイムアウト付き）
        console.log('📡 Fetching fresh courses...')
        const coursesPromise = getLearningCourses()
        const coursesTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Courses fetch timeout')), 15000)
        )
        
        try {
          const coursesData = await Promise.race([coursesPromise, coursesTimeout])
          console.log('✅ Fresh courses loaded:', coursesData.length)
          setCourses(coursesData)
          globalCache.set(cacheKey, coursesData, 5 * 60 * 1000) // 5分キャッシュ
          clearTimeout(dataTimeout)
        } catch (coursesError) {
          console.error('❌ Courses loading failed:', coursesError)
          if (!cachedCourses) {
            // キャッシュもない場合は空配列で継続
            setCourses([])
            setLoading(false)
            clearTimeout(dataTimeout)
          }
        }

        // ユーザーの学習統計を計算（タイムアウト付き）
        if (user?.id) {
          console.log('📊 Loading user statistics...')
          try {
            const statsPromise = Promise.all([
              calculateLearningStats(user.id),
              getBadgeStats(user.id)
            ])
            const statsTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Stats timeout')), 10000)
            )
            
            const [stats, badges] = await Promise.race([statsPromise, statsTimeout])
            console.log('✅ Statistics loaded:', { stats, badges })
            setLearningStats(stats)
            setBadgeStats(badges)
          } catch (statsError) {
            console.error('❌ Error loading statistics:', statsError)
            // 統計読み込みエラーでも画面は表示する
          }
        } else {
          console.log('ℹ️ No user logged in, skipping statistics')
        }
        
        console.log('🎉 Learning page data loading completed')
      } catch (error) {
        console.error('❌ Critical error loading learning data:', error)
        console.error('❌ Error stack:', error instanceof Error ? error.stack : error)
        // エラーが発生してもローディングを終了
      } finally {
        console.log('⏹️ Setting loading to false')
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id, authLoading])

  const handleStartCourse = async (courseId: string) => {
    console.log('🚀 Starting course navigation to:', courseId)
    
    // 事前にコースデータをプリロード（キャッシュに保存）
    try {
      const { getLearningCourseDetails } = await import('@/lib/learning/data')
      console.log('📦 Preloading course data...')
      await getLearningCourseDetails(courseId)
      console.log('✅ Course data preloaded for:', courseId)
    } catch (error) {
      console.warn('⚠️ Failed to preload course data:', error)
    }
    
    router.push(`/learning/${courseId}`)
  }

  // 認証ローディング中は認証完了を待つ
  if (authLoading) {
    console.log('🔄 Learning: Auth still loading...')
    return <LoadingScreen message="認証状態を確認しています..." />
  }

  // 認証が必要だがユーザーがいない場合
  if (!user) {
    console.log('🚫 Learning: No user found, redirecting to login')
    router.push('/login')
    return <LoadingScreen message="ログインページに移動中..." />
  }

  // データローディング中
  if (loading) {
    return <LoadingScreen message="学習コンテンツを読み込んでいます..." />
  }

  // データエラー時のフォールバック
  if (!courses || courses.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">コースが見つかりません</h2>
            <p className="text-muted-foreground mb-4">
              学習コンテンツの読み込みに問題が発生しました
            </p>
            <Button onClick={() => window.location.reload()}>
              ページを再読み込み
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const availableCourses = courses.filter(course => course.status === 'available')
  const comingSoonCourses = courses.filter(course => course.status === 'coming_soon')

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
      />
      
      <MobileNav 
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">コース学習メニュー</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              3分のマイクロラーニングで、ビジネススキルを体系的に身につけよう
            </p>
          </div>

          {/* Learning Stats */}
          {(learningStats.totalSessionsCompleted > 0 || learningStats.totalAvailableSessions > 0) && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>あなたの学習状況</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {learningStats.totalSessionsCompleted}/{learningStats.totalAvailableSessions}
                    </div>
                    <div className="text-sm text-muted-foreground">セッション進捗</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {learningStats.totalTimeSpent}
                    </div>
                    <div className="text-sm text-muted-foreground">学習時間(分)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {learningStats.currentStreak}
                    </div>
                    <div className="text-sm text-muted-foreground">連続学習日数</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-yellow-600">
                        {badgeStats.active}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">修了証</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Courses */}
          {availableCourses.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">利用可能なコース</h2>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {availableCourses.length}コース
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onStartCourse={handleStartCourse}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Coming Soon Courses */}
          {comingSoonCourses.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">近日公開予定</h2>
                <Badge variant="outline">
                  {comingSoonCourses.length}コース
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comingSoonCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onStartCourse={handleStartCourse}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Learning Tips */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <span>効果的な学習のコツ</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">毎日3分継続</h3>
                  <p className="text-sm text-muted-foreground">
                    短時間の学習を毎日続けることで定着率が向上
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold">実践で活用</h3>
                  <p className="text-sm text-muted-foreground">
                    学んだ内容を実際の業務で活用してスキル定着
                  </p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">復習で強化</h3>
                  <p className="text-sm text-muted-foreground">
                    獲得したカードで重要ポイントを定期的に復習
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}