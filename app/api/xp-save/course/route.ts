import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings, calculateCourseXP, calculateBonusXP } from '@/lib/xp-settings'
import type { LearningGenre, LearningTheme } from '@/lib/types/learning'
// import { calculateStreakBonus } from '@/lib/xp-settings' // 未使用のためコメントアウト
// import { getUserLearningStreak } from '@/lib/supabase-learning' // 未使用のためコメントアウト

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

    // 1. セキュリティ重視：フロントエンド判定 + バックエンド二重チェック
    const clientSideFirstCompletion = body.is_first_completion ?? false
    
    // サーバーサイドでの検証
    const progressKey = `${body.course_id}_${body.genre_id}_${body.theme_id}_${body.session_id}`
    const { data: settingData, error: checkError } = await supabase
      .from('user_settings')
      .select('setting_value, updated_at')
      .eq('user_id', userId)
      .eq('setting_key', `lp_${progressKey}`)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn(`⚠️ User settings check warning: ${checkError.message}`)
    }

    // サーバーサイドでの初回完了判定
    const progressData = settingData?.setting_value as { completed?: boolean } | null
    const serverSideFirstCompletion = !progressData?.completed
    
    // セキュリティチェック：クライアントとサーバーの判定不整合を検出
    if (clientSideFirstCompletion !== serverSideFirstCompletion) {
      const timeSinceUpdate = settingData?.updated_at 
        ? (Date.now() - new Date(settingData.updated_at).getTime()) / 1000 
        : null
      
      console.warn('⚠️ Client-Server completion status mismatch:', {
        client: clientSideFirstCompletion,
        server: serverSideFirstCompletion,
        timeSinceLastUpdate: timeSinceUpdate,
        progressData,
        userId: userId.substring(0, 8) + '...'
      })
    }
    
    // セキュリティのためサーバーサイド判定を優先（後で重複チェックにより変更可能）
    let isFirstCompletion = serverSideFirstCompletion
    
    console.log(`🔍 Completion status (security-first):`, { 
      progressKey: `lp_${progressKey}`,
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
    
    // 3. 新XP計算（難易度対応固定値方式）
    const xpSettings = await loadXPSettings(supabase)
    let earnedXP = isFirstCompletion && body.session_quiz_correct 
      ? calculateCourseXP(courseDifficulty, xpSettings) 
      : 0

    // 4. SKP計算（コース学習用 - 初回のみ付与、パーフェクトボーナスなし）
    let totalSKP = 0
    if (isFirstCompletion) {
      // コース確認クイズは正解/不正解のみでパーフェクトボーナスは適用しない
      if (body.session_quiz_correct) {
        totalSKP = xpSettings.skp.course_correct
      } else {
        totalSKP = xpSettings.skp.course_incorrect
      }
    }
    
    console.log('📚 Course XP calculation (new system):', {
      courseId: body.course_id,
      courseDifficulty,
      isFirstCompletion,
      sessionQuizCorrect: body.session_quiz_correct,
      earnedXP,
      totalSKP,
      xpSettingsUsed: {
        basic: xpSettings.xp_course.basic,
        intermediate: xpSettings.xp_course.intermediate,
        advanced: xpSettings.xp_course.advanced,
        expert: xpSettings.xp_course.expert
      }
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
          earned_xp: earnedXP
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

    // 6. 統一回答ログシステム: コース確認クイズ回答をquiz_answersテーブルに記録
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

    // 7. ユーザー全体統計を直接更新（セッション回数は常に更新、XPは初回完了時のみ）
    // 既存の統計を取得
    const { data: existingStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 統一回答ログシステムの統計更新: セッション回数は常に+1、XPは初回完了時のみ
    const updatedStats = {
      user_id: userId,
      total_xp: (existingStats?.total_xp || 0) + earnedXP, // 初回完了時のみXP追加
      quiz_xp: existingStats?.quiz_xp || 0,
      course_xp: (existingStats?.course_xp || 0) + earnedXP, // 初回完了時のみXP追加
      bonus_xp: existingStats?.bonus_xp || 0,
      // SKP関連フィールド追加（初回完了時のみ）
      total_skp: (existingStats?.total_skp || 0) + (isFirstCompletion ? totalSKP : 0),
      quiz_skp: existingStats?.quiz_skp || 0,
      course_skp: (existingStats?.course_skp || 0) + (isFirstCompletion ? totalSKP : 0),
      bonus_skp: existingStats?.bonus_skp || 0,
      streak_skp: existingStats?.streak_skp || 0,
      // 既存フィールド
      quiz_sessions_completed: existingStats?.quiz_sessions_completed || 0,
      course_sessions_completed: (existingStats?.course_sessions_completed || 0) + 1, // 常に+1
      quiz_questions_answered: (existingStats?.quiz_questions_answered || 0) + (isFirstCompletion ? 1 : 0), // コース確認クイズも問題数にカウント（初回のみ）
      quiz_questions_correct: (existingStats?.quiz_questions_correct || 0) + (isFirstCompletion && body.session_quiz_correct ? 1 : 0), // 正解時のみ加算（初回のみ）
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
      .from('user_xp_stats_v2')
      .upsert(updatedStats)

    if (userStatsError) {
      console.error('❌ Course user stats upsert error:', userStatsError)
    } else {
      console.log('✅ Course user stats updated (sessions always +1, XP only if first completion):', {
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
        newAccuracy: updatedStats.quiz_average_accuracy,
        isFirstCompletion: isFirstCompletion
      })
    }

    // 8. SKP取引記録を追加（初回完了時のみ）
    if (isFirstCompletion && totalSKP > 0) {
      const { error: skpTransactionError } = await supabase
        .from('skp_transactions')
        .insert({
          user_id: userId,
          type: 'earned',
          amount: totalSKP,
          source: `course_session_${body.session_id}`,
          description: `Course session: ${body.course_id} (${body.session_quiz_correct ? 'Correct' : 'Incorrect'} confirmation quiz)${body.session_quiz_correct ? ' + Perfect bonus' : ''}`,
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
        bonus_xp_earned: existingDailyRecord?.bonus_xp_earned || 0
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

    // 10. コース完了チェックとボーナスXP付与（初回完了のみ）
    let courseCompletionBonus = 0
    if (isFirstCompletion) {
      try {
        // コースの全セッション数を取得
        const { data: courseData, error: courseError } = await supabase
          .from('learning_courses')
          .select(`
            *,
            genres:learning_genres(
              *,
              themes:learning_themes(
                *,
                sessions:learning_sessions(id)
              )
            )
          `)
          .eq('id', body.course_id)
          .single()

        if (!courseError && courseData) {
          // コースの全セッション数を計算
          const totalSessions = courseData.genres?.reduce((total: number, genre: LearningGenre) => {
            return total + (genre.themes?.reduce((themeTotal: number, theme: LearningTheme) => {
              return themeTotal + (theme.sessions?.length || 0)
            }, 0) || 0)
          }, 0) || 0

          console.log(`🔍 Course ${body.course_id} has ${totalSessions} total sessions`)

          // 完了したセッション数を取得（ユニークセッション数で正しく判定）
          const { data: completedSessions, error: completedError } = await supabase
            .from('course_session_completions')
            .select('session_id')
            .eq('user_id', userId)
            .eq('course_id', body.course_id)
            .eq('is_first_completion', true)

          if (!completedError && completedSessions) {
            // 重複セッション除去：ユニークなセッションIDのみカウント
            const uniqueSessionIds = new Set(completedSessions.map(s => s.session_id))
            const completedCount = uniqueSessionIds.size
            console.log(`👤 User has completed ${completedCount}/${totalSessions} unique sessions (${completedSessions.length} total first completion records)`)
            console.log(`📋 Completed sessions: ${Array.from(uniqueSessionIds).sort()}`)

            // 全セッション完了時にボーナスXP・SKP付与
            if (completedCount >= totalSessions && totalSessions > 0) {
              courseCompletionBonus = calculateBonusXP('course_completion', xpSettings)
              const courseCompletionSKPBonus = xpSettings.skp.course_complete_bonus
              
              console.log(`🎉 Course completion bonus! ${courseCompletionBonus}XP + ${courseCompletionSKPBonus}SKP`)

              // ユーザー統計にボーナスXP・SKPを追加（ユーザー全体統計のみ）
              const { data: currentStats } = await supabase
                .from('user_xp_stats_v2')
                .select('*')
                .eq('user_id', userId)
                .single()

              if (currentStats) {
                const newTotalXP = currentStats.total_xp + courseCompletionBonus
                const newTotalSKP = (currentStats.total_skp || 0) + courseCompletionSKPBonus
                const newLevel = Math.floor(newTotalXP / 1000) + 1

                const { error: bonusUpdateError } = await supabase
                  .from('user_xp_stats_v2')
                  .update({
                    total_xp: newTotalXP,
                    bonus_xp: (currentStats.bonus_xp || 0) + courseCompletionBonus,
                    total_skp: newTotalSKP,
                    bonus_skp: (currentStats.bonus_skp || 0) + courseCompletionSKPBonus,
                    current_level: newLevel,
                    updated_at: new Date().toISOString()
                  })
                  .eq('user_id', userId)

                if (bonusUpdateError) {
                  console.error('❌ Course completion bonus update error:', bonusUpdateError)
                } else {
                  console.log('✅ Course completion bonus added to user stats:', {
                    bonusXP: courseCompletionBonus,
                    bonusSKP: courseCompletionSKPBonus,
                    newTotalXP,
                    newTotalSKP,
                    newLevel
                  })
                }

                // SKP取引記録を追加
                if (courseCompletionSKPBonus > 0) {
                  const { error: skpTransactionError } = await supabase
                    .from('skp_transactions')
                    .insert({
                      user_id: userId,
                      type: 'earned',
                      amount: courseCompletionSKPBonus,
                      source: `course_completion_${body.course_id}`,
                      description: `Course completion bonus: ${body.course_id}`,
                      created_at: new Date().toISOString()
                    })

                  if (skpTransactionError) {
                    console.warn('⚠️ Course completion SKP transaction recording error:', skpTransactionError)
                  } else {
                    console.log('💰 Course completion SKP transaction recorded:', {
                      amount: courseCompletionSKPBonus,
                      source: `course_completion_${body.course_id}`
                    })
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Course completion check error:', error)
      }
    }

    // 11. 作成されたセッション完了記録取得
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

    // 12. 継続学習ボーナスSKP計算・付与（自動実行）
    let streakBonusResult = null
    try {
      console.log('🔥 Auto-triggering streak bonus calculation after course completion...')
      
      // 最新の学習継続日数を計算
      const today = new Date()
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const { data: activityRecords } = await supabase
        .from('daily_xp_records')
        .select('date, quiz_sessions, course_sessions')
        .eq('user_id', userId)
        .gte('date', ninetyDaysAgo)
        .order('date', { ascending: false })

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

      // 継続ボーナスがある場合のみ処理
      if (currentStreak > 0) {
        // 既に付与された継続ボーナスを確認
        const { data: existingStreakTransactions } = await supabase
          .from('skp_transactions')
          .select('amount, description')
          .eq('user_id', userId)
          .eq('type', 'earned')
          .like('source', 'streak_%')
          .order('created_at', { ascending: false })

        const totalStreakBonusAlreadyPaid = existingStreakTransactions?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0
        
        // XP設定を取得
        const xpSettings = await loadXPSettings(supabase)
        
        // 新しく付与すべきボーナスを計算
        const dailyStreakBonus = currentStreak * xpSettings.skp.daily_streak_bonus
        const tenDayBonusCount = Math.floor(currentStreak / 10)
        const tenDayBonus = tenDayBonusCount * xpSettings.skp.ten_day_streak_bonus
        const totalStreakBonusShould = dailyStreakBonus + tenDayBonus
        const newStreakBonus = Math.max(0, totalStreakBonusShould - totalStreakBonusAlreadyPaid)

        if (newStreakBonus > 0) {
          // ユーザー統計を更新
          const { data: currentStats } = await supabase
            .from('user_xp_stats_v2')
            .select('*')
            .eq('user_id', userId)
            .single()

          if (currentStats) {
            const newTotalSKP = (currentStats.total_skp || 0) + newStreakBonus

            await supabase
              .from('user_xp_stats_v2')
              .update({
                total_skp: newTotalSKP,
                streak_skp: (currentStats.streak_skp || 0) + newStreakBonus,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)

            // SKP取引記録を追加
            await supabase
              .from('skp_transactions')
              .insert({
                user_id: userId,
                type: 'earned',
                amount: newStreakBonus,
                source: `streak_${currentStreak}days`,
                description: `Learning streak bonus: ${currentStreak} consecutive days${tenDayBonusCount > 0 ? ` (includes ${tenDayBonusCount} ten-day bonuses)` : ''}`,
                created_at: new Date().toISOString()
              })

            streakBonusResult = {
              streak_days: currentStreak,
              bonus_skp: newStreakBonus,
              total_skp: newTotalSKP
            }

            console.log(`✅ Auto-awarded streak bonus: ${newStreakBonus} SKP for ${currentStreak} days streak`)
          }
        } else {
          console.log(`ℹ️ No new streak bonus needed. Current streak: ${currentStreak} days`)
        }
      }
    } catch (streakError) {
      console.warn('⚠️ Automatic streak bonus calculation failed:', streakError)
      // エラーが発生してもコース保存は成功として扱う
    }

    const responseMessage = isFirstCompletion && body.session_quiz_correct
      ? courseCompletionBonus > 0 
        ? `Course session completed! Earned ${earnedXP} XP + ${courseCompletionBonus} course completion bonus!`
        : `Course session completed! Earned ${earnedXP} XP`
      : isFirstCompletion
      ? 'Course session completed (no quiz or incorrect answer - no XP)'
      : 'Course session completed (review mode - no XP, but logged for analysis)'

    console.log(`✅ Course XP Save Success: Session ${body.session_id}, XP: ${earnedXP}, Bonus: ${courseCompletionBonus}`)

    return NextResponse.json({
      success: true,
      session_id: body.session_id,
      earned_xp: earnedXP,
      course_completion_bonus: courseCompletionBonus,
      is_first_completion: isFirstCompletion,
      quiz_correct: body.session_quiz_correct,
      streak_bonus: streakBonusResult,
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