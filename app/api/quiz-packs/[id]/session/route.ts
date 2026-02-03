import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * クイズパック セッション情報取得API
 * GET /api/quiz-packs/[id]/session?session_id=xxx
 *
 * セッションIDに基づいて問題データを取得
 */

export async function GET(
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
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'session_idが必要です' },
        { status: 400 }
      )
    }

    // セッション情報を取得
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    // パック情報を取得
    const { data: pack } = await supabaseAdmin
      .from('quiz_packs')
      .select('id, name, icon_emoji, color_theme')
      .eq('id', packId)
      .single()

    // 問題データを取得（JSONB型をキャスト）
    const questionIds = (session.question_ids as number[] | null) || []

    if (questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '問題がありません' },
        { status: 400 }
      )
    }

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .in('id', questionIds)

    if (questionsError || !questions) {
      return NextResponse.json(
        { success: false, error: '問題の取得に失敗しました' },
        { status: 500 }
      )
    }

    // question_idsの順序を維持（idは数値型）
    const orderedQuestions = questionIds
      .map((id) => questions.find(q => q.id === id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined)

    // サブカテゴリー・カテゴリーの日本語名を取得
    const uniqueSubcategoryIds = [...new Set(orderedQuestions.map(q => q.subcategory_id).filter((id): id is string => Boolean(id)))]
    const uniqueCategoryIds = [...new Set(orderedQuestions.map(q => q.category_id).filter((id): id is string => Boolean(id)))]

    // サブカテゴリー名を取得
    const subcategoryNameMap = new Map<string, string>()
    if (uniqueSubcategoryIds.length > 0) {
      const { data: subcategories } = await supabaseAdmin
        .from('subcategories')
        .select('subcategory_id, name')
        .in('subcategory_id', uniqueSubcategoryIds)

      subcategories?.forEach(sc => {
        subcategoryNameMap.set(sc.subcategory_id, sc.name)
      })
    }

    // カテゴリー名を取得
    const categoryNameMap = new Map<string, string>()
    if (uniqueCategoryIds.length > 0) {
      const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('category_id, name')
        .in('category_id', uniqueCategoryIds)

      categories?.forEach(cat => {
        categoryNameMap.set(cat.category_id, cat.name)
      })
    }

    // QuizSession用のQuestion形式に変換（日本語名を含む）
    const formattedQuestions = orderedQuestions.map((q) => ({
      id: q.id,
      category: q.category_id,
      subcategory: q.subcategory_id || '',
      subcategory_id: q.subcategory_id || undefined,
      category_name: categoryNameMap.get(q.category_id) || q.category_id,
      subcategory_name: q.subcategory_id ? (subcategoryNameMap.get(q.subcategory_id) || q.subcategory_id) : '',
      difficulty: q.difficulty || 'basic',
      question: q.question,
      options: [q.option1, q.option2, q.option3, q.option4],
      correct: q.correct_answer,  // 0-based in database
      explanation: q.explanation || '',
      timeLimit: q.time_limit || 60,
      relatedTopics: [],
      source: null,
      level1_hint: q.level1_hint,
      level2_hint: q.level2_hint,
      level3_hint: q.level3_hint
    }))

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        current_question_index: session.current_question_index || 0,
        correct_answers: session.correct_answers || 0,
        total_questions: session.total_questions
      },
      pack,
      questions: formattedQuestions
    })

  } catch (error) {
    console.error('Quiz pack session error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
