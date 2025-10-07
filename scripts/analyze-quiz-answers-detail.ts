/**
 * quiz_answersテーブルの詳細分析
 * time_spent異常値の原因調査
 */

// 環境変数を明示的に読み込み
import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

const TEST_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

async function analyzeQuizAnswersDetail() {
  console.log('🔍 quiz_answersテーブル詳細分析開始...')
  console.log(`👤 対象ユーザー: ${TEST_USER_ID}`)
  
  // 1. 基本統計
  const { data: allAnswers, error: allError } = await supabaseAdmin
    .from('quiz_answers')
    .select('*')
    .gte('created_at', '2025-09-01') // 最近2ヶ月
    .order('created_at', { ascending: false })
    .limit(200)

  if (allError) {
    console.error('❌ quiz_answers取得エラー:', allError)
    return
  }

  console.log(`📊 総回答数: ${allAnswers?.length || 0}件`)

  // 2. time_spent分析
  const timeSpentValues = allAnswers?.map(a => a.time_spent).filter(t => t !== null) || []
  const totalTimeSpent = timeSpentValues.reduce((sum, t) => sum + t, 0)
  const averageTimeSpent = timeSpentValues.length > 0 ? totalTimeSpent / timeSpentValues.length : 0
  const maxTimeSpent = Math.max(...timeSpentValues)
  const minTimeSpent = Math.min(...timeSpentValues)

  console.log('\n📊 time_spent統計:')
  console.log(`- 総時間: ${totalTimeSpent}秒 (${Math.round(totalTimeSpent/60)}分)`)
  console.log(`- 平均時間: ${averageTimeSpent.toFixed(1)}秒/問`)
  console.log(`- 最大時間: ${maxTimeSpent}秒`)
  console.log(`- 最小時間: ${minTimeSpent}秒`)

  // 3. 異常値検出
  const sortedTimes = [...timeSpentValues].sort((a, b) => a - b)
  const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
  const q1 = sortedTimes[Math.floor(sortedTimes.length * 0.25)]
  const q3 = sortedTimes[Math.floor(sortedTimes.length * 0.75)]
  const iqr = q3 - q1
  const outlierThreshold = q3 + 1.5 * iqr

  const outliers = allAnswers?.filter(a => a.time_spent > outlierThreshold) || []

  console.log('\n🚨 異常値分析:')
  console.log(`- 中央値: ${median}秒`)
  console.log(`- Q1: ${q1}秒, Q3: ${q3}秒`)
  console.log(`- IQR: ${iqr}秒`)
  console.log(`- 異常値閾値: ${outlierThreshold}秒`)
  console.log(`- 異常値件数: ${outliers.length}件`)

  if (outliers.length > 0) {
    console.log('\n🔍 異常値詳細 (上位10件):')
    outliers
      .sort((a, b) => b.time_spent - a.time_spent)
      .slice(0, 10)
      .forEach((answer, index) => {
        console.log(`${index + 1}. ${answer.time_spent}秒 - ${answer.created_at} - Q${answer.question_id}`)
      })
  }

  // 4. セッション別分析
  const sessionTimeAnalysis = await analyzeBySession()
  
  console.log('\n📊 セッション別時間分析:')
  sessionTimeAnalysis.forEach(session => {
    console.log(`- セッション ${session.sessionId.substring(0, 8)}...: ${session.totalTime}秒 (${session.questionCount}問)`)
  })

  // 5. 時系列分析
  console.log('\n📅 時系列分析:')
  const dailyStats = analyzeDailyPattern(allAnswers || [])
  Object.entries(dailyStats).forEach(([date, stats]) => {
    console.log(`- ${date}: ${stats.totalTime}秒 (${stats.count}問, 平均${stats.avgTime.toFixed(1)}秒/問)`)
  })

  // 6. 推定vs実測比較
  await compareWithSessionTimes()
}

async function analyzeBySession() {
  const { data: sessions, error } = await supabaseAdmin
    .from('quiz_answers')
    .select('quiz_session_id, time_spent')
    .not('quiz_session_id', 'is', null)
    .gte('created_at', '2025-09-01')

  if (error) {
    console.error('セッション分析エラー:', error)
    return []
  }

  const sessionMap = new Map()
  sessions?.forEach(answer => {
    const sessionId = answer.quiz_session_id
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, { totalTime: 0, questionCount: 0 })
    }
    const session = sessionMap.get(sessionId)
    session.totalTime += answer.time_spent || 0
    session.questionCount += 1
  })

  return Array.from(sessionMap.entries()).map(([sessionId, data]) => ({
    sessionId,
    totalTime: data.totalTime,
    questionCount: data.questionCount,
    avgTime: data.totalTime / data.questionCount
  })).sort((a, b) => b.totalTime - a.totalTime)
}

function analyzeDailyPattern(answers: any[]) {
  const dailyMap = new Map()
  
  answers.forEach(answer => {
    const date = answer.created_at?.split('T')[0] // YYYY-MM-DD
    if (!date) return
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { totalTime: 0, count: 0 })
    }
    
    const day = dailyMap.get(date)
    day.totalTime += answer.time_spent || 0
    day.count += 1
  })

  const result: Record<string, any> = {}
  dailyMap.forEach((stats, date) => {
    result[date] = {
      ...stats,
      avgTime: stats.totalTime / stats.count
    }
  })

  return result
}

async function compareWithSessionTimes() {
  console.log('\n🔍 quiz_answersとquiz_sessionsの時間比較...')
  
  // quiz_sessionsから実測時間を取得
  const { data: sessions, error: sessionError } = await supabaseAdmin
    .from('quiz_sessions')
    .select('id, session_start_time, session_end_time')
    .eq('user_id', TEST_USER_ID)
    .not('session_start_time', 'is', null)
    .not('session_end_time', 'is', null)

  if (sessionError) {
    console.error('セッション取得エラー:', sessionError)
    return
  }

  for (const session of sessions || []) {
    const startTime = new Date(session.session_start_time).getTime()
    const endTime = session.session_end_time ? new Date(session.session_end_time).getTime() : Date.now()
    const actualDuration = Math.round((endTime - startTime) / 1000)

    // 対応するquiz_answersの合計時間を取得
    const { data: answers, error: answerError } = await supabaseAdmin
      .from('quiz_answers')
      .select('time_spent')
      .eq('quiz_session_id', session.id)

    if (answerError) continue

    const answerTotalTime = answers?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0

    console.log(`セッション ${session.id.substring(0, 8)}...`)
    console.log(`  実測時間: ${actualDuration}秒`)
    console.log(`  回答時間合計: ${answerTotalTime}秒`)
    console.log(`  差異: ${answerTotalTime - actualDuration}秒`)
    console.log(`  比率: ${answerTotalTime > 0 ? (answerTotalTime / actualDuration).toFixed(2) + 'x' : 'N/A'}`)
  }
}

// スクリプト実行
if (require.main === module) {
  analyzeQuizAnswersDetail()
    .then(() => {
      console.log('\n✅ quiz_answers詳細分析完了')
    })
    .catch(error => {
      console.error('❌ 分析実行エラー:', error)
      process.exit(1)
    })
}