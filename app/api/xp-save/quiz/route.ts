import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings, calculateQuizXP, calculateBonusXP } from '@/lib/xp-settings'

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

interface QuizAnswer {
  question_id: string
  user_answer: number | null
  is_correct: boolean
  time_spent: number
  is_timeout: boolean
  category_id: string
  subcategory_id: string
  difficulty: string
}

interface QuizSessionRequest {
  session_start_time: string
  session_end_time?: string
  total_questions: number
  correct_answers: number
  accuracy_rate: number
  answers: QuizAnswer[]
}

// 旧XP設定システムは削除し、新しい統合設定システムを使用

// クイズセッション完了時のXP保存API
export async function POST(request: Request) {
  try {
    console.log('💾 Quiz XP Save API Request')

    const body: QuizSessionRequest = await request.json()
    
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
    
    // バリデーション
    if (!body.answers || body.answers.length === 0) {
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      )
    }

    if (body.total_questions !== body.answers.length) {
      return NextResponse.json(
        { error: 'Total questions must match answers count' },
        { status: 400 }
      )
    }

    // 1. クイズセッション記録作成
    const { data: sessionData, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: userId,
        session_start_time: body.session_start_time,
        session_end_time: body.session_end_time || new Date().toISOString(),
        total_questions: body.total_questions,
        correct_answers: body.correct_answers,
        accuracy_rate: body.accuracy_rate,
        status: 'completed'
      })
      .select()
      .single()

    if (sessionError) {
      throw new Error(`Session creation error: ${sessionError.message}`)
    }

    const sessionId = sessionData.id

    // 2. 新統合XP設定を取得
    const xpSettings = await loadXPSettings(supabase)

    // 3. 各回答のXP計算と記録（新固定値方式）
    const answerInserts = []
    for (const answer of body.answers) {
      let earnedXP = 0
      
      if (answer.is_correct) {
        // 新XP計算（固定値方式）
        earnedXP = calculateQuizXP(answer.difficulty, xpSettings)
      }

      answerInserts.push({
        quiz_session_id: sessionId,
        question_id: answer.question_id,
        user_answer: answer.user_answer,
        is_correct: answer.is_correct,
        time_spent: answer.time_spent,
        is_timeout: answer.is_timeout,
        category_id: answer.category_id,
        subcategory_id: answer.subcategory_id,
        difficulty: answer.difficulty,
        earned_xp: earnedXP
      })
    }

    // 3. 回答記録一括挿入
    const { error: answersError } = await supabase
      .from('quiz_answers')
      .insert(answerInserts)

    if (answersError) {
      throw new Error(`Answers insertion error: ${answersError.message}`)
    }

    // 4. セッション合計XP計算とボーナス処理
    const totalQuestionXP = answerInserts.reduce((sum, answer) => sum + answer.earned_xp, 0)
    let bonusXP = 0
    let wisdomCards = 0
    
    // 精度ボーナス計算（新設定システム）
    if (body.accuracy_rate >= 100.0) {
      bonusXP = calculateBonusXP('quiz_accuracy_100', xpSettings)
      wisdomCards = 1 // 格言カード
    } else if (body.accuracy_rate >= 80.0) {
      bonusXP = calculateBonusXP('quiz_accuracy_80', xpSettings)
    }
    
    const totalXP = totalQuestionXP + bonusXP
    
    console.log('🎯 Quiz XP calculation (new system):', {
      totalQuestionXP,
      bonusXP,
      totalXP,
      accuracy: body.accuracy_rate,
      xpSettingsUsed: {
        basic: xpSettings.xp_quiz.basic,
        intermediate: xpSettings.xp_quiz.intermediate,
        advanced: xpSettings.xp_quiz.advanced,
        expert: xpSettings.xp_quiz.expert
      }
    })
    
    // 5. セッション記録更新
    const { error: sessionUpdateError } = await supabase
      .from('quiz_sessions')
      .update({
        total_xp: totalXP,
        bonus_xp: bonusXP,
        wisdom_cards_awarded: wisdomCards,
        status: 'completed'
      })
      .eq('id', sessionId)

    if (sessionUpdateError) {
      console.warn('Session update error:', sessionUpdateError)
    }

    // 6. ユーザー全体統計を直接更新（加算ベース）
    // まず既存の統計を取得
    const { data: existingStats } = await supabase
      .from('user_xp_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 新規または更新
    const updatedStats = {
      user_id: userId,
      total_xp: (existingStats?.total_xp || 0) + totalXP,
      quiz_xp: (existingStats?.quiz_xp || 0) + totalXP,
      course_xp: existingStats?.course_xp || 0,
      bonus_xp: (existingStats?.bonus_xp || 0) + bonusXP,
      quiz_sessions_completed: (existingStats?.quiz_sessions_completed || 0) + 1,
      course_sessions_completed: existingStats?.course_sessions_completed || 0,
      quiz_questions_answered: (existingStats?.quiz_questions_answered || 0) + body.total_questions,
      quiz_questions_correct: (existingStats?.quiz_questions_correct || 0) + body.correct_answers,
      quiz_average_accuracy: Math.round(
        ((existingStats?.quiz_questions_correct || 0) + body.correct_answers) / 
        ((existingStats?.quiz_questions_answered || 0) + body.total_questions) * 100 * 100
      ) / 100, // 小数点第2位まで
      wisdom_cards_total: (existingStats?.wisdom_cards_total || 0) + wisdomCards,
      knowledge_cards_total: existingStats?.knowledge_cards_total || 0,
      badges_total: existingStats?.badges_total || 0,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: upsertResult, error: userStatsError } = await supabase
      .from('user_xp_stats')
      .upsert(updatedStats)
      .select()

    if (userStatsError) {
      console.error('❌ User stats upsert error:', {
        message: userStatsError.message,
        details: userStatsError.details,
        hint: userStatsError.hint,
        code: userStatsError.code,
        updatedStats: updatedStats
      })
    } else {
      console.log('✅ User stats updated directly:', {
        previousTotal: existingStats?.total_xp || 0,
        previousSessions: existingStats?.quiz_sessions_completed || 0,
        previousAnswers: existingStats?.quiz_questions_answered || 0,
        addedXP: totalXP,
        addedSessions: 1,
        addedAnswers: body.total_questions,
        newTotal: updatedStats.total_xp,
        newSessions: updatedStats.quiz_sessions_completed,
        newAnswers: updatedStats.quiz_questions_answered,
        upsertResult: upsertResult?.length || 0
      })
    }

    // 8. 実際の統計結果を再確認
    const { data: verifyStats, error: verifyError } = await supabase
      .from('user_xp_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!verifyError) {
      console.log('🔍 Stats verification after update:', {
        actualTotal: verifyStats.total_xp,
        actualSessions: verifyStats.quiz_sessions_completed,
        actualAnswers: verifyStats.quiz_questions_answered
      })
    } else {
      console.error('❌ Stats verification failed:', verifyError)
    }

    // 9. 更新されたセッション情報取得
    const { data: updatedSession, error: fetchError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError) {
      throw new Error(`Updated session fetch error: ${fetchError.message}`)
    }

    console.log(`✅ Quiz XP Save Success: Session ${sessionId}, Total XP: ${updatedSession.total_xp}`)

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      total_xp: updatedSession.total_xp,
      bonus_xp: updatedSession.bonus_xp,
      wisdom_cards_awarded: updatedSession.wisdom_cards_awarded,
      message: 'Quiz session saved and XP calculated successfully'
    })

  } catch (error) {
    console.error('❌ Quiz XP Save API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to save quiz session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}