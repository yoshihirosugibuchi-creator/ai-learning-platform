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
  difficulty: 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert'
  icon: string
  color: string
  displayOrder: number
  genreCount: number
  themeCount: number
  status: 'available' | 'coming_soon' | 'draft'
  genres?: unknown[]
}[]> {
  const cacheKey = 'learning_courses_db'
  
  // キャッシュチェック（5分間）
  const cached = globalCache.get(cacheKey)
  if (cached) {
    console.log('🚀 Learning courses loaded from cache')
    return cached as {
      id: string
      title: string
      description: string
      estimatedDays: number
      difficulty: 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert'
      icon: string
      color: string
      displayOrder: number
      genreCount: number
      themeCount: number
      status: 'available' | 'coming_soon' | 'draft'
      genres?: unknown[]
    }[]
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
async function loadLearningCoursesFromJSON(): Promise<{
  id: string
  title: string
  description: string
  estimatedDays: number
  difficulty: 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert'
  icon: string
  color: string
  displayOrder: number
  genreCount: number
  themeCount: number
  status: 'available' | 'coming_soon' | 'draft'
  genres?: unknown[]
}[]> {
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
      data.courses.map(async (course: {
        id: string
        title: string
        description: string
        estimatedDays: number
        difficulty: 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert'
        icon: string
        color: string
        displayOrder: number
        genreCount: number
        themeCount: number
        status: 'available' | 'coming_soon' | 'draft'
        genres?: unknown[]
      }) => {
        if (course.status === 'available') {
          try {
            const detailResponse = await fetch(`/learning-data/${course.id}.json`)
            if (detailResponse.ok) {
              const detailData = await detailResponse.json() as { genres: unknown[] }
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
    return cached as LearningCourse
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
export async function getAvailableLearningCourses(): Promise<{
  id: string
  title: string
  description: string
  estimatedDays: number
  difficulty: 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert'
  icon: string
  color: string
  displayOrder: number
  genreCount: number
  themeCount: number
  status: 'available' | 'coming_soon' | 'draft'
  genres?: unknown[]
}[]> {
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

export async function getLearningProgress(userId: string): Promise<Record<string, unknown>> {
  try {
    const progress = await getLearningProgressSupabase(userId)
    return progress
  } catch (error) {
    console.error('Error loading learning progress from Supabase:', error)
    return {}
  }
}

export async function saveLearningProgress(userId: string, courseId: string, genreId: string, themeId: string, sessionId: string, completed: boolean): Promise<boolean> {
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

// 学習統計の計算（XPシステム統合版）
export async function calculateLearningStats(userId: string): Promise<{
  totalSessionsCompleted: number
  totalAvailableSessions: number
  totalTimeSpent: number
  currentStreak: number
  lastLearningDate: Date | null
}> {
  // console.log('🔍 DEBUG: calculateLearningStats called for user:', userId.substring(0, 8) + '...')
  try {
    // Supabaseから直接XP統計を取得
    const { supabase } = await import('@/lib/supabase')
    let xpStats = null
    
    try {
      const { data: userStats } = await supabase
        .from('user_xp_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (userStats) {
        console.log('🔍 Debug: User XP stats found, fetching daily records...')
        
        // recent_activity も取得
        const { data: activities, error: activitiesError } = await supabase
          .from('daily_xp_records')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(30)
        
        if (activitiesError) {
          console.error('🔍 Debug: Error fetching daily_xp_records:', activitiesError)
        } else {
          console.log('🔍 Debug: Daily XP records fetched:', activities?.length || 0, 'records')
          if (activities && activities.length > 0) {
            console.log('🔍 Debug: First record:', activities[0])
          }
        }
        
        xpStats = {
          user: userStats,
          recent_activity: activities || []
        }
      } else {
        console.log('🔍 Debug: No user XP stats found')
      }
    } catch (xpError) {
      console.warn('Supabase XP統計取得エラー:', xpError)
    }
    
    const totalAvailableSessions = await getTotalAvailableSessions()
    
    // 学習進捗データから初回完了セッション数を算出（復習除く）
    const progress = await getLearningProgress(userId)
    const uniqueCompletedSessions = Object.values(progress).filter((p: unknown): p is { completed: boolean; completedAt?: string } => 
      typeof p === 'object' && p !== null && 'completed' in p && (p as { completed: boolean }).completed
    )
    const totalSessionsCompleted = uniqueCompletedSessions.length
    
    // 学習時間の計算（XPシステムの実施回数を使用、復習含む）
    const xpTotalSessions = xpStats ? 
      (xpStats.user.quiz_sessions_completed + xpStats.user.course_sessions_completed) : 0
    const totalTimeSpent = xpTotalSessions * 3 // 実際の実施セッション数（復習含む）× 3分
    
    // 連続学習日数の計算（XPシステムのlast_activity_atを使用）
    const currentStreak = await calculateLearningStreakFromXP(userId, xpStats)
    
    // 最終学習日（XPシステムから）
    const lastLearningDate = xpStats?.user.last_activity_at ? 
      new Date(xpStats.user.last_activity_at) : null
    
    console.log('📊 Debug: XP統合学習統計:', {
      userId: userId.substring(0, 8) + '...',
      totalSessionsCompleted,
      totalAvailableSessions,
      totalTimeSpent,
      currentStreak,
      lastLearningDate: lastLearningDate?.toISOString(),
      hasXPStats: !!xpStats,
      xpStatsDetails: xpStats ? {
        quizSessions: xpStats.user.quiz_sessions_completed,
        courseSessions: xpStats.user.course_sessions_completed,
        totalXPSessions: xpTotalSessions,
        uniqueProgressSessions: totalSessionsCompleted,
        recentActivities: xpStats.recent_activity?.length || 0
      } : null,
      xpDataSource: 'integrated'
    })
    
    return {
      totalSessionsCompleted,
      totalAvailableSessions,
      totalTimeSpent,
      currentStreak,
      lastLearningDate
    }
    
  } catch (error) {
    console.error('XP統合学習統計でエラー、フォールバック使用:', error)
    
    // エラー時は従来ロジックにフォールバック
    const progress = await getLearningProgress(userId)
    const completedSessions = Object.values(progress).filter((p: unknown): p is { completed: boolean; completedAt?: string } => 
      typeof p === 'object' && p !== null && 'completed' in p && (p as { completed: boolean }).completed
    )
    const totalAvailableSessions = await getTotalAvailableSessions()
    
    return {
      totalSessionsCompleted: completedSessions.length,
      totalAvailableSessions,
      totalTimeSpent: completedSessions.length * 3,
      currentStreak: await calculateLearningStreak(userId),
      lastLearningDate: completedSessions.length > 0 ? 
        new Date(Math.max(...completedSessions.filter(p => p.completedAt).map(p => new Date(p.completedAt!).getTime()))) : null
    }
  }
}

// 利用可能な全セッション数を計算
// DBが提供しているコースのメタデータを使用
export async function getTotalAvailableSessions(): Promise<number> {
  try {
    const courses = await getLearningCourses()
    let totalSessions = 0
    
    // console.log('🔍 Debug: Starting session calculation, found courses:', courses.length)
    
    for (const course of courses) {
      if (course.status === 'available') {
        // console.log(`🔍 Debug: Processing course ${course.id} (${course.title})`)
        
        // コースの詳細情報から実際のセッション数を取得
        try {
          const courseDetails = await getLearningCourseDetails(course.id)
          // console.log(`🔍 Debug: Course details for ${course.id}:`, courseDetails ? 'loaded' : 'null')
          
          if (courseDetails && courseDetails.genres) {
            // console.log(`🔍 Debug: Course ${course.id} has ${courseDetails.genres.length} genres`)
            
            let courseSessionCount = 0
            for (const genre of courseDetails.genres) {
              // console.log(`🔍 Debug: Genre ${genre.id} has ${genre.themes.length} themes`)
              
              for (const theme of genre.themes) {
                const sessionCount = theme.sessions.length
                courseSessionCount += sessionCount
                // console.log(`🔍 Debug: Theme ${theme.id} has ${sessionCount} sessions`)
              }
            }
            totalSessions += courseSessionCount
            // console.log(`🔍 Debug: Course ${course.id} total sessions: ${courseSessionCount}`)
          } else {
            // console.warn(`🔍 Debug: Course details null or no genres for ${course.id}`)
            // フォールバック: コース概算値を使用
            const fallbackSessions = course.themeCount * 3 // テーマあたり平均3セッションと仮定
            totalSessions += fallbackSessions
            // console.log(`🔍 Debug: Using fallback for ${course.id}: ${fallbackSessions} sessions`)
          }
        } catch (courseError) {
          console.warn(`Failed to load details for course ${course.id}:`, courseError)
          // フォールバック: コース概算値を使用
          const fallbackSessions = course.themeCount * 3 // テーマあたり平均3セッションと仮定
          totalSessions += fallbackSessions
          // console.log(`🔍 Debug: Error fallback for ${course.id}: ${fallbackSessions} sessions`)
        }
      } else {
        // console.log(`🔍 Debug: Skipping course ${course.id} (status: ${course.status})`)
      }
    }
    
    // console.log('🔍 Debug: Final total sessions calculated:', totalSessions)
    return totalSessions
  } catch (error) {
    console.error('Error calculating total available sessions:', error)
    return 0
  }
}

// XPシステム統合版の連続学習日数計算
async function calculateLearningStreakFromXP(userId: string, xpStats: { user: { last_activity_at: string }; recent_activity: { date: string; quiz_sessions: number; course_sessions: number }[] } | null): Promise<number> {
  try {
    // console.log('🔍 Debug: calculateLearningStreakFromXP called', {
    //   hasXPStats: !!xpStats,
    //   hasRecentActivity: !!(xpStats?.recent_activity),
    //   activityLength: xpStats?.recent_activity?.length || 0
    // })
    
    // XPシステムの recent_activity データを使用
    if (xpStats && xpStats.recent_activity && xpStats.recent_activity.length > 0) {
      const activities = xpStats.recent_activity.sort((a: { date: string }, b: { date: string }) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      
      // 今日の日付を文字列形式で取得（タイムゾーン問題を回避）
      const today = new Date()
      const currentDateStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0')
      
      let streak = 0
      
      // console.log('🔍 Debug: Starting streak calculation:', {
      //   currentDateStr,
      //   activitiesCount: activities.length
      // })
      
      // Activities are already sorted by date (newest first)
      
      let lastActivityDay = -1 // まだ活動を見つけていない
      
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) { // 最大30日前まで確認
        // 該当日の活動を探す
        const checkDate = new Date(currentDateStr)
        checkDate.setDate(checkDate.getDate() - dayOffset)
        const checkDateStr = checkDate.getFullYear() + '-' + 
          String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(checkDate.getDate()).padStart(2, '0')
        
        const dayActivity = activities.find((act: { date: string; quiz_sessions: number; course_sessions: number }) => act.date === checkDateStr)
        const hasActivity = dayActivity && (dayActivity.quiz_sessions > 0 || dayActivity.course_sessions > 0)
        
        // console.log('🔍 Debug: Checking day:', {
        //   dayOffset,
        //   checkDate: checkDateStr,
        //   hasActivity,
        //   quiz: dayActivity?.quiz_sessions || 0,
        //   course: dayActivity?.course_sessions || 0
        // })
        
        if (hasActivity) {
          if (lastActivityDay === -1) {
            // 最初の活動を発見
            lastActivityDay = dayOffset
            streak = 1
            // console.log('✅ First activity found:', `day -${dayOffset}, streak = 1`)
          } else if (dayOffset === lastActivityDay + 1) {
            // 連続した活動
            lastActivityDay = dayOffset
            streak++
            // console.log('✅ Consecutive activity:', `day -${dayOffset}, streak = ${streak}`)
          } else {
            // 活動はあるが連続していない
            // console.log('❌ Gap found, stopping streak:', `expected day -${lastActivityDay + 1}, found -${dayOffset}`)
            break
          }
        } else {
          if (lastActivityDay !== -1) {
            // 活動が見つかっていたが、この日は活動なし
            // console.log('❌ No activity on expected day, stopping:', `day -${dayOffset}`)
            break
          }
          // まだ活動が見つかっていないので続行
        }
      }
      
      console.log('📊 Debug: XP streak calculation:', { streak, activitiesCount: activities.length })
      return streak
    }
    
    // XPデータがない場合はフォールバック
    return await calculateLearningStreakFallback(userId)
    
  } catch (error) {
    console.error('XP連続日数計算エラー:', error)
    return await calculateLearningStreakFallback(userId)
  }
}

// フォールバック版の連続学習日数計算
async function calculateLearningStreakFallback(userId: string): Promise<number> {
  const progress = await getLearningProgress(userId)
  const completedSessions = Object.values(progress)
    .filter((p: unknown): p is { completed: boolean; completedAt: string } => 
      typeof p === 'object' && p !== null && 'completed' in p && 
      (p as { completed: boolean }).completed && 'completedAt' in p
    )
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
  
  if (completedSessions.length === 0) return 0
  
  // 日付ごとにグループ化
  const dailyActivities = new Map<string, number>()
  
  for (const session of completedSessions) {
    const dateKey = new Date(session.completedAt).toISOString().split('T')[0]
    dailyActivities.set(dateKey, (dailyActivities.get(dateKey) || 0) + 1)
  }
  
  // 連続日数を計算
  const _sortedDates = Array.from(dailyActivities.keys()).sort().reverse()
  const currentDate = new Date().toISOString().split('T')[0]
  
  let streak = 0
  const currentCheckDate = new Date(currentDate)
  
  for (let i = 0; i < 30; i++) { // 最大30日前まで確認
    const dateKey = currentCheckDate.toISOString().split('T')[0]
    
    if (dailyActivities.has(dateKey)) {
      streak++
    } else if (streak > 0) {
      break // 連続が途切れた
    }
    
    currentCheckDate.setDate(currentCheckDate.getDate() - 1)
  }
  
  return streak
}

// 従来版の連続学習日数計算（参照用）
async function calculateLearningStreak(userId: string): Promise<number> {
  return await calculateLearningStreakFallback(userId)
}