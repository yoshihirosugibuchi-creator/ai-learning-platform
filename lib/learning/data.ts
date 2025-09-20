import { LearningCourse } from '@/lib/types/learning'
import { globalCache } from '@/lib/performance-optimizer'
import { 
  getCoursesFromDB, 
  getCourseDetailsFromDB, 
  getAvailableCoursesFromDB 
} from './supabase-data'

/**
 * 学習コンテンツデータ読み込み関数
 * フィーチャーフラグでJSON/DB切り替え
 */

// フィーチャーフラグ: DB使用モード
const USE_DATABASE = true // true: DB, false: JSON

// コース一覧の取得（カテゴリー情報含む）- DB API使用版 with JSONフォールバック
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
  genres?: Record<string, unknown>[]
}[]> {
  const cacheKey = 'learning_courses_db'
  
  // キャッシュチェック（5分間）
  const cached = globalCache.get(cacheKey)
  if (cached) {
    console.log('🚀 Learning courses loaded from cache')
    return cached
  }

  if (USE_DATABASE) {
    try {
      console.log('📡 Fetching learning courses from DB API')
      const courses = await getCoursesFromDB()
      
      // キャッシュに保存（5分間）
      globalCache.set(cacheKey, courses, 5 * 60 * 1000)
      
      console.log(`✅ Learning courses loaded from DB: ${courses.length} courses`)
      return courses
      
    } catch (error) {
      console.error('❌ Error loading learning courses from DB:', error)
      console.log('🔄 Falling back to JSON files...')
      
      // JSONフォールバック
      return await loadLearningCoursesFromJSON()
    }
  }

  // JSONモード（直接）
  return await loadLearningCoursesFromJSON()
}

// JSONファイルからの学習コース読み込み（フォールバック用）
async function loadLearningCoursesFromJSON(): Promise<Record<string, unknown>[]> {
  try {
    console.log('📄 Loading learning courses from JSON fallback')
    
    // まずコース一覧を取得
    const response = await fetch('/learning-data/courses.json')
    if (!response.ok) {
      throw new Error(`JSON file request failed: ${response.status}`)
    }
    const data = await response.json()
    
    // 各コースについて詳細データからジャンル情報を取得
    const coursesWithGenres = await Promise.all(
      data.courses.map(async (course: Record<string, unknown>) => {
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
    
    console.log(`✅ Learning courses loaded from JSON: ${coursesWithGenres.length} courses`)
    return coursesWithGenres
    
  } catch (error) {
    console.error('❌ Error loading learning courses from JSON:', error)
    return []
  }
}

// 特定コースの詳細データ取得 - DB API使用版 with JSONフォールバック
export async function getLearningCourseDetails(courseId: string): Promise<LearningCourse | null> {
  const cacheKey = `course_details_db_${courseId}`
  
  // キャッシュチェック（10分間）
  const cached = globalCache.get(cacheKey)
  if (cached) {
    console.log('🚀 Course details loaded from cache:', courseId)
    return cached
  }

  if (USE_DATABASE) {
    try {
      console.log('📡 Fetching course details from DB API:', courseId)
      const courseData = await getCourseDetailsFromDB(courseId)
      
      if (courseData) {
        // キャッシュに保存（10分間）
        globalCache.set(cacheKey, courseData, 10 * 60 * 1000)
        console.log('✅ Course details loaded from DB:', courseId)
        return courseData
      }
      
    } catch (error) {
      console.error(`❌ Error loading course details from DB for ${courseId}:`, error)
      console.log('🔄 Falling back to JSON file...')
      
      // JSONフォールバック
      return await loadCourseDetailsFromJSON(courseId)
    }
  }

  // JSONモード（直接）
  return await loadCourseDetailsFromJSON(courseId)
}

// JSONファイルからのコース詳細読み込み（フォールバック用）
async function loadCourseDetailsFromJSON(courseId: string): Promise<LearningCourse | null> {
  try {
    console.log('📄 Loading course details from JSON fallback:', courseId)
    const response = await fetch(`/learning-data/${courseId}.json`)
    
    if (!response.ok) {
      throw new Error(`JSON file request failed: ${response.status}`)
    }
    
    const courseData = await response.json()
    console.log('✅ Course details loaded from JSON:', courseId)
    
    return courseData
    
  } catch (error) {
    console.error(`❌ Error loading course details from JSON for ${courseId}:`, error)
    return null
  }
}


// 利用可能なコースのみを取得 - DB API使用版 with JSONフォールバック
export async function getAvailableLearningCourses() {
  if (USE_DATABASE) {
    try {
      console.log('📡 Fetching available courses from DB API')
      const courses = await getAvailableCoursesFromDB()
      console.log(`✅ Available courses loaded from DB: ${courses.length} courses`)
      return courses
      
    } catch (error) {
      console.error('❌ Error loading available courses from DB:', error)
      console.log('🔄 Falling back to JSON files...')
      
      // JSONフォールバック
      const courses = await loadLearningCoursesFromJSON()
      return courses.filter(course => course.status === 'available')
    }
  }

  // JSONモード（直接）
  const courses = await loadLearningCoursesFromJSON()
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
  const completedSessions = Object.values(progress).filter((p: Record<string, unknown>) => p.completed)
  const totalAvailableSessions = await getTotalAvailableSessions()
  
  return {
    totalSessionsCompleted: completedSessions.length,
    totalAvailableSessions,
    totalTimeSpent: completedSessions.length * 3, // 概算（セッション1つ=3分）
    currentStreak: await calculateLearningStreak(userId),
    lastLearningDate: completedSessions.length > 0 ? 
      new Date(Math.max(...completedSessions.map((p: Record<string, unknown>) => new Date((p.completedAt as string)).getTime()))) : null
  }
}

// 利用可能な全セッション数を計算
export async function getTotalAvailableSessions(): Promise<number> {
  try {
    const courses = await getLearningCourses()
    let totalSessions = 0
    
    for (const course of courses) {
      if (course.status === 'available' && course.genres) {
        for (const genre of course.genres) {
          for (const theme of genre.themes) {
            totalSessions += theme.sessions ? theme.sessions.length : 0
          }
        }
      }
    }
    
    return totalSessions
  } catch (error) {
    console.error('Error calculating total available sessions:', error)
    return 0
  }
}

async function calculateLearningStreak(userId: string): Promise<number> {
  const progress = await getLearningProgress(userId)
  const completedSessions = Object.values(progress)
    .filter((p: Record<string, unknown>) => p.completed)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date((b.completedAt as string)).getTime() - new Date((a.completedAt as string)).getTime())
  
  if (completedSessions.length === 0) return 0
  
  let streak = 0
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  
  for (const session of completedSessions) {
    const sessionDate = new Date((session as Record<string, unknown>).completedAt as string)
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