import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings, calculateCourseXP } from '@/lib/xp-settings'

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

interface CourseSessionRequest {
  session_id: string
  course_id: string
  theme_id: string
  genre_id: string
  category_id: string
  subcategory_id: string
  session_quiz_correct: boolean
  is_first_completion?: boolean
  completion_time?: string
}

// コース学習セッション完了時のXP保存API
export async function POST(request: Request) {
  try {
    console.log('💾 Course XP Save API Request')

    const body: CourseSessionRequest = await request.json()
    
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
    const requiredFields = ['session_id', 'course_id', 'theme_id', 'genre_id', 'category_id', 'subcategory_id']
    for (const field of requiredFields) {
      if (!body[field as keyof CourseSessionRequest]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // 1. 既存の完了記録チェック（重複防止）
    const { data: existingCompletion, error: checkError } = await supabase
      .from('course_session_completions')
      .select('id, is_first_completion')
      .eq('session_id', body.session_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Completion check error: ${checkError.message}`)
    }

    // 初回完了判定
    const isFirstCompletion = !existingCompletion && (body.is_first_completion ?? true)

    // 2. コース情報と難易度を取得
    let courseDifficulty = 'basic' // デフォルト
    
    if (body.course_id && isFirstCompletion) {
      const { data: courseData, error: courseError } = await supabase
        .from('learning_courses')
        .select('difficulty')
        .eq('id', body.course_id)
        .single()
      
      if (!courseError && courseData) {
        courseDifficulty = courseData.difficulty || 'basic'
      } else {
        console.warn('⚠️ Course difficulty fetch failed, using default:', courseError?.message)
      }
    }
    
    // 3. 新XP計算（難易度対応固定値方式）
    const xpSettings = await loadXPSettings(supabase)
    const earnedXP = isFirstCompletion && body.session_quiz_correct 
      ? calculateCourseXP(courseDifficulty, xpSettings) 
      : 0

    console.log('📚 Course XP calculation (new system):', {
      courseId: body.course_id,
      courseDifficulty,
      isFirstCompletion,
      sessionQuizCorrect: body.session_quiz_correct,
      earnedXP,
      xpSettingsUsed: {
        basic: xpSettings.xp_course.basic,
        intermediate: xpSettings.xp_course.intermediate,
        advanced: xpSettings.xp_course.advanced,
        expert: xpSettings.xp_course.expert
      }
    })

    // 3. セッション完了記録作成
    const { error: insertError } = await supabase
      .from('course_session_completions')
      .insert({
        user_id: userId,
        session_id: body.session_id,
        course_id: body.course_id,
        theme_id: body.theme_id,
        genre_id: body.genre_id,
        category_id: body.category_id,
        subcategory_id: body.subcategory_id,
        is_first_completion: isFirstCompletion,
        session_quiz_correct: body.session_quiz_correct,
        earned_xp: earnedXP
      })

    if (insertError) {
      console.warn('Course completion insert error:', insertError)
    }

    // 4. 統一回答ログシステム: コース確認クイズ回答をquiz_answersテーブルに記録
    if (isFirstCompletion) {
      const { error: answerInsertError } = await supabase
        .from('quiz_answers')
        .insert({
          quiz_session_id: null, // コース確認クイズはクイズセッションと無関係
          question_id: `course_confirmation_${body.session_id}`,
          user_answer: 1, // 確認クイズは通常選択肢がシンプル
          is_correct: body.session_quiz_correct,
          time_spent: 30, // コース確認クイズのデフォルト回答時間
          is_timeout: false,
          session_type: 'course_confirmation',
          course_session_id: body.session_id,
          course_id: body.course_id,
          theme_id: body.theme_id,
          genre_id: body.genre_id,
          category_id: body.category_id,
          subcategory_id: body.subcategory_id,
          difficulty: courseDifficulty, // コースの実際の難易度を使用
          earned_xp: earnedXP
        })
      
      if (answerInsertError) {
        console.error('❗ Course confirmation quiz answer insert error:', answerInsertError)
      } else {
        console.log('✅ Course confirmation quiz answer recorded in unified system')
      }
    }

    // 5. ユーザー全体統計を直接更新（統一ログシステム: 初回完了時のみ）
    if (isFirstCompletion) {
      // 既存の統計を取得
      const { data: existingStats } = await supabase
        .from('user_xp_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      // 統一回答ログシステムの統計更新: コース確認クイズも含めて更新
      const updatedStats = {
        user_id: userId,
        total_xp: (existingStats?.total_xp || 0) + earnedXP,
        quiz_xp: existingStats?.quiz_xp || 0,
        course_xp: (existingStats?.course_xp || 0) + earnedXP,
        bonus_xp: existingStats?.bonus_xp || 0,
        quiz_sessions_completed: existingStats?.quiz_sessions_completed || 0,
        course_sessions_completed: (existingStats?.course_sessions_completed || 0) + 1,
        quiz_questions_answered: (existingStats?.quiz_questions_answered || 0) + (isFirstCompletion ? 1 : 0), // コース確認クイズも問題数にカウント
        quiz_questions_correct: (existingStats?.quiz_questions_correct || 0) + (isFirstCompletion && body.session_quiz_correct ? 1 : 0), // 正解時のみ加算
        quiz_average_accuracy: 0, // 精度計算は後で再計算
        wisdom_cards_total: existingStats?.wisdom_cards_total || 0,
        knowledge_cards_total: existingStats?.knowledge_cards_total || 0,
        badges_total: existingStats?.badges_total || 0,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // 精度の再計算
      if (updatedStats.quiz_questions_answered > 0) {
        updatedStats.quiz_average_accuracy = Math.round((updatedStats.quiz_questions_correct / updatedStats.quiz_questions_answered) * 100 * 100) / 100
      }

      const { error: userStatsError } = await supabase
        .from('user_xp_stats')
        .upsert(updatedStats)

      if (userStatsError) {
        console.error('❌ Course user stats upsert error:', userStatsError)
      } else {
        console.log('✅ Course user stats updated with unified answer logging:', {
          previousTotal: existingStats?.total_xp || 0,
          previousCourseSessions: existingStats?.course_sessions_completed || 0,
          previousQuestionsAnswered: existingStats?.quiz_questions_answered || 0,
          previousQuestionsCorrect: existingStats?.quiz_questions_correct || 0,
          addedXP: earnedXP,
          addedSessions: 1,
          addedQuestions: isFirstCompletion ? 1 : 0,
          addedCorrect: isFirstCompletion && body.session_quiz_correct ? 1 : 0,
          newTotal: updatedStats.total_xp,
          newCourseSessions: updatedStats.course_sessions_completed,
          newQuestionsAnswered: updatedStats.quiz_questions_answered,
          newQuestionsCorrect: updatedStats.quiz_questions_correct,
          newAccuracy: updatedStats.quiz_average_accuracy
        })
      }
    }

    // 6. 作成されたセッション完了記録取得
    const { data: _completionRecord, error: fetchError } = await supabase
      .from('course_session_completions')
      .select('*')
      .eq('session_id', body.session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError) {
      throw new Error(`Completion record fetch error: ${fetchError.message}`)
    }

    // 7. テーマ完了チェック（すべてのセッションが完了している場合）
    // この部分は将来的にテーマ完了判定ロジックを追加予定

    // 8. コース完了チェック（すべてのテーマが完了している場合）
    // この部分は将来的にコース完了判定ロジックを追加予定

    const responseMessage = isFirstCompletion && body.session_quiz_correct
      ? `Course session completed! Earned ${earnedXP} XP`
      : isFirstCompletion
      ? 'Course session completed (review - no XP)'
      : 'Course session already completed'

    console.log(`✅ Course XP Save Success: Session ${body.session_id}, XP: ${earnedXP}`)

    return NextResponse.json({
      success: true,
      session_id: body.session_id,
      earned_xp: earnedXP,
      is_first_completion: isFirstCompletion,
      quiz_correct: body.session_quiz_correct,
      message: responseMessage
    })

  } catch (error) {
    console.error('❌ Course XP Save API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to save course session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// コース完了ボーナス処理API
export async function PUT(request: Request) {
  try {
    console.log('🎉 Course Completion Bonus API Request')

    const body = await request.json()
    
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
    
    if (!body.course_id) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      )
    }

    // コース完了ボーナス処理関数呼び出し
    const { error: bonusError } = await supabase
      .rpc('process_course_completion_bonus', {
        p_user_id: userId,
        p_course_id: body.course_id
      })

    if (bonusError) {
      throw new Error(`Course completion bonus error: ${bonusError.message}`)
    }

    // 完了記録取得
    const { data: completionRecord, error: fetchError } = await supabase
      .from('course_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', body.course_id)
      .single()

    if (fetchError) {
      throw new Error(`Course completion record fetch error: ${fetchError.message}`)
    }

    console.log(`🎊 Course Completion Bonus Success: Course ${body.course_id}, Bonus: ${completionRecord.completion_bonus_xp} XP`)

    return NextResponse.json({
      success: true,
      course_id: body.course_id,
      completion_bonus_xp: completionRecord.completion_bonus_xp,
      badges_awarded: completionRecord.badges_awarded,
      message: `Course completed! Bonus: ${completionRecord.completion_bonus_xp} XP, Badges: ${completionRecord.badges_awarded}`
    })

  } catch (error) {
    console.error('❌ Course Completion Bonus API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process course completion bonus',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}