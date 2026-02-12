/**
 * コースIDの詳細確認
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCourseIds() {
  console.log('========================================')
  console.log('📋 aigコースのID詳細確認')
  console.log('========================================')

  // コース
  const { data: courses } = await supabase
    .from('learning_courses')
    .select('id, title')
    .or('id.like.aig%,id.like.ai_%')
    .order('created_at', { ascending: false })

  console.log('\n📚 コース一覧:')
  for (const c of courses || []) {
    console.log(`  ${c.id}: ${c.title}`)
  }

  // ジャンル
  const { data: genres } = await supabase
    .from('learning_genres')
    .select('id, title, course_id')
    .eq('course_id', 'aig')

  console.log('\n📁 ジャンル一覧 (aig):')
  for (const g of genres || []) {
    console.log(`  ${g.id}: ${g.title}`)
  }

  // テーマ（最初の2ジャンルのみ）
  if (genres && genres.length > 0) {
    const genreIds = genres.slice(0, 2).map(g => g.id)
    const { data: themes } = await supabase
      .from('learning_themes')
      .select('id, title, genre_id')
      .in('genre_id', genreIds)
      .limit(10)

    console.log('\n📑 テーマ一覧 (最初の10件):')
    for (const t of themes || []) {
      console.log(`  ${t.id}: ${t.title}`)
    }

    // セッション（最初のテーマのみ）
    if (themes && themes.length > 0) {
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select('id, title, theme_id')
        .eq('theme_id', themes[0].id)
        .limit(5)

      console.log('\n📝 セッション一覧 (最初の5件):')
      for (const s of sessions || []) {
        console.log(`  ${s.id}: ${s.title}`)
      }
    }
  }

  // 新規作成された重複コースがないか確認
  console.log('\n========================================')
  console.log('🔍 重複コース確認')
  console.log('========================================')

  const { data: allCourses } = await supabase
    .from('learning_courses')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('\n最新5件のコース:')
  for (const c of allCourses || []) {
    console.log(`  ${c.id}: ${c.title} (${c.created_at})`)
  }
}

checkCourseIds().catch(console.error)
