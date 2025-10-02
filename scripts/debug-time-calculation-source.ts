import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugTimeCalculationSource() {
  console.log('🔍 時間計算の不正箇所特定調査')
  console.log('='.repeat(60))
  
  const userId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

  try {
    // 1. 実際のセッション時間を計算
    console.log('\n📊 Step 1: 実際のセッション時間計算 (終了-開始)')
    
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    let totalActualSeconds = 0
    let sessionCount = 0
    
    console.log('📋 クイズセッション詳細:')
    quizSessions?.forEach((session, index) => {
      const start = new Date(session.session_start_time)
      const end = new Date(session.session_end_time)
      const actualSeconds = Math.round((end.getTime() - start.getTime()) / 1000)
      
      totalActualSeconds += actualSeconds
      sessionCount++
      
      console.log(`  ${index + 1}. ${session.created_at.split('T')[0]}: ${actualSeconds}秒 (${Math.round(actualSeconds / 60)}分)`)
    })
    
    console.log(`📊 実際の合計時間: ${totalActualSeconds}秒 = ${Math.round(totalActualSeconds / 60)}分`)

    // 2. コースセッション時間確認
    console.log('\n📊 Step 2: コースセッション時間確認')
    
    const { data: courseSessions } = await supabase
      .from('course_session_completions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    console.log(`📋 コースセッション数: ${courseSessions?.length || 0}`)
    courseSessions?.slice(0, 5).forEach((session, index) => {
      console.log(`  ${index + 1}. ${session.created_at.split('T')[0]}: ${session.completion_time}`)
    })

    // 3. daily_xp_recordsの時間データの源泉を調査
    console.log('\n📊 Step 3: daily_xp_records の時間データ源泉調査')
    
    const { data: dailyRecords } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    dailyRecords?.forEach((record, index) => {
      console.log(`\n📅 ${record.date}:`)
      console.log(`  total_time_seconds: ${record.total_time_seconds}秒 = ${Math.round(record.total_time_seconds / 60)}分`)
      console.log(`  quiz_time_seconds: ${record.quiz_time_seconds}秒`)
      console.log(`  course_time_seconds: ${record.course_time_seconds}秒`)
      console.log(`  study_time_minutes: ${record.study_time_minutes}分`)
      console.log(`  quiz_sessions: ${record.quiz_sessions}`)
      console.log(`  course_sessions: ${record.course_sessions}`)
      
      // この日の実際のセッション時間と比較
      const dailyQuizSessions = quizSessions?.filter(session => 
        session.created_at.split('T')[0] === record.date
      ) || []
      
      const actualDailySeconds = dailyQuizSessions.reduce((sum, session) => {
        const start = new Date(session.session_start_time)
        const end = new Date(session.session_end_time)
        return sum + Math.round((end.getTime() - start.getTime()) / 1000)
      }, 0)
      
      console.log(`  📊 実際のクイズ時間: ${actualDailySeconds}秒 vs 記録: ${record.quiz_time_seconds}秒`)
      console.log(`  🔍 差分: ${record.quiz_time_seconds - actualDailySeconds}秒 (${Math.round((record.quiz_time_seconds - actualDailySeconds) / 60)}分)`)
    })

    // 4. user_xp_stats_v2の時間データの源泉を調査
    console.log('\n📊 Step 4: user_xp_stats_v2 の時間データ源泉調査')
    
    const { data: xpStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (xpStats) {
      console.log(`📊 user_xp_stats_v2:`)
      console.log(`  total_learning_time_seconds: ${xpStats.total_learning_time_seconds}秒`)
      console.log(`  quiz_learning_time_seconds: ${xpStats.quiz_learning_time_seconds}秒`)
      console.log(`  course_learning_time_seconds: ${xpStats.course_learning_time_seconds}秒`)
      
      console.log(`\n🔍 比較分析:`)
      console.log(`  実際のクイズ時間合計: ${totalActualSeconds}秒`)
      console.log(`  XP統計のクイズ時間: ${xpStats.quiz_learning_time_seconds}秒`)
      console.log(`  差分: ${xpStats.quiz_learning_time_seconds - totalActualSeconds}秒`)
      console.log(`  倍率: ${Math.round(xpStats.quiz_learning_time_seconds / totalActualSeconds)}倍`)
    }

    // 5. どの処理で時間データが作成/更新されているかを調査
    console.log('\n📊 Step 5: 時間データ作成箇所の推定')
    console.log('🔍 候補箇所:')
    console.log('  1. クイズセッション完了時の時間記録処理')
    console.log('  2. daily_xp_records の集計処理')
    console.log('  3. user_xp_stats_v2 の更新処理')
    console.log('  4. XP獲得API (/api/xp-save/quiz, /api/xp-save/course)')
    
    console.log('\n💡 推定原因:')
    console.log('  - 時間データが重複して加算されている')
    console.log('  - ミリ秒→秒の変換でミスがある')
    console.log('  - セッション時間計算式が間違っている')
    console.log('  - データベーストリガーで重複処理が発生している')

  } catch (error) {
    console.error('❌ 調査エラー:', error)
  }
}

debugTimeCalculationSource()