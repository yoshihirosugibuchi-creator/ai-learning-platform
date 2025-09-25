import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// XPデータベース直接確認API
export async function GET(request: Request) {
  try {
    console.log('🔍 XP Database Verification Request')
    
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
    console.log('👤 Verifying data for user:', userId.substring(0, 8) + '...')

    // 1. クイズセッション数を確認（全件）
    const { data: allSessions, error: _allSessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, total_xp, bonus_xp, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // 最新5件も取得
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, total_xp, bonus_xp, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (sessionsError) {
      throw new Error(`Sessions query error: ${sessionsError.message}`)
    }

    // 2. ユーザー統計を確認
    const { data: userStats, error: userStatsError } = await supabase
      .from('user_xp_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (userStatsError && userStatsError.code !== 'PGRST116') {
      throw new Error(`User stats query error: ${userStatsError.message}`)
    }

    // 3. 統一回答ログを確認（クイズセッション・コース確認クイズ含む全件）
    const { data: allAnswers, error: _allAnswersError } = await supabase
      .from('quiz_answers')
      .select('quiz_session_id, course_session_id, session_type, earned_xp, is_correct, difficulty')
      .or(`quiz_session_id.in.(${(allSessions?.map(s => s.id) || []).join(',')}),session_type.eq.course_confirmation`)

    // 最新5件のセッションの回答も別途取得
    const { data: _answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('quiz_session_id, course_session_id, session_type, earned_xp, is_correct, difficulty')
      .or(`quiz_session_id.in.(${(sessions?.map(s => s.id) || []).join(',')}),session_type.eq.course_confirmation`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (answersError) {
      console.warn('Answers query error:', answersError)
    }

    // 4. コース学習セッション数を取得
    const { data: courseCompletions, error: _courseError } = await supabase
      .from('course_session_completions')
      .select('id')
      .eq('user_id', userId)
    
    const result = {
      success: true,
      user_id: userId.substring(0, 8) + '...',
      
      // === ユーザー向け統計情報 (user_xp_statsテーブル) ===
      user_stats: userStats || null,
      
      // === 系統整合性検証用 ===
      verification: {
        quiz_sessions_raw: allSessions?.length || 0,
        course_sessions_raw: courseCompletions?.length || 0,
        total_sessions_raw: (allSessions?.length || 0) + (courseCompletions?.length || 0),
        unified_answers_raw: allAnswers?.length || 0,
        quiz_answers_raw: allAnswers?.filter(a => a.session_type === 'quiz' || !a.session_type).length || 0,
        course_answers_raw: allAnswers?.filter(a => a.session_type === 'course_confirmation').length || 0,
        total_xp_from_raw: allAnswers?.reduce((sum, a) => sum + (a.earned_xp || 0), 0) || 0,
        
        // 整合性チェック
        stats_vs_raw: {
          xp_match: (userStats?.total_xp || 0) === (allAnswers?.reduce((sum, a) => sum + (a.earned_xp || 0), 0) || 0),
          quiz_sessions_match: (userStats?.quiz_sessions_completed || 0) === (allSessions?.length || 0),
          course_sessions_match: (userStats?.course_sessions_completed || 0) === (courseCompletions?.length || 0),
          answers_match: (userStats?.quiz_questions_answered || 0) === (allAnswers?.length || 0)
        }
      },
      
      // === レガシー表示 (下位互換性) ===
      total_sessions: allSessions?.length || 0, // 旧式: クイズのみ
      answers_count: allAnswers?.length || 0,
      total_earned_from_answers: allAnswers?.reduce((sum, a) => sum + (a.earned_xp || 0), 0) || 0
    }

    console.log('✅ Database verification complete:', {
      total_sessions: result.total_sessions,
      userStatsExists: !!userStats,
      totalXP: userStats?.total_xp,
      statsSessionCount: userStats?.quiz_sessions_completed
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Database Verification Error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to verify XP data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}