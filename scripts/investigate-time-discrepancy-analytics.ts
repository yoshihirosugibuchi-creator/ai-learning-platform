#!/usr/bin/env tsx

import { config } from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database-types-official'

config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)

// 型エイリアス
type UserXPStats = Database['public']['Tables']['user_xp_stats_v2']['Row']
type DailyXPRecord = Database['public']['Tables']['daily_xp_records']['Row']

const TARGET_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

async function investigateTimeDiscrepancy() {
  console.log('🔍 学習分析の時間データ差異調査開始...')
  console.log(`👤 対象ユーザー: ${TARGET_USER_ID}`)
  
  // 1. user_xp_stats_v2の総学習時間
  const { data: userStats } = await supabaseAdmin
    .from('user_xp_stats_v2')
    .select('quiz_learning_time_seconds, course_learning_time_seconds')
    .eq('user_id', TARGET_USER_ID)
    .single()
  
  const typedUserStats = userStats as UserXPStats | null
  const totalTimeFromStats = (typedUserStats?.quiz_learning_time_seconds || 0) + (typedUserStats?.course_learning_time_seconds || 0)
  console.log('\n📊 user_xp_stats_v2からの総学習時間:')
  console.log(`  クイズ時間: ${typedUserStats?.quiz_learning_time_seconds || 0}秒`)
  console.log(`  コース時間: ${typedUserStats?.course_learning_time_seconds || 0}秒`)
  console.log(`  合計: ${totalTimeFromStats}秒 (${Math.round(totalTimeFromStats / 60)}分)`)
  
  // 2. overview APIの計算ロジック (30日間)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  
  const { data: quizSessions } = await supabaseAdmin
    .from('quiz_sessions')
    .select('session_start_time, session_end_time')
    .eq('user_id', TARGET_USER_ID)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
  
  const { data: courseCompletions } = await supabaseAdmin
    .from('course_session_completions')
    .select('*')
    .eq('user_id', TARGET_USER_ID)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })
  
  console.log('\n📈 過去30日間のセッション数:')
  console.log(`  クイズセッション: ${quizSessions?.length || 0}件`)
  console.log(`  コース完了: ${courseCompletions?.length || 0}件`)
  
  // Overview APIの計算ロジックを再現
  const totalStudyTimeMinutes = (quizSessions || []).reduce((total, session) => {
    if (session.session_start_time && session.session_end_time) {
      const duration = (new Date(session.session_end_time).getTime() - new Date(session.session_start_time).getTime()) / (1000 * 60)
      console.log(`    セッション継続時間: ${Math.round(duration)}分`)
      return total + duration
    }
    console.log(`    デフォルト継続時間: 15分 (開始・終了時刻なし)`)
    return total + 15 // Default quiz session duration
  }, 0) + (courseCompletions || []).reduce((total, _completion) => {
    console.log(`    コース推定時間: 10分`)
    return total + 10
  }, 0)
  
  console.log('\n🎯 overview APIの計算結果:')
  console.log(`  過去30日間の総学習時間: ${Math.round(totalStudyTimeMinutes)}分 (${Math.round(totalStudyTimeMinutes * 60)}秒)`)
  
  // 3. 全期間のクイズセッション確認
  const { data: allQuizSessions } = await supabaseAdmin
    .from('quiz_sessions')
    .select('session_start_time, session_end_time, created_at')
    .eq('user_id', TARGET_USER_ID)
    .order('created_at', { ascending: false })
  
  console.log('\n📚 全期間のクイズセッション分析:')
  console.log(`  全クイズセッション数: ${allQuizSessions?.length || 0}件`)
  
  let totalCalculatedTime = 0
  let sessionsWithTime = 0
  let sessionsWithoutTime = 0
  
  if (allQuizSessions) {
    allQuizSessions.forEach((session, index) => {
    if (session.session_start_time && session.session_end_time) {
      const duration = (new Date(session.session_end_time).getTime() - new Date(session.session_start_time).getTime()) / 1000
      totalCalculatedTime += duration
      sessionsWithTime++
      if (index < 5) {
        console.log(`    [${index + 1}] ${Math.round(duration)}秒 (${session.created_at})`)
      }
    } else {
      sessionsWithoutTime++
      if (index < 5 && !session.session_end_time) {
        console.log(`    [${index + 1}] 時間データなし (${session.created_at})`)
      }
    }
    })
  }
  
  console.log(`  時間データありセッション: ${sessionsWithTime}件`)
  console.log(`  時間データなしセッション: ${sessionsWithoutTime}件`)
  console.log(`  全セッション推定総時間: ${totalCalculatedTime + (sessionsWithoutTime * 15 * 60)}秒`)
  
  // 4. daily_xp_records確認
  const { data: dailyRecords } = await supabaseAdmin
    .from('daily_xp_records')
    .select('date, quiz_time_seconds, course_time_seconds')
    .eq('user_id', TARGET_USER_ID)
    .order('date', { ascending: false })
  
  const totalFromDaily = (dailyRecords || []).reduce((total, record) => {
    return total + (record.quiz_time_seconds || 0) + (record.course_time_seconds || 0)
  }, 0)
  
  console.log('\n📅 daily_xp_recordsからの総時間:')
  console.log(`  記録日数: ${dailyRecords?.length || 0}日`)
  console.log(`  総学習時間: ${totalFromDaily}秒 (${Math.round(totalFromDaily / 60)}分)`)
  
  // 5. 差異の分析
  console.log('\n🔍 時間データ比較分析:')
  console.log(`  user_xp_stats_v2: ${totalTimeFromStats}秒`)
  console.log(`  daily_xp_records合計: ${totalFromDaily}秒`)
  console.log(`  過去30日API計算: ${Math.round(totalStudyTimeMinutes * 60)}秒`)
  console.log(`  全期間推定計算: ${totalCalculatedTime + (sessionsWithoutTime * 15 * 60)}秒`)
  
  const diff1 = totalTimeFromStats - totalFromDaily
  const diff2 = totalTimeFromStats - Math.round(totalStudyTimeMinutes * 60)
  
  console.log('\n📊 差異:')
  console.log(`  user_xp_stats_v2 vs daily_xp_records: ${diff1}秒 (${Math.round(diff1 / 60)}分)`)
  console.log(`  user_xp_stats_v2 vs 30日API: ${diff2}秒 (${Math.round(diff2 / 60)}分)`)
  
  // 6. 問題の特定
  console.log('\n💡 問題の可能性:')
  if (Math.abs(diff2) > 60) {
    console.log('  - 総学習時間は全期間、週間パフォーマンスは30日間の可能性')
    console.log('  - データ取得期間の違いによる差異')
  }
  if (sessionsWithoutTime > 0) {
    console.log(`  - ${sessionsWithoutTime}件のセッションに正確な時間データなし`)
    console.log('  - デフォルト15分での推定が影響している可能性')
  }
  if (Math.abs(diff1) > 60) {
    console.log('  - user_xp_stats_v2とdaily_xp_recordsの同期問題')
  }
}

investigateTimeDiscrepancy().catch(console.error)