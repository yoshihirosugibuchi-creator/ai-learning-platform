/**
 * 学習コンテンツ JSON → Supabase DB 移行スクリプト
 * 実行方法: npx tsx scripts/migrate-learning-content-to-db.ts
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// 直接環境変数を設定
const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A'

// Supabaseクライアント作成
const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('✅ Supabase client initialized for migration')

// ===== 型定義 =====
interface CourseJson {
  courses: Array<{
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
    badge: {
      id: string
      title: string
      description: string
      icon: string
      color: string
      badgeImageUrl?: string
      validityPeriodMonths?: number
    }
  }>
}

interface CourseDetailJson {
  id: string
  title: string
  description: string
  estimatedDays: number
  difficulty: string
  icon: string
  color: string
  displayOrder: number
  genres: Array<{
    id: string
    title: string
    description: string
    categoryId: string
    subcategoryId?: string
    estimatedDays: number
    displayOrder: number
    badge: any
    themes: Array<{
      id: string
      title: string
      description: string
      estimatedMinutes: number
      displayOrder: number
      rewardCard: any
      sessions: Array<{
        id: string
        title: string
        estimatedMinutes: number
        type: 'knowledge' | 'practice' | 'case_study'
        displayOrder: number
        content: Array<{
          id: string
          type: 'text' | 'image' | 'video' | 'example' | 'key_points'
          title?: string
          content: string
          duration?: number
          displayOrder: number
        }>
        quiz: Array<{
          id: string
          question: string
          options: string[]
          correct: number
          explanation: string
          type: 'single_choice' | 'multiple_choice'
        }>
      }>
    }>
  }>
}

// ===== ユーティリティ関数 =====
function readJsonFile<T>(filePath: string): T {
  const fullPath = path.join(process.cwd(), filePath)
  const jsonContent = fs.readFileSync(fullPath, 'utf-8')
  return JSON.parse(jsonContent)
}

function generateContentId(sessionId: string, index: number): string {
  return `${sessionId}_content_${index + 1}`
}

function generateQuizId(sessionId: string, index: number): string {
  return `${sessionId}_quiz_${index + 1}`
}

// ===== データ移行関数 =====
async function migrateCourses(coursesData: CourseJson) {
  console.log('🏗️  Migrating courses...')
  
  const coursesToInsert = coursesData.courses.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    estimated_days: course.estimatedDays,
    difficulty: course.difficulty,
    icon: course.icon,
    color: course.color,
    display_order: course.displayOrder,
    status: course.status,
    badge_data: course.badge
  }))

  const { data, error } = await supabase
    .from('learning_courses')
    .upsert(coursesToInsert, { onConflict: 'id' })

  if (error) {
    console.error('❌ Error migrating courses:', error)
    throw error
  }

  console.log(`✅ Migrated ${coursesToInsert.length} courses`)
  return coursesToInsert.length
}

async function migrateGenres(courseDetail: CourseDetailJson) {
  console.log(`📚 Migrating genres for course: ${courseDetail.id}`)
  
  const genresToInsert = courseDetail.genres.map(genre => ({
    id: genre.id,
    course_id: courseDetail.id,
    title: genre.title,
    description: genre.description,
    category_id: genre.categoryId,
    subcategory_id: genre.subcategoryId || null,
    estimated_days: genre.estimatedDays,
    display_order: genre.displayOrder,
    badge_data: genre.badge
  }))

  const { data, error } = await supabase
    .from('learning_genres')
    .upsert(genresToInsert, { onConflict: 'id' })

  if (error) {
    console.error('❌ Error migrating genres:', error)
    throw error
  }

  console.log(`✅ Migrated ${genresToInsert.length} genres`)
  return genresToInsert.length
}

async function migrateThemes(courseDetail: CourseDetailJson) {
  console.log(`🎯 Migrating themes for course: ${courseDetail.id}`)
  
  const themesToInsert: any[] = []
  
  courseDetail.genres.forEach(genre => {
    genre.themes.forEach(theme => {
      themesToInsert.push({
        id: theme.id,
        genre_id: genre.id,
        title: theme.title,
        description: theme.description,
        estimated_minutes: theme.estimatedMinutes,
        display_order: theme.displayOrder,
        reward_card_data: theme.rewardCard
      })
    })
  })

  const { data, error } = await supabase
    .from('learning_themes')
    .upsert(themesToInsert, { onConflict: 'id' })

  if (error) {
    console.error('❌ Error migrating themes:', error)
    throw error
  }

  console.log(`✅ Migrated ${themesToInsert.length} themes`)
  return themesToInsert.length
}

async function migrateSessions(courseDetail: CourseDetailJson) {
  console.log(`⚡ Migrating sessions for course: ${courseDetail.id}`)
  
  const sessionsToInsert: any[] = []
  
  courseDetail.genres.forEach(genre => {
    genre.themes.forEach(theme => {
      theme.sessions.forEach(session => {
        sessionsToInsert.push({
          id: session.id,
          theme_id: theme.id,
          title: session.title,
          estimated_minutes: session.estimatedMinutes,
          session_type: session.type,
          display_order: session.displayOrder
        })
      })
    })
  })

  const { data, error } = await supabase
    .from('learning_sessions')
    .upsert(sessionsToInsert, { onConflict: 'id' })

  if (error) {
    console.error('❌ Error migrating sessions:', error)
    throw error
  }

  console.log(`✅ Migrated ${sessionsToInsert.length} sessions`)
  return sessionsToInsert.length
}

async function migrateContents(courseDetail: CourseDetailJson) {
  console.log(`📝 Migrating contents for course: ${courseDetail.id}`)
  
  const contentsToInsert: any[] = []
  
  courseDetail.genres.forEach(genre => {
    genre.themes.forEach(theme => {
      theme.sessions.forEach(session => {
        session.content.forEach((content, index) => {
          contentsToInsert.push({
            id: generateContentId(session.id, index),
            session_id: session.id,
            content_type: content.type,
            title: content.title || null,
            content: content.content,
            duration: content.duration || null,
            display_order: content.displayOrder
          })
        })
      })
    })
  })

  // バッチ処理（500件ずつ）
  const BATCH_SIZE = 500
  let totalInserted = 0
  
  for (let i = 0; i < contentsToInsert.length; i += BATCH_SIZE) {
    const batch = contentsToInsert.slice(i, i + BATCH_SIZE)
    
    const { data, error } = await supabase
      .from('session_contents')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`❌ Error migrating contents batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error)
      throw error
    }
    
    totalInserted += batch.length
    console.log(`📝 Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} contents`)
  }

  console.log(`✅ Migrated ${totalInserted} contents`)
  return totalInserted
}

async function migrateQuizzes(courseDetail: CourseDetailJson) {
  console.log(`❓ Migrating quizzes for course: ${courseDetail.id}`)
  
  const quizzesToInsert: any[] = []
  
  courseDetail.genres.forEach(genre => {
    genre.themes.forEach(theme => {
      theme.sessions.forEach(session => {
        session.quiz.forEach((quiz, index) => {
          quizzesToInsert.push({
            id: generateQuizId(session.id, index),
            session_id: session.id,
            question: quiz.question,
            options: JSON.stringify(quiz.options),
            correct_answer: quiz.correct,
            explanation: quiz.explanation,
            quiz_type: quiz.type,
            display_order: index
          })
        })
      })
    })
  })

  const { data, error } = await supabase
    .from('session_quizzes')
    .upsert(quizzesToInsert, { onConflict: 'id' })

  if (error) {
    console.error('❌ Error migrating quizzes:', error)
    throw error
  }

  console.log(`✅ Migrated ${quizzesToInsert.length} quizzes`)
  return quizzesToInsert.length
}

// ===== メイン移行関数 =====
async function migrateLearningContent() {
  console.log('🚀 Starting learning content migration...')
  
  try {
    // 1. コース一覧データを読み込み・移行
    console.log('\n--- Phase 1: Courses ---')
    const coursesData = readJsonFile<CourseJson>('public/learning-data/courses.json')
    const coursesCount = await migrateCourses(coursesData)
    
    // 2. 利用可能なコースの詳細データを移行
    console.log('\n--- Phase 2: Course Details ---')
    const availableCourses = coursesData.courses.filter(course => course.status === 'available')
    
    let totalGenres = 0
    let totalThemes = 0
    let totalSessions = 0
    let totalContents = 0
    let totalQuizzes = 0
    
    for (const course of availableCourses) {
      console.log(`\n📖 Processing course: ${course.id}`)
      
      try {
        const courseDetail = readJsonFile<CourseDetailJson>(`public/learning-data/${course.id}.json`)
        
        const genresCount = await migrateGenres(courseDetail)
        const themesCount = await migrateThemes(courseDetail)
        const sessionsCount = await migrateSessions(courseDetail)
        const contentsCount = await migrateContents(courseDetail)
        const quizzesCount = await migrateQuizzes(courseDetail)
        
        totalGenres += genresCount
        totalThemes += themesCount
        totalSessions += sessionsCount
        totalContents += contentsCount
        totalQuizzes += quizzesCount
        
        console.log(`✅ Course ${course.id} migration completed`)
        
      } catch (error) {
        console.error(`❌ Error processing course ${course.id}:`, error)
        // 他のコースの処理は続行
      }
    }
    
    // 3. 移行結果サマリー
    console.log('\n🎉 MIGRATION COMPLETED!')
    console.log('=====================================')
    console.log(`📊 Migration Summary:`)
    console.log(`   Courses:  ${coursesCount}`)
    console.log(`   Genres:   ${totalGenres}`)
    console.log(`   Themes:   ${totalThemes}`)
    console.log(`   Sessions: ${totalSessions}`)
    console.log(`   Contents: ${totalContents}`)
    console.log(`   Quizzes:  ${totalQuizzes}`)
    console.log('=====================================')
    
  } catch (error) {
    console.error('💥 MIGRATION FAILED:', error)
    process.exit(1)
  }
}

// ===== 実行 =====
if (require.main === module) {
  migrateLearningContent()
    .then(() => {
      console.log('✅ Migration script completed successfully')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Migration script failed:', error)
      process.exit(1)
    })
}

export { migrateLearningContent }