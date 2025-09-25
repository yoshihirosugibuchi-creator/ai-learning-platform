#!/usr/bin/env tsx

/**
 * コース学習データ整合性チェックスクリプト
 * learning_courses → learning_genres → learning_themes → learning_sessions → session_contents/session_quizzes
 * の階層構造とマスタデータ整合性を検証
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// .env.local ファイルから環境変数を直接読み込み
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=')
        }
      }
    }
  }
  
  return env
}

const envVars = loadEnvFile()
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CourseIntegrityResult {
  summary: {
    courses: number
    genres: number
    themes: number
    sessions: number
    contents: number
    quizzes: number
  }
  issues: {
    missingCategoryIds: string[]
    missingSubcategoryIds: string[]
    japaneseSubcategoryIds: string[]
    jsonDataConcerns: string[]
    brokenReferences: string[]
  }
  dataStructure: {
    genreCategories: Record<string, number>
    genreSubcategories: Record<string, number>
    sessionTypes: Record<string, number>
  }
}

async function checkCourseLearningIntegrity() {
  console.log('🔍 コース学習データ整合性チェック開始...\n')

  // マスタデータ取得
  console.log('📋 マスタデータ取得中...')
  const { data: categories } = await supabase
    .from('categories')
    .select('category_id, name')
    .order('category_id')

  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcategory_id, name, parent_category_id')
    .order('subcategory_id')

  const masterCategoryIds = new Set((categories || []).map(c => c.category_id))
  const masterSubcategoryIds = new Set((subcategories || []).map(s => s.subcategory_id))

  console.log(`✅ マスタカテゴリー: ${masterCategoryIds.size}件`)
  console.log(`✅ マスタサブカテゴリー: ${masterSubcategoryIds.size}件\n`)

  // コース学習テーブル構造調査
  console.log('🔍 コース学習テーブル構造調査...')

  // 1. learning_courses
  const { data: courses, error: coursesError } = await supabase
    .from('learning_courses')
    .select('*')
    .limit(5)

  if (coursesError) {
    console.error('❌ learning_courses テーブル取得エラー:', coursesError)
    return
  }

  console.log('📄 learning_courses サンプル:')
  courses?.slice(0, 2).forEach((course, i) => {
    console.log(`  ${i+1}. ID: ${course.id}, Title: ${course.title}`)
    console.log(`     カラム: ${Object.keys(course).join(', ')}`)
  })

  // 2. learning_genres
  const { data: genres, error: genresError } = await supabase
    .from('learning_genres')
    .select('*')
    .limit(10)

  if (genresError) {
    console.error('❌ learning_genres テーブル取得エラー:', genresError)
    return
  }

  console.log('\n📄 learning_genres サンプル:')
  genres?.slice(0, 3).forEach((genre, i) => {
    console.log(`  ${i+1}. ID: ${genre.id}, Course: ${genre.course_id}`)
    console.log(`     category_id: "${genre.category_id}", subcategory_id: "${genre.subcategory_id}"`)
    console.log(`     カラム: ${Object.keys(genre).join(', ')}`)
  })

  // 3. learning_themes
  const { data: themes, error: themesError } = await supabase
    .from('learning_themes')
    .select('*')
    .limit(10)

  if (themesError) {
    console.error('❌ learning_themes テーブル取得エラー:', themesError)
    return
  }

  console.log('\n📄 learning_themes サンプル:')
  themes?.slice(0, 3).forEach((theme, i) => {
    console.log(`  ${i+1}. ID: ${theme.id}, Genre: ${theme.genre_id}, Title: ${theme.title}`)
  })

  // 4. learning_sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('learning_sessions')
    .select('*')
    .limit(10)

  if (sessionsError) {
    console.error('❌ learning_sessions テーブル取得エラー:', sessionsError)
    return
  }

  console.log('\n📄 learning_sessions サンプル:')
  sessions?.slice(0, 3).forEach((session, i) => {
    console.log(`  ${i+1}. ID: ${session.id}, Theme: ${session.theme_id}, Type: ${session.session_type}`)
    console.log(`     カラム: ${Object.keys(session).join(', ')}`)
  })

  // 5. session_contents
  const { data: contents, error: contentsError } = await supabase
    .from('session_contents')
    .select('*')
    .limit(5)

  if (contentsError) {
    console.error('❌ session_contents テーブル取得エラー:', contentsError)
    return
  }

  console.log('\n📄 session_contents サンプル:')
  contents?.slice(0, 2).forEach((content, i) => {
    console.log(`  ${i+1}. ID: ${content.id}, Session: ${content.session_id}`)
    console.log(`     Content type: ${content.content_type}`)
    if (content.content_data && typeof content.content_data === 'object') {
      console.log(`     Content data keys: ${Object.keys(content.content_data).join(', ')}`)
    }
  })

  // 6. session_quizzes
  const { data: quizzes, error: quizzesError } = await supabase
    .from('session_quizzes')
    .select('*')
    .limit(5)

  if (quizzesError) {
    console.error('❌ session_quizzes テーブル取得エラー:', quizzesError)
    return
  }

  console.log('\n📄 session_quizzes サンプル:')
  quizzes?.slice(0, 2).forEach((quiz, i) => {
    console.log(`  ${i+1}. ID: ${quiz.id}, Session: ${quiz.session_id}`)
    if (quiz.quiz_data && typeof quiz.quiz_data === 'object') {
      const quizData = quiz.quiz_data as any
      console.log(`     Quiz data keys: ${Object.keys(quizData).join(', ')}`)
      if (quizData.options && Array.isArray(quizData.options)) {
        console.log(`     Options count: ${quizData.options.length}`)
      }
    }
  })

  // 7. learning_progress
  const { data: progress, error: progressError } = await supabase
    .from('learning_progress')
    .select('*')
    .limit(5)

  if (progressError) {
    console.warn('⚠️ learning_progress テーブル取得エラー:', progressError)
  } else if (progress && progress.length > 0) {
    console.log('\n📄 learning_progress サンプル:')
    progress.slice(0, 2).forEach((prog, i) => {
      console.log(`  ${i+1}. User: ${prog.user_id}, Course: ${prog.course_id || 'N/A'}, Session: ${prog.session_id || 'N/A'}`)
      console.log(`     カラム: ${Object.keys(prog).join(', ')}`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 詳細整合性分析')
  console.log('='.repeat(80))

  // 全データ取得して詳細分析
  const [allGenres, allThemes, allSessions, allContents, allQuizzes] = await Promise.all([
    supabase.from('learning_genres').select('*'),
    supabase.from('learning_themes').select('*'), 
    supabase.from('learning_sessions').select('*'),
    supabase.from('session_contents').select('*'),
    supabase.from('session_quizzes').select('*')
  ])

  const result: CourseIntegrityResult = {
    summary: {
      courses: courses?.length || 0,
      genres: allGenres.data?.length || 0,
      themes: allThemes.data?.length || 0,
      sessions: allSessions.data?.length || 0,
      contents: allContents.data?.length || 0,
      quizzes: allQuizzes.data?.length || 0
    },
    issues: {
      missingCategoryIds: [],
      missingSubcategoryIds: [],
      japaneseSubcategoryIds: [],
      jsonDataConcerns: [],
      brokenReferences: []
    },
    dataStructure: {
      genreCategories: {},
      genreSubcategories: {},
      sessionTypes: {}
    }
  }

  // Genres のカテゴリー・サブカテゴリー整合性チェック
  console.log('🔍 learning_genres のマスタデータ整合性チェック...')
  
  if (allGenres.data) {
    for (const genre of allGenres.data) {
      // Category ID チェック
      if (genre.category_id && !masterCategoryIds.has(genre.category_id)) {
        result.issues.missingCategoryIds.push(genre.category_id)
      }

      // Subcategory ID チェック
      if (genre.subcategory_id) {
        if (!masterSubcategoryIds.has(genre.subcategory_id)) {
          result.issues.missingSubcategoryIds.push(genre.subcategory_id)
        }
        
        // 日本語IDか英語IDかの判定（簡単なヒューリスティック）
        if (/[ひらがなカタカナ漢字]/.test(genre.subcategory_id)) {
          result.issues.japaneseSubcategoryIds.push(genre.subcategory_id)
        }
      }

      // カテゴリー・サブカテゴリー統計
      const catId = genre.category_id || 'undefined'
      const subId = genre.subcategory_id || 'undefined'
      result.dataStructure.genreCategories[catId] = (result.dataStructure.genreCategories[catId] || 0) + 1
      result.dataStructure.genreSubcategories[subId] = (result.dataStructure.genreSubcategories[subId] || 0) + 1
    }
  }

  // Sessions のタイプ統計
  if (allSessions.data) {
    for (const session of allSessions.data) {
      const sessionType = session.session_type || 'undefined'
      result.dataStructure.sessionTypes[sessionType] = (result.dataStructure.sessionTypes[sessionType] || 0) + 1
    }
  }

  // JSON データの懸念事項チェック
  console.log('🔍 JSON データ構造チェック...')

  // session_contents のJSON構造
  if (allContents.data) {
    const jsonContentTypes = new Set<string>()
    let badgeDataCount = 0
    
    for (const content of allContents.data) {
      if (content.content_data && typeof content.content_data === 'object') {
        const data = content.content_data as any
        if (data.type) jsonContentTypes.add(data.type)
        if (data.badge_data || data.badges) badgeDataCount++
      }
    }
    
    if (badgeDataCount > 0) {
      result.issues.jsonDataConcerns.push(`Badge data stored in JSON: ${badgeDataCount}件`)
    }
    
    if (jsonContentTypes.size > 0) {
      result.issues.jsonDataConcerns.push(`Content types: ${Array.from(jsonContentTypes).join(', ')}`)
    }
  }

  // session_quizzes のJSON構造  
  if (allQuizzes.data) {
    let jsonOptionsCount = 0
    let knowledgeCardCount = 0
    
    for (const quiz of allQuizzes.data) {
      if (quiz.quiz_data && typeof quiz.quiz_data === 'object') {
        const data = quiz.quiz_data as any
        if (data.options && Array.isArray(data.options)) jsonOptionsCount++
        if (data.knowledge_card || data.knowledge_cards) knowledgeCardCount++
      }
    }
    
    if (jsonOptionsCount > 0) {
      result.issues.jsonDataConcerns.push(`Quiz options stored as JSON arrays: ${jsonOptionsCount}件`)
    }
    
    if (knowledgeCardCount > 0) {
      result.issues.jsonDataConcerns.push(`Knowledge card data in JSON: ${knowledgeCardCount}件`)
    }
  }

  // 参照整合性チェック（簡易版）
  console.log('🔍 参照整合性チェック...')
  
  if (allThemes.data && allGenres.data) {
    const genreIds = new Set(allGenres.data.map(g => g.id))
    const orphanThemes = allThemes.data.filter(t => t.genre_id && !genreIds.has(t.genre_id))
    if (orphanThemes.length > 0) {
      result.issues.brokenReferences.push(`Orphan themes (genre not found): ${orphanThemes.length}件`)
    }
  }

  if (allSessions.data && allThemes.data) {
    const themeIds = new Set(allThemes.data.map(t => t.id))
    const orphanSessions = allSessions.data.filter(s => s.theme_id && !themeIds.has(s.theme_id))
    if (orphanSessions.length > 0) {
      result.issues.brokenReferences.push(`Orphan sessions (theme not found): ${orphanSessions.length}件`)
    }
  }

  // 結果レポート
  console.log('\n' + '='.repeat(80))
  console.log('📊 コース学習データ整合性レポート')
  console.log('='.repeat(80))

  console.log('\n📊 データ件数サマリー:')
  Object.entries(result.summary).forEach(([key, count]) => {
    console.log(`- ${key}: ${count}件`)
  })

  console.log('\n🚨 整合性の問題:')
  
  if (result.issues.missingCategoryIds.length > 0) {
    console.log(`❌ マスタにないcategory_id: ${[...new Set(result.issues.missingCategoryIds)].length}件`)
    console.log(`   例: ${[...new Set(result.issues.missingCategoryIds)].slice(0, 5).join(', ')}`)
  } else {
    console.log('✅ category_id: 全てマスタに存在')
  }

  if (result.issues.missingSubcategoryIds.length > 0) {
    console.log(`❌ マスタにないsubcategory_id: ${[...new Set(result.issues.missingSubcategoryIds)].length}件`)
    console.log(`   例: ${[...new Set(result.issues.missingSubcategoryIds)].slice(0, 5).join(', ')}`)
  } else {
    console.log('✅ subcategory_id: 全てマスタに存在')
  }

  if (result.issues.japaneseSubcategoryIds.length > 0) {
    console.log(`⚠️ 日本語のsubcategory_id: ${[...new Set(result.issues.japaneseSubcategoryIds)].length}件`)
    console.log(`   例: ${[...new Set(result.issues.japaneseSubcategoryIds)].slice(0, 3).join(', ')}`)
  } else {
    console.log('✅ subcategory_id: 全て英語ID')
  }

  if (result.issues.brokenReferences.length > 0) {
    console.log('❌ 参照整合性の問題:')
    result.issues.brokenReferences.forEach(issue => console.log(`   - ${issue}`))
  } else {
    console.log('✅ 参照整合性: 問題なし')
  }

  console.log('\n🔍 JSONデータの懸念事項:')
  if (result.issues.jsonDataConcerns.length > 0) {
    result.issues.jsonDataConcerns.forEach(concern => console.log(`⚠️ ${concern}`))
  } else {
    console.log('✅ JSONデータ: 特に問題なし')
  }

  console.log('\n📊 データ分布:')
  console.log('Genre categories:', Object.entries(result.dataStructure.genreCategories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([k,v]) => `${k}(${v})`)
    .join(', '))
    
  console.log('Session types:', Object.entries(result.dataStructure.sessionTypes)
    .sort(([,a], [,b]) => b - a)
    .map(([k,v]) => `${k}(${v})`)
    .join(', '))

  // 総合判定
  const totalIssues = result.issues.missingCategoryIds.length + 
                     result.issues.missingSubcategoryIds.length + 
                     result.issues.brokenReferences.length

  console.log('\n🎯 総合判定:')
  if (totalIssues === 0) {
    console.log('✅ コース学習データ整合性: 問題なし')
    console.log('Phase 1以降の作業に進行可能です')
  } else {
    console.log(`❌ 修正が必要な問題: ${totalIssues}件`)
    console.log('データ修正後にPhase 1に進行してください')
  }

  if (result.issues.japaneseSubcategoryIds.length > 0) {
    console.log('\n💡 推奨改善:')
    console.log('- learning_genres の subcategory_id を英語IDに統一することを検討')
  }

  console.log('\n='.repeat(80))
}

checkCourseLearningIntegrity().catch(console.error)