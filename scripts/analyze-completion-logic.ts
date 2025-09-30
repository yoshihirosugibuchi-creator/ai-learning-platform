import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 環境変数を読み込み
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function analyzeCompletionLogic() {
  console.log('🔍 Analyzing completion logic requirements...')
  
  // 現在の course_session_completions データを確認
  const { data: sessionData, error: sessionError } = await supabase
    .from('course_session_completions')
    .select('course_id, theme_id, genre_id, user_id, is_first_completion')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (sessionError) {
    console.error('Error fetching session data:', sessionError.message)
    return
  }

  console.log('\n📊 Recent course_session_completions data (last 10):')
  sessionData?.forEach((session, index) => {
    console.log(`${index + 1}. User: ${session.user_id.substring(0, 8)}..., Course: ${session.course_id}, Theme: ${session.theme_id}, First: ${session.is_first_completion}`)
  })

  // course_completions の目的：コース全体の完了を記録
  // course_theme_completions の目的：テーマレベルの完了を記録
  
  console.log('\n🎯 Expected behavior:')
  console.log('1. course_session_completions: Each session completion (exists: 32 records)')
  console.log('2. course_theme_completions: When all sessions in a theme are completed (missing: 0 records)')
  console.log('3. course_completions: When all themes in a course are completed (missing: 0 records)')

  // テーマ完了の集計可能性確認
  const { data: themeAnalysis, error: themeError } = await supabase
    .from('course_session_completions')
    .select('course_id, theme_id, user_id, is_first_completion')
    .eq('is_first_completion', true)
  
  if (themeError) {
    console.error('Theme analysis error:', themeError.message)
    return
  }

  // テーマ別に集計
  const themeCompletions = new Map<string, Set<string>>()
  themeAnalysis?.forEach(session => {
    const themeKey = `${session.user_id}_${session.course_id}_${session.theme_id}`
    if (!themeCompletions.has(themeKey)) {
      themeCompletions.set(themeKey, new Set())
    }
    themeCompletions.get(themeKey)?.add(session.theme_id)
  })

  console.log(`\n📈 Analysis results:`)
  console.log(`- Unique theme completions possible: ${themeCompletions.size}`)
  console.log(`- These should be recorded in course_theme_completions`)

  // コース別に集計
  const courseCompletions = new Map<string, Set<string>>()
  themeAnalysis?.forEach(session => {
    const courseKey = `${session.user_id}_${session.course_id}`
    if (!courseCompletions.has(courseKey)) {
      courseCompletions.set(courseKey, new Set())
    }
    courseCompletions.get(courseKey)?.add(session.theme_id)
  })

  console.log(`- Unique user-course combinations: ${courseCompletions.size}`)
  console.log(`- These should be checked for full course completion`)
}

analyzeCompletionLogic().catch(console.error)