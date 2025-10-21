import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings } from '@/lib/xp-settings'

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

/**
 * 継続学習ボーナスSKP計算・付与API
 * 
 * ユーザーの学習継続日数を計算し、継続ボーナスSKPを付与します。
 * - 毎日継続: 10SKP/日
 * - 10日毎追加ボーナス: 100SKP
 */
export async function POST(request: Request) {
  try {
    console.log('🔥 SKP Streak Bonus API Request')

    // 認証付きSupabaseクライアント作成
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = user.id
    console.log('👤 Authenticated user:', userId.substring(0, 8) + '...')

    // XP設定を取得
    const xpSettings = await loadXPSettings(supabase)

    // 1. 最新の学習継続日数を計算
    const today = new Date()

    // 過去90日間の活動記録を取得（継続日数計算用）
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: activityRecords, error: activityError } = await supabase
      .from('daily_xp_records')
      .select('date, quiz_sessions, course_sessions')
      .eq('user_id', userId)
      .gte('date', ninetyDaysAgo)
      .order('date', { ascending: false })

    if (activityError) {
      throw new Error(`Activity records error: ${activityError.message}`)
    }

    // 2. 継続日数を計算
    let currentStreak = 0
    if (activityRecords && activityRecords.length > 0) {
      const sortedRecords = activityRecords.sort((a, b) => b.date.localeCompare(a.date))
      
      // 今日から逆算して継続日数を計算
      const checkDate = new Date(today)
      for (const record of sortedRecords) {
        const checkDateString = checkDate.getFullYear() + '-' + 
          String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(checkDate.getDate()).padStart(2, '0')
        
        if (record.date === checkDateString && (record.quiz_sessions > 0 || record.course_sessions > 0)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    }

    console.log(`📅 Current learning streak: ${currentStreak} days`)

    // 3. 既に付与された継続ボーナスを確認
    const { data: existingStreakTransactions, error: streakTransactionError } = await supabase
      .from('skp_transactions')
      .select('amount, description')
      .eq('user_id', userId)
      .eq('type', 'earned')
      .like('source', 'streak_%')
      .order('created_at', { ascending: false })

    if (streakTransactionError) {
      console.warn('⚠️ Streak transaction check error:', streakTransactionError)
    }

    const totalStreakBonusAlreadyPaid = existingStreakTransactions?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0
    
    // 4. 新しく付与すべきボーナスを計算
    let newStreakBonus = 0
    let newTenDayBonuses = 0
    
    if (currentStreak > 0) {
      // 毎日継続ボーナス: 10SKP/日
      const dailyStreakBonus = currentStreak * xpSettings.skp.daily_streak_bonus
      
      // 10日毎追加ボーナス: 100SKP
      const tenDayBonusCount = Math.floor(currentStreak / 10)
      const tenDayBonus = tenDayBonusCount * xpSettings.skp.ten_day_streak_bonus
      
      const totalStreakBonusShould = dailyStreakBonus + tenDayBonus
      newStreakBonus = Math.max(0, totalStreakBonusShould - totalStreakBonusAlreadyPaid)
      newTenDayBonuses = tenDayBonusCount
      
      console.log(`📊 Streak bonus calculation:`, {
        currentStreak,
        dailyStreakBonus,
        tenDayBonusCount,
        tenDayBonus,
        totalStreakBonusShould,
        totalStreakBonusAlreadyPaid,
        newStreakBonus
      })
    }

    // 5. 新しいボーナスがある場合のみ付与
    if (newStreakBonus > 0) {
      // ユーザー統計を更新
      const { data: currentStats } = await supabase
        .from('user_xp_stats_v2')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (currentStats) {
        const newTotalSKP = (currentStats.total_skp || 0) + newStreakBonus

        const { error: statsUpdateError } = await supabase
          .from('user_xp_stats_v2')
          .update({
            total_skp: newTotalSKP,
            streak_skp: (currentStats.streak_skp || 0) + newStreakBonus,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (statsUpdateError) {
          throw new Error(`Stats update error: ${statsUpdateError.message}`)
        }

        // SKP取引記録を追加
        const { error: transactionError } = await supabase
          .from('skp_transactions')
          .insert({
            user_id: userId,
            type: 'earned',
            amount: newStreakBonus,
            source: `streak_${currentStreak}days`,
            description: `学習継続ボーナス: ${currentStreak}日連続${newTenDayBonuses > 0 ? ` (10日ボーナス${newTenDayBonuses}回含む)` : ''}`,
            created_at: new Date().toISOString()
          })

        if (transactionError) {
          console.warn('⚠️ Streak SKP transaction recording error:', transactionError)
        } else {
          console.log('💰 Streak SKP transaction recorded:', {
            amount: newStreakBonus,
            streak: currentStreak,
            source: `streak_${currentStreak}days`
          })
        }

        console.log(`✅ Streak bonus awarded: ${newStreakBonus} SKP for ${currentStreak} days streak`)

        return NextResponse.json({
          success: true,
          streak_days: currentStreak,
          bonus_skp: newStreakBonus,
          total_skp: newTotalSKP,
          ten_day_bonuses: newTenDayBonuses,
          message: `Streak bonus awarded! ${newStreakBonus} SKP for ${currentStreak} consecutive days`
        })
      } else {
        throw new Error('User stats not found')
      }
    } else {
      console.log(`ℹ️ No new streak bonus needed. Current streak: ${currentStreak} days`)
      
      return NextResponse.json({
        success: true,
        streak_days: currentStreak,
        bonus_skp: 0,
        ten_day_bonuses: newTenDayBonuses,
        message: currentStreak > 0 
          ? `Current streak: ${currentStreak} days (bonus already awarded)`
          : 'No current learning streak'
      })
    }

  } catch (error) {
    console.error('❌ SKP Streak Bonus API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process streak bonus',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}