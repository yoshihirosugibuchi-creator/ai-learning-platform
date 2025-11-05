import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { getUserReviewSettings, shouldShowReviewNotification } from '@/lib/user-review-settings'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * ユーザーの復習統計情報を取得
 * GET /api/review/stats
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    console.log(`📊 Fetching review stats for user: ${userId}`)

    // 並列で各統計を取得（事前セットベース）
    const [
      totalReviewNeeded,
      reviewSettings,
      todayReviewCount,
      reviewEffectiveness
    ] = await Promise.all([
      getReviewQuestionsCountFromPrecomputedSets(userId),
      getUserReviewSettings(userId),
      getTodayReviewCompletedCount(userId),
      calculateReviewEffectiveness(userId)
    ])

    // 最後の復習日を取得
    const lastReviewDate = await getLastReviewDate(userId)

    // 復習通知判定
    const shouldNotify = await shouldShowReviewNotification(userId, lastReviewDate || undefined)

    const stats = {
      totalReviewNeeded,
      todayCompleted: todayReviewCount,
      reviewSettings,
      reviewEffectiveness,
      lastReviewDate: lastReviewDate?.toISOString() || null,
      shouldShowNotification: shouldNotify,
      lastCalculated: new Date().toISOString()
    }

    console.log(`✅ Review stats calculated for user ${userId}:`, {
      totalReviewNeeded,
      todayCompleted: todayReviewCount,
      shouldNotify,
      effectivenessImprovement: reviewEffectiveness.improvement
    })

    return NextResponse.json(stats)

  } catch (error) {
    console.error('❌ Error in review stats API:', error)
    return NextResponse.json(
      { error: '復習統計の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 今日の復習完了数を取得（問題数ベース）
 */
async function getTodayReviewCompletedCount(userId: string): Promise<number> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 今日復習した問題数をカウント（reviewed_at ベース）
    const { data, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id')
      .eq('user_id', userId)
      .not('reviewed_at', 'is', null)  // 復習済み
      .gte('reviewed_at', today.toISOString())
      .lt('reviewed_at', tomorrow.toISOString())

    if (error) {
      console.error('❌ Error fetching today review count:', error)
      return 0
    }

    return data?.length || 0

  } catch (error) {
    console.error('❌ Error in getTodayReviewCompletedCount:', error)
    return 0
  }
}

/**
 * 最後の復習日を取得（問題ベース）
 */
async function getLastReviewDate(userId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('reviewed_at')
      .eq('user_id', userId)
      .not('reviewed_at', 'is', null)  // 復習済み
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data.reviewed_at ? new Date(data.reviewed_at) : null

  } catch (error) {
    console.error('❌ Error in getLastReviewDate:', error)
    return null
  }
}

/**
 * 復習効果分析（問題ベース）
 */
async function calculateReviewEffectiveness(userId: string): Promise<{
  beforeAccuracy: number
  afterAccuracy: number
  improvement: number
  sampleSize: number
}> {
  try {
    // 直近30日以内の復習済み問題を取得
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: reviewedAnswers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, is_correct, reviewed_at, created_at')
      .eq('user_id', userId)
      .not('reviewed_at', 'is', null)  // 復習済み
      .gte('reviewed_at', thirtyDaysAgo)
      .order('reviewed_at', { ascending: false })
      .limit(50) // 直近50問

    if (error || !reviewedAnswers || reviewedAnswers.length === 0) {
      return {
        beforeAccuracy: 0,
        afterAccuracy: 0,
        improvement: 0,
        sampleSize: 0
      }
    }

    let totalBeforeCorrect = 0
    let totalBeforeQuestions = 0
    let totalAfterCorrect = 0
    let totalAfterQuestions = 0

    for (const reviewAnswer of reviewedAnswers) {
      // 復習後の結果
      totalAfterQuestions++
      if (reviewAnswer.is_correct) {
        totalAfterCorrect++
      }

      // 同じ問題の復習前の結果を取得
      const { data: beforeAnswers } = await supabaseAdmin
        .from('quiz_answers')
        .select('is_correct')
        .eq('user_id', userId)
        .eq('question_id', reviewAnswer.question_id)
        .lt('created_at', reviewAnswer.reviewed_at) // 復習前
        .order('created_at', { ascending: false })
        .limit(1) // 直近1回

      if (beforeAnswers && beforeAnswers.length > 0) {
        totalBeforeQuestions++
        if (beforeAnswers[0].is_correct) {
          totalBeforeCorrect++
        }
      }
    }

    const beforeAccuracy = totalBeforeQuestions > 0 ? 
      Math.round((totalBeforeCorrect / totalBeforeQuestions) * 100) : 0
    const afterAccuracy = totalAfterQuestions > 0 ? 
      Math.round((totalAfterCorrect / totalAfterQuestions) * 100) : 0
    const improvement = afterAccuracy - beforeAccuracy

    return {
      beforeAccuracy,
      afterAccuracy,
      improvement,
      sampleSize: reviewedAnswers.length
    }

  } catch (error) {
    console.error('❌ Error in calculateReviewEffectiveness:', error)
    return {
      beforeAccuracy: 0,
      afterAccuracy: 0,
      improvement: 0,
      sampleSize: 0
    }
  }
}

/**
 * 事前セットから復習問題数を取得
 */
async function getReviewQuestionsCountFromPrecomputedSets(userId: string): Promise<number> {
  try {
    const currentTime = new Date().toISOString()
    console.log(`🔍 DEBUG: Checking precomputed sets for user ${userId} at ${currentTime}`)
    
    // まず全ての復習セットを確認（デバッグ用）
    const { data: allSets } = await supabaseAdmin
      .from('precomputed_quiz_sets')
      .select('id, user_id, quiz_type, used_at, expires_at, question_ids, created_at')
      .eq('user_id', userId)
      .eq('quiz_type', 'review')
    
    console.log(`🔍 DEBUG: Found ${allSets?.length || 0} total review sets for user:`, 
      allSets?.map(set => ({
        id: set.id,
        used_at: set.used_at,
        expires_at: set.expires_at,
        expired: (set.expires_at || '') <= currentTime,
        question_count: set.question_ids?.length || 0,
        created_at: set.created_at
      }))
    )

    // 🚀 FIXED: used_atを無視してデータ存在のみで復習判定
    const { data: precomputedSets } = await supabaseAdmin
      .from('precomputed_quiz_sets')
      .select('question_ids')
      .eq('user_id', userId)
      .eq('quiz_type', 'review')
      // .is('used_at', null)  ← 削除: 使用済みでも復習対象として判定
      .gt('expires_at', currentTime)

    console.log(`🔍 DEBUG: Found ${precomputedSets?.length || 0} valid (non-expired) review sets - used_at ignored for stats`)

    if (!precomputedSets || precomputedSets.length === 0) {
      console.log(`📊 No valid review precomputed sets found for user: ${userId}`)
      
      // 期限切れだが未使用のセットがあるかチェック
      const { data: expiredSets } = await supabaseAdmin
        .from('precomputed_quiz_sets')
        .select('question_ids, expires_at')
        .eq('user_id', userId)
        .eq('quiz_type', 'review')
        .is('used_at', null)
        .lte('expires_at', currentTime)
      
      if (expiredSets && expiredSets.length > 0) {
        console.log(`⚠️ DEBUG: Found ${expiredSets.length} expired but unused review sets`)
      }
      
      return 0
    }

    // 全ての事前セットの問題数を合計
    const totalQuestions = precomputedSets.reduce((total, set) => {
      return total + (set.question_ids?.length || 0)
    }, 0)

    console.log(`📊 Found ${totalQuestions} review questions in ${precomputedSets.length} precomputed sets`)
    return totalQuestions

  } catch (error) {
    console.error('❌ Error getting review questions count from precomputed sets:', error)
    return 0
  }
}