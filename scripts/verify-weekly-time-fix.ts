#!/usr/bin/env tsx
// 週間時間重複修正の検証スクリプト

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// 週境界計算関数（修正前のロジックを再現）
function getWeekBounds(now: Date, weeksAgo: number): { monday: Date; sunday: Date } {
  const today = new Date(now)
  const currentDay = today.getDay()
  const mondayOffset = currentDay === 0 ? -6 : -(currentDay - 1)
  
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset - (weeksAgo * 7))
  monday.setHours(0, 0, 0, 0)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  
  return { monday, sunday }
}

async function verifyWeeklyTimeFix(userId?: string) {
  console.log('🔍 週間時間重複修正検証スクリプト')
  
  // ユーザーID取得（引数で指定されていない場合）
  if (!userId) {
    const { data: users } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id')
      .gt('total_learning_time_seconds', 0)
      .limit(1)
    
    if (!users?.length) {
      console.log('❌ アクティブユーザーが見つかりません')
      return
    }
    
    userId = users[0].user_id
  }
  
  console.log(`👤 検証対象ユーザー: ${userId?.substring(0, 8)}...`)
  
  // 全daily_xp_recordsを取得
  const { data: allRecords } = await supabase
    .from('daily_xp_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  
  if (!allRecords?.length) {
    console.log('❌ daily_xp_recordsが見つかりません')
    return
  }
  
  console.log(`📊 全daily_xp_records: ${allRecords.length}件`)
  
  // 全レコードの合計時間
  const totalActualTime = allRecords.reduce((sum, r) => sum + (r.total_time_seconds || 0), 0)
  console.log(`⏱️ 実際の合計時間: ${Math.round(totalActualTime / 60)}分 (${totalActualTime}秒)`)
  
  const now = new Date()
  
  // 修正前ロジックでの計算（重複あり）
  console.log('\n📊 修正前ロジック（重複あり）での計算:')
  let oldTotalTime = 0
  
  for (let i = 0; i < 4; i++) {
    const { monday, sunday } = getWeekBounds(now, i)
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]
    
    // 修正前のクエリロジック
    const weekRecords = allRecords.filter(r => {
      const recordDate = r.date
      if (i === 0) {
        // 今週：日曜日まで含む
        return recordDate >= mondayStr && recordDate <= sundayStr
      } else {
        // 先週以降：次週の月曜日未満（重複原因）
        const nextMondayStr = getWeekBounds(now, i - 1).monday.toISOString().split('T')[0]
        return recordDate >= mondayStr && recordDate < nextMondayStr
      }
    })
    
    const weekTime = weekRecords.reduce((sum, r) => sum + (r.total_time_seconds || 0), 0)
    oldTotalTime += weekTime
    
    console.log(`  Week ${i + 1} (${mondayStr} - ${sundayStr}): ${Math.round(weekTime / 60)}分`)
    console.log(`    Records: ${weekRecords.map(r => r.date).join(', ')}`)
  }
  
  console.log(`  修正前合計: ${Math.round(oldTotalTime / 60)}分`)
  
  // 修正後ロジックでの計算（重複なし）
  console.log('\n📊 修正後ロジック（重複なし）での計算:')
  let newTotalTime = 0
  
  for (let i = 0; i < 4; i++) {
    const { monday, sunday } = getWeekBounds(now, i)
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]
    
    // 修正後のクエリロジック（明確な境界）
    const weekRecords = allRecords.filter(r => {
      const recordDate = r.date
      return recordDate >= mondayStr && recordDate <= sundayStr
    })
    
    const weekTime = weekRecords.reduce((sum, r) => sum + (r.total_time_seconds || 0), 0)
    newTotalTime += weekTime
    
    console.log(`  Week ${i + 1} (${mondayStr} - ${sundayStr}): ${Math.round(weekTime / 60)}分`)
    console.log(`    Records: ${weekRecords.map(r => r.date).join(', ')}`)
  }
  
  console.log(`  修正後合計: ${Math.round(newTotalTime / 60)}分`)
  
  // 結果比較
  console.log('\n🔍 検証結果:')
  console.log(`実際の合計時間:     ${Math.round(totalActualTime / 60)}分`)
  console.log(`修正前の週間合計:   ${Math.round(oldTotalTime / 60)}分 (差: ${Math.round((oldTotalTime - totalActualTime) / 60)}分)`)
  console.log(`修正後の週間合計:   ${Math.round(newTotalTime / 60)}分 (差: ${Math.round((newTotalTime - totalActualTime) / 60)}分)`)
  
  if (oldTotalTime > totalActualTime) {
    console.log('✅ 修正前は重複によりデータが過大評価されていた')
  }
  
  if (Math.abs(newTotalTime - totalActualTime) < Math.abs(oldTotalTime - totalActualTime)) {
    console.log('✅ 修正後の方が実際のデータにより近い')
  }
  
  // 重複検出
  const duplicateMinutes = Math.round((oldTotalTime - newTotalTime) / 60)
  if (duplicateMinutes > 0) {
    console.log(`🎯 重複で過大計上されていた時間: ${duplicateMinutes}分`)
  }
}

// スクリプト実行
if (require.main === module) {
  verifyWeeklyTimeFix(process.argv[2]).catch(console.error)
}

export { verifyWeeklyTimeFix }