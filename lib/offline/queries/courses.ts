/**
 * 学習コース データ取得
 * ローカルDB優先 → Supabaseフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import { resolveData } from '../data-source'

// ========== 共通型定義 ==========

export interface CourseRecord {
  id: string
  title: string
  description: string
  difficulty: string
  icon: string
  color: string
  display_order: number
  estimated_days: number
  status: string
  badge_data: unknown
}

export interface GenreRecord {
  id: string
  course_id: string
  title: string
  description: string
  display_order: number
  estimated_days: number
  category_id: string
  subcategory_id: string | null
  badge_data: unknown
}

export interface ThemeRecord {
  id: string
  genre_id: string
  title: string
  description: string
  display_order: number
  estimated_minutes: number
  subcategory_id: string | null
  reward_card_data: unknown
}

export interface SessionRecord {
  id: string
  theme_id: string
  title: string
  display_order: number
  estimated_minutes: number
  session_type: string
}

export interface SessionContentRecord {
  id: string
  session_id: string
  title: string | null
  content: string
  content_type: string
  display_order: number
  duration: number | null
}

export interface CoursesData {
  courses: CourseRecord[]
  genres: GenreRecord[]
  themes: ThemeRecord[]
  sessions: SessionRecord[]
}

export interface CourseDetailData extends CoursesData {
  sessionContents: SessionContentRecord[]
}

// ========== 共通処理ロジック ==========

/** 利用可能なコースのみフィルタ */
export function filterAvailableCourses(courses: CourseRecord[]): CourseRecord[] {
  return courses.filter(c => c.status === 'available')
}

/** コースにジャンル数・テーマ数を付与 */
export function enrichCoursesWithCounts(
  courses: CourseRecord[],
  genres: GenreRecord[],
  themes: ThemeRecord[]
): (CourseRecord & { genreCount: number; themeCount: number })[] {
  return courses.map(course => {
    const courseGenres = genres.filter(g => g.course_id === course.id)
    const courseGenreIds = new Set(courseGenres.map(g => g.id))
    const courseThemes = themes.filter(t => courseGenreIds.has(t.genre_id))
    return { ...course, genreCount: courseGenres.length, themeCount: courseThemes.length }
  })
}

/** 特定コースの階層データを構築 */
export function buildCourseHierarchy(
  courseId: string,
  data: CourseDetailData
): {
  course: CourseRecord
  genres: (GenreRecord & {
    themes: (ThemeRecord & {
      sessions: (SessionRecord & { contents: SessionContentRecord[] })[]
    })[]
  })[]
} | null {
  const course = data.courses.find(c => c.id === courseId)
  if (!course) return null

  const courseGenres = data.genres
    .filter(g => g.course_id === courseId)
    .sort((a, b) => a.display_order - b.display_order)

  const genres = courseGenres.map(genre => {
    const genreThemes = data.themes
      .filter(t => t.genre_id === genre.id)
      .sort((a, b) => a.display_order - b.display_order)

    const themes = genreThemes.map(theme => {
      const themeSessions = data.sessions
        .filter(s => s.theme_id === theme.id)
        .sort((a, b) => a.display_order - b.display_order)

      const sessions = themeSessions.map(session => ({
        ...session,
        contents: data.sessionContents
          .filter(c => c.session_id === session.id)
          .sort((a, b) => a.display_order - b.display_order),
      }))

      return { ...theme, sessions }
    })

    return { ...genre, themes }
  })

  return { course, genres }
}

// ========== データソース: ローカルDB ==========

async function loadCoursesFromLocalDB(db: WMDatabase): Promise<CoursesData | null> {
  const [coursesRaw, genresRaw, themesRaw, sessionsRaw] = await Promise.all([
    db.get('learning_courses').query().fetch(),
    db.get('learning_genres').query().fetch(),
    db.get('learning_themes').query().fetch(),
    db.get('learning_sessions').query().fetch(),
  ])

  if (coursesRaw.length === 0) return null

  const courses = coursesRaw.map(r => toRecord<CourseRecord>((r as { _raw: Record<string, unknown> })._raw, [
    'id', 'title', 'description', 'difficulty', 'icon', 'color', 'display_order', 'estimated_days', 'status', 'badge_data',
  ]))
  const genres = genresRaw.map(r => toRecord<GenreRecord>((r as { _raw: Record<string, unknown> })._raw, [
    'id', 'course_id', 'title', 'description', 'display_order', 'estimated_days', 'category_id', 'subcategory_id', 'badge_data',
  ]))
  const themes = themesRaw.map(r => toRecord<ThemeRecord>((r as { _raw: Record<string, unknown> })._raw, [
    'id', 'genre_id', 'title', 'description', 'display_order', 'estimated_minutes', 'subcategory_id', 'reward_card_data',
  ]))
  const sessions = sessionsRaw.map(r => toRecord<SessionRecord>((r as { _raw: Record<string, unknown> })._raw, [
    'id', 'theme_id', 'title', 'display_order', 'estimated_minutes', 'session_type',
  ]))

  console.log(`✅ Local DB: ${courses.length} courses, ${genres.length} genres, ${themes.length} themes, ${sessions.length} sessions loaded`)
  return { courses, genres, themes, sessions }
}

async function loadCourseDetailFromLocalDB(db: WMDatabase): Promise<CourseDetailData | null> {
  const base = await loadCoursesFromLocalDB(db)
  if (!base) return null

  const contentsRaw = await db.get('session_contents').query().fetch()
  const sessionContents = contentsRaw.map(r => toRecord<SessionContentRecord>((r as { _raw: Record<string, unknown> })._raw, [
    'id', 'session_id', 'title', 'content', 'content_type', 'display_order', 'duration',
  ]))

  return { ...base, sessionContents }
}

// ========== データソース: サーバー ==========

async function loadCoursesFromServer(): Promise<CoursesData> {
  const { supabase } = await import('@/lib/supabase')

  const [coursesResult, genresResult, themesResult, sessionsResult] = await Promise.all([
    supabase.from('learning_courses').select('*').order('display_order'),
    supabase.from('learning_genres').select('*').order('display_order'),
    supabase.from('learning_themes').select('*').order('display_order'),
    supabase.from('learning_sessions').select('*').order('display_order'),
  ])

  return {
    courses: (coursesResult.data ?? []).map(row => ({
      id: row.id,
      title: row.title,
      description: row.description ?? '',
      difficulty: row.difficulty ?? 'intermediate',
      icon: row.icon ?? '📚',
      color: row.color ?? '#7C3AED',
      display_order: row.display_order ?? 0,
      estimated_days: row.estimated_days ?? 7,
      status: row.status ?? 'available',
      badge_data: row.badge_data,
    })),
    genres: (genresResult.data ?? []).map(row => ({
      id: row.id,
      course_id: row.course_id,
      title: row.title,
      description: row.description ?? '',
      display_order: row.display_order ?? 0,
      estimated_days: row.estimated_days ?? 7,
      category_id: row.category_id ?? '',
      subcategory_id: row.subcategory_id ?? null,
      badge_data: row.badge_data,
    })),
    themes: (themesResult.data ?? []).map(row => ({
      id: row.id,
      genre_id: row.genre_id,
      title: row.title,
      description: row.description ?? '',
      display_order: row.display_order ?? 0,
      estimated_minutes: row.estimated_minutes ?? 15,
      subcategory_id: row.subcategory_id ?? null,
      reward_card_data: row.reward_card_data,
    })),
    sessions: (sessionsResult.data ?? []).map(row => ({
      id: row.id,
      theme_id: row.theme_id,
      title: row.title,
      display_order: row.display_order ?? 0,
      estimated_minutes: row.estimated_minutes ?? 10,
      session_type: row.session_type ?? 'text',
    })),
  }
}

async function loadCourseDetailFromServer(): Promise<CourseDetailData> {
  const base = await loadCoursesFromServer()
  const { supabase } = await import('@/lib/supabase')

  const contentsResult = await supabase.from('session_contents').select('*').order('display_order')

  const sessionContents: SessionContentRecord[] = (contentsResult.data ?? []).map(row => ({
    id: row.id,
    session_id: row.session_id,
    title: row.title ?? null,
    content: row.content ?? '',
    content_type: row.content_type ?? 'text',
    display_order: row.display_order ?? 0,
    duration: row.duration ?? null,
  }))

  return { ...base, sessionContents }
}

// ========== エントリポイント ==========

/**
 * コース一覧データを取得（ジャンル・テーマ含む、コンテンツなし）
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 */
export async function getCoursesData(database: WMDatabase | null): Promise<CoursesData> {
  return resolveData(
    { loadFromLocal: loadCoursesFromLocalDB, loadFromServer: loadCoursesFromServer },
    database
  )
}

/**
 * コース詳細データを取得（セッションコンテンツ含む）
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 */
export async function getCourseDetailData(database: WMDatabase | null): Promise<CourseDetailData> {
  return resolveData(
    { loadFromLocal: loadCourseDetailFromLocalDB, loadFromServer: loadCourseDetailFromServer },
    database
  )
}

// ========== ヘルパー ==========

/** WatermelonDBの_rawレコードからフラットなオブジェクトに変換 */
function toRecord<T>(raw: Record<string, unknown>, fields: string[]): T {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    let value = raw[field]
    // JSON文字列をパース
    if ((field === 'badge_data' || field === 'reward_card_data') && typeof value === 'string') {
      try { value = JSON.parse(value) } catch { /* keep string */ }
    }
    result[field] = value ?? null
  }
  return result as T
}
