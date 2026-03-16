import type { Database as WMDatabase } from '@nozbe/watermelondb'
import { LearningCourse } from '@/lib/types/learning'
// Server-side cache implementation (separate from client-side)
class ServerCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

  set(key: string, data: unknown, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key)
    if (!item) return null

    // TTL check
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }
}

const serverCache = new ServerCache()
import { 
  getCoursesFromDB, 
  getCourseDetailsFromDB, 
  getAvailableCoursesFromDB 
} from './supabase-data'
import type { Database } from '@/lib/database-types-official'

/**
 * 学習コンテンツデータ読み込み関数
 * フィーチャーフラグでJSON/DB切り替え
 */

// フィーチャーフラグ: DB使用モード
const USE_DATABASE = true // true: DB, false: JSON

// コース一覧の取得（カテゴリー情報含む）- DB API使用版 with JSONフォールバック
// database: WMDBインスタンス（null/undefined=PC→サーバー直接、モバイル=ローカル優先）
export async function getLearningCourses(database?: WMDatabase | null): Promise<{
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
  // モバイル: ローカルDB優先
  if (database) {
    try {
      const { getCoursesData, enrichCoursesWithCounts } = await import('@/lib/offline/queries/courses')
      const data = await getCoursesData(database)
      const enriched = enrichCoursesWithCounts(data.courses, data.genres, data.themes)
      console.log(`✅ Learning courses loaded from local DB: ${enriched.length} courses`)
      return enriched.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        estimatedDays: c.estimated_days,
        difficulty: c.difficulty as 'beginner' | 'basic' | 'intermediate' | 'advanced' | 'expert',
        icon: c.icon,
        color: c.color,
        displayOrder: c.display_order,
        genreCount: c.genreCount,
        themeCount: c.themeCount,
        status: c.status as 'available' | 'coming_soon' | 'draft',
      }))
    } catch (e) {
      console.warn('⚠️ Local DB courses failed, falling back:', e)
    }
  }

  const cacheKey = 'learning_courses_db'

  // キャッシュチェック（5分間）
  const cached = serverCache.get(cacheKey)
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
      serverCache.set(cacheKey, courses, 5 * 60 * 1000)
      
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
    
    // 新しいフォールバックファイルパスを使用
    const response = await fetch('/data/learning-courses-fallback.json')
    if (!response.ok) {
      // 古いパスもフォールバックとして試行
      console.log('🔄 Trying legacy fallback path...')
      const legacyResponse = await fetch('/learning-data/courses.json')
      if (!legacyResponse.ok) {
        throw new Error(`Both fallback paths failed: ${response.status}, ${legacyResponse.status}`)
      }
      const legacyData = await legacyResponse.json()
      return await processLegacyCoursesData(legacyData)
    }
    
    const data = await response.json()
    
    // 新しいフォールバック形式の処理
    if (data.genres && Array.isArray(data.genres)) {
      console.log(`✅ New fallback format: ${data.genres.length} genres found`)
      
      // genresからcoursesを構築（一時的な変換処理）
      const coursesFromGenres = data.genres.map((genre: Database['public']['Tables']['learning_genres']['Row'], index: number) => ({
        id: genre.course_id || `course_${genre.id}`,
        title: genre.title,
        description: genre.description,
        estimatedDays: genre.estimated_days || 7,
        difficulty: 'intermediate' as const,
        icon: (genre.badge_data as { icon?: string; color?: string } | null)?.icon || '📚',
        color: (genre.badge_data as { icon?: string; color?: string } | null)?.color || '#7C3AED',
        displayOrder: genre.display_order || index + 1,
        genreCount: 1,
        themeCount: data.themes?.filter((t: Database['public']['Tables']['learning_themes']['Row']) => t.genre_id === genre.id).length || 0,
        status: 'available' as const,
        genres: [genre]
      }))
      
      console.log(`✅ Learning courses loaded from new fallback: ${coursesFromGenres.length} courses`)
      return coursesFromGenres
    }
    
    // 古い形式との互換性
    return await processLegacyCoursesData(data)
    
  } catch (error) {
    console.error('❌ Error loading learning courses from JSON:', error)
    return []
  }
}

// 古い形式のコースデータ処理（レガシー互換）
async function processLegacyCoursesData(data: Record<string, unknown>): Promise<{
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
  if (!data.courses || !Array.isArray(data.courses)) {
    console.warn('⚠️ No courses array found in legacy data')
    return []
  }

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
  
  console.log(`✅ Learning courses loaded from legacy JSON: ${coursesWithGenres.length} courses`)
  return coursesWithGenres
}

// 特定コースの詳細データ取得 - DB API使用版 with JSONフォールバック
// database: WMDBインスタンス（null/undefined=PC→サーバー直接、モバイル=ローカル優先）
export async function getLearningCourseDetails(courseId: string, database?: WMDatabase | null): Promise<LearningCourse | null> {
  // モバイル: ローカルDB優先
  if (database) {
    try {
      const { getCourseDetailData, buildCourseHierarchy } = await import('@/lib/offline/queries/courses')
      const data = await getCourseDetailData(database)
      const hierarchy = buildCourseHierarchy(courseId, data)
      // コンテンツが1件もない場合はsync不完全とみなしてサーバーにフォールバック
      const totalContents = hierarchy?.genres.reduce((sum, g) =>
        sum + g.themes.reduce((ts, t) =>
          ts + t.sessions.reduce((ss, s) => ss + s.contents.length, 0), 0), 0) ?? 0
      if (hierarchy && totalContents > 0) {
        console.log(`✅ Course details loaded from local DB: ${courseId} (${totalContents} contents)`)
        // LearningCourse型に変換
        const badgeData = (genre: { badge_data: unknown }) => {
          const bd = genre.badge_data as Record<string, unknown> | null
          return {
            id: String(bd?.id || ''),
            title: String(bd?.title || ''),
            description: String(bd?.description || ''),
            icon: String(bd?.icon || '📚'),
            color: String(bd?.color || '#7C3AED'),
            difficulty: String(bd?.difficulty || 'intermediate') as 'basic' | 'intermediate' | 'advanced' | 'expert',
          }
        }
        const rewardData = (theme: { reward_card_data: unknown }) => {
          const rd = theme.reward_card_data as Record<string, unknown> | null
          return {
            id: String(rd?.id || ''),
            title: String(rd?.title || ''),
            summary: String(rd?.summary || ''),
            keyPoints: (Array.isArray(rd?.keyPoints) ? rd.keyPoints : []) as string[],
            icon: String(rd?.icon || '📖'),
            color: String(rd?.color || '#7C3AED'),
          }
        }
        return {
          id: hierarchy.course.id,
          title: hierarchy.course.title,
          description: hierarchy.course.description,
          difficulty: hierarchy.course.difficulty as LearningCourse['difficulty'],
          icon: hierarchy.course.icon,
          color: hierarchy.course.color,
          displayOrder: hierarchy.course.display_order,
          estimatedDays: hierarchy.course.estimated_days,
          genres: hierarchy.genres.map(genre => ({
            id: genre.id,
            title: genre.title,
            description: genre.description,
            displayOrder: genre.display_order,
            estimatedDays: genre.estimated_days,
            categoryId: genre.category_id,
            subcategoryId: genre.subcategory_id || undefined,
            badge: badgeData(genre),
            themes: genre.themes.map(theme => ({
              id: theme.id,
              title: theme.title,
              description: theme.description,
              displayOrder: theme.display_order,
              estimatedMinutes: theme.estimated_minutes,
              subcategoryId: theme.subcategory_id || undefined,
              rewardCard: rewardData(theme),
              sessions: theme.sessions.map(session => ({
                id: session.id,
                title: session.title,
                displayOrder: session.display_order,
                estimatedMinutes: session.estimated_minutes,
                type: (session.session_type === 'practice' || session.session_type === 'case_study'
                  ? session.session_type : 'knowledge') as 'knowledge' | 'practice' | 'case_study',
                content: session.contents.map(content => ({
                  id: content.id,
                  title: content.title || undefined,
                  content: content.content,
                  type: content.content_type as 'text' | 'image' | 'video' | 'example' | 'key_points',
                  displayOrder: content.display_order,
                  duration: content.duration || undefined,
                })),
                quiz: (session.quizzes || []).map(quiz => {
                  const options = typeof quiz.options === 'string'
                    ? (() => { try { return JSON.parse(quiz.options as string) } catch { return quiz.options } })()
                    : quiz.options
                  return {
                    id: quiz.id,
                    question: quiz.question,
                    options: options,
                    correct: quiz.correct_answer,
                    explanation: quiz.explanation,
                    type: quiz.quiz_type,
                  }
                }),
              })),
            })),
          })),
        } as LearningCourse
      }
    } catch (e) {
      console.warn('⚠️ Local DB course details failed, falling back:', e)
    }
  }

  const cacheKey = `course_details_db_${courseId}`

  // キャッシュチェック（10分間）
  const cached = serverCache.get(cacheKey)
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
        serverCache.set(cacheKey, courseData, 10 * 60 * 1000)
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
import { getLearningProgressSupabase as _getLearningProgressSupabase, saveLearningProgressSupabase as _saveLearningProgressSupabase } from '@/lib/supabase-learning'

/**
 * @deprecated この関数は廃止されました。
 * 現在はcourse_session_completions / course_theme_completionsテーブルで
 * コース完了を管理しています。
 */
export async function getLearningProgress(_userId: string): Promise<Record<string, unknown>> {
  console.warn('⚠️ getLearningProgress: DEPRECATED - この関数は廃止されました')
  console.warn('📋 コース完了は course_session_completions / course_theme_completions で管理されます')
  
  // 空のオブジェクトを返す（既存呼び出し元でエラーにならないように）
  return {}
}

/**
 * @deprecated この関数は廃止されました。
 * 現在はcourse_session_completions / course_theme_completionsテーブルで
 * コース完了を管理しています。
 * 
 * XP保存は /api/xp-save/course で自動的に行われます。
 * user_settingsテーブルは使用禁止です。
 */
export async function saveLearningProgress(_userId: string, _courseId: string, _genreId: string, _themeId: string, _sessionId: string, _completed: boolean): Promise<boolean> {
  console.warn('⚠️ saveLearningProgress: DEPRECATED - この関数は廃止されました')
  console.warn('📋 コース完了は course_session_completions / course_theme_completions で管理されます')
  console.warn('💾 XP保存は /api/xp-save/course で自動実行されます')
  console.warn('🚫 user_settingsテーブルは使用禁止です')
  
  // 何もせずに成功を返す（既存呼び出し元でエラーにならないように）
  return true
}

// 学習統計の計算（XPシステム統合版）
// database: WMDBインスタンス（null/undefined=PC→サーバー直接、モバイル=ローカル優先）
export async function calculateLearningStats(userId: string, database?: WMDatabase | null): Promise<{
  totalSessionsCompleted: number
  totalAvailableSessions: number
  totalTimeSpent: number
  currentStreak: number
  lastLearningDate: Date | null
}> {
  // モバイル: ローカルDB優先でXP統計取得
  if (database) {
    try {
      const { getUserStatsData } = await import('@/lib/offline/queries/user-stats')
      const statsData = await getUserStatsData(database, userId)
      if (statsData.xpStats) {
        const xp = statsData.xpStats
        const totalAvailableSessions = await getTotalAvailableSessions()
        const totalSessionsCompleted = xp.course_sessions_completed
        const totalTimeSpent = (xp.quiz_sessions_completed + xp.course_sessions_completed) * 3
        return {
          totalSessionsCompleted,
          totalAvailableSessions,
          totalTimeSpent,
          currentStreak: 0, // ストリーク計算は簡略化（ローカルでは日別レコードから計算可能だが複雑）
          lastLearningDate: xp.last_activity_at ? new Date(xp.last_activity_at) : null,
        }
      }
    } catch (e) {
      console.warn('⚠️ Local DB calculateLearningStats failed:', e)
    }
  }

  try {
    // Supabaseから直接XP統計を取得
    const { supabase } = await import('@/lib/supabase')
    let xpStats = null
    
    try {
      const { data: userStats } = await supabase
        .from('user_xp_stats_v2')
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
async function calculateLearningStreakFromXP(userId: string, xpStats: { user: { last_activity_at: string | null }; recent_activity: { date: string; quiz_sessions: number; course_sessions: number }[] } | null): Promise<number> {
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