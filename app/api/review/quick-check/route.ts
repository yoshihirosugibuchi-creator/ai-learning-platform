import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 高速復習チェックAPI - 高速判定
 * GET /api/review/quick-check
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

    console.log(`⚡ Quick review check for user: ${userId}`)

    // URLパラメータからリトライ回数を取得
    const searchParams = request.nextUrl.searchParams
    const retryCount = parseInt(searchParams.get('retry') || '0')
    const maxRetries = 3
    
    // 復習設定を取得
    const reviewSettings = await getUserReviewSettingsAdmin(userId)
    
    // 高速復習チェック
    const reviewData = await getReviewQuickStatus(userId, retryCount, maxRetries, reviewSettings)
    
    return NextResponse.json(reviewData)

  } catch (error) {
    console.error('❌ Error in quick review check:', error)
    return NextResponse.json(
      { error: '復習チェックに失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * 高速復習チェック + リトライ機能
 */
async function getReviewQuickStatus(
  userId: string, 
  retryCount: number = 0, 
  maxRetries: number = 3,
  reviewSettings: { reviewQuestionsCount: number } = { reviewQuestionsCount: 10 }
): Promise<{
  hasReviewQuestions: boolean
  totalQuestions: number
  availableSets: number
  displayText: string
  isGenerating?: boolean
  retryAfterMs?: number
  retryCount: number
  debugInfo: {
    error?: string
    message?: string
    hasRecentTargets?: boolean
    reviewQuestionsPerSession?: number
    sets?: Array<{
      id: string
      questionCount: number
      created: string | null
      expires: string | null
      used: string | null
    }>
  }
}> {
  const currentTime = new Date().toISOString()
  
  // 復習セットを確認
  const { data: precomputedSets, error } = await supabaseAdmin
    .from('precomputed_quiz_sets')
    .select('id, question_ids, created_at, expires_at, used_at')
    .eq('user_id', userId)
    .eq('quiz_type', 'review')
    .gt('expires_at', currentTime)

  console.log(`🔍 [QuickCheck] Found ${precomputedSets?.length || 0} valid review sets for user ${userId}`)

  if (error) {
    console.error('❌ Error checking precomputed sets:', error)
    return {
      hasReviewQuestions: false,
      totalQuestions: 0,
      availableSets: 0,
      displayText: '0問',
      retryCount,
      debugInfo: { error: error.message }
    }
  }

  // 復習セットが存在する場合 - 即座に結果返却
  if (precomputedSets && precomputedSets.length > 0) {
    const totalQuestions = precomputedSets.reduce((total, set) => {
      return total + (set.question_ids?.length || 0)
    }, 0)

    // 復習設定に基づいた表示テキストを生成
    const questionsPerSession = reviewSettings.reviewQuestionsCount
    const possibleSessions = Math.floor(totalQuestions / questionsPerSession)
    
    let displayText: string
    if (possibleSessions >= 2) {
      // 設定問題数の2倍以上あれば「X問以上」表示
      const minQuestions = possibleSessions * questionsPerSession
      displayText = `${minQuestions}問以上`
    } else {
      // 設定問題数未満または1回分のみの場合は実際の問題数
      displayText = `${totalQuestions}問`
    }

    console.log(`✅ [QuickCheck] Found ${totalQuestions} review questions in ${precomputedSets.length} sets (${questionsPerSession} per session) -> Display: ${displayText}`)
    
    return {
      hasReviewQuestions: totalQuestions > 0,
      totalQuestions,
      availableSets: precomputedSets.length,
      displayText,
      retryCount,
      debugInfo: {
        reviewQuestionsPerSession: questionsPerSession,
        sets: precomputedSets.map(set => ({
          id: set.id,
          questionCount: set.question_ids?.length || 0,
          created: set.created_at,
          expires: set.expires_at,
          used: set.used_at
        }))
      }
    }
  }

  // 復習セットが存在しない場合のリトライ判定
  if (retryCount < maxRetries) {
    console.log(`🔄 [QuickCheck] No sets found, checking if generation is needed (retry ${retryCount + 1}/${maxRetries})`)
    
    // 最近生成された復習対象問題があるかチェック
    const hasRecentReviewTargets = await checkRecentReviewTargets(userId)
    
    if (hasRecentReviewTargets) {
      // 生成中の可能性があるのでリトライを提案
      const retryDelayMs = Math.min(2000 * Math.pow(2, retryCount), 10000) // 指数バックオフ（最大10秒）
      
      console.log(`⏳ [QuickCheck] Review targets exist but no precomputed sets - suggesting retry in ${retryDelayMs}ms`)
      
      return {
        hasReviewQuestions: false,
        totalQuestions: 0,
        availableSets: 0,
        displayText: '準備中...',
        isGenerating: true,
        retryAfterMs: retryDelayMs,
        retryCount,
        debugInfo: {
          message: 'Review targets exist, sets may be generating',
          hasRecentTargets: hasRecentReviewTargets
        }
      }
    }
  }

  // 復習対象なし
  console.log(`📊 [QuickCheck] No review questions available for user ${userId}`)
  return {
    hasReviewQuestions: false,
    totalQuestions: 0,
    availableSets: 0,
    displayText: '0問',
    retryCount,
    debugInfo: {
      message: 'No review targets or precomputed sets found'
    }
  }
}

/**
 * 最近の復習対象問題の存在をチェック（軽量版）
 */
async function checkRecentReviewTargets(userId: string): Promise<boolean> {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    
    // 軽量チェック：review_needed=trueで3日以上古い未復習問題の存在確認
    const { data, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id')
      .eq('user_id', userId)
      .eq('review_needed', true)
      .is('reviewed_at', null)
      .lt('created_at', threeDaysAgo)
      .limit(1) // 1件でも存在すればOK

    if (error) {
      console.error('❌ Error checking recent review targets:', error)
      return false
    }

    const hasTargets = data && data.length > 0
    console.log(`🎯 [QuickCheck] Recent review targets check: ${hasTargets ? 'Found' : 'None'}`)
    
    return hasTargets

  } catch (error) {
    console.error('❌ Error in checkRecentReviewTargets:', error)
    return false
  }
}

/**
 * サーバーサイド用復習設定取得
 */
async function getUserReviewSettingsAdmin(userId: string): Promise<{ reviewQuestionsCount: number }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('review_settings')
      .select('review_questions_count')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching review settings:', error)
      return { reviewQuestionsCount: 10 } // デフォルト値
    }

    return {
      reviewQuestionsCount: data?.review_questions_count || 10
    }

  } catch (error) {
    console.error('❌ Error in getUserReviewSettingsAdmin:', error)
    return { reviewQuestionsCount: 10 } // デフォルト値
  }
}