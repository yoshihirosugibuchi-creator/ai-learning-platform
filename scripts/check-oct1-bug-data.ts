/**
 * 10/1バグデータ残存確認
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function checkOct1Data() {
  console.log('🔍 10/1 バグデータ残存確認...')
  
  // 10/1の daily_xp_records 確認
  const { data: oct1Daily } = await supabaseAdmin
    .from('daily_xp_records')
    .select('*')
    .eq('date', '2025-10-01')
    
  console.log(`10/1 daily_xp_records: ${oct1Daily?.length || 0}件`)
  if (oct1Daily && oct1Daily.length > 0) {
    oct1Daily.forEach(record => {
      console.log(`- User: ${record.user_id.substring(0, 8)} Quiz時間: ${record.quiz_time_seconds}秒`)
    })
  }
  
  // 10/1の quiz_answers で異常セッション確認
  const { data: oct1Answers } = await supabaseAdmin
    .from('quiz_answers')
    .select('quiz_session_id, time_spent, created_at')
    .gte('created_at', '2025-10-01T00:00:00Z')
    .lt('created_at', '2025-10-02T00:00:00Z')
    .gt('time_spent', 100) // 100秒以上の異常値
    
  console.log(`\n10/1 異常時間回答: ${oct1Answers?.length || 0}件`)
  if (oct1Answers && oct1Answers.length > 0) {
    const sessionMap = new Map()
    oct1Answers.forEach(answer => {
      const sessionId = answer.quiz_session_id
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, [])
      }
      sessionMap.get(sessionId).push(answer.time_spent)
    })
    
    Array.from(sessionMap.entries()).forEach(([sessionId, times]) => {
      const totalTime = times.reduce((sum: number, t: number) => sum + t, 0)
      console.log(`- Session: ${sessionId.substring(0, 8)} 総時間: ${totalTime}秒`)
    })
  }
  
  // 異常セッション e248549f の状況確認
  console.log('\n🔍 異常セッション e248549f の現在状況:')
  const { data: anomalySession } = await supabaseAdmin
    .from('quiz_answers')
    .select('time_spent, created_at')
    .eq('quiz_session_id', 'e248549f-0e4f-450f-8f4a-64d053702449')
    
  if (anomalySession && anomalySession.length > 0) {
    const totalTime = anomalySession.reduce((sum, a) => sum + a.time_spent, 0)
    console.log(`- 回答数: ${anomalySession.length}件`)
    console.log(`- 総時間: ${totalTime}秒`)
    console.log(`- 平均時間: ${(totalTime / anomalySession.length).toFixed(1)}秒/問`)
  } else {
    console.log('- 異常セッションは見つかりませんでした')
  }
}

// スクリプト実行
if (require.main === module) {
  checkOct1Data()
    .then(() => {
      console.log('\n✅ 10/1データ確認完了')
    })
    .catch(error => {
      console.error('❌ 確認エラー:', error)
      process.exit(1)
    })
}