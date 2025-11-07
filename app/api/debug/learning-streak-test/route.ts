import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 学習ストリーク計算関数のテスト用
function calculateLearningStreak(activities: Array<{date: string, quiz_sessions?: number, course_sessions?: number, total_xp_earned?: number}>): number {
  if (!activities || activities.length === 0) {
    console.log('📊 [学習ストリーク] データなし')
    return 0
  }
  
  console.log('📊 [学習ストリーク] 計算開始:', activities.length, '日分のデータ')
  
  // 今日の日付を日本時間で取得
  const today = new Date()
  const jstToday = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const currentDateStr = jstToday.getFullYear() + '-' + 
    String(jstToday.getMonth() + 1).padStart(2, '0') + '-' + 
    String(jstToday.getDate()).padStart(2, '0')
  
  console.log('📊 [学習ストリーク] 今日の日付 (JST):', currentDateStr)
  
  let streak = 0
  let consecutiveDays = 0
  
  // 今日から過去30日まで順に確認
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const checkDate = new Date(jstToday)
    checkDate.setDate(checkDate.getDate() - dayOffset)
    const checkDateStr = checkDate.getFullYear() + '-' + 
      String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(checkDate.getDate()).padStart(2, '0')
    
    // 該当日の学習記録を探す
    const dayActivity = activities.find(act => act.date === checkDateStr)
    
    // 学習活動があった日かチェック（XPが取得されていれば学習したとみなす）
    const hasLearning = dayActivity && (
      (dayActivity.quiz_sessions && dayActivity.quiz_sessions > 0) ||
      (dayActivity.course_sessions && dayActivity.course_sessions > 0) ||
      (dayActivity.total_xp_earned && dayActivity.total_xp_earned > 0)
    )
    
    console.log(`📊 [学習ストリーク] ${checkDateStr}: 学習あり=${hasLearning}, データ=${JSON.stringify(dayActivity)}`)
    
    if (hasLearning) {
      consecutiveDays++
      if (dayOffset === 0) {
        // 今日学習した場合、連続日数を継続
        streak = consecutiveDays
      } else if (dayOffset === 1 && consecutiveDays === 1) {
        // 昨日学習した場合、今日学習していなくても継続とみなす
        streak = consecutiveDays
      } else if (consecutiveDays === dayOffset + 1) {
        // 連続して学習している
        streak = consecutiveDays
      }
    } else {
      // 学習していない日
      if (dayOffset === 0) {
        // 今日学習していない場合、昨日まで遡って確認
        continue
      } else {
        // 連続学習が途切れた
        break
      }
    }
  }
  
  console.log('📊 [学習ストリーク] 計算結果:', streak, '日連続')
  return streak
}

export async function GET(_request: Request) {
  try {
    // テスト用ユーザーID
    const testUserId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07' // 4日連続学習しているユーザー

    // 最近30日の学習記録取得
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: recentActivity, error } = await supabaseAdmin
      .from('daily_xp_records')
      .select('date, quiz_sessions, course_sessions, total_xp_earned')
      .eq('user_id', testUserId)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 学習ストリーク計算
    const learningStreak = calculateLearningStreak(recentActivity || [])

    return NextResponse.json({
      success: true,
      user_id: testUserId,
      learning_streak: learningStreak,
      recent_activity: recentActivity?.slice(0, 10) || [],
      debug_info: {
        activity_count: recentActivity?.length || 0,
        today_jst: new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
      }
    })

  } catch (error) {
    console.error('Error testing learning streak:', error)
    return NextResponse.json(
      { error: 'Learning streak test failed' },
      { status: 500 }
    )
  }
}