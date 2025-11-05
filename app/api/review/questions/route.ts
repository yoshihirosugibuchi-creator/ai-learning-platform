import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Question } from '@/lib/types'
import { REVIEW_REASON_MAP } from '@/lib/review-reasons'

/**
 * 復習対象問題を取得（事前セット使用）
 * GET /api/review/questions?count=10
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

    // ユーザーの復習設定を取得（review_settingsテーブルから）
    const { data: reviewSettingsData } = await supabaseAdmin
      .from('review_settings')
      .select('review_questions_count')
      .eq('user_id', userId)
      .single()

    // URLパラメータからcountを取得（設定より優先）
    const { searchParams } = new URL(request.url)
    const requestedCount = searchParams.get('count')
    
    // 設定の問題数を使用（URLパラメータがない場合、デフォルト10）
    const defaultCount = reviewSettingsData?.review_questions_count || 10
    const count = requestedCount ? parseInt(requestedCount) : defaultCount

    // バリデーション
    if (count <= 0 || count > 100) {
      return NextResponse.json(
        { error: '問題数は1〜100の範囲で指定してください' },
        { status: 400 }
      )
    }

    const currentTime = new Date().toISOString()
    console.log(`🎯 Getting review questions from precomputed sets for user ${userId}, count: ${count} (from ${requestedCount ? 'URL parameter' : 'user settings'})`)
    console.log(`🔍 DEBUG: Current time: ${currentTime}`)

    // デバッグモードでのみ全復習セット確認（本番最適化）
    if (process.env.NODE_ENV === 'development') {
      const { data: allSets } = await supabaseAdmin
        .from('precomputed_quiz_sets')
        .select('id, user_id, quiz_type, used_at, expires_at, question_ids, created_at')
        .eq('user_id', userId)
        .eq('quiz_type', 'review')
      
      console.log(`🔍 DEBUG: Found ${allSets?.length || 0} total review sets:`, 
        allSets?.map(set => ({
          id: set.id,
          used_at: set.used_at,
          expires_at: set.expires_at,
          expired: (set.expires_at || '') <= currentTime,
          question_count: set.question_ids?.length || 0
        }))
      )
    }

    // 🚀 FIXED: 未使用セット優先、全て使用済みなら使用済みセットも利用
    const { data: precomputedSets } = await supabaseAdmin
      .from('precomputed_quiz_sets')
      .select('id, question_ids, analysis_data, used_at')
      .eq('user_id', userId)
      .eq('quiz_type', 'review')
      .gt('expires_at', currentTime)
      .order('used_at', { ascending: true, nullsFirst: true }) // 未使用優先、次に古い使用済み
      .limit(1)

    console.log(`🔍 DEBUG: Found ${precomputedSets?.length || 0} valid (non-expired) review sets - unused preferred`)

    if (!precomputedSets || precomputedSets.length === 0) {
      console.log('ℹ️ No precomputed review sets found')
      return NextResponse.json({
        success: true,
        questions: [],
        selectedCount: 0,
        totalAvailable: 0,
        hasMore: false,
        generatedAt: new Date().toISOString(),
        source: 'no_precomputed_sets'
      })
    }

    const selectedSet = precomputedSets[0]
    console.log(`📋 Selected review set: ${selectedSet.id} (${selectedSet.used_at ? 'previously used' : 'unused'})`)
    
    // 問題詳細を取得
    const { data: questions } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .in('id', selectedSet.question_ids)
      .eq('is_deleted', false)

    if (!questions || questions.length === 0) {
      console.log('⚠️ Precomputed set found but no valid questions')
      return NextResponse.json({
        success: true,
        questions: [],
        selectedCount: 0,
        totalAvailable: 0,
        hasMore: false,
        generatedAt: new Date().toISOString(),
        source: 'invalid_precomputed_questions'
      })
    }

    // Question型に変換
    const reviewQuestions: Question[] = questions.slice(0, count).map(q => ({
      id: q.id,
      category: q.category_id,
      subcategory: q.subcategory_id || '',
      difficulty: q.difficulty || 'intermediate',
      question: q.question,
      options: [q.option1, q.option2, q.option3, q.option4],
      correct: q.correct_answer,
      explanation: q.explanation || '',
      timeLimit: q.time_limit || 60,
      relatedTopics: [],
      source: q.source || ''
    }))

    // 🆕 DB保存された復習理由を直接取得（高速化）
    console.log(`🔍 [REVIEW REASONS] Getting stored review reasons for ${reviewQuestions.length} questions...`)
    const questionIds = reviewQuestions.map(q => q.id.toString())
    
    const { data: storedReasons, error: reasonsError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, review_reason, created_at')
      .eq('user_id', userId)
      .in('question_id', questionIds)
      .not('review_reason', 'is', null) // 復習理由が記録されているもののみ
      .order('created_at', { ascending: false })
    
    if (reasonsError) {
      console.error(`❌ [REVIEW REASONS] Error fetching stored reasons:`, reasonsError)
    }

    console.log(`🔍 [REVIEW REASONS] Found ${storedReasons?.length || 0} stored review reasons`)
    
    // 各問題の最新の復習理由を取得
    const latestReasons = new Map()
    storedReasons?.forEach(answer => {
      if (!latestReasons.has(answer.question_id) && answer.review_reason) {
        latestReasons.set(answer.question_id, answer.review_reason)
      }
    })

    console.log(`🔍 [REVIEW REASONS] Latest reasons for ${latestReasons.size} questions`)

    // 復習理由を付与（DB保存済み理由を直接使用）
    const questionsWithReasons = reviewQuestions.map(question => {
      const storedReason = latestReasons.get(question.id.toString())
      const reviewReason = storedReason ? REVIEW_REASON_MAP[storedReason] : null
      
      return {
        ...question,
        reviewReason
      }
    })

    console.log(`✅ [REVIEW REASONS] Added stored review reasons to ${questionsWithReasons.length} questions`)
    console.log(`🔍 [REVIEW REASONS] Sample questions with reasons:`, questionsWithReasons.slice(0, 2).map(q => ({
      id: q.id,
      reviewReason: q.reviewReason ? {
        type: q.reviewReason.type,
        icon: q.reviewReason.icon,
        label: q.reviewReason.label
      } : null
    })))

    // セットを使用済みとしてマーク
    await supabaseAdmin
      .from('precomputed_quiz_sets')
      .update({ used_at: new Date().toISOString() })
      .eq('id', selectedSet.id)

    // 統計用に総数取得（事前セット基準で高速化）
    const totalAvailable = selectedSet.question_ids?.length || reviewQuestions.length

    console.log(`✅ Selected ${questionsWithReasons.length} review questions with reasons from precomputed set`)

    return NextResponse.json({
      success: true,
      questions: questionsWithReasons,
      selectedCount: questionsWithReasons.length,
      totalAvailable,
      hasMore: totalAvailable > questionsWithReasons.length,
      generatedAt: new Date().toISOString(),
      source: 'precomputed_set',
      setId: selectedSet.id,
      reviewReasonsAnalyzed: true
    })

  } catch (error) {
    console.error('❌ Error in review questions API:', error)
    return NextResponse.json(
      { error: '復習問題の取得に失敗しました' },
      { status: 500 }
    )
  }
}