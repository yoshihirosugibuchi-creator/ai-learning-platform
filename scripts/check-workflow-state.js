/**
 * ワークフロー状態確認スクリプト
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkWorkflowState() {
  console.log('========================================')
  console.log('📋 ワークフロー状態確認')
  console.log('========================================')

  // ワークフロー取得
  const { data: workflows, error } = await supabase
    .from('ai_course_workflows')
    .select('id, title, status, current_step, published_course_id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ ワークフロー取得エラー:', error)
    return
  }

  console.log(`\n📁 最新ワークフロー一覧 (${workflows.length}件):`)
  for (const wf of workflows) {
    console.log(`\n  ID: ${wf.id}`)
    console.log(`  タイトル: ${wf.title || '(未設定)'}`)
    console.log(`  ステータス: ${wf.status}`)
    console.log(`  現在ステップ: ${wf.current_step}`)
    console.log(`  公開コースID: ${wf.published_course_id || '(未公開)'}`)
    console.log(`  更新日時: ${wf.updated_at}`)
  }

  // aigコースの存在確認
  console.log('\n========================================')
  console.log('📚 コース学習データ確認')
  console.log('========================================')

  const { data: courses } = await supabase
    .from('learning_courses')
    .select('id, title, status, created_at')
    .eq('id', 'aig')

  if (courses && courses.length > 0) {
    const course = courses[0]
    console.log(`\n  コースID: ${course.id}`)
    console.log(`  タイトル: ${course.title}`)
    console.log(`  ステータス: ${course.status}`)
    console.log(`  作成日時: ${course.created_at}`)

    // 関連データ数確認
    const { count: genreCount } = await supabase
      .from('learning_genres')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', 'aig')

    const { data: genres } = await supabase
      .from('learning_genres')
      .select('id')
      .eq('course_id', 'aig')

    let themeCount = 0
    let sessionCount = 0
    if (genres && genres.length > 0) {
      const genreIds = genres.map(g => g.id)

      const { count: tc } = await supabase
        .from('learning_themes')
        .select('*', { count: 'exact', head: true })
        .in('genre_id', genreIds)
      themeCount = tc || 0

      const { data: themes } = await supabase
        .from('learning_themes')
        .select('id')
        .in('genre_id', genreIds)

      if (themes && themes.length > 0) {
        const themeIds = themes.map(t => t.id)
        const { count: sc } = await supabase
          .from('learning_sessions')
          .select('*', { count: 'exact', head: true })
          .in('theme_id', themeIds)
        sessionCount = sc || 0
      }
    }

    console.log(`\n  関連データ:`)
    console.log(`    - ジャンル数: ${genreCount}`)
    console.log(`    - テーマ数: ${themeCount}`)
    console.log(`    - セッション数: ${sessionCount}`)
  } else {
    console.log('\n  aigコースは存在しません')
  }

  // 正しい状態の説明
  console.log('\n========================================')
  console.log('✅ 正しいワークフロー状態')
  console.log('========================================')
  console.log(`
  コース作成済み（Step 4完了後）の場合:
  - status: 'outline_approved'
  - current_step: '5' (次のステップ)
  - published_course_id: 'aig' (作成されたコースID)

  まだ作成途中の場合:
  - status: 'outline_draft' または 'source_analysis'
  - current_step: '0' ~ '4'
  - published_course_id: null
  `)
}

checkWorkflowState().catch(console.error)
