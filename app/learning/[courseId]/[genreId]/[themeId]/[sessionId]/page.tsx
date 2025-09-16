'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LoadingScreen from '@/components/layout/LoadingScreen'
import LearningSession from '@/components/learning/LearningSession'
import { getLearningCourseDetails } from '@/lib/learning/data'
import { LearningCourse, LearningSession as LearningSessionType } from '@/lib/types/learning'
import { useUserContext } from '@/contexts/UserContext'

export default function SessionPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useUserContext()
  const [course, setCourse] = useState<LearningCourse | null>(null)
  const [currentSession, setCurrentSession] = useState<LearningSessionType | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sessionData, setSessionData] = useState<{
    totalSessions: number
    currentIndex: number
    sessions: LearningSessionType[]
    themeRewardCard?: {
      id: string
      title: string
      description?: string
      icon?: string
    }
  }>({ totalSessions: 0, currentIndex: 0, sessions: [] })

  const courseId = params.courseId as string
  const genreId = params.genreId as string
  const themeId = params.themeId as string
  const sessionId = params.sessionId as string

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const courseData = await getLearningCourseDetails(courseId)
        if (!courseData) {
          throw new Error('Course not found')
        }
        setCourse(courseData)

        // Find the specific session and related data
        const genre = courseData.genres.find(g => g.id === genreId)
        if (!genre) {
          throw new Error('Genre not found')
        }

        const theme = genre.themes.find(t => t.id === themeId)
        if (!theme) {
          throw new Error('Theme not found')
        }

        const session = theme.sessions.find(s => s.id === sessionId)
        if (!session) {
          throw new Error('Session not found')
        }

        setCurrentSession(session)

        // Calculate session position and navigation data
        const currentIndex = theme.sessions.findIndex(s => s.id === sessionId)
        setSessionData({
          totalSessions: theme.sessions.length,
          currentIndex,
          sessions: theme.sessions,
          themeRewardCard: theme.rewardCard
        })

      } catch (error) {
        console.error('Failed to load session data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSessionData()
  }, [courseId, genreId, themeId, sessionId])

  const handleSessionComplete = (completedSessionId: string) => {
    console.log(`Session ${completedSessionId} completed`)
  }

  const handleNext = () => {
    if (sessionData.currentIndex < sessionData.sessions.length - 1) {
      const nextSession = sessionData.sessions[sessionData.currentIndex + 1]
      router.push(`/learning/${courseId}/${genreId}/${themeId}/${nextSession.id}`)
    }
  }

  const handlePrevious = () => {
    if (sessionData.currentIndex > 0) {
      const prevSession = sessionData.sessions[sessionData.currentIndex - 1]
      router.push(`/learning/${courseId}/${genreId}/${themeId}/${prevSession.id}`)
    }
  }

  const handleExit = () => {
    router.push(`/learning/${courseId}`)
  }

  if (loading) {
    return <LoadingScreen message="学習セッションを読み込んでいます..." />
  }

  if (!course || !currentSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">セッションが見つかりません</h1>
          <p className="text-muted-foreground">
            指定された学習セッションが見つかりませんでした
          </p>
          <button 
            onClick={() => router.push('/learning')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            学習コンテンツ一覧に戻る
          </button>
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
        <LearningSession
          courseId={courseId}
          genreId={genreId}
          themeId={themeId}
          session={currentSession}
          totalSessions={sessionData.totalSessions}
          currentSessionIndex={sessionData.currentIndex}
          themeRewardCard={sessionData.themeRewardCard}
          onComplete={handleSessionComplete}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onExit={handleExit}
        />
      </main>
    </div>
  )
}