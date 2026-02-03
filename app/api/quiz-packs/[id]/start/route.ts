import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserAskedQuestions, selectQuestionsWithPriority } from '@/lib/quiz-question-history'

/**
 * クイズパック セッション開始API
 * POST /api/quiz-packs/[id]/start
 *
 * パックの条件に基づいて問題を選択し、クイズセッションを開始
 * 問題選択優先度:
 * 1. 未出題問題 (70%目標)
 * 2. 過去出題で7日以上経過した問題 (忘却曲線対応)
 * 3. 直近7日に回答した問題 (最後の手段)
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証確認
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { id: packId } = await params

    console.log('🎯 [Quiz Pack Start] Starting pack quiz:', { packId, userId: user.id })

    // パック情報を取得
    const { data: pack, error: packError } = await supabaseAdmin
      .from('quiz_packs')
      .select('*')
      .eq('id', packId)
      .eq('is_published', true)
      .single()

    if (packError || !pack) {
      console.log('❌ [Quiz Pack Start] Pack not found:', packError)
      return NextResponse.json(
        { success: false, error: 'パックが見つかりません' },
        { status: 404 }
      )
    }

    // JSONB型をキャスト
    const packCategories = pack.categories as string[] | null
    const packSubcategories = pack.subcategories as string[] | null
    const packDifficulties = pack.difficulties as string[] | null

    console.log('📋 [Quiz Pack Start] Pack found:', {
      name: pack.name,
      categories: packCategories,
      difficulties: packDifficulties,
      question_count: pack.question_count
    })

    // 進行中のセッションがあれば再開
    const { data: existingSession } = await supabaseAdmin
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSession) {
      console.log('🔄 [Quiz Pack Start] Resuming existing session:', existingSession.id)
      return NextResponse.json({
        success: true,
        session_id: existingSession.id,
        is_resume: true,
        current_question: existingSession.current_question_index || 0,
        total_questions: existingSession.total_questions
      })
    }

    // ユーザーの過去回答履歴を取得（優先度選択用）
    const questionHistory = await getUserAskedQuestions(user.id)

    console.log('📊 [Quiz Pack Start] Question history:', {
      recentCount: questionHistory.recentQuestions.size,
      totalCount: questionHistory.totalQuestions.size
    })

    // パック条件に基づいて問題を検索
    let questionsQuery = supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory_id, difficulty')
      .or('is_deleted.is.null,is_deleted.eq.false')

    // カテゴリーフィルター
    if (packCategories && packCategories.length > 0) {
      questionsQuery = questionsQuery.in('category_id', packCategories)
    }

    // サブカテゴリーフィルター（指定がある場合のみ）
    if (packSubcategories && packSubcategories.length > 0) {
      questionsQuery = questionsQuery.in('subcategory_id', packSubcategories)
    }

    // 難易度フィルター
    if (packDifficulties && packDifficulties.length > 0) {
      questionsQuery = questionsQuery.in('difficulty', packDifficulties)
    }

    const { data: candidateQuestions, error: questionsError } = await questionsQuery

    if (questionsError) {
      console.error('❌ [Quiz Pack Start] Questions fetch error:', questionsError)
      return NextResponse.json(
        { success: false, error: '問題の取得に失敗しました' },
        { status: 500 }
      )
    }

    console.log('📋 [Quiz Pack Start] Candidate questions found:', candidateQuestions?.length || 0)

    if (!candidateQuestions || candidateQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: '条件に合う問題がありません' },
        { status: 400 }
      )
    }

    // 優先度に基づいて問題を選択
    // 1. 未出題問題 (70%目標)
    // 2. 過去出題で7日以上経過した問題 (忘却曲線対応)
    // 3. 直近7日に回答した問題 (最後の手段)
    const selectedQuestions = selectQuestionsWithPriority(
      candidateQuestions,
      questionHistory,
      pack.question_count
    )
    const questionIds = selectedQuestions.map(q => q.id)

    console.log('✅ [Quiz Pack Start] Selected questions:', questionIds.length)

    // カテゴリー・サブカテゴリー情報を取得（セッション作成用）
    const categoryId = selectedQuestions[0]?.category_id
    const subcategoryId = selectedQuestions[0]?.subcategory_id

    // クイズセッションを作成
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        pack_id: packId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        total_questions: questionIds.length,
        question_ids: questionIds,
        status: 'in_progress',
        current_question_index: 0,
        correct_answers: 0,
        quiz_type: 'pack'
      })
      .select()
      .single()

    if (sessionError || !session) {
      console.error('❌ [Quiz Pack Start] Session creation error:', sessionError)
      console.error('Insert data:', {
        user_id: user.id,
        pack_id: packId,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        total_questions: questionIds.length,
        question_ids_count: questionIds.length
      })
      return NextResponse.json(
        { success: false, error: `セッションの作成に失敗しました: ${sessionError?.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    console.log('✅ [Quiz Pack Start] Session created:', session.id)

    return NextResponse.json({
      success: true,
      session_id: session.id,
      is_resume: false,
      current_question: 0,
      total_questions: questionIds.length,
      pack_name: pack.name
    }, { status: 201 })

  } catch (error) {
    console.error('❌ [Quiz Pack Start] Error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
