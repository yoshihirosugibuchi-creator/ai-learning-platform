import { LearningCourse } from '@/lib/types/learning'

/**
 * 学習コンテンツデータ読み込み関数
 */

// コース一覧の取得（カテゴリー情報含む）
export async function getLearningCourses(): Promise<{ 
  id: string
  title: string
  description: string
  estimatedDays: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  icon: string
  color: string
  displayOrder: number
  genreCount: number
  themeCount: number
  status: 'available' | 'coming_soon' | 'draft'
  genres?: any[]
}[]> {
  try {
    // まずコース一覧を取得
    const response = await fetch('/learning-data/courses.json')
    if (!response.ok) {
      throw new Error('Failed to fetch courses')
    }
    const data = await response.json()
    
    // 各コースについて詳細データからジャンル情報を取得
    const coursesWithGenres = await Promise.all(
      data.courses.map(async (course: any) => {
        if (course.status === 'available') {
          try {
            const detailResponse = await fetch(`/learning-data/${course.id}.json`)
            if (detailResponse.ok) {
              const detailData = await detailResponse.json()
              return {
                ...course,
                genres: detailData.genres
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch genre data for course ${course.id}:`, error)
          }
        }
        return course
      })
    )
    
    return coursesWithGenres
  } catch (error) {
    console.error('Error loading learning courses:', error)
    return []
  }
}

// 特定コースの詳細データ取得
export async function getLearningCourseDetails(courseId: string): Promise<LearningCourse | null> {
  try {
    const response = await fetch(`/learning-data/${courseId}.json?t=${Date.now()}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch course details for ${courseId}`)
    }
    const courseData = await response.json()
    console.log('🔍 Raw course data loaded:', courseData)
    return courseData
  } catch (error) {
    console.error(`Error loading course details for ${courseId}:`, error)
    return null
  }
}


// 利用可能なコースのみを取得
export async function getAvailableLearningCourses() {
  const courses = await getLearningCourses()
  return courses.filter(course => course.status === 'available')
}

// 学習進捗の取得・保存（Supabase使用）
import { getLearningProgressSupabase, saveLearningProgressSupabase } from '@/lib/supabase-learning'

export async function getLearningProgress(userId: string) {
  try {
    const progress = await getLearningProgressSupabase(userId)
    return progress
  } catch (error) {
    console.error('Error loading learning progress from Supabase:', error)
    return {}
  }
}

export async function saveLearningProgress(userId: string, courseId: string, genreId: string, themeId: string, sessionId: string, completed: boolean) {
  try {
    const success = await saveLearningProgressSupabase(userId, courseId, genreId, themeId, sessionId, completed)
    if (!success) {
      console.error('Failed to save learning progress to Supabase')
    }
    return success
  } catch (error) {
    console.error('Error saving learning progress to Supabase:', error)
    return false
  }
}

// 学習統計の計算
export async function calculateLearningStats(userId: string) {
  const progress = await getLearningProgress(userId)
  const completedSessions = Object.values(progress).filter((p: any) => p.completed)
  
  return {
    totalSessionsCompleted: completedSessions.length,
    totalTimeSpent: completedSessions.length * 3, // 概算（セッション1つ=3分）
    currentStreak: await calculateLearningStreak(userId),
    lastLearningDate: completedSessions.length > 0 ? 
      new Date(Math.max(...completedSessions.map((p: any) => new Date(p.completedAt).getTime()))) : null
  }
}

async function calculateLearningStreak(userId: string): Promise<number> {
  const progress = await getLearningProgress(userId)
  const completedSessions = Object.values(progress)
    .filter((p: any) => p.completed)
    .sort((a: any, b: any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  
  if (completedSessions.length === 0) return 0
  
  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  
  for (const session of completedSessions) {
    const sessionDate = new Date((session as any).completedAt)
    sessionDate.setHours(0, 0, 0, 0)
    
    const diffDays = (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (diffDays === streak) {
      streak++
    } else if (diffDays > streak) {
      break
    }
  }
  
  return streak
}