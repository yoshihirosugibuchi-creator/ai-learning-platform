import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

interface QuizCreateRequest {
  session_id: string
  question: string
  options: Array<{ text: string; isCorrect: boolean }> | string[]
  correct_answer: number
  explanation: string
  quiz_type?: 'single_choice' | 'multiple_choice'
  display_order?: number
}

interface QuizUpdateRequest {
  question?: string
  options?: Array<{ text: string; isCorrect: boolean }> | string[]
  correct_answer?: number
  explanation?: string
  quiz_type?: 'single_choice' | 'multiple_choice'
  display_order?: number
}

// ID生成関数（既存パターンに合わせた英数記号）
const generateQuizId = (session_id: string, display_order: number): string => {
  // session_id_quiz_order パターン
  const orderNum = display_order || 1
  return `${session_id}_quiz_${orderNum}`
}

// クイズ作成（POST）
export async function POST(request: NextRequest) {
  try {
    // 認証確認
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const body: QuizCreateRequest = await request.json()
    const { session_id, question, options, correct_answer, explanation, quiz_type, display_order } = body

    // 必須フィールド検証
    if (!session_id || !question || !options || correct_answer === undefined || !explanation) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, question, options, correct_answer, explanation' },
        { status: 400 }
      )
    }

    // quiz_type検証（Phase1-3対応）
    const validQuizTypes = ['single_choice', 'multiple_choice', 'true_false', 'sorting', 'fill_blank', 'essay']
    const finalQuizType = quiz_type || 'single_choice'
    if (!validQuizTypes.includes(finalQuizType)) {
      return NextResponse.json(
        { error: `Invalid quiz_type. Must be one of: ${validQuizTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // options配列検証
    if (!Array.isArray(options) || options.length === 0) {
      return NextResponse.json(
        { error: 'Options must be a non-empty array' },
        { status: 400 }
      )
    }

    // correct_answer範囲検証
    if (correct_answer < 0 || correct_answer >= options.length) {
      return NextResponse.json(
        { error: `correct_answer (${correct_answer}) must be between 0 and ${options.length - 1}` },
        { status: 400 }
      )
    }

    // セッション存在確認
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: `Session not found: ${session_id}` },
        { status: 404 }
      )
    }

    // display_order がない場合、既存クイズ数+1を設定
    let finalDisplayOrder = display_order
    if (!finalDisplayOrder) {
      const { data: existingQuizzes } = await supabaseAdmin
        .from('session_quizzes')
        .select('display_order')
        .eq('session_id', session_id)
        .order('display_order', { ascending: false })
        .limit(1)

      finalDisplayOrder = existingQuizzes && existingQuizzes.length > 0 
        ? (existingQuizzes[0].display_order || 0) + 1 
        : 1
    }

    // options を JSONB 形式に変換
    let optionsJsonb: any = options
    
    // 文字列配列の場合、選択肢オブジェクト配列に変換
    if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'string') {
      optionsJsonb = (options as string[]).map((text, index) => ({
        text,
        isCorrect: index === correct_answer
      }))
    }

    // ID生成（重複チェック付き）
    let quizId = generateQuizId(session_id, finalDisplayOrder)
    let counter = 1
    const maxAttempts = 10

    while (counter <= maxAttempts) {
      const { data: existing } = await supabaseAdmin
        .from('session_quizzes')
        .select('id')
        .eq('id', quizId)
        .single()

      if (!existing) break

      quizId = `${generateQuizId(session_id, finalDisplayOrder)}_${counter}`
      counter++
    }

    if (counter > maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique quiz ID' },
        { status: 500 }
      )
    }

    // クイズ作成
    const quizData = {
      id: quizId,
      session_id,
      question,
      options: optionsJsonb,
      correct_answer,
      explanation,
      quiz_type: finalQuizType,
      display_order: finalDisplayOrder
    }

    const { data: newQuiz, error: insertError } = await supabaseAdmin
      .from('session_quizzes')
      .insert([quizData])
      .select()
      .single()

    if (insertError) {
      console.error('Quiz insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create quiz', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      quiz: newQuiz,
      message: `Quiz created: ${quizId}`
    })

  } catch (error) {
    console.error('Quiz creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// クイズ一覧取得（GET）
export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const { userId } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')
    const quiz_type = searchParams.get('quiz_type')

    let query = supabaseAdmin
      .from('session_quizzes')
      .select(`
        *,
        learning_sessions!inner(id, title, theme_id)
      `)
      .order('display_order', { ascending: true })

    if (session_id) {
      query = query.eq('session_id', session_id)
    }

    if (quiz_type) {
      query = query.eq('quiz_type', quiz_type)
    }

    const { data: quizzes, error } = await query

    if (error) {
      console.error('Quizzes fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch quizzes', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      quizzes: quizzes || []
    })

  } catch (error) {
    console.error('Quizzes GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// クイズ更新（PATCH）
export async function PATCH(request: NextRequest) {
  try {
    // 認証確認
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const body: QuizUpdateRequest & { id: string } = await request.json()
    const { id, quiz_type, options, correct_answer, ...otherUpdateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // quiz_type検証（Phase1-3対応）
    if (quiz_type) {
      const validQuizTypes = ['single_choice', 'multiple_choice', 'true_false', 'sorting', 'fill_blank', 'essay']
      if (!validQuizTypes.includes(quiz_type)) {
        return NextResponse.json(
          { error: `Invalid quiz_type. Must be one of: ${validQuizTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // options検証（提供された場合）
    if (options) {
      if (!Array.isArray(options) || options.length === 0) {
        return NextResponse.json(
          { error: 'Options must be a non-empty array' },
          { status: 400 }
        )
      }

      // correct_answer検証（optionsと一緒に提供された場合）
      if (correct_answer !== undefined && (correct_answer < 0 || correct_answer >= options.length)) {
        return NextResponse.json(
          { error: `correct_answer (${correct_answer}) must be between 0 and ${options.length - 1}` },
          { status: 400 }
        )
      }
    }

    // 更新データ準備
    const updateData: any = { ...otherUpdateData }
    
    if (quiz_type) updateData.quiz_type = quiz_type
    if (correct_answer !== undefined) updateData.correct_answer = correct_answer
    
    if (options) {
      // options を JSONB 形式に変換
      if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'string') {
        updateData.options = (options as string[]).map((text, index) => ({
          text,
          isCorrect: index === (correct_answer ?? 0)
        }))
      } else {
        updateData.options = options
      }
    }

    // 更新データから undefined を除去
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const { data: updatedQuiz, error: updateError } = await supabaseAdmin
      .from('session_quizzes')
      .update(cleanUpdateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Quiz update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update quiz', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedQuiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      quiz: updatedQuiz,
      message: `Quiz updated: ${id}`
    })

  } catch (error) {
    console.error('Quiz PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}