import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings, calculateQuizXP, calculateBonusXP, calculateSKP } from '@/lib/xp-settings'

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
    const answerInserts: Array<{
      quiz_session_id: string;
      question_id: string;
      user_answer: number | null;
      is_correct: boolean;
      time_spent: number;
      is_timeout: boolean;
      earned_xp: number;
      category_id: string;
      subcategory_id: string;
      difficulty: string;
    }> = []
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

    // 5. SKP計算（新規追加）
    const correctAnswers = body.correct_answers
    const incorrectAnswers = body.total_questions - body.correct_answers
    const isPerfect = body.accuracy_rate >= 100.0
    const totalSKP = calculateSKP(correctAnswers, incorrectAnswers, isPerfect, xpSettings)
    
    console.log('🎯 SKP計算:', {
      correctAnswers,
      incorrectAnswers,
      isPerfect,
      totalSKP,
      accuracyRate: body.accuracy_rate
    })
    
    // 精度ボーナス計算（新設定システム）
    let accuracyBonus = 0
    if (body.accuracy_rate >= 100.0) {
      accuracyBonus = calculateBonusXP('quiz_accuracy_100', xpSettings)
      wisdomCards = 1 // 格言カード
    } else if (body.accuracy_rate >= 80.0) {
      accuracyBonus = calculateBonusXP('quiz_accuracy_80', xpSettings)
    }

    bonusXP = accuracyBonus
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

    // 6. ユーザー全体統計を直接更新（トリガーレス v2テーブル使用）
    // まず既存の統計を取得
    const { data: existingStats } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 新規または更新（アプリケーションレベルでレベル計算）
    const newTotalXP = (existingStats?.total_xp || 0) + totalXP
    const newCurrentLevel = Math.floor(newTotalXP / 1000) + 1  // 1000XP = 1レベル

    const updatedStats = {
      user_id: userId,
      total_xp: newTotalXP,
      quiz_xp: (existingStats?.quiz_xp || 0) + totalXP,
      course_xp: existingStats?.course_xp || 0,
      bonus_xp: (existingStats?.bonus_xp || 0) + bonusXP,
      // SKP関連フィールド追加
      total_skp: (existingStats?.total_skp || 0) + totalSKP,
      quiz_skp: (existingStats?.quiz_skp || 0) + totalSKP,
      course_skp: existingStats?.course_skp || 0,
      bonus_skp: existingStats?.bonus_skp || 0,
      streak_skp: existingStats?.streak_skp || 0,
      // 既存フィールド
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
      current_level: newCurrentLevel,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let upsertResult, userStatsError

    // 完全アプリケーション管理：INSERTかUPDATEを明示的に使用してトリガーを回避
    if (existingStats) {
      // 既存レコードの更新（UPDATE）- v2テーブル使用
      const { data, error } = await supabase
        .from('user_xp_stats_v2')
        .update(updatedStats)
        .eq('user_id', userId)
        .select()
      
      upsertResult = data
      userStatsError = error
      
      console.log('🔄 Updating existing XP stats record (v2 table)')
    } else {
      // 新規レコードの挿入（INSERT）- v2テーブル使用
      const { data, error } = await supabase
        .from('user_xp_stats_v2')
        .insert(updatedStats)
        .select()
      
      upsertResult = data
      userStatsError = error
      
      console.log('➕ Inserting new XP stats record (v2 table)')
    }

    if (userStatsError) {
      console.error('❌ User stats update/insert error:', {
        message: userStatsError.message,
        details: userStatsError.details,
        hint: userStatsError.hint,
        code: userStatsError.code,
        updatedStats: updatedStats
      })
      
      // エラーが発生した場合でも処理を継続（クイズセッションは既に保存済み）
      console.warn('⚠️ XP stats update failed, but quiz session was saved successfully')
    } else {
      console.log('✅ User stats updated successfully:', {
        previousTotal: existingStats?.total_xp || 0,
        previousSessions: existingStats?.quiz_sessions_completed || 0,
        previousAnswers: existingStats?.quiz_questions_answered || 0,
        addedXP: totalXP,
        addedSessions: 1,
        addedAnswers: body.total_questions,
        newTotal: updatedStats.total_xp,
        newSessions: updatedStats.quiz_sessions_completed,
        newAnswers: updatedStats.quiz_questions_answered,
        newLevel: updatedStats.current_level,
        upsertResult: upsertResult?.length || 0
      })
    }

    // 7. daily_xp_records テーブルの更新（連続日数計算用）
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
      quiz_sessions: (existingDailyRecord?.quiz_sessions || 0) + 1,
      course_sessions: existingDailyRecord?.course_sessions || 0,
      quiz_xp_earned: (existingDailyRecord?.quiz_xp_earned || 0) + totalXP,
      course_xp_earned: existingDailyRecord?.course_xp_earned || 0,
      total_xp_earned: (existingDailyRecord?.total_xp_earned || 0) + totalXP,
      bonus_xp_earned: (existingDailyRecord?.bonus_xp_earned || 0) + bonusXP
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
      console.log('🔄 Updating existing daily XP record')
    } else {
      // 新規記録の挿入
      const { error } = await supabase
        .from('daily_xp_records')
        .insert(dailyRecordData)
      
      dailyRecordError = error
      console.log('➕ Inserting new daily XP record')
    }

    if (dailyRecordError) {
      console.warn('⚠️ Daily XP record update error:', dailyRecordError)
    } else {
      console.log('📅 Daily XP record updated:', {
        date: dateString,
        quizSessions: dailyRecordData.quiz_sessions,
        quizXP: dailyRecordData.quiz_xp_earned,
        totalXP: dailyRecordData.total_xp_earned
      })
    }

    // 8. SKP取引記録を追加
    if (totalSKP > 0) {
      const { error: skpTransactionError } = await supabase
        .from('skp_transactions')
        .insert({
          user_id: userId,
          type: 'earned',
          amount: totalSKP,
          source: `quiz_session_${sessionId}`,
          description: `Quiz session: ${correctAnswers}/${body.total_questions} correct (${body.accuracy_rate}% accuracy)${isPerfect ? ' + Perfect bonus' : ''}`,
          created_at: new Date().toISOString()
        })

      if (skpTransactionError) {
        console.warn('⚠️ SKP transaction recording error:', skpTransactionError)
      } else {
        console.log('💰 SKP transaction recorded:', {
          amount: totalSKP,
          source: `quiz_session_${sessionId}`,
          isPerfect
        })
      }
    }

    // 9. 実際の統計結果を再確認（v2テーブル）
    const { data: verifyStats, error: verifyError } = await supabase
      .from('user_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!verifyError) {
      console.log('🔍 Stats verification after update:', {
        actualTotal: verifyStats.total_xp,
        actualSessions: verifyStats.quiz_sessions_completed,
        actualAnswers: verifyStats.quiz_questions_answered,
        actualTotalSKP: verifyStats.total_skp,
        actualQuizSKP: verifyStats.quiz_skp
      })
    } else {
      console.error('❌ Stats verification failed:', verifyError)
    }

    // 10. 更新されたセッション情報取得
    const { data: updatedSession, error: fetchError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError) {
      throw new Error(`Updated session fetch error: ${fetchError.message}`)
    }

    // 11. カテゴリー別・サブカテゴリー別統計更新
    try {
      // 全回答のカテゴリー・サブカテゴリーを確認
      const allCategories = Array.from(new Set(body.answers.map(a => a.category_id)))
      const allSubcategories = Array.from(new Set(body.answers.map(a => a.subcategory_id || 'general')))
      
      console.log('🔍 All categories/subcategories in session:', {
        allCategories,
        allSubcategories,
        totalAnswers: body.answers.length,
        totalXP
      })

      // カテゴリー別に回答を分類して統計更新
      for (const categoryId of allCategories) {
        const categoryAnswers = body.answers.filter(a => a.category_id === categoryId)
        const categoryCorrectAnswers = categoryAnswers.filter(a => a.is_correct).length
        const categoryTotalQuestions = categoryAnswers.length
        // 正しいXP計算：そのカテゴリーで獲得したXPを積み上げ
        const categoryXP = categoryAnswers
          .filter(a => a.is_correct)
          .reduce((sum, answer) => sum + (answerInserts.find(ai => ai.question_id === answer.question_id)?.earned_xp || 0), 0)

        console.log(`📊 Category ${categoryId} stats:`, {
          categoryAnswers: categoryTotalQuestions,
          categoryCorrect: categoryCorrectAnswers,
          categoryXP
        })

        if (categoryXP > 0) {
          // カテゴリー別統計取得（v2テーブル使用）
          const { data: existingCategoryStats } = await supabase
            .from('user_category_xp_stats_v2')
            .select('*')
            .eq('user_id', userId)
            .eq('category_id', categoryId)
            .single()

          // カテゴリー別統計更新（そのカテゴリーの分のみ）
          const newQuestionsCategoryAnswered = (existingCategoryStats?.quiz_questions_answered || 0) + categoryTotalQuestions
          const newQuestionsCategoryCorrect = (existingCategoryStats?.quiz_questions_correct || 0) + categoryCorrectAnswers
          const newCategoryTotalXP = (existingCategoryStats?.total_xp || 0) + categoryXP
        
          const { error: categoryStatsError } = await supabase
            .from('user_category_xp_stats_v2')
            .upsert({
              user_id: userId,
              category_id: categoryId,
              total_xp: newCategoryTotalXP,
              current_level: Math.floor(newCategoryTotalXP / 500) + 1, // メインカテゴリーは500XP/レベル
              quiz_xp: (existingCategoryStats?.quiz_xp || 0) + categoryXP,
              quiz_sessions_completed: (existingCategoryStats?.quiz_sessions_completed || 0) + 1,
              quiz_questions_answered: newQuestionsCategoryAnswered,
              quiz_questions_correct: newQuestionsCategoryCorrect,
              quiz_average_accuracy: Math.round((newQuestionsCategoryCorrect / newQuestionsCategoryAnswered) * 100 * 100) / 100,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,category_id' })

          if (categoryStatsError) {
            console.error('❌ Category stats update error:', {
              error: categoryStatsError,
              categoryId,
              userId: userId.substring(0, 8) + '...',
              data: {
                total_xp: newCategoryTotalXP,
                quiz_xp: (existingCategoryStats?.quiz_xp || 0) + categoryXP,
                quiz_sessions_completed: (existingCategoryStats?.quiz_sessions_completed || 0) + 1,
                quiz_questions_answered: newQuestionsCategoryAnswered,
                quiz_questions_correct: newQuestionsCategoryCorrect,
                quiz_average_accuracy: Math.round((newQuestionsCategoryCorrect / newQuestionsCategoryAnswered) * 100 * 100) / 100
              }
            })
          } else {
            console.log('✅ Category stats updated successfully:', { categoryId, newXP: newCategoryTotalXP })
          }
        }
      }

      // サブカテゴリー別統計更新
      for (const categoryId of allCategories) {
        const categoryAnswers = body.answers.filter(a => a.category_id === categoryId)
        const subcategoriesInCategory = Array.from(new Set(categoryAnswers.map(a => a.subcategory_id || 'general')))
        
        for (const subcategoryId of subcategoriesInCategory) {
          const subcategoryAnswers = categoryAnswers.filter(a => (a.subcategory_id || 'general') === subcategoryId)
          const subcategoryCorrectAnswers = subcategoryAnswers.filter(a => a.is_correct).length
          const subcategoryTotalQuestions = subcategoryAnswers.length
          // 正しいXP計算：そのサブカテゴリーで獲得したXPを積み上げ
          const subcategoryXP = subcategoryAnswers
            .filter(a => a.is_correct)
            .reduce((sum, answer) => sum + (answerInserts.find(ai => ai.question_id === answer.question_id)?.earned_xp || 0), 0)

          console.log(`📊 Subcategory ${categoryId}/${subcategoryId} stats:`, {
            subcategoryAnswers: subcategoryTotalQuestions,
            subcategoryCorrect: subcategoryCorrectAnswers,
            subcategoryXP
          })

          if (subcategoryXP > 0) {
            // サブカテゴリー別統計取得（v2テーブル使用）
            const { data: existingSubcategoryStats } = await supabase
              .from('user_subcategory_xp_stats_v2')
              .select('*')
              .eq('user_id', userId)
              .eq('category_id', categoryId)
              .eq('subcategory_id', subcategoryId)
              .single()

            // サブカテゴリー別統計更新（そのサブカテゴリーの分のみ）
            const newQuestionsSubcategoryAnswered = (existingSubcategoryStats?.quiz_questions_answered || 0) + subcategoryTotalQuestions
            const newQuestionsSubcategoryCorrect = (existingSubcategoryStats?.quiz_questions_correct || 0) + subcategoryCorrectAnswers
            const newSubcategoryTotalXP = (existingSubcategoryStats?.total_xp || 0) + subcategoryXP

            const { error: subcategoryStatsError } = await supabase
              .from('user_subcategory_xp_stats_v2')
              .upsert({
                user_id: userId,
                category_id: categoryId,
                subcategory_id: subcategoryId,
                total_xp: newSubcategoryTotalXP,
                current_level: Math.floor(newSubcategoryTotalXP / 500) + 1, // サブカテゴリーも500XP/レベル
                quiz_xp: (existingSubcategoryStats?.quiz_xp || 0) + subcategoryXP,
                quiz_sessions_completed: (existingSubcategoryStats?.quiz_sessions_completed || 0) + 1,
                quiz_questions_answered: newQuestionsSubcategoryAnswered,
                quiz_questions_correct: newQuestionsSubcategoryCorrect,
                quiz_average_accuracy: Math.round((newQuestionsSubcategoryCorrect / newQuestionsSubcategoryAnswered) * 100 * 100) / 100,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id,category_id,subcategory_id' })

            if (subcategoryStatsError) {
              console.error('❌ Subcategory stats update error:', {
                error: subcategoryStatsError,
                categoryId,
                subcategoryId,
                userId: userId.substring(0, 8) + '...',
                data: {
                  total_xp: newSubcategoryTotalXP,
                  quiz_xp: (existingSubcategoryStats?.quiz_xp || 0) + subcategoryXP,
                  quiz_sessions_completed: (existingSubcategoryStats?.quiz_sessions_completed || 0) + 1,
                  quiz_questions_answered: newQuestionsSubcategoryAnswered,
                  quiz_questions_correct: newQuestionsSubcategoryCorrect,
                  quiz_average_accuracy: Math.round((newQuestionsSubcategoryCorrect / newQuestionsSubcategoryAnswered) * 100 * 100) / 100
                }
              })
            } else {
              console.log('✅ Subcategory stats updated successfully:', { categoryId, subcategoryId, newXP: newSubcategoryTotalXP })
            }
          }
        }
      }

      console.log('✅ All category/subcategory stats processing completed')
    } catch (categoryError) {
      console.warn('⚠️ Category stats update failed:', categoryError)
    }

    // 12. 継続学習ボーナスSKP計算・付与（自動実行）
    let streakBonusResult = null
    try {
      console.log('🔥 Auto-triggering streak bonus calculation after quiz completion...')
      
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
      // エラーが発生してもクイズ保存は成功として扱う
    }

    console.log(`✅ Quiz XP Save Success: Session ${sessionId}, Total XP: ${updatedSession.total_xp}`)

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      total_xp: updatedSession.total_xp,
      bonus_xp: updatedSession.bonus_xp,
      wisdom_cards_awarded: updatedSession.wisdom_cards_awarded,
      streak_bonus: streakBonusResult,
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
