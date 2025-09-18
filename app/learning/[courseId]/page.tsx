'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, Clock, BookOpen, CheckCircle, Circle, Award, Star, Tag } from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import { getLearningCourseDetails, getLearningProgress } from '@/lib/learning/data'
import { LearningCourse, DifficultyLabels, SessionTypeLabels } from '@/lib/types/learning'
import { getCategoryInfoForCourse, getCategoryInfoForGenre } from '@/lib/learning/category-integration'
import { useAuth } from '@/components/auth/AuthProvider'

export default function CourseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState<LearningCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userProgress, setUserProgress] = useState<any>({})
  const [categoryInfo, setCategoryInfo] = useState<any>(null)

  const courseId = params.courseId as string

  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return
      
      try {
        console.log('📚 Loading course data for:', courseId)
        
        // コースデータと進捗を並列で取得
        const coursePromise = getLearningCourseDetails(courseId)
        const progressPromise = user?.id ? getLearningProgress(user.id) : Promise.resolve({})
        
        const [courseData, progress] = await Promise.all([coursePromise, progressPromise])
        
        if (!courseData) {
          console.error('❌ Course data not found for:', courseId)
          setLoading(false)
          return
        }

        console.log('✅ Course data loaded:', courseData.title)
        setCourse(courseData)

        // カテゴリー情報を取得（同期処理）
        const catInfo = getCategoryInfoForCourse(courseData)
        setCategoryInfo(catInfo)

        // 進捗データを設定
        if (user?.id) {
          console.log('📈 Progress data loaded, sessions:', Object.keys(progress).length)
          setUserProgress(progress)
        }
      } catch (error) {
        console.error('❌ Failed to load course details:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCourseData()
  }, [courseId, user?.id])

  const handleStartSession = (genreId: string, themeId: string, sessionId: string) => {
    router.push(`/learning/${courseId}/${genreId}/${themeId}/${sessionId}`)
  }

  const isSessionCompleted = (genreId: string, themeId: string, sessionId: string) => {
    const key = `${courseId}_${genreId}_${themeId}_${sessionId}`
    const isCompleted = userProgress[key]?.completed || false
    console.log(`🔍 Checking session completion: ${key} -> ${isCompleted}`)
    return isCompleted
  }

  const getThemeProgress = (genreId: string, themeId: string, sessions: any[]) => {
    const completed = sessions.filter(session => 
      isSessionCompleted(genreId, themeId, session.id)
    ).length
    return { completed, total: sessions.length }
  }

  const getGenreProgress = (genre: any) => {
    let totalSessions = 0
    let completedSessions = 0
    
    genre.themes.forEach((theme: any) => {
      totalSessions += theme.sessions.length
      theme.sessions.forEach((session: any) => {
        if (isSessionCompleted(genre.id, theme.id, session.id)) {
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
          <Button onClick={() => router.push('/learning')}>
            学習コンテンツ一覧に戻る
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
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => router.push('/learning')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>学習コンテンツ一覧</span>
          </Button>

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
                    {categoryInfo.categories.map((cat: any, index: number) => (
                      cat.mainCategory && (
                        <Badge 
                          key={index}
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            borderColor: cat.mainCategory.color,
                            color: cat.mainCategory.color 
                          }}
                        >
                          {cat.mainCategory.icon} {cat.subcategory || cat.mainCategory.name}
                        </Badge>
                      )
                    ))}
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

              // ジャンル単位のカテゴリー情報を取得
              const genreCategoryInfo = getCategoryInfoForGenre(genre)

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
                        {genreCategoryInfo.mainCategory && (
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
                        )}
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
                                  const isCompleted = isSessionCompleted(genre.id, theme.id, session.id)
                                  
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