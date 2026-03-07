import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings, type XPSettings, calculateCourseXP } from '@/lib/xp-settings'
import { 
  mapDifficultyToEnglish
} from '@/lib/xp-level-system'
import { getLearningCourseDetails } from '@/lib/learning/data'
import type { 
  Database,
  UserXPStatsV2Update,
  SKPTransactionInsert
} from '@/lib/database-types-official'
// import type { LearningGenre, LearningTheme } from '@/lib/types/learning' // 未使用のためコメントアウト
// import { calculateStreakBonus } from '@/lib/xp-settings' // 未使用のためコメントアウト
// import { getUserLearningStreak } from '@/lib/supabase-learning' // 未使用のためコメントアウト

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient<Database>(
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
  session_start_time?: string
  session_end_time?: string
  duration_seconds?: number
  quiz_time_spent?: number  // 理解度チェック実測時間
  quiz_user_answer?: number | null  // ユーザーが選択した理解度チェックの回答選択肢インデックス
  // Client-side completion detection results
  client_theme_completed?: boolean
  client_course_completed?: boolean
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

    // 1. セキュリティ重視：フロントエンド判定 + バックエンド二重チェック
    const clientSideFirstCompletion = body.is_first_completion ?? false
    
    // サーバーサイドでの検証（新システム：course_session_completions ベース）
    const { data: existingCompletion, error: checkError } = await supabase
      .from('course_session_completions')
      .select('is_first_completion, created_at')
      .eq('user_id', userId)
      .eq('session_id', body.session_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn(`⚠️ Course session completion check warning: ${checkError.message}`)
    }

    // サーバーサイドでの初回完了判定（新システムベース）
    const serverSideFirstCompletion = !existingCompletion
    
    // セキュリティチェック：クライアントとサーバーの判定不整合を検出
    if (clientSideFirstCompletion !== serverSideFirstCompletion) {
      const timeSinceUpdate = existingCompletion?.created_at 
        ? (Date.now() - new Date(existingCompletion.created_at).getTime()) / 1000 
        : null
      
      console.warn('⚠️ Client-Server completion status mismatch:', {
        client: clientSideFirstCompletion,
        server: serverSideFirstCompletion,
        timeSinceLastCompletion: timeSinceUpdate,
        existingCompletion,
        userId: userId.substring(0, 8) + '...'
      })
    }
    
    // セキュリティのためサーバーサイド判定を優先（新システムベース）
    let isFirstCompletion = serverSideFirstCompletion
    
    console.log(`🔍 Completion status (security-first):`, { 
      sessionId: body.session_id,
      clientSide: clientSideFirstCompletion,
      serverSide: serverSideFirstCompletion,
      finalDecision: isFirstCompletion,
      isSecure: clientSideFirstCompletion === serverSideFirstCompletion
    })

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
    
    // 3. 統合XP/SKP計算システム使用
    console.log('🔄 Using unified XP/SKP calculation system for course')
    
    // XP設定をロード
    const xpSettings = await loadXPSettings(supabase)
    
    // 難易度を統合システム形式に変換
    const unifiedDifficulty = mapDifficultyToEnglish(courseDifficulty)
    
    // コースXP計算（テーブルベース）
    let earnedXP = isFirstCompletion && body.session_quiz_correct 
      ? calculateCourseXP(unifiedDifficulty, xpSettings)  // コースは正解数ベース
      : 0

    // 統合コースSKP計算
    let totalSKP = 0
    let skpResult = { skpGained: 0, breakdown: { base: 0, bonus: 0, description: 'No SKP (review or not first completion)' } }
    
    if (isFirstCompletion) {
      // コースSKP計算（コースセッション専用）
      // コースの確認クイズは1問のみ - パーフェクトボーナスは適用しない
      let baseSKP = 0
      if (body.session_quiz_correct) {
        baseSKP = xpSettings.skp.quiz_correct  // 正解: 10 SKP
      } else {
        baseSKP = xpSettings.skp.quiz_incorrect  // 不正解: 2 SKP
      }
      
      skpResult = {
        skpGained: baseSKP,
        breakdown: {
          base: baseSKP,
          bonus: 0,
          description: body.session_quiz_correct 
            ? `確認クイズ正解(${baseSKP}SKP)`
            : `確認クイズ不正解(${baseSKP}SKP)`
        }
      }
      
      totalSKP = skpResult.skpGained
    }
    
    console.log('📚 Unified course XP/SKP calculation:', {
      courseId: body.course_id,
      courseDifficulty,
      unifiedDifficulty,
      isFirstCompletion,
      sessionQuizCorrect: body.session_quiz_correct,
      earnedXP,
      totalSKP,
      skpBreakdown: skpResult.breakdown
    })

    // 5. セッション完了記録作成（重複防止 + atomic操作で競合状態対策）
    let _finalInsertResult = null
    try {
      // 初回完了の場合は重複チェック
      if (isFirstCompletion) {
        const { data: existingFirstCompletion } = await supabase
          .from('course_session_completions')
          .select('id')
          .eq('user_id', userId)
          .eq('session_id', body.session_id)
          .eq('is_first_completion', true)
          .single()
          
        if (existingFirstCompletion) {
          console.warn('⚠️ First completion already exists for this session, recording as review instead')
          // 既に初回完了記録が存在する場合は復習として記録
          isFirstCompletion = false
          earnedXP = 0
        }
      }
      
      const { data: insertResult, error: insertError } = await supabase
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
          earned_xp: earnedXP,
          session_start_time: body.session_start_time,
          session_end_time: body.session_end_time,
          duration_seconds: body.duration_seconds
        })
        .select()

      if (insertError) {
        console.warn('Course completion insert error:', insertError)
        
        // 重複エラーの場合は既存記録を取得
        if (insertError.code === '23505') {
          console.log('🔒 Duplicate completion detected - fetching existing record')
          const { data: existingRecord } = await supabase
            .from('course_session_completions')
            .select('*')
            .eq('user_id', userId)
            .eq('session_id', body.session_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          _finalInsertResult = existingRecord
        }
      } else {
        _finalInsertResult = insertResult?.[0]
      }
    } catch (error) {
      console.error('❌ Course completion insert critical error:', error)
    }

    // 6. learning_progressへの時間データ記録は LearningSession.tsx で統一管理
    // 重複防止のため、こちらでの直接記録は削除
    console.log('📝 Learning progress recording delegated to LearningSession.tsx (重複防止)')

    // 7. 統一回答ログシステム: コース確認クイズ回答をquiz_answersテーブルに記録
    if (isFirstCompletion) {
      console.log('📝 Recording quiz answer:', {
        quiz_user_answer: body.quiz_user_answer,
        quiz_time_spent: body.quiz_time_spent,
        session_quiz_correct: body.session_quiz_correct,
        hasQuizUserAnswer: body.quiz_user_answer !== undefined && body.quiz_user_answer !== null,
        hasQuizTimeSpent: body.quiz_time_spent !== undefined && body.quiz_time_spent !== null
      })
      
      const { error: answerInsertError } = await supabase
        .from('quiz_answers')
        .insert({
          user_id: userId, // ユーザーID追加
          quiz_session_id: null, // コース確認クイズはクイズセッションと無関係
          question_id: `course_confirmation_${body.session_id}`,
          user_answer: body.quiz_user_answer ?? null, // ユーザーが選択した理解度チェックの選択肢インデックス
          is_correct: body.session_quiz_correct,
          time_spent: body.quiz_time_spent || 30, // 理解度チェック実測時間（フォールバック30秒）
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

    // 7. ユーザー全体統計更新はテーマ・コース完了記録後に実行（タイミング修正）
    // 初回の場合のみセッション完了記録と基本統計更新を実行
    if (isFirstCompletion) {
      // 既存の統計を取得してセッション数のみ更新（XPは後で更新）
      const { data: existingStats } = await supabase
        .from('user_xp_stats_v2')
        .select('*')
        .eq('user_id', userId)
        .single()

      // 🔧 セッション数のみ更新（現在のレコード数ベース）
      const { count: currentSessionsCompleted } = await supabase
        .from('course_session_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)

      const initialStatsUpdate = {
        user_id: userId,
        course_sessions_completed: currentSessionsCompleted || 0, // 実際のレコード数
        quiz_questions_answered: (existingStats?.quiz_questions_answered || 0) + 1, // コース確認クイズも問題数にカウント
        quiz_questions_correct: (existingStats?.quiz_questions_correct || 0) + (body.session_quiz_correct ? 1 : 0), // 正解時のみ加算
        total_learning_time_seconds: (existingStats?.total_learning_time_seconds || 0) + (body.duration_seconds || 0),
        course_learning_time_seconds: (existingStats?.course_learning_time_seconds || 0) + (body.duration_seconds || 0),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        quiz_average_accuracy: 0 // 精度計算用の初期値
      }

      // 精度の再計算
      if (initialStatsUpdate.quiz_questions_answered > 0) {
        initialStatsUpdate.quiz_average_accuracy = Math.round((initialStatsUpdate.quiz_questions_correct / initialStatsUpdate.quiz_questions_answered) * 100 * 100) / 100
      }

      const { error: initialStatsError } = await supabase
        .from('user_xp_stats_v2')
        .update(initialStatsUpdate)
        .eq('user_id', userId)

      if (initialStatsError) {
        console.error('❌ Initial course stats update error:', initialStatsError)
      } else {
        console.log('✅ Initial course stats updated (sessions +1, questions +1):', {
          courseSessions: initialStatsUpdate.course_sessions_completed,
          questionsAnswered: initialStatsUpdate.quiz_questions_answered,
          questionsCorrect: initialStatsUpdate.quiz_questions_correct,
          accuracy: initialStatsUpdate.quiz_average_accuracy
        })
      }
    }

    // 8. カテゴリー・サブカテゴリー統計更新は完了処理後に実行（タイミング修正）
    // 統計更新処理は recordThemeCompletion/recordCourseCompletion後に実行

    // 9. SKP取引記録を追加（初回完了時のみ）
    if (isFirstCompletion && totalSKP > 0) {
      const { error: skpTransactionError } = await supabase
        .from('skp_transactions')
        .insert({
          user_id: userId,
          type: 'earned',
          amount: totalSKP,
          source: `course_session_${body.session_id}`,
          description: `コース学習完了: ${body.course_id} (確認クイズ${body.session_quiz_correct ? '正解' : '不正解'})`,
          created_at: new Date().toISOString()
        })

      if (skpTransactionError) {
        console.warn('⚠️ Course SKP transaction recording error:', skpTransactionError)
      } else {
        console.log('💰 Course SKP transaction recorded:', {
          amount: totalSKP,
          source: `course_session_${body.session_id}`,
          isPerfect: body.session_quiz_correct
        })
      }
    }

    // 9. daily_xp_records テーブルの更新（セッション回数は常に更新、XPは初回完了時のみ）
    {
      const today = new Date()
      const dateString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0')

      // 今日の記録を取得または作成
      const { data: existingDailyRecord } = await supabase
        .from('daily_xp_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateString)
        .single()

      const dailyRecordData = {
        user_id: userId,
        date: dateString,
        quiz_sessions: existingDailyRecord?.quiz_sessions || 0,
        course_sessions: (existingDailyRecord?.course_sessions || 0) + 1,
        quiz_xp_earned: existingDailyRecord?.quiz_xp_earned || 0,
        course_xp_earned: (existingDailyRecord?.course_xp_earned || 0) + earnedXP,
        total_xp_earned: (existingDailyRecord?.total_xp_earned || 0) + earnedXP,
        bonus_xp_earned: existingDailyRecord?.bonus_xp_earned || 0,
        // 学習時間統計（常に累積）
        quiz_time_seconds: existingDailyRecord?.quiz_time_seconds || 0,
        course_time_seconds: (existingDailyRecord?.course_time_seconds || 0) + (body.duration_seconds || 0),
        total_time_seconds: (existingDailyRecord?.total_time_seconds || 0) + (body.duration_seconds || 0)
      }

      let dailyRecordError
      
      if (existingDailyRecord) {
        // 既存記録の更新
        const { error } = await supabase
          .from('daily_xp_records')
          .update(dailyRecordData)
          .eq('user_id', userId)
          .eq('date', dateString)
        
        dailyRecordError = error
        console.log('🔄 Updating existing daily XP record for course session (sessions always +1, XP only if first completion)')
      } else {
        // 新規記録の挿入
        const { error } = await supabase
          .from('daily_xp_records')
          .insert(dailyRecordData)
        
        dailyRecordError = error
        console.log('➕ Inserting new daily XP record for course session (sessions always +1, XP only if first completion)')
      }

      if (dailyRecordError) {
        console.warn('⚠️ Course daily XP record update error:', dailyRecordError)
      } else {
        console.log('📅 Course daily XP record updated (sessions always +1, XP only if first completion):', {
          date: dateString,
          courseSessions: dailyRecordData.course_sessions,
          courseXP: dailyRecordData.course_xp_earned,
          totalXP: dailyRecordData.total_xp_earned,
          isFirstCompletion: isFirstCompletion,
          earnedXP: earnedXP
        })
      }
    }

    // 10. テーマ・コース完了処理（クライアント判定 + サーバー二重チェック）
    let themeCompleted = false
    let courseCompleted = false

    if (isFirstCompletion) {
      try {
        console.log('🎯 Processing completion results (client + server verification)')

        // クライアント側の判定結果を受け取り
        const clientThemeCompleted = body.client_theme_completed || false
        const clientCourseCompleted = body.client_course_completed || false

        // サーバーサイド独自検証: テーマ完了チェック
        let serverThemeCompleted = false
        try {
          const courseDetails = await getLearningCourseDetails(body.course_id)
          if (courseDetails) {
            // 現在のテーマの全セッションIDを取得
            let themeSessionIds: string[] = []
            for (const genre of courseDetails.genres) {
              const theme = genre.themes.find(t => t.id === body.theme_id)
              if (theme) {
                themeSessionIds = theme.sessions.map(s => s.id)
                break
              }
            }

            if (themeSessionIds.length > 0) {
              // DBから完了済みセッションを取得（今回のセッション含む）
              const { data: completedInTheme } = await supabase
                .from('course_session_completions')
                .select('session_id')
                .eq('user_id', userId)
                .eq('course_id', body.course_id)
                .eq('is_first_completion', true)
                .in('session_id', themeSessionIds)

              const completedIds = new Set((completedInTheme || []).map(c => c.session_id))
              completedIds.add(body.session_id) // 今回のセッションを追加

              serverThemeCompleted = themeSessionIds.every(sid => completedIds.has(sid))

              console.log('🔍 Server theme completion check:', {
                themeId: body.theme_id,
                totalSessions: themeSessionIds.length,
                completedSessions: completedIds.size,
                serverResult: serverThemeCompleted,
                clientResult: clientThemeCompleted
              })
            }

            // サーバーサイド独自検証: コース完了チェック
            let serverCourseCompleted = false
            const allCourseSessionIds: string[] = []
            for (const genre of courseDetails.genres) {
              for (const theme of genre.themes) {
                for (const session of theme.sessions) {
                  allCourseSessionIds.push(session.id)
                }
              }
            }

            if (allCourseSessionIds.length > 0) {
              const { data: completedInCourse } = await supabase
                .from('course_session_completions')
                .select('session_id')
                .eq('user_id', userId)
                .eq('course_id', body.course_id)
                .eq('is_first_completion', true)

              const completedCourseIds = new Set((completedInCourse || []).map(c => c.session_id))
              completedCourseIds.add(body.session_id) // 今回のセッションを追加

              serverCourseCompleted = allCourseSessionIds.every(sid => completedCourseIds.has(sid))

              console.log('🔍 Server course completion check:', {
                courseId: body.course_id,
                totalSessions: allCourseSessionIds.length,
                completedSessions: completedCourseIds.size,
                serverResult: serverCourseCompleted,
                clientResult: clientCourseCompleted,
                missingSessions: allCourseSessionIds.filter(sid => !completedCourseIds.has(sid))
              })
            }

            // クライアントとサーバーの判定不整合をログ
            if (clientThemeCompleted !== serverThemeCompleted) {
              console.warn('⚠️ Theme completion mismatch: client=', clientThemeCompleted, 'server=', serverThemeCompleted)
            }
            if (clientCourseCompleted !== serverCourseCompleted) {
              console.warn('⚠️ Course completion mismatch: client=', clientCourseCompleted, 'server=', serverCourseCompleted)
            }

            // テーマ完了処理（クライアントORサーバーのどちらかがtrueなら実行）
            if (clientThemeCompleted || serverThemeCompleted) {
              themeCompleted = await recordThemeCompletion(supabase, userId, body, xpSettings)
            }

            // コース完了処理（クライアントORサーバーのどちらかがtrueなら実行）
            if (clientCourseCompleted || serverCourseCompleted) {
              courseCompleted = await recordCourseCompletion(supabase, userId, body, xpSettings)
            }
          } else {
            // コース詳細が取得できない場合はクライアント判定にフォールバック
            console.warn('⚠️ Course details not available for server-side check, using client judgment')
            if (clientThemeCompleted) {
              themeCompleted = await recordThemeCompletion(supabase, userId, body, xpSettings)
            }
            if (clientCourseCompleted) {
              courseCompleted = await recordCourseCompletion(supabase, userId, body, xpSettings)
            }
          }
        } catch (verifyError) {
          console.warn('⚠️ Server-side completion verification failed, using client judgment:', verifyError)
          if (clientThemeCompleted) {
            themeCompleted = await recordThemeCompletion(supabase, userId, body, xpSettings)
          }
          if (clientCourseCompleted) {
            courseCompleted = await recordCourseCompletion(supabase, userId, body, xpSettings)
          }
        }

        console.log('✅ Database completion recording results:', { themeCompleted, courseCompleted })

        // テーマ・コース完了記録後に統計更新
        if (earnedXP > 0 || totalSKP > 0) {
          // 1. カテゴリー・サブカテゴリー統計更新
          console.log('📊 Updating category and subcategory stats after completion processing...')
          await updateCategoryAndSubcategoryStats(supabase, userId, body, earnedXP)

          // 2. user_xp_stats_v2のテーマ・コース完了統計更新（完了記録後）
          console.log('📊 Updating user_xp_stats_v2 theme/course completion stats after records created...')
          await updateUserXPStatsCompletions(supabase, userId, earnedXP, totalSKP, isFirstCompletion)
        }

      } catch (error) {
        console.warn('⚠️ Completion recording error:', error)
      }
    }

    // 11. セッション完了記録は既に保存済みのため、追加取得は不要

    // 12. 継続学習ボーナスSKP計算・付与（非同期実行でUIブロック回避）
    const streakBonusResult = null
    // 重い継続学習ボーナス計算を非同期で実行
    Promise.resolve().then(async () => {
      try {
        console.log('🔥 Auto-triggering streak bonus calculation (async)...')
        
        // 効率化: 最近7日分のみチェックしてからフル計算を判断
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const { data: recentActivity } = await supabase
          .from('daily_xp_records')
          .select('date, quiz_sessions, course_sessions')
          .eq('user_id', userId)
          .gte('date', sevenDaysAgo)
          .order('date', { ascending: false })
          .limit(7)

        let hasRecentActivity = false
        if (recentActivity && recentActivity.length > 0) {
          // 最近の活動があるかチェック
          const today = new Date().toISOString().split('T')[0]
          hasRecentActivity = recentActivity.some((record: { date: string; quiz_sessions: number; course_sessions: number }) => 
            record.date === today && (record.quiz_sessions > 0 || record.course_sessions > 0)
          )
        }

        // 今日活動がある場合のみフル継続日数計算を実行
        if (hasRecentActivity) {
          console.log('📅 Recent activity detected, calculating full streak (async)')
          
          // フル計算は非同期で実行 - Temporarily disabled until function is available
          try {
            console.log('Streak calculation temporarily disabled - function not yet available')
            // const { data, error } = await supabase.rpc('calculate_learning_streak', { 
            //   p_user_id: userId 
            // })
            
            // if (error) {
            //   console.warn('Streak calculation function not available:', error.message)
            // } else if (data && typeof data === 'object' && 'current_streak' in data && 'new_bonus_amount' in data) {
            //   const streakResult = data as { current_streak: number; new_bonus_amount: number }
            //   const streakDays = streakResult.current_streak
            //   const newBonus = streakResult.new_bonus_amount
            //   
            //   if (newBonus > 0) {
            //     console.log(`✅ Auto-awarded streak bonus (async): ${newBonus} SKP for ${streakDays} days streak`)
            //   } else {
            //     console.log(`ℹ️ No new streak bonus needed (async). Current streak: ${streakDays} days`)
            //   }
            // }
          } catch (streakError) {
            console.warn('Failed to calculate learning streak:', streakError)
          }
        } else {
          console.log('📅 No recent activity, skipping streak calculation (async)')
        }
      } catch (streakError) {
        console.warn('⚠️ Automatic streak bonus calculation failed (async):', streakError)
      }
    }).catch(error => {
      console.warn('⚠️ Streak bonus async processing failed:', error)
    })

    // コース完了ボーナスXP計算（初回完了 & コース完了時のみ）
    let courseCompletionBonusXP = 0
    if (isFirstCompletion && courseCompleted) {
      const xpSettings = await loadXPSettings(supabase)
      courseCompletionBonusXP = xpSettings.xp_bonus.course_completion || 0
    }
    
    // 総獲得XP計算
    const totalEarnedXP = earnedXP + courseCompletionBonusXP

    const responseMessage = isFirstCompletion && body.session_quiz_correct
      ? `Course session completed! Session: ${earnedXP} XP${courseCompletionBonusXP > 0 ? `, Bonus: ${courseCompletionBonusXP} XP` : ''}`
      : isFirstCompletion
      ? 'Course session completed (no quiz or incorrect answer - no XP)'
      : 'Course session completed (review mode - no XP, but logged for analysis)'

    console.log(`✅ Course XP Save Success: Session ${body.session_id}, Session XP: ${earnedXP}, Bonus XP: ${courseCompletionBonusXP}, Total: ${totalEarnedXP}`)

    // 🚀 早期レスポンス: 内訳付きXP値を即座に返す（UIパフォーマンス向上）
    const earlyResponse = NextResponse.json({
      success: true,
      session_id: body.session_id,
      session_xp: earnedXP,
      completion_bonus_xp: courseCompletionBonusXP,
      total_earned_xp: totalEarnedXP,
      is_first_completion: isFirstCompletion,
      quiz_correct: body.session_quiz_correct,
      theme_completed: themeCompleted,
      course_completed: courseCompleted,
      streak_bonus: streakBonusResult,
      message: responseMessage
    })

    console.log('⚡ Early response sent, heavy processing continues in background')
    return earlyResponse

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

// ユーザー全体統計更新関数（テーマ・コース完了記録後）
async function updateUserXPStatsCompletions(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  earnedXP: number,
  totalSKP: number,
  isFirstCompletion: boolean
): Promise<void> {
  try {
    // 既存の統計を取得
    const { data: existingStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 🔧 実際のレコード数ベースで統計を取得（記録後の正確なカウント）
    const [themesCompletedResult, coursesCompletedResult] = await Promise.all([
      // テーマ完了数の取得（完了記録作成後）
      supabase
        .from('course_theme_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId),
      // コース完了数の取得（完了記録作成後）
      supabase
        .from('course_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
    ])

    const currentThemesCompleted = themesCompletedResult.count || 0
    const currentCoursesCompleted = coursesCompletedResult.count || 0

    // 統計更新（XP・SKP、テーマ・コース完了数を正確に反映）
    const updatedStats = {
      total_xp: (existingStats?.total_xp || 0) + earnedXP, // 初回完了時のみXP追加
      course_xp: (existingStats?.course_xp || 0) + earnedXP, // 初回完了時のみXP追加
      total_skp: (existingStats?.total_skp || 0) + (isFirstCompletion ? totalSKP : 0),
      course_skp: (existingStats?.course_skp || 0) + (isFirstCompletion ? totalSKP : 0),
      // 🔧 重要: 完了記録作成後の正確なカウント
      course_themes_completed: currentThemesCompleted,
      course_completed: currentCoursesCompleted,
      updated_at: new Date().toISOString()
    }

    const { error: userStatsError } = await supabase
      .from('user_xp_stats_v2')
      .update(updatedStats)
      .eq('user_id', userId)

    if (userStatsError) {
      console.error('❌ User stats completion update error:', userStatsError)
    } else {
      console.log('✅ User stats updated with accurate completion counts:', {
        addedXP: earnedXP,
        addedSKP: isFirstCompletion ? totalSKP : 0,
        themesCompleted: currentThemesCompleted,
        coursesCompleted: currentCoursesCompleted,
        totalXP: updatedStats.total_xp,
        totalSKP: updatedStats.total_skp
      })
    }
  } catch (error) {
    console.error('❌ User stats completion update error:', error)
  }
}

// カテゴリー・サブカテゴリー統計更新関数
async function updateCategoryAndSubcategoryStats(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  body: CourseSessionRequest,
  earnedXP: number
): Promise<void> {
  console.log('📊 Updating category and subcategory stats for course session...')
  
  // デバッグ: リクエストデータ確認
  console.log('🔍 XP Save API request data debug:', {
    categoryId: body.category_id,
    subcategoryId: body.subcategory_id,
    subcategoryIdType: typeof body.subcategory_id,
    subcategoryIdLength: body.subcategory_id?.length || 0,
    subcategoryIdEmpty: body.subcategory_id === '' || body.subcategory_id === null || body.subcategory_id === undefined,
    earnedXP
  })
  
  try {
    // サブカテゴリーIDの検証とエラーハンドリング
    if (!body.subcategory_id || body.subcategory_id.trim() === '') {
      console.warn('⚠️ subcategory_id is empty or null, skipping subcategory stats update')
      console.warn('⚠️ Category stats will still be updated, but subcategory stats will be skipped')
    }
    
    // カテゴリー統計の更新
    console.log('🔍 Fetching existing category stats for:', { userId: userId.substring(0, 8), categoryId: body.category_id })
    const { data: existingCategoryStats, error: categoryFetchError } = await supabase
      .from('user_category_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', body.category_id)
      .maybeSingle()
    
    console.log('🔍 Category stats fetch result:', { 
      found: !!existingCategoryStats, 
      error: categoryFetchError?.message,
      data: existingCategoryStats 
    })

    // 🔧 修正: quiz_xp と course_xp を分離して管理
    const newCourseXP = (existingCategoryStats?.course_xp || 0) + earnedXP
    const existingQuizXP = existingCategoryStats?.quiz_xp || 0
    const newTotalXP = existingQuizXP + newCourseXP

    // 🔧 カテゴリー別統計を実際のレコード数で取得
    const [categorySessionsResult, categoryThemesResult] = await Promise.all([
      supabase
        .from('course_session_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('category_id', body.category_id),
      supabase
        .from('course_theme_completions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('category_id', body.category_id)
    ])

    const categoryStatsData = {
      user_id: userId,
      category_id: body.category_id,
      quiz_questions_answered: (existingCategoryStats?.quiz_questions_answered || 0) + 1,
      quiz_questions_correct: (existingCategoryStats?.quiz_questions_correct || 0) + (body.session_quiz_correct ? 1 : 0),
      quiz_xp: existingQuizXP, // クイズXPは変更なし
      course_xp: newCourseXP, // コースXPに今回のXPを加算
      total_xp: newTotalXP, // total = quiz + course
      course_sessions_completed: categorySessionsResult?.count || 0, // 実際のレコード数
      course_themes_completed: categoryThemesResult?.count || 0, // 実際のレコード数
      quiz_sessions_completed: existingCategoryStats?.quiz_sessions_completed || 0,
      quiz_average_accuracy: 0, // 後で計算
      updated_at: new Date().toISOString()
    }

    // quiz_average_accuracy の正答率計算
    if (categoryStatsData.quiz_questions_answered > 0) {
      categoryStatsData.quiz_average_accuracy = Math.round((categoryStatsData.quiz_questions_correct / categoryStatsData.quiz_questions_answered) * 100 * 100) / 100
    }

    const { error: categoryStatsError } = await supabase
      .from('user_category_xp_stats_v2')
      .upsert(categoryStatsData, { 
        onConflict: 'user_id,category_id',
        ignoreDuplicates: false 
      })

    if (categoryStatsError) {
      console.error('❌ Course category stats update error:', categoryStatsError)
    } else {
      console.log('✅ Course category stats updated:', {
        categoryId: body.category_id,
        quizXP: categoryStatsData.quiz_xp,
        courseXP: categoryStatsData.course_xp,
        totalXP: categoryStatsData.total_xp,
        earnedXP: earnedXP,
        courseSessions: categoryStatsData.course_sessions_completed,
        courseThemes: categoryStatsData.course_themes_completed
      })
    }

    // サブカテゴリー統計の更新（subcategory_idが有効な場合のみ）
    if (body.subcategory_id && body.subcategory_id.trim() !== '') {
      console.log('🔍 Fetching existing subcategory stats for:', { 
        userId: userId.substring(0, 8), 
        categoryId: body.category_id, 
        subcategoryId: body.subcategory_id 
      })
      
      const { data: existingSubcategoryStats, error: subcategoryFetchError } = await supabase
        .from('user_subcategory_xp_stats_v2')
        .select('*')
        .eq('user_id', userId)
        .eq('category_id', body.category_id)
        .eq('subcategory_id', body.subcategory_id)
        .maybeSingle()
        
      console.log('🔍 Subcategory stats fetch result:', { 
        found: !!existingSubcategoryStats, 
        error: subcategoryFetchError?.message,
        data: existingSubcategoryStats 
      })

      // 🔧 修正: サブカテゴリーもquiz_xp と course_xp を分離して管理
      const newSubcategoryCourseXP = (existingSubcategoryStats?.course_xp || 0) + earnedXP
      const existingSubcategoryQuizXP = existingSubcategoryStats?.quiz_xp || 0
      const newSubcategoryTotalXP = existingSubcategoryQuizXP + newSubcategoryCourseXP

      // 🔧 サブカテゴリー別統計を実際のレコード数で取得
      const [subcategorySessionsResult, subcategoryThemesResult] = await Promise.all([
        supabase
          .from('course_session_completions')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .eq('category_id', body.category_id)
          .eq('subcategory_id', body.subcategory_id),
        supabase
          .from('course_theme_completions')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .eq('category_id', body.category_id)
          .eq('subcategory_id', body.subcategory_id)
      ])

      const subcategoryStatsData = {
        user_id: userId,
        category_id: body.category_id,
        subcategory_id: body.subcategory_id,
        quiz_questions_answered: (existingSubcategoryStats?.quiz_questions_answered || 0) + 1,
        quiz_questions_correct: (existingSubcategoryStats?.quiz_questions_correct || 0) + (body.session_quiz_correct ? 1 : 0),
        quiz_xp: existingSubcategoryQuizXP, // クイズXPは変更なし
        course_xp: newSubcategoryCourseXP, // コースXPに今回のXPを加算
        total_xp: newSubcategoryTotalXP, // total = quiz + course
        course_sessions_completed: subcategorySessionsResult?.count || 0, // 実際のレコード数
        course_themes_completed: subcategoryThemesResult?.count || 0, // 実際のレコード数
        quiz_sessions_completed: existingSubcategoryStats?.quiz_sessions_completed || 0,
        quiz_average_accuracy: 0, // 後で計算
        updated_at: new Date().toISOString()
      }

      // quiz_average_accuracy の正答率計算
      if (subcategoryStatsData.quiz_questions_answered > 0) {
        subcategoryStatsData.quiz_average_accuracy = Math.round((subcategoryStatsData.quiz_questions_correct / subcategoryStatsData.quiz_questions_answered) * 100 * 100) / 100
      }

      const { error: subcategoryStatsError } = await supabase
        .from('user_subcategory_xp_stats_v2')
        .upsert(subcategoryStatsData, { 
          onConflict: 'user_id,category_id,subcategory_id',
          ignoreDuplicates: false 
        })

      if (subcategoryStatsError) {
        console.error('❌ Course subcategory stats update error:', subcategoryStatsError)
      } else {
        console.log('✅ Course subcategory stats updated:', {
          categoryId: body.category_id,
          subcategoryId: body.subcategory_id,
          quizXP: subcategoryStatsData.quiz_xp,
          courseXP: subcategoryStatsData.course_xp,
          totalXP: subcategoryStatsData.total_xp,
          earnedXP: earnedXP,
          courseSessions: subcategoryStatsData.course_sessions_completed,
          courseThemes: subcategoryStatsData.course_themes_completed
        })
      }
    }
  } catch (error) {
    console.error('❌ Category/subcategory stats update error:', error)
  }
}

// テーマ完了記録関数（クライアント判定に基づく）
async function recordThemeCompletion(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  body: CourseSessionRequest,
  _xpSettings: XPSettings
): Promise<boolean> {
  try {
    // 1. 既にテーマ完了記録があるかチェック（重複防止）
    const { data: existingThemeCompletion } = await supabase
      .from('course_theme_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', body.course_id)
      .eq('theme_id', body.theme_id)
      .single()

    if (existingThemeCompletion) {
      console.log('ℹ️ Theme already completed, returning true')
      return true
    }

    // 2. クライアント判定に基づいてテーマ完了記録を作成
    console.log(`🎉 Recording theme completion based on client judgment: ${body.theme_id}`)

    // テーマのセッション数を取得（統計用）
    let totalThemeSessions = 0
    try {
      const courseDetails = await getLearningCourseDetails(body.course_id)
      if (courseDetails) {
        for (const genre of courseDetails.genres) {
          const theme = genre.themes.find(t => t.id === body.theme_id)
          if (theme) {
            totalThemeSessions = theme.sessions.length
            break
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to get theme session count:', error)
      totalThemeSessions = 1
    }

    // 3. テーマ完了記録を作成
      const themeCompletionData = {
        user_id: userId,
        course_id: body.course_id,
        theme_id: body.theme_id,
        genre_id: body.genre_id,
        category_id: body.category_id,
        subcategory_id: body.subcategory_id,
        completed_sessions: totalThemeSessions, // クライアント判定で完了なので全セッション完了
        total_sessions: totalThemeSessions,
        knowledge_cards_awarded: 1
      }
      
      const { error: themeCompletionError } = await supabase
        .from('course_theme_completions')
        .insert(themeCompletionData)

      if (themeCompletionError) {
        console.error('❌ Theme completion record error:', themeCompletionError)
        console.error('❌ Theme completion data attempted:', themeCompletionData)
        return false
      }
      
      console.log('✅ Theme completion recorded successfully:', themeCompletionData)

      // ✅ course_themes_completed統計は実際のレコード数ベースで自動計算されるため個別更新不要
      console.log('📊 Theme completion statistics will be auto-calculated from actual records')

      // 4. ナレッジカード処理は統合V2システムで管理
      // user_knowledge_collection_v2への記録はクライアント側で完了済み

      console.log('✅ Theme completion recorded')
      return true
  } catch (error) {
    console.error('❌ Theme completion check error:', error)
    return false
  }
}

// コース完了記録関数（クライアント判定に基づく）
async function recordCourseCompletion(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  body: CourseSessionRequest,
  xpSettings: XPSettings
): Promise<boolean> {
  try {
    // 1. 既にコース完了記録があるかチェック（重複防止）
    const { data: existingCourseCompletion } = await supabase
      .from('course_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', body.course_id)
      .single()

    if (existingCourseCompletion) {
      console.log('ℹ️ Course already completed, returning true')
      return true
    }

    // 2. クライアント判定に基づいてコース完了記録を作成
    console.log(`🎉 Recording course completion based on client judgment: ${body.course_id}`)

    // コースの統計情報を取得
    let totalSessions = 0
    let totalThemes = 0
    let completedThemes = 0
    let totalSessionXP = 0
    
    try {
      const courseDetails = await getLearningCourseDetails(body.course_id)
      if (courseDetails) {
        // 全セッション数とテーマ数を正確に計算
        for (const genre of courseDetails.genres) {
          totalThemes += genre.themes.length
          for (const theme of genre.themes) {
            totalSessions += theme.sessions.length
          }
        }
        
        // 実際に完了したテーマ数をDBから取得
        const { data: completedThemeRecords } = await supabase
          .from('course_theme_completions')
          .select('theme_id')
          .eq('user_id', userId)
          .eq('course_id', body.course_id)
        
        completedThemes = completedThemeRecords?.length || 0
        
        // コースの累積セッションXPを計算
        const { data: userCompletions } = await supabase
          .from('course_session_completions')
          .select('earned_xp')
          .eq('user_id', userId)
          .eq('course_id', body.course_id)
          .eq('is_first_completion', true)
        
        totalSessionXP = userCompletions?.reduce((sum, completion) => sum + (completion.earned_xp || 0), 0) || 0
      }
    } catch (error) {
      console.warn('⚠️ Failed to get course details:', error)
      totalSessions = 1
      totalThemes = 1
      completedThemes = 1
      totalSessionXP = 0
    }
    
    // コース完了ボーナスXP計算
    const courseCompletionBonus = xpSettings.xp_bonus.course_completion || 100
    const totalEarnedXP = totalSessionXP + courseCompletionBonus
    const completionRate = totalThemes > 0 ? (completedThemes / totalThemes) * 100 : 100

    // 3. コース完了記録を正確なデータで作成
      const courseCompletionData = {
        user_id: userId,
        course_id: body.course_id,
        completed_sessions: totalSessions, // 実際の完了セッション数（クライアント判定では全完了）
        completed_themes: completedThemes, // 実際にDBに記録されている完了テーマ数
        total_sessions: totalSessions, // コース全体のセッション数
        total_themes: totalThemes, // コース全体のテーマ数
        total_session_xp: totalSessionXP, // セッションからの累積XP
        completion_bonus_xp: courseCompletionBonus, // 完了ボーナスXP
        total_earned_xp: totalEarnedXP, // 総獲得XP
        completion_rate: Math.round(completionRate * 100) / 100, // 完了率（小数点以下2桁）
        badges_awarded: 1
      }
      
      const { error: courseCompletionError } = await supabase
        .from('course_completions')
        .insert(courseCompletionData)

      if (courseCompletionError) {
        console.error('❌ Course completion record error:', courseCompletionError)
        console.error('❌ Course completion data attempted:', courseCompletionData)
        return false
      }
      
      console.log('✅ Course completion recorded successfully:', courseCompletionData)

      // 5. 修了証バッジ付与（learning_coursesのbadge_dataを使用）
      try {
        // まずコース情報とbadge_dataを取得
        const { data: courseData, error: courseError } = await supabase
          .from('learning_courses')
          .select('id, title, difficulty, badge_data')
          .eq('id', body.course_id)
          .single()

        if (courseError || !courseData) {
          console.error('❌ Failed to fetch course badge data:', courseError)
          throw new Error(`Course ${body.course_id} not found`)
        }

        console.log('📋 Course badge data retrieved:', courseData.badge_data)

        // badge_dataからバッジ情報を取得
        const badgeInfo = (courseData.badge_data as Record<string, unknown>) || {}
        
        // 有効期限の計算（validityPeriodMonthsが指定されている場合）
        let expiresAt: string | null = null
        const validityMonths = badgeInfo.validityPeriodMonths as number | null
        if (validityMonths && validityMonths > 0) {
          const expiryDate = new Date()
          expiryDate.setMonth(expiryDate.getMonth() + validityMonths)
          expiresAt = expiryDate.toISOString()
        }

        const badgeData = {
          user_id: userId,
          badge_id: (badgeInfo.id as string) || `course_completion_${body.course_id}`,
          course_id: body.course_id,
          course_name: courseData.title || body.course_id, // 正しいコース名を使用
          badge_title: (badgeInfo.title as string) || `${courseData.title} 修了証`,
          badge_description: (badgeInfo.description as string) || `${courseData.title}を完了しました`,
          badge_image_url: (badgeInfo.badgeImageUrl as string) || null,
          badge_color: (badgeInfo.color as string) || '#FFD700',
          difficulty: courseData.difficulty || 'intermediate', // コース本来の難易度を使用
          earned_at: new Date().toISOString(),
          expires_at: expiresAt,
          validity_period_months: validityMonths
        }
        
        console.log('🏆 Creating badge with data:', badgeData)
        
        const { error: badgeError } = await supabase
          .from('user_badges')
          .insert(badgeData)

        if (badgeError) {
          console.warn('⚠️ Course completion badge error:', badgeError)
        } else {
          console.log('🎉 Course completion badge awarded with proper badge_data!')
        }
      } catch (badgeCreationError) {
        console.error('❌ Badge creation error:', badgeCreationError)
        console.warn('⚠️ Badge award failed, but course completion will continue')
      }

      // 6. コース完了ボーナスXP・SKP付与（既存システム使用）
      const bonusXP = xpSettings.xp_bonus.course_completion || 50
      const courseCompletionSKPBonus = xpSettings.skp.course_complete_bonus || 50
      
      // まず現在の統計を取得
      const { data: currentStats } = await supabase
        .from('user_xp_stats_v2')
        .select('total_xp, bonus_xp, total_skp, bonus_skp, course_skp, badges_total')
        .eq('user_id', userId)
        .single()

      const [statsUpdate, skpTransaction] = await Promise.all([
        // ユーザー統計更新 
        supabase
          .from('user_xp_stats_v2')
          .update({
            total_xp: (currentStats?.total_xp || 0) + bonusXP,
            bonus_xp: (currentStats?.bonus_xp || 0) + bonusXP,
            total_skp: (currentStats?.total_skp || 0) + courseCompletionSKPBonus,
            course_skp: (currentStats?.course_skp || 0) + courseCompletionSKPBonus,
            badges_total: (currentStats?.badges_total || 0) + 1,
            updated_at: new Date().toISOString()
          } as UserXPStatsV2Update)
          .eq('user_id', userId),
        
        // SKP取引記録
        courseCompletionSKPBonus > 0 ? supabase
          .from('skp_transactions')
          .insert({
            user_id: userId,
            type: 'earned',
            amount: courseCompletionSKPBonus,
            source: `course_completion_${body.course_id}`,
            description: `コース完了ボーナス: ${body.course_id}`,
            created_at: new Date().toISOString()
          } as SKPTransactionInsert) : Promise.resolve({ error: null })
      ])

      if (statsUpdate.error) {
        console.error('❌ Course completion bonus update error:', statsUpdate.error)
      } else {
        console.log('✅ Course completion bonus XP/SKP added')
      }

      if (skpTransaction.error) {
        console.warn('⚠️ Course completion SKP transaction error:', skpTransaction.error)
      }

      // 7. daily_xp_recordsにボーナスXPを追加
      const today = new Date()
      const dateString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0')
      
      const { data: existingDailyRecord } = await supabase
        .from('daily_xp_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', dateString)
        .single()
      
      if (existingDailyRecord) {
        const { error: dailyUpdateError } = await supabase
          .from('daily_xp_records')
          .update({
            bonus_xp_earned: (existingDailyRecord.bonus_xp_earned || 0) + bonusXP,
            total_xp_earned: (existingDailyRecord.total_xp_earned || 0) + bonusXP
          })
          .eq('user_id', userId)
          .eq('date', dateString)
        
        if (dailyUpdateError) {
          console.warn('⚠️ Daily XP record bonus update error:', dailyUpdateError)
        }
      }
      
      console.log(`🎊 Course completion recorded: +${bonusXP}XP, +${courseCompletionSKPBonus}SKP, +1 Badge`)
      return true
    
  } catch (error) {
    console.error('❌ Course completion recording error:', error)
    return false
  }
}