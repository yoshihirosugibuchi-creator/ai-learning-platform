import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// ヒントデータの型定義
interface HintData {
  level1: string | null
  level2: string | null  
  level3: string | null
}

/**
 * 指定問題のヒント情報を取得
 * GET /api/questions/[id]/hints
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const questionId = parseInt(resolvedParams.id)
    if (isNaN(questionId)) {
      return NextResponse.json(
        { error: '無効な問題IDです' },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching hints for question ID: ${questionId}`)

    // 問題の存在確認
    const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      console.error('❌ Question not found:', questionError)
      return NextResponse.json(
        { error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    // 統合テーブルからヒント情報取得
    const { data: questionWithHints, error: hintsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('level1_hint, level2_hint, level3_hint')
      .eq('id', questionId)
      .single()

    if (hintsError) {
      console.error('❌ Error fetching hints:', hintsError)
      return NextResponse.json(
        { error: 'ヒント情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // ヒントデータ整形
    const hintData: HintData = {
      level1: questionWithHints?.level1_hint || null,
      level2: questionWithHints?.level2_hint || null,
      level3: questionWithHints?.level3_hint || null
    }

    console.log(`✅ Hints fetched for question ${questionId}:`, {
      hasLevel1: !!hintData.level1,
      hasLevel2: !!hintData.level2,
      hasLevel3: !!hintData.level3
    })

    return NextResponse.json({
      success: true,
      questionId: questionId,
      hints: hintData,
      available: !!(hintData.level1 || hintData.level2 || hintData.level3)
    })

  } catch (error) {
    console.error('❌ Error in hints API:', error)
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 問題のヒント情報を作成・更新（管理者のみ）
 * POST /api/questions/[id]/hints
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const questionId = parseInt(resolvedParams.id)
    if (isNaN(questionId)) {
      return NextResponse.json(
        { error: '無効な問題IDです' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { level1, level2, level3 } = body

    console.log(`📝 Creating/updating hints for question ID: ${questionId}`)

    // 問題の存在確認
    const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .eq('id', questionId)
      .single()

    if (questionError || !question) {
      return NextResponse.json(
        { error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    // 統合テーブルでヒント情報を更新
    const { data: updatedQuestion, error: hintsError } = await supabaseAdmin
      .from('quiz_questions')
      .update({
        level1_hint: level1 || null,
        level2_hint: level2 || null,
        level3_hint: level3 || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select('level1_hint, level2_hint, level3_hint')
      .single()

    if (hintsError) {
      console.error('❌ Error saving hints:', hintsError)
      return NextResponse.json(
        { error: 'ヒント情報の保存に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ Hints saved for question ${questionId}`)

    return NextResponse.json({
      success: true,
      questionId: questionId,
      hints: {
        level1: updatedQuestion.level1_hint,
        level2: updatedQuestion.level2_hint,
        level3: updatedQuestion.level3_hint
      },
      message: 'ヒント情報を保存しました'
    })

  } catch (error) {
    console.error('❌ Error in hints POST API:', error)
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}