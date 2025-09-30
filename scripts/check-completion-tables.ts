import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 環境変数を読み込み
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

async function checkCompletionTables() {
  console.log('📊 Checking completion tables record counts...')
  
  // course_completions テーブル確認
  const { data: courseCompletions, error: courseError, count: courseCount } = await supabase
    .from('course_completions')
    .select('*', { count: 'exact', head: true })
  
  console.log('📚 course_completions:', {
    count: courseCount,
    error: courseError?.message || 'none'
  })
  
  // course_theme_completions テーブル確認  
  const { data: themeCompletions, error: themeError, count: themeCount } = await supabase
    .from('course_theme_completions')
    .select('*', { count: 'exact', head: true })
    
  console.log('🎨 course_theme_completions:', {
    count: themeCount,
    error: themeError?.message || 'none'
  })
  
  // 比較: course_session_completions テーブル確認
  const { data: sessionCompletions, error: sessionError, count: sessionCount } = await supabase
    .from('course_session_completions')
    .select('*', { count: 'exact', head: true })
    
  console.log('🎯 course_session_completions (for comparison):', {
    count: sessionCount,
    error: sessionError?.message || 'none'
  })

  // learning_progress テーブルも確認
  const { data: learningProgress, error: learningError, count: learningCount } = await supabase
    .from('learning_progress')
    .select('*', { count: 'exact', head: true })
    
  console.log('📖 learning_progress (for comparison):', {
    count: learningCount,
    error: learningError?.message || 'none'
  })

  console.log('\n🔍 Analysis:')
  console.log('- course_completions should track overall course completion')
  console.log('- course_theme_completions should track theme-level completion')
  console.log('- course_session_completions tracks individual session completion')
  console.log('- learning_progress tracks detailed session progress with time data')
}

checkCompletionTables().catch(console.error)