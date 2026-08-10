'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, Clock, CheckCircle, Circle, Award, Star, Tag, Eye, Edit } from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { getLearningCourseDetails } from '@/lib/learning/data'
import { LearningCourse, LearningGenre, LearningTheme, LearningSession, DifficultyLabels, SessionTypeLabels } from '@/lib/types/learning'
import { getCategoryInfoForCourseAsync, getCategoryInfoForGenre } from '@/lib/learning/category-integration'
import { getCategories } from '@/lib/categories'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOfflineDB } from '@/lib/offline/provider'
import { supabase } from '@/lib/supabase'
import { MainCategory, IndustryCategory } from '@/lib/types/category'

// 新設計: セッション完了データ型
interface SessionCompletion {
  session_id: string
  theme_id: string
  genre_id: string
  is_first_completion: boolean
  created_at: string | null
}

export default function CourseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { database } = useOfflineDB()
  const fromHome = searchParams.get('from') === 'home'
  const [course, setCourse] = useState<LearningCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sessionCompletions, setSessionCompletions] = useState<SessionCompletion[]>([])
  const [categoryInfo, setCategoryInfo] = useState<{
    categories: Array<{
      genreId: string
      genreTitle: string
      mainCategory: (MainCategory | IndustryCategory) | null
      subcategory: string | null
    }>
    uniqueMainCategories: (MainCategory | IndustryCategory)[]
  } | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  const courseId = params.courseId as string

  // プレビューモードの検出
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    setIsPreviewMode(urlParams.get('preview') === 'admin')
  }, [])

  // ページ遷移時にスクロール位置をトップにリセット
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [courseId])

  // ローカルDB + サーバーをマージ: course_session_completions テーブルから完了状態を取得
  const loadSessionCompletions = useCallback(async (userId: string) => {
    try {
      // サーバーから取得（ベースデータ）
      const { data: serverCompletions, error } = await supabase
        .from('course_session_completions')
        .select('session_id, theme_id, genre_id, is_first_completion, created_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('is_first_completion', true)

      if (error) {
        console.error('❌ Error loading session completions:', error)
      }

      // session_id をキーにマージ用Mapを作成
      const completionMap = new Map<string, SessionCompletion>()

      // サーバーデータをMapに追加
      for (const c of (serverCompletions || [])) {
        completionMap.set(c.session_id, c)
      }

      // ローカルDB（WatermelonDB）からも取得してマージ
      if (database) {
        try {
          const { Q } = await import('@nozbe/watermelondb')
          const collection = database.get('course_session_completions')
          const localRecords = await collection.query(
            Q.where('user_id', userId),
            Q.where('course_id', courseId)
          ).fetch()

          for (const r of localRecords as Array<{ _raw: Record<string, unknown> }>) {
            const sessionId = r._raw.session_id as string
            // ローカルにしかないレコードをマージ（サーバー未反映分を補完）
            if (!completionMap.has(sessionId)) {
              completionMap.set(sessionId, {
                session_id: sessionId,
                theme_id: r._raw.theme_id as string,
                genre_id: r._raw.genre_id as string,
                is_first_completion: true,
                created_at: r._raw.created_at ? new Date(r._raw.created_at as number).toISOString() : null,
              })
            }
          }
        } catch (e) {
          console.warn('ローカルDB読み取り失敗:', e)
        }
      }

      setSessionCompletions(Array.from(completionMap.values()))
    } catch (error) {
      console.error('❌ Error in loadSessionCompletions:', error)
    }
  }, [courseId, database])

  // 新設計: セッション完了状態の判定
  const isSessionCompleted = (sessionId: string): boolean => {
    return sessionCompletions.some(completion => completion.session_id === sessionId)
  }

  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return

      try {
        console.log('📚 Loading course data for:', courseId)

        // カテゴリーキャッシュを事前に初期化
        await getCategories().catch(err => console.warn('Category pre-load warning:', err))

        // コースデータを取得
        const courseData = await getLearningCourseDetails(courseId, database)

        if (!courseData) {
          console.error('❌ Course data not found for:', courseId)
          setLoading(false)
          return
        }

        console.log('✅ Course data loaded:', courseData.title)
        setCourse(courseData)

        // カテゴリー情報を取得（非同期版: サブカテゴリーキャッシュ確実にロード後に解決）
        const catInfo = await getCategoryInfoForCourseAsync(courseData)
        setCategoryInfo(catInfo)

        // 完了状態データの読み込み
        if (user?.id) {
          await loadSessionCompletions(user.id)
        }
      } catch (error) {
        console.error('❌ Failed to load course details:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCourseData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id, loadSessionCompletions])

  const handleStartSession = (genreId: string, themeId: string, sessionId: string) => {
    router.push(`/learning/${courseId}/${genreId}/${themeId}/${sessionId}`)
  }

  const getThemeProgress = (genreId: string, themeId: string, sessions: LearningSession[]) => {
    const completed = sessions.filter(session => 
      isSessionCompleted(session.id)
    ).length
    return { completed, total: sessions.length }
  }

  const getGenreProgress = (genre: LearningGenre) => {
    let totalSessions = 0
    let completedSessions = 0
    
    genre.themes.forEach((theme: LearningTheme) => {
      totalSessions += theme.sessions.length
      theme.sessions.forEach((session: LearningSession) => {
        if (isSessionCompleted(session.id)) {
          completedSessions++
        }
      })
    })
    
    return { completed: completedSessions, total: totalSessions }
  }


  if (loading) {
    return <LoadingScreen message={`コース詳細を読み込んでいます... (${courseId})`} />
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">コースが見つかりません</h1>
          <Button onClick={() => router.push(fromHome ? '/' : '/learning')}>
            {fromHome ? 'ホームに戻る' : '学習コンテンツ一覧に戻る'}
          </Button>
        </div>
      </div>
    )
  }

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
        <div className="space-y-6">
          {/* Back Button - プレビューモード対応 */}
          {isPreviewMode ? (
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium">
                <Eye className="h-4 w-4" />
                <span>プレビューモード</span>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => router.push('/admin/courses')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>コース学習メンテナンスに戻る</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.push(fromHome ? '/' : '/learning')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{fromHome ? 'ホームに戻る' : '学習コンテンツ一覧'}</span>
              </Button>
              {fromHome && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/learning')}
                >
                  コース一覧を見る
                </Button>
              )}
            </div>
          )}

          {/* Course Header */}
          <Card style={{ borderTop: `4px solid ${course.color}` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div 
                    className="text-3xl p-3 rounded-full bg-opacity-10 flex items-center justify-center w-16 h-16"
                    style={{ backgroundColor: `${course.color}20` }}
                  >
                    {course.icon}
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">
                        {DifficultyLabels[course.difficulty]}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{course.estimatedDays}日間</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* プレビューモード時の編集ボタン */}
                {isPreviewMode && (
                  <Button 
                    onClick={() => router.push(`/admin/courses/${courseId}/edit`)}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>コース編集</span>
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {course.description}
              </p>
              
              {/* カテゴリー情報 */}
              {categoryInfo && categoryInfo.uniqueMainCategories.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                    <Tag className="h-4 w-4" />
                    <span>関連カテゴリー</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* 重複を除去してユニークなカテゴリーのみ表示 */}
                    {(() => {
                      const seen = new Set<string>()
                      return categoryInfo.categories
                        .filter(cat => {
                          if (!cat.mainCategory) return false
                          const key = `${cat.mainCategory.id}-${cat.subcategory || ''}`
                          if (seen.has(key)) return false
                          seen.add(key)
                          return true
                        })
                        .map((cat, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: cat.mainCategory!.color,
                              color: cat.mainCategory!.color
                            }}
                          >
                            {cat.mainCategory!.icon} {cat.subcategory || cat.mainCategory!.name}
                          </Badge>
                        ))
                    })()}
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Course Content */}
          <div className="space-y-6">
            {course.genres.map((genre) => {
              const genreProgress = getGenreProgress(genre)
              const genreProgressPercentage = genreProgress.total > 0 
                ? Math.round((genreProgress.completed / genreProgress.total) * 100) 
                : 0

              return (
                <Card key={genre.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <CardTitle className="flex items-center space-x-2">
                          <span>{genre.title}</span>
                          {genreProgressPercentage === 100 && (
                            <Award className="h-5 w-5 text-yellow-500" />
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {genre.description}
                        </p>
                        
                        {/* ジャンル別カテゴリー情報表示 */}
                        {(() => {
                          const genreCategoryInfo = getCategoryInfoForGenre(genre)
                          return genreCategoryInfo.mainCategory && (
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className="text-xs px-2 py-0.5"
                                style={{ 
                                  borderColor: genreCategoryInfo.mainCategory.color + '40',
                                  color: genreCategoryInfo.mainCategory.color,
                                  backgroundColor: genreCategoryInfo.mainCategory.color + '10'
                                }}
                              >
                                <Tag className="h-2.5 w-2.5 mr-1" />
                                {genreCategoryInfo.subcategory || genreCategoryInfo.mainCategory.name}
                              </Badge>
                            </div>
                          )
                        })()}
                      </div>
                      <Badge 
                        variant={genreProgressPercentage === 100 ? "default" : "outline"}
                        style={{ 
                          backgroundColor: genreProgressPercentage === 100 ? course.color : undefined
                        }}
                      >
                        {genreProgress.completed}/{genreProgress.total} 完了
                      </Badge>
                    </div>
                    
                    {genreProgress.total > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>進捗状況</span>
                          <span>{genreProgressPercentage}%</span>
                        </div>
                        <Progress value={genreProgressPercentage} className="h-2" />
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="space-y-0">
                      {genre.themes.map((theme) => {
                        const themeProgress = getThemeProgress(genre.id, theme.id, theme.sessions)
                        const themeProgressPercentage = themeProgress.total > 0 
                          ? Math.round((themeProgress.completed / themeProgress.total) * 100) 
                          : 0

                        return (
                          <div key={theme.id} className="border-b last:border-b-0">
                            <div className="p-4 space-y-4">
                              {/* Theme Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-2">
                                    {themeProgressPercentage === 100 ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-gray-300" />
                                    )}
                                    <h3 className="font-semibold">{theme.title}</h3>
                                  </div>
                                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{theme.estimatedMinutes}分</span>
                                  </div>
                                </div>
                                
                                {themeProgressPercentage === 100 && (
                                  <div className="flex items-center space-x-2">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm text-muted-foreground">
                                      カード獲得済み
                                    </span>
                                  </div>
                                )}
                              </div>

                              <p className="text-sm text-muted-foreground">
                                {theme.description}
                              </p>

                              {/* Sessions */}
                              <div className="grid gap-2">
                                {theme.sessions.map((session, index) => {
                                  const isCompleted = isSessionCompleted(session.id)
                                  
                                  return (
                                    <div 
                                      key={session.id}
                                      className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium">
                                          {index + 1}
                                        </div>
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium">{session.title}</span>
                                            {isCompleted && (
                                              <CheckCircle className="h-4 w-4 text-green-500" />
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="text-xs">
                                              {SessionTypeLabels[session.type]}
                                            </Badge>
                                            <span>{session.estimatedMinutes}分</span>
                                          </div>
                                        </div>
                                      </div>

                                      <Button
                                        size="sm"
                                        onClick={() => handleStartSession(genre.id, theme.id, session.id)}
                                        variant={isCompleted ? "outline" : "default"}
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        {isCompleted ? '復習' : '開始'}
                                      </Button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}