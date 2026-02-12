/**
 * 重複コースデータ削除スクリプト
 * 対象: aig_1 (2026-01-25T05:43:13に作成された重複コース)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DUPLICATE_COURSE_ID = 'aig_1'

async function checkDuplicateData() {
  console.log('========================================')
  console.log('🔍 重複データ確認')
  console.log('========================================')

  // 1. コース確認
  const { data: courses, error: coursesError } = await supabase
    .from('learning_courses')
    .select('id, title, status, created_at')
    .or(`id.eq.aig,id.eq.aig_1`)
    .order('created_at', { ascending: true })

  if (coursesError) {
    console.error('❌ コース取得エラー:', coursesError)
    return null
  }

  console.log('\n📚 learning_courses:')
  courses.forEach(c => {
    console.log(`  - ${c.id}: "${c.title}" (status: ${c.status}, created: ${c.created_at})`)
  })

  // 2. ジャンル確認
  const { data: genres, error: genresError } = await supabase
    .from('learning_genres')
    .select('id, title, course_id, created_at')
    .eq('course_id', DUPLICATE_COURSE_ID)

  if (genresError) {
    console.error('❌ ジャンル取得エラー:', genresError)
    return null
  }

  console.log(`\n📁 learning_genres (course_id = ${DUPLICATE_COURSE_ID}): ${genres.length}件`)
  genres.forEach(g => {
    console.log(`  - ${g.id}: "${g.title}"`)
  })

  // 3. テーマ確認
  const genreIds = genres.map(g => g.id)
  let themes = []
  if (genreIds.length > 0) {
    const { data: themesData, error: themesError } = await supabase
      .from('learning_themes')
      .select('id, title, genre_id')
      .in('genre_id', genreIds)

    if (themesError) {
      console.error('❌ テーマ取得エラー:', themesError)
      return null
    }
    themes = themesData || []
  }

  console.log(`\n📑 learning_themes: ${themes.length}件`)
  themes.forEach(t => {
    console.log(`  - ${t.id}: "${t.title}" (genre: ${t.genre_id})`)
  })

  // 4. セッション確認
  const themeIds = themes.map(t => t.id)
  let sessions = []
  if (themeIds.length > 0) {
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('learning_sessions')
      .select('id, title, theme_id')
      .in('theme_id', themeIds)

    if (sessionsError) {
      console.error('❌ セッション取得エラー:', sessionsError)
      return null
    }
    sessions = sessionsData || []
  }

  console.log(`\n📝 learning_sessions: ${sessions.length}件`)
  sessions.forEach(s => {
    console.log(`  - ${s.id}: "${s.title}" (theme: ${s.theme_id})`)
  })

  return { courses, genres, themes, sessions }
}

async function deleteDuplicateCourse() {
  console.log('\n========================================')
  console.log('🗑️ 重複コース削除開始')
  console.log(`   対象: ${DUPLICATE_COURSE_ID}`)
  console.log('========================================')

  // 1. 確認
  const data = await checkDuplicateData()
  if (!data) {
    console.error('❌ データ確認に失敗しました')
    return
  }

  const duplicateCourse = data.courses.find(c => c.id === DUPLICATE_COURSE_ID)
  if (!duplicateCourse) {
    console.log('ℹ️ 重複コースは既に削除されています')
    return
  }

  // 2. 削除実行（逆順: sessions → themes → genres → courses）
  console.log('\n🔄 削除実行中...')

  // 2-1. セッション削除
  if (data.sessions.length > 0) {
    const sessionIds = data.sessions.map(s => s.id)

    // session_contentsを先に削除
    const { error: contentsError } = await supabase
      .from('session_contents')
      .delete()
      .in('session_id', sessionIds)

    if (contentsError) {
      console.error('❌ session_contents削除エラー:', contentsError)
    } else {
      console.log('  ✅ session_contents 削除完了')
    }

    // session_quizzesを削除
    const { error: quizzesError } = await supabase
      .from('session_quizzes')
      .delete()
      .in('session_id', sessionIds)

    if (quizzesError) {
      console.error('❌ session_quizzes削除エラー:', quizzesError)
    } else {
      console.log('  ✅ session_quizzes 削除完了')
    }

    // セッション削除
    const { error: sessionsError } = await supabase
      .from('learning_sessions')
      .delete()
      .in('id', sessionIds)

    if (sessionsError) {
      console.error('❌ learning_sessions削除エラー:', sessionsError)
    } else {
      console.log(`  ✅ learning_sessions 削除完了 (${sessionIds.length}件)`)
    }
  }

  // 2-2. テーマ削除
  if (data.themes.length > 0) {
    const themeIds = data.themes.map(t => t.id)
    const { error: themesError } = await supabase
      .from('learning_themes')
      .delete()
      .in('id', themeIds)

    if (themesError) {
      console.error('❌ learning_themes削除エラー:', themesError)
    } else {
      console.log(`  ✅ learning_themes 削除完了 (${themeIds.length}件)`)
    }
  }

  // 2-3. ジャンル削除
  if (data.genres.length > 0) {
    const genreIds = data.genres.map(g => g.id)
    const { error: genresError } = await supabase
      .from('learning_genres')
      .delete()
      .in('id', genreIds)

    if (genresError) {
      console.error('❌ learning_genres削除エラー:', genresError)
    } else {
      console.log(`  ✅ learning_genres 削除完了 (${genreIds.length}件)`)
    }
  }

  // 2-4. コース削除
  const { error: courseError } = await supabase
    .from('learning_courses')
    .delete()
    .eq('id', DUPLICATE_COURSE_ID)

  if (courseError) {
    console.error('❌ learning_courses削除エラー:', courseError)
  } else {
    console.log(`  ✅ learning_courses 削除完了 (${DUPLICATE_COURSE_ID})`)
  }

  console.log('\n========================================')
  console.log('✅ 削除処理完了')
  console.log('========================================')

  // 3. 削除後確認
  console.log('\n📋 削除後の確認:')
  const { data: remainingCourses } = await supabase
    .from('learning_courses')
    .select('id, title, status')
    .or(`id.eq.aig,id.eq.aig_1`)

  if (remainingCourses && remainingCourses.length > 0) {
    console.log('  残存コース:')
    remainingCourses.forEach(c => {
      console.log(`    - ${c.id}: "${c.title}" (status: ${c.status})`)
    })
  } else {
    console.log('  関連コースなし')
  }
}

// 実行
deleteDuplicateCourse().catch(console.error)
