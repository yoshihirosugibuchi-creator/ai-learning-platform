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

export default function LearningPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [learningStats, setLearningStats] = useState({
    totalSessionsCompleted: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
    lastLearningDate: null
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const coursesData = await getLearningCourses()
        setCourses(coursesData)

        // ユーザーの学習統計を計算
        if (user?.id) {
          const stats = await calculateLearningStats(user.id)
          setLearningStats(stats)
        }
      } catch (error) {
        console.error('Failed to load learning data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  const handleStartCourse = (courseId: string) => {
    router.push(`/learning/${courseId}`)
  }

  if (loading) {
    return <LoadingScreen message="学習コンテンツを読み込んでいます..." />
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
              <h1 className="text-3xl font-bold">体系的学習コンテンツ</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              3分のマイクロラーニングで、ビジネススキルを体系的に身につけよう
            </p>
          </div>

          {/* Learning Stats */}
          {learningStats.totalSessionsCompleted > 0 && (
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
                      {learningStats.totalSessionsCompleted}
                    </div>
                    <div className="text-sm text-muted-foreground">完了セッション</div>
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
                        {Math.floor(learningStats.totalSessionsCompleted / 10)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">獲得バッジ</div>
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