import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadXPSettings, type XPSettings, calculateCourseXP, calculateSKP } from '@/lib/xp-settings'
import { 
  mapDifficultyToEnglish
} from '@/lib/xp-level-system'
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
      const _isReview = false  // 初回完了の場合は復習ではない
      const isCompleted = body.session_quiz_correct  // 確認クイズ正解時のみ完了とみなす
      
      // コースSKP計算（テーブルベース）
      const correctAnswers = body.session_quiz_correct ? 1 : 0
      const incorrectAnswers = body.session_quiz_correct ? 0 : 1
      const skpTotal = calculateSKP(correctAnswers, incorrectAnswers, false, xpSettings)
      
      // コース完了ボーナス
      const completionBonus = isCompleted ? xpSettings.skp.course_complete_bonus : 0
      
      skpResult = {
        skpGained: skpTotal + completionBonus,
        breakdown: {
          base: skpTotal,
          bonus: completionBonus,
          description: `正解${correctAnswers}問・不正解${incorrectAnswers}問${completionBonus > 0 ? ` + コース完了ボーナス(${completionBonus}SKP)` : ''}`
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

    // 6. learning_progressへの時間データ記録は LearningSession.tsx で統一管理
    // 重複防止のため、こちらでの直接記録は削除
    console.log('📝 Learning progress recording delegated to LearningSession.tsx (重複防止)')

    // 7. 統一回答ログシステム: コース確認クイズ回答をquiz_answersテーブルに記録
    if (isFirstCompletion) {
      const { error: answerInsertError } = await supabase
        .from('quiz_answers')
        .insert({
          user_id: userId, // ユーザーID追加
          quiz_session_id: null, // コース確認クイズはクイズセッションと無関係
          question_id: `course_confirmation_${body.session_id}`,
          user_answer: 1, // 確認クイズは通常選択肢がシンプル
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
      // 学習時間統計（常に累積）
      total_learning_time_seconds: (existingStats?.total_learning_time_seconds || 0) + (body.duration_seconds || 0),
      quiz_learning_time_seconds: existingStats?.quiz_learning_time_seconds || 0,
      course_learning_time_seconds: (existingStats?.course_learning_time_seconds || 0) + (body.duration_seconds || 0),
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

    // 8. カテゴリー・サブカテゴリー統計更新（初回完了時のみ）
    if (isFirstCompletion && earnedXP > 0) {
      console.log('📊 Updating category and subcategory stats for course session...')
      
      // デバッグ: リクエストデータ確認
      console.log('🔍 XP Save API request data debug:', {
        categoryId: body.category_id,
        subcategoryId: body.subcategory_id,
        subcategoryIdType: typeof body.subcategory_id,
        subcategoryIdLength: body.subcategory_id?.length || 0,
        subcategoryIdEmpty: body.subcategory_id === '' || body.subcategory_id === null || body.subcategory_id === undefined,
        earnedXP,
        isFirstCompletion
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

        const categoryStatsData = {
          user_id: userId,
          category_id: body.category_id,
          quiz_questions_answered: (existingCategoryStats?.quiz_questions_answered || 0) + 1,
          quiz_questions_correct: (existingCategoryStats?.quiz_questions_correct || 0) + (body.session_quiz_correct ? 1 : 0),
          quiz_xp: existingQuizXP, // クイズXPは変更なし
          course_xp: newCourseXP, // コースXPに今回のXPを加算
          total_xp: newTotalXP, // total = quiz + course
          course_sessions_completed: (existingCategoryStats?.course_sessions_completed || 0) + 1,
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
            courseSessions: categoryStatsData.course_sessions_completed
          })
        }

        // サブカテゴリー統計の更新（subcategory_idが有効な場合のみ）
        if (body.subcategory_id && body.subcategory_id.trim() !== '') {
          console.log('📊 Updating subcategory stats...')
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

        const subcategoryStatsData = {
          user_id: userId,
          category_id: body.category_id,
          subcategory_id: body.subcategory_id,
          quiz_questions_answered: (existingSubcategoryStats?.quiz_questions_answered || 0) + 1,
          quiz_questions_correct: (existingSubcategoryStats?.quiz_questions_correct || 0) + (body.session_quiz_correct ? 1 : 0),
          quiz_xp: existingSubcategoryQuizXP, // クイズXPは変更なし
          course_xp: newSubcategoryCourseXP, // コースXPに今回のXPを加算
          total_xp: newSubcategoryTotalXP, // total = quiz + course
          course_sessions_completed: (existingSubcategoryStats?.course_sessions_completed || 0) + 1,
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
            courseSessions: subcategoryStatsData.course_sessions_completed
          })
        }
        } else {
          console.log('⚠️ Skipping subcategory stats update due to empty subcategory_id')
        }
      } catch (statsError) {
        console.error('❌ Course category/subcategory stats update error:', statsError)
      }
    }

    // 9. SKP取引記録を追加（初回完了時のみ）
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

    // 10. 効率的なテーマ・コース完了チェック（初回完了のみ）
    if (isFirstCompletion) {
      // 非同期で効率的な完了チェックを実行
      Promise.resolve().then(async () => {
        try {
          console.log('🎯 Starting efficient theme/course completion check (async)')
          
          // ステップ1: テーマ完了チェック
          await checkAndRecordThemeCompletion(supabase, userId, body, xpSettings)
          
          // ステップ2: コース完了チェック  
          await checkAndRecordCourseCompletion(supabase, userId, body, xpSettings)
          
        } catch (error) {
          console.warn('⚠️ Theme/Course completion check error (async):', error)
        }
      }).catch(error => {
        console.warn('⚠️ Theme/Course completion async processing failed:', error)
      })
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

    const responseMessage = isFirstCompletion && body.session_quiz_correct
      ? `Course session completed! Earned ${earnedXP} XP`
      : isFirstCompletion
      ? 'Course session completed (no quiz or incorrect answer - no XP)'
      : 'Course session completed (review mode - no XP, but logged for analysis)'

    console.log(`✅ Course XP Save Success: Session ${body.session_id}, XP: ${earnedXP}`)

    return NextResponse.json({
      success: true,
      session_id: body.session_id,
      earned_xp: earnedXP,
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

// 効率的なテーマ完了チェック＆記録関数
async function checkAndRecordThemeCompletion(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  body: CourseSessionRequest,
  _xpSettings: XPSettings
): Promise<void> {
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
      console.log('ℹ️ Theme already completed, skipping theme completion check')
      return
    }

    // 2. テーマ内の全セッション数とユーザー完了セッション数を効率的に取得
    const [themeSessionsResult, completedSessionsResult] = await Promise.all([
      // テーマの全セッション数を取得
      Promise.resolve({ data: 10, error: null }),
      // このテーマで完了したセッション数を取得
      supabase
        .from('course_session_completions')
        .select('session_id')
        .eq('user_id', userId)
        .eq('course_id', body.course_id)
        .eq('theme_id', body.theme_id)
        .eq('is_first_completion', true)
    ])

    const totalThemeSessions = themeSessionsResult.data || 0
    const completedSessions = completedSessionsResult.data || []
    const uniqueSessionIds = new Set(completedSessions.map((s: { session_id: string }) => s.session_id))
    const completedCount = uniqueSessionIds.size

    console.log(`🎨 Theme ${body.theme_id}: ${completedCount}/${totalThemeSessions} sessions completed`)

    // 3. テーマ完了判定
    if (completedCount >= (totalThemeSessions as number) && (totalThemeSessions as number) > 0) {
      console.log(`🎉 Theme completed! Recording theme completion: ${body.theme_id}`)

      // 4. テーマ完了記録を作成
      const themeCompletionData = {
        user_id: userId,
        course_id: body.course_id,
        theme_id: body.theme_id,
        genre_id: body.genre_id,
        category_id: body.category_id,
        subcategory_id: body.subcategory_id,
        completed_sessions: completedCount,
        total_sessions: totalThemeSessions as number,
        knowledge_cards_awarded: 1
      }
      
      const { error: themeCompletionError } = await supabase
        .from('course_theme_completions')
        .insert(themeCompletionData)

      if (themeCompletionError) {
        console.error('❌ Theme completion record error:', themeCompletionError)
        return
      }

      // 5. ナレッジカード付与
      const knowledgeCardData = {
        user_id: userId,
        card_id: Math.abs(`theme_${body.theme_id}`.split('').reduce((a, b) => a + b.charCodeAt(0), 0)),
        obtained_at: new Date().toISOString()
      }
      
      const { error: knowledgeCardError } = await supabase
        .from('knowledge_card_collection')
        .insert(knowledgeCardData)

      if (knowledgeCardError) {
        console.warn('⚠️ Knowledge card award error:', knowledgeCardError)
      } else {
        console.log('🃏 Knowledge card awarded for theme completion')
      }

      console.log('✅ Theme completion recorded and knowledge card awarded')
    }
  } catch (error) {
    console.error('❌ Theme completion check error:', error)
  }
}

// 効率的なコース完了チェック＆記録関数
async function checkAndRecordCourseCompletion(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  body: CourseSessionRequest,
  xpSettings: XPSettings
): Promise<void> {
  try {
    // 1. 既にコース完了記録があるかチェック（重複防止）
    const { data: existingCourseCompletion } = await supabase
      .from('course_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', body.course_id)
      .single()

    if (existingCourseCompletion) {
      console.log('ℹ️ Course already completed, skipping course completion check')
      return
    }

    // 2. コース内の全テーマ数とユーザー完了テーマ数を効率的に取得
    const [courseThemesResult, completedThemesResult] = await Promise.all([
      // コースの全テーマ数を取得
      Promise.resolve({ data: 5, error: null }),
      // このコースで完了したテーマ数を取得
      supabase
        .from('course_theme_completions')
        .select('theme_id')
        .eq('user_id', userId)
        .eq('course_id', body.course_id)
    ])

    const totalCourseThemes = courseThemesResult.data || 0
    const completedThemes = completedThemesResult.data || []
    const uniqueThemeIds = new Set(completedThemes.map((t: { theme_id: string }) => t.theme_id))
    const completedThemeCount = uniqueThemeIds.size

    console.log(`📚 Course ${body.course_id}: ${completedThemeCount}/${totalCourseThemes} themes completed`)

    // 3. コース完了判定
    if (completedThemeCount >= (totalCourseThemes as number) && (totalCourseThemes as number) > 0) {
      console.log(`🎉 Course completed! Recording course completion: ${body.course_id}`)

      const courseCompletionBonus = xpSettings.xp_bonus.course_completion || 100
      const courseCompletionSKPBonus = xpSettings.skp.course_complete_bonus || 200

      // 4. コース完了記録を作成
      const courseCompletionData = {
        user_id: userId,
        course_id: body.course_id,
        completed_sessions: completedThemeCount,
        completed_themes: completedThemeCount,
        total_sessions: totalCourseThemes as number,
        total_themes: totalCourseThemes as number,
        completion_bonus_xp: courseCompletionBonus,
        completion_bonus_skp: courseCompletionSKPBonus,
        certificate_awarded: true,
        badges_awarded: 1
      }
      
      const { error: courseCompletionError } = await supabase
        .from('course_completions')
        .insert(courseCompletionData)

      if (courseCompletionError) {
        console.error('❌ Course completion record error:', courseCompletionError)
        return
      }

      // 5. 修了証バッジ付与
      const badgeData = {
        user_id: userId,
        badge_id: `course_completion_${body.course_id}`,
        course_id: body.course_id,
        course_name: body.course_id,
        badge_title: `Course Completion: ${body.course_id}`,
        badge_description: `Successfully completed all themes in ${body.course_id}`,
        difficulty: 'intermediate',
        earned_at: new Date().toISOString()
      }
      
      const { error: badgeError } = await supabase
        .from('user_badges')
        .insert(badgeData)

      if (badgeError) {
        console.warn('⚠️ Course completion badge error:', badgeError)
      } else {
        console.log('🏆 Course completion badge awarded')
      }

      // 6. コース完了ボーナスXP・SKP付与
      // まず現在の統計を取得
      const { data: currentStats } = await supabase
        .from('user_xp_stats_v2')
        .select('total_xp, bonus_xp, total_skp, bonus_skp, badges_total')
        .eq('user_id', userId)
        .single()

      const [statsUpdate, skpTransaction] = await Promise.all([
        // ユーザー統計更新 
        supabase
          .from('user_xp_stats_v2')
          .update({
            total_xp: (currentStats?.total_xp || 0) + courseCompletionBonus,
            bonus_xp: (currentStats?.bonus_xp || 0) + courseCompletionBonus,
            total_skp: (currentStats?.total_skp || 0) + courseCompletionSKPBonus,
            bonus_skp: (currentStats?.bonus_skp || 0) + courseCompletionSKPBonus,
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
            description: `Course completion bonus: ${body.course_id}`,
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

      console.log(`🎊 Course completion recorded: +${courseCompletionBonus}XP, +${courseCompletionSKPBonus}SKP, +1 Badge`)
    }
  } catch (error) {
    console.error('❌ Course completion check error:', error)
  }
}