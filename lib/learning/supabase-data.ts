/**
 * 学習コンテンツ Supabaseデータアクセス関数
 * JSONからDBへの移行対応
 */

import { supabase } from '@/lib/supabase'
import { LearningCourse, LearningGenre } from '@/lib/types/learning'
// Server-side cache implementation for supabase-data
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

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }
}

const serverCache = new ServerCache()

// ===== 型定義 =====

interface DbGenre {
  id: string
  course_id: string
  title: string
  description: string
  category_id: string
  subcategory_id: string | null
  estimated_days: number
  display_order: number
  badge_data: unknown
}

interface DbTheme {
  id: string
  genre_id: string
  title: string
  description: string
  subcategory_id: string | null // テーマ単位のサブカテゴリー
  estimated_minutes: number
  display_order: number
  reward_card_data: unknown
}




// ===== コース一覧取得 =====
export async function getCoursesFromDB(): Promise<{
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
  genres?: unknown[]
}[]> {
  const cacheKey = 'learning_courses_db_list'
  
  // キャッシュから取得を試行
  const cached = serverCache.get(cacheKey)
  if (cached) {
    console.log('🚀 DB Courses loaded from cache')
    return cached as {
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
      genres?: unknown[]
    }[]
  }
  
  try {
    console.log('📡 Fetching courses from Supabase DB')
    
    // コース基本情報を取得
    const { data: coursesData, error: coursesError } = await supabase
      .from('learning_courses')
      .select('*')
      .order('display_order', { ascending: true })
    
    if (coursesError) {
      throw coursesError
    }
    
    if (!coursesData) {
      return []
    }
    
    // 全コースのジャンルを一括取得（category_id, subcategory_id含む）
    const courseIds = coursesData.map(c => c.id)
    const { data: allGenres } = await supabase
      .from('learning_genres')
      .select('id, course_id, category_id, subcategory_id')
      .in('course_id', courseIds)

    // ジャンルIDからテーマのサブカテゴリーを一括取得
    const genreIds = allGenres?.map(g => g.id) || []
    const { data: allThemes } = genreIds.length > 0
      ? await supabase
          .from('learning_themes')
          .select('id, genre_id, subcategory_id')
          .in('genre_id', genreIds)
      : { data: [] }

    // テーマをジャンルIDでグループ化
    const themesByGenre = new Map<string, Array<{ subcategoryId?: string }>>()
    for (const theme of (allThemes || [])) {
      const existing = themesByGenre.get(theme.genre_id) || []
      existing.push({ subcategoryId: theme.subcategory_id || undefined })
      themesByGenre.set(theme.genre_id, existing)
    }

    // 各コースのジャンル・テーマ数を集計
    const coursesWithCounts = coursesData.map((course) => {
      const courseGenres = (allGenres || []).filter(g => g.course_id === course.id)
      const genreCount = courseGenres.length

      // テーマ数をジャンル経由で集計
      let themeCount = 0
      const genres = courseGenres.map(g => {
        const themes = themesByGenre.get(g.id) || []
        themeCount += themes.length
        return {
          id: g.id,
          categoryId: g.category_id,
          subcategoryId: g.subcategory_id || undefined,
          themes
        }
      })

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        estimatedDays: course.estimated_days,
        difficulty: course.difficulty,
        icon: course.icon,
        color: course.color,
        displayOrder: course.display_order,
        genreCount,
        themeCount,
        status: course.status as 'available' | 'coming_soon' | 'draft',
        genres
      }
    })
    
    // キャッシュに保存（5分間）
    serverCache.set(cacheKey, coursesWithCounts, 5 * 60 * 1000)
    console.log('✅ DB Courses loaded and cached, count:', coursesWithCounts.length)
    
    return coursesWithCounts as {
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
      genres?: unknown[]
    }[]
    
  } catch (error) {
    console.error('❌ Error loading courses from DB:', error)
    return []
  }
}

// ===== コース詳細取得 =====
export async function getCourseDetailsFromDB(courseId: string): Promise<LearningCourse | null> {
  const cacheKey = `course_details_db_${courseId}`
  
  // キャッシュから取得を試行
  const cached = serverCache.get(cacheKey)
  if (cached) {
    console.log('🚀 DB Course details loaded from cache:', courseId)
    return cached as LearningCourse
  }
  
  try {
    console.log('📡 Fetching course details from Supabase DB:', courseId)
    
    // 1. コース基本情報
    const { data: courseData, error: courseError } = await supabase
      .from('learning_courses')
      .select('*')
      .eq('id', courseId)
      .single()
    
    if (courseError) {
      // PGRST116エラー（データなし）の場合は適切に処理
      if (courseError.code === 'PGRST116') {
        console.log(`⚠️ Course not found: ${courseId}`)
        return null
      }
      console.error('❌ Course fetch error:', courseError)
      throw courseError
    }
    
    console.log('✅ Course data found:', courseData?.title)
    
    // 2. ジャンル情報
    const { data: genresData, error: genresError } = await supabase
      .from('learning_genres')
      .select('*')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true })
    
    if (genresError) {
      console.error('❌ Genres fetch error:', genresError)
      throw genresError
    }
    
    console.log('✅ Genres found:', genresData?.length || 0, 'genres')
    if (genresData && genresData.length > 0) {
      console.log('Genre IDs:', genresData.map(g => g.id))
    }
    
    if (!genresData || genresData.length === 0) {
      console.warn(`❌ No genres found for course: ${courseId}`)
      return null
    }
    
    // 3. 各ジャンルのテーマ・セッション・コンテンツを取得
    const genres = await Promise.all(
      genresData.map(async (genre: DbGenre) => {
        // テーマ取得
        const { data: themesData } = await supabase
          .from('learning_themes')
          .select('*')
          .eq('genre_id', genre.id)
          .order('display_order', { ascending: true })
        
        const themes = await Promise.all(
          (themesData || []).map(async (theme: DbTheme) => {
            // セッション取得
            const { data: sessionsData } = await supabase
              .from('learning_sessions')
              .select('*')
              .eq('theme_id', theme.id)
              .order('display_order', { ascending: true })
            
            const sessions = await Promise.all(
              (sessionsData || []).map(async (session) => {
                // コンテンツ取得
                const { data: contentsData } = await supabase
                  .from('session_contents')
                  .select('*')
                  .eq('session_id', session.id)
                  .order('display_order', { ascending: true })
                
                // クイズ取得
                const { data: quizzesData } = await supabase
                  .from('session_quizzes')
                  .select('*')
                  .eq('session_id', session.id)
                  .order('display_order', { ascending: true })
                
                return {
                  id: session.id,
                  title: session.title,
                  estimatedMinutes: session.estimated_minutes,
                  type: session.session_type,
                  displayOrder: session.display_order,
                  content: (contentsData || []).map((content) => ({
                    id: content.id,
                    type: content.content_type,
                    title: content.title,
                    content: content.content,
                    duration: content.duration,
                    displayOrder: content.display_order
                  })),
                  quiz: (quizzesData || []).map((quiz) => {
                    try {
                      // optionsが文字列の場合はJSONパース、既にオブジェクトの場合はそのまま使用
                      const options = typeof quiz.options === 'string' 
                        ? JSON.parse(quiz.options) 
                        : quiz.options
                      return {
                        id: quiz.id,
                        question: quiz.question,
                        options: options,
                        correct: quiz.correct_answer,
                        explanation: quiz.explanation,
                        type: quiz.quiz_type
                      }
                    } catch (parseError) {
                      console.error('❌ Failed to parse quiz options:', quiz.id, quiz.options, parseError)
                      return {
                        id: quiz.id,
                        question: quiz.question,
                        options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'], // フォールバック
                        correct: quiz.correct_answer,
                        explanation: quiz.explanation,
                        type: quiz.quiz_type
                      }
                    }
                  })
                }
              })
            )
            
            // サブカテゴリーID: テーマ優先、なければジャンルから継承
            const themeSubcategoryId = theme.subcategory_id || genre.subcategory_id || undefined

            return {
              id: theme.id,
              title: theme.title,
              description: theme.description,
              subcategoryId: themeSubcategoryId,
              estimatedMinutes: theme.estimated_minutes,
              displayOrder: theme.display_order,
              rewardCard: theme.reward_card_data,
              sessions
            }
          })
        )
        
        return {
          id: genre.id,
          title: genre.title,
          description: genre.description,
          categoryId: genre.category_id,
          subcategoryId: genre.subcategory_id || undefined,
          estimatedDays: genre.estimated_days,
          displayOrder: genre.display_order,
          badge: genre.badge_data,
          themes
        }
      })
    )
    
    // 4. LearningCourse形式に変換
    const courseDetails: LearningCourse = {
      id: courseData.id,
      title: courseData.title,
      description: courseData.description,
      estimatedDays: courseData.estimated_days,
      difficulty: courseData.difficulty as 'basic' | 'intermediate' | 'advanced' | 'expert',
      icon: courseData.icon,
      color: courseData.color,
      displayOrder: courseData.display_order,
      genres: genres as LearningGenre[]
    }
    
    // キャッシュに保存（10分間）
    serverCache.set(cacheKey, courseDetails, 10 * 60 * 1000)
    console.log('✅ DB Course details loaded and cached:', courseId)
    
    return courseDetails
    
  } catch (error) {
    console.error(`❌ Error loading course details from DB for ${courseId}:`, error)
    console.error('Full error details:', JSON.stringify(error, null, 2))
    return null
  }
}

// ===== セッション詳細取得 =====
export async function getSessionDetailsFromDB(sessionId: string) {
  const cacheKey = `session_details_db_${sessionId}`
  
  const cached = serverCache.get(cacheKey)
  if (cached) {
    console.log('🚀 DB Session details loaded from cache:', sessionId)
    return cached
  }
  
  try {
    console.log('📡 Fetching session details from Supabase DB:', sessionId)
    
    // セッション基本情報
    const { data: sessionData, error: sessionError } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (sessionError) {
      throw sessionError
    }
    
    // コンテンツ取得
    const { data: contentsData } = await supabase
      .from('session_contents')
      .select('*')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: true })
    
    // クイズ取得
    const { data: quizzesData } = await supabase
      .from('session_quizzes')
      .select('*')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: true })
    
    const sessionDetails = {
      ...sessionData,
      content: (contentsData || []).map((content) => ({
        id: content.id,
        type: content.content_type,
        title: content.title,
        content: content.content,
        duration: content.duration,
        displayOrder: content.display_order
      })),
      quiz: (quizzesData || []).map((quiz) => {
        try {
          const options = typeof quiz.options === 'string' 
            ? JSON.parse(quiz.options) 
            : quiz.options
          return {
            id: quiz.id,
            question: quiz.question,
            options: options,
            correct: quiz.correct_answer,
            explanation: quiz.explanation,
            type: quiz.quiz_type
          }
        } catch (parseError) {
          console.error('❌ Failed to parse quiz options in session:', quiz.id, quiz.options, parseError)
          return {
            id: quiz.id,
            question: quiz.question,
            options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
            correct: quiz.correct_answer,
            explanation: quiz.explanation,
            type: quiz.quiz_type
          }
        }
      })
    }
    
    // キャッシュに保存（15分間）
    serverCache.set(cacheKey, sessionDetails, 15 * 60 * 1000)
    console.log('✅ DB Session details loaded and cached:', sessionId)
    
    return sessionDetails
    
  } catch (error) {
    console.error(`❌ Error loading session details from DB for ${sessionId}:`, error)
    return null
  }
}

// ===== 利用可能コース取得 =====
export async function getAvailableCoursesFromDB() {
  const courses = await getCoursesFromDB()
  return courses.filter(course => course.status === 'available')
}