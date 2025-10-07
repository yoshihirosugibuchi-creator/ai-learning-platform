/**
 * user_xp_stats_v2 と daily_xp_records の時間差異調査
 * 両方ともquiz_answersが元ネタなのになぜ351秒もズレるのか？
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

// 型エイリアス
type UserXPStats = Database['public']['Tables']['user_xp_stats_v2']['Row']
type DailyXPRecord = Database['public']['Tables']['daily_xp_records']['Row']

const TEST_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

async function investigateTimeDiscrepancy() {
  console.log('🔍 時間差異の原因調査開始...')
  console.log(`👤 対象ユーザー: ${TEST_USER_ID}`)
  
  // 1. user_xp_stats_v2 の値確認
  const { data: userStats } = await supabaseAdmin
    .from('user_xp_stats_v2')
    .select('quiz_learning_time_seconds, total_learning_time_seconds')
    .eq('user_id', TEST_USER_ID)
    .single()
    
  console.log('📊 user_xp_stats_v2:')
  const typedUserStats = userStats as UserXPStats | null
  console.log(`- quiz_learning_time_seconds: ${typedUserStats?.quiz_learning_time_seconds || 0}秒`)
  console.log(`- total_learning_time_seconds: ${typedUserStats?.total_learning_time_seconds || 0}秒`)
  
  // 2. daily_xp_records の値確認
  const { data: dailyRecords } = await supabaseAdmin
    .from('daily_xp_records')
    .select('date, quiz_time_seconds, total_time_seconds')
    .eq('user_id', TEST_USER_ID)
    .order('date', { ascending: true })
    
  console.log('\n📅 daily_xp_records:')
  let dailyQuizTotal = 0
  let dailyTotalTotal = 0
  
  const typedDailyRecords = dailyRecords as DailyXPRecord[] | null
  typedDailyRecords?.forEach(record => {
    dailyQuizTotal += record.quiz_time_seconds || 0
    dailyTotalTotal += record.total_time_seconds || 0
    console.log(`- ${record.date}: クイズ ${record.quiz_time_seconds}秒, 総計 ${record.total_time_seconds}秒`)
  })
  
  console.log(`📊 daily_xp_records 合計:`)
  console.log(`- quiz_time_seconds合計: ${dailyQuizTotal}秒`)
  console.log(`- total_time_seconds合計: ${dailyTotalTotal}秒`)
  
  // 3. quiz_answers の生データ確認
  const { data: allQuizAnswers } = await supabaseAdmin
    .from('quiz_answers')
    .select('time_spent, created_at, session_type')
    .eq('session_type', 'quiz')
    .order('created_at', { ascending: true })
    
  console.log(`\n📝 quiz_answers (session_type='quiz'):`)
  console.log(`- 総回答数: ${allQuizAnswers?.length || 0}件`)
  
  const realQuizTotal = allQuizAnswers?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0
  console.log(`- 実際の総時間: ${realQuizTotal}秒`)
  
  // 4. 日付別にquiz_answersを集計
  console.log('\n📅 quiz_answers 日付別集計:')
  const dateMap = new Map<string, number>()
  
  allQuizAnswers?.forEach(answer => {
    const date = answer.created_at?.split('T')[0] // YYYY-MM-DD
    if (date) {
      const current = dateMap.get(date) || 0
      dateMap.set(date, current + (answer.time_spent || 0))
    }
  })
  
  let quizAnswersTotal = 0
  Array.from(dateMap.entries()).sort().forEach(([date, timeSpent]) => {
    quizAnswersTotal += timeSpent
    console.log(`- ${date}: ${timeSpent}秒`)
    
    // daily_xp_recordsと比較
    const dailyRecord = dailyRecords?.find(r => r.date === date)
    if (dailyRecord) {
      const diff = timeSpent - (dailyRecord.quiz_time_seconds || 0)
      if (diff !== 0) {
        console.log(`  ⚠️ daily_xp_records(${dailyRecord.quiz_time_seconds}秒)と${diff}秒の差異`)
      }
    } else {
      console.log(`  ❌ daily_xp_recordsに${date}のレコードが存在しない`)
    }
  })
  
  console.log(`📊 quiz_answers日別集計総計: ${quizAnswersTotal}秒`)
  
  // 5. 差異の詳細分析
  console.log('\n🔍 差異分析:')
  const userStatsTime = userStats?.quiz_learning_time_seconds || 0
  const dailyRecordsTime = dailyQuizTotal
  const quizAnswersTime = realQuizTotal
  
  console.log(`- user_xp_stats_v2: ${userStatsTime}秒`)
  console.log(`- daily_xp_records合計: ${dailyRecordsTime}秒`)
  console.log(`- quiz_answers実測: ${quizAnswersTime}秒`)
  console.log(`- user_stats vs daily: ${userStatsTime - dailyRecordsTime}秒差`)
  console.log(`- user_stats vs quiz_answers: ${userStatsTime - quizAnswersTime}秒差`)
  
  // 6. daily_xp_recordsに記録されていない日付を特定
  console.log('\n❌ daily_xp_recordsに記録されていない日付:')
  const dailyDates = new Set(dailyRecords?.map(r => r.date) || [])
  const quizDates = new Set(Array.from(dateMap.keys()))
  
  let missingTime = 0
  quizDates.forEach(date => {
    if (!dailyDates.has(date)) {
      const timeSpent = dateMap.get(date) || 0
      missingTime += timeSpent
      console.log(`- ${date}: ${timeSpent}秒 (daily_xp_recordsに記録なし)`)
    }
  })
  
  console.log(`📊 未記録時間合計: ${missingTime}秒`)
  
  // 7. session_type別確認
  console.log('\n🔍 session_type別確認:')
  const { data: allAnswers } = await supabaseAdmin
    .from('quiz_answers')
    .select('time_spent, session_type')
    
  const bySessionType = new Map<string, number>()
  allAnswers?.forEach(answer => {
    const type = answer.session_type || 'unknown'
    const current = bySessionType.get(type) || 0
    bySessionType.set(type, current + (answer.time_spent || 0))
  })
  
  Array.from(bySessionType.entries()).forEach(([type, time]) => {
    console.log(`- ${type}: ${time}秒`)
  })
  
  // 8. 結論
  console.log('\n📋 調査結論:')
  if (missingTime === (userStatsTime - dailyRecordsTime)) {
    console.log('✅ 差異の原因特定: daily_xp_recordsの記録漏れ')
  } else {
    console.log('⚠️ 差異の原因が複雑: 追加調査が必要')
  }
}

// スクリプト実行
if (require.main === module) {
  investigateTimeDiscrepancy()
    .then(() => {
      console.log('\n✅ 時間差異調査完了')
    })
    .catch(error => {
      console.error('❌ 調査エラー:', error)
      process.exit(1)
    })
}