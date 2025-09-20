import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { LearningCourse } from '@/lib/types/learning'
import fs from 'fs'
import path from 'path'

// DB対応版 - 学習コンテンツデータ取得
export async function GET() {
  try {
    console.log('🔍 Admin: Fetching all learning content from DB')
    
    // 全てのテーブルから並列でデータを取得
    const [coursesResult, genresResult, themesResult, sessionsResult, contentsResult, quizzesResult] = await Promise.all([
      supabase.from('learning_courses').select('*').order('display_order'),
      supabase.from('learning_genres').select('*').order('display_order'),
      supabase.from('learning_themes').select('*').order('display_order'),
      supabase.from('learning_sessions').select('*').order('display_order'),
      supabase.from('session_contents').select('*').order('content_order'),
      supabase.from('session_quizzes').select('*')
    ])

    // エラーチェック
    const errors = [coursesResult.error, genresResult.error, themesResult.error, 
                   sessionsResult.error, contentsResult.error, quizzesResult.error]
                   .filter(Boolean)
    
    if (errors.length > 0) {
      console.error('❌ Database query errors:', errors)
      return NextResponse.json(
        { error: 'Database query failed', details: errors.map(e => e.message) },
        { status: 500 }
      )
    }
    
    const courses = coursesResult.data || []
    const genres = genresResult.data || []
    const themes = themesResult.data || []
    const sessions = sessionsResult.data || []
    const contents = contentsResult.data || []
    const quizzes = quizzesResult.data || []
    
    console.log(`✅ Admin: ${courses.length} courses, ${genres.length} genres, ${themes.length} themes, ${sessions.length} sessions, ${contents.length} contents, ${quizzes.length} quizzes retrieved from DB`)
    
    return NextResponse.json({
      courses,
      genres,
      themes,
      sessions,
      contents,
      quizzes,
      source: 'database',
      stats: {
        totalCourses: courses.length,
        totalGenres: genres.length,
        totalThemes: themes.length,
        totalSessions: sessions.length,
        totalContents: contents.length,
        totalQuizzes: quizzes.length
      }
    })
    
  } catch (error) {
    console.error('❌ Admin learning content fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DB対応版 - 学習コンテンツデータをJSONファイルに同期
export async function POST(request: NextRequest) {
  try {
    const { updateMode = 'sync' } = await request.json()
    
    console.log(`🚀 Admin: Starting learning content ${updateMode} to JSON files`)
    
    // DBから全データを取得
    const response = await GET()
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data from DB', details: data.error },
        { status: 500 }
      )
    }
    
    const { courses, genres, themes, sessions, contents, quizzes } = data
    
    // JSONファイル更新処理
    const updateResults = []
    
    // courses.jsonを更新
    try {
      const coursesJsonPath = path.join(process.cwd(), 'public', 'learning-data', 'courses.json')
      const coursesJson = {
        courses: courses.map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          estimatedDays: course.estimated_days,
          difficulty: course.difficulty,
          icon: course.icon,
          color: course.color,
          displayOrder: course.display_order,
          genreCount: genres.filter((g: any) => g.course_id === course.id).length,
          themeCount: themes.filter((t: any) => t.course_id === course.id).length,
          status: course.status
        })),
        lastUpdated: new Date().toISOString(),
        source: 'database_sync'
      }
      
      fs.writeFileSync(coursesJsonPath, JSON.stringify(coursesJson, null, 2), 'utf-8')
      updateResults.push({ file: 'courses.json', status: 'updated', items: courses.length })
      console.log(`✅ Updated courses.json with ${courses.length} courses`)
    } catch (error) {
      updateResults.push({ file: 'courses.json', status: 'error', error: error.message })
      console.error('❌ Failed to update courses.json:', error)
    }
    
    // 各コースの詳細JSONファイルを更新
    for (const course of courses) {
      try {
        const courseGenres = genres.filter((g: any) => g.course_id === course.id)
        const courseJsonPath = path.join(process.cwd(), 'public', 'learning-data', `${course.id}.json`)
        
        const courseJson = {
          id: course.id,
          title: course.title,
          description: course.description,
          estimatedDays: course.estimated_days,
          difficulty: course.difficulty,
          icon: course.icon,
          color: course.color,
          displayOrder: course.display_order,
          status: course.status,
          genres: courseGenres.map((genre: any) => {
            const genreThemes = themes.filter((t: any) => t.genre_id === genre.id)
            return {
              id: genre.id,
              title: genre.title,
              description: genre.description,
              displayOrder: genre.display_order,
              themes: genreThemes.map((theme: any) => {
                const themeSessions = sessions.filter((s: any) => s.theme_id === theme.id)
                return {
                  id: theme.id,
                  title: theme.title,
                  description: theme.description,
                  displayOrder: theme.display_order,
                  sessions: themeSessions.map((session: any) => {
                    const sessionContents = contents.filter((c: any) => c.session_id === session.id)
                    const sessionQuizzes = quizzes.filter((q: any) => q.session_id === session.id)
                    return {
                      id: session.id,
                      title: session.title,
                      description: session.description,
                      displayOrder: session.display_order,
                      contents: sessionContents.map((content: any) => ({
                        id: content.id,
                        type: content.content_type,
                        title: content.title,
                        description: content.description,
                        content: content.content_data,
                        order: content.content_order
                      })),
                      quiz: sessionQuizzes.length > 0 ? {
                        id: sessionQuizzes[0].id,
                        question: sessionQuizzes[0].question,
                        options: sessionQuizzes[0].options,
                        correct: sessionQuizzes[0].correct_answer,
                        explanation: sessionQuizzes[0].explanation
                      } : null
                    }
                  })
                }
              })
            }
          }),
          lastUpdated: new Date().toISOString(),
          source: 'database_sync'
        }
        
        fs.writeFileSync(courseJsonPath, JSON.stringify(courseJson, null, 2), 'utf-8')
        updateResults.push({ 
          file: `${course.id}.json`, 
          status: 'updated', 
          items: {
            genres: courseGenres.length,
            themes: themes.filter((t: any) => t.course_id === course.id).length,
            sessions: sessions.filter((s: any) => s.course_id === course.id).length
          }
        })
        console.log(`✅ Updated ${course.id}.json`)
      } catch (error) {
        updateResults.push({ file: `${course.id}.json`, status: 'error', error: error.message })
        console.error(`❌ Failed to update ${course.id}.json:`, error)
      }
    }
    
    const successCount = updateResults.filter(r => r.status === 'updated').length
    const errorCount = updateResults.filter(r => r.status === 'error').length
    
    console.log(`✅ Admin: Learning content sync completed - ${successCount} files updated, ${errorCount} errors`)
    
    return NextResponse.json({
      success: errorCount === 0,
      message: `Successfully synced ${successCount} of ${updateResults.length} files`,
      stats: data.stats,
      updateResults,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Admin learning content sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync learning content', details: error.message },
      { status: 500 }
    )
  }
}