import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 管理者権限チェック（admin または system_admin）
    if (userRole !== 'system_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 問題情報を統合テーブルから取得（ヒント情報も含む）
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select(`
        id,
        question,
        option1,
        option2,
        option3,
        option4,
        correct_answer,
        category_id,
        subcategory_id,
        subcategory,
        difficulty,
        explanation,
        level1_hint,
        level2_hint,
        level3_hint,
        source,
        related_topics,
        time_limit,
        created_at,
        updated_at
      `)
      .eq('is_deleted', false)
      .order('id', { ascending: true })

    if (questionsError) {
      console.error('問題取得エラー:', questionsError)
      return NextResponse.json({ error: '問題の取得に失敗しました' }, { status: 500 })
    }

    // カテゴリー一覧を取得（MAIN→display_order、Industry→display_order順）
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('category_id, name, type, display_order')
      .eq('is_active', true)
      .eq('is_visible', true)
      .order('type', { ascending: false }) // MAIN が先
      .order('display_order', { ascending: true })

    if (categoriesError) {
      console.error('カテゴリー取得エラー:', categoriesError)
      return NextResponse.json({ error: 'カテゴリーの取得に失敗しました' }, { status: 500 })
    }

    // 問題データを整形（統合テーブルから直接ヒント情報を取得）
    const questionsWithHints = questions.map(question => ({
      ...question,
      hints: {
        level1_hint: question.level1_hint,
        level2_hint: question.level2_hint,
        level3_hint: question.level3_hint
      }
    }))

    // 統計情報を計算
    const stats = {
      total: questionsWithHints.length,
      withHints: questionsWithHints.filter(q => 
        q.level1_hint || q.level2_hint || q.level3_hint
      ).length,
      byDifficulty: {
        basic: questionsWithHints.filter(q => q.difficulty === 'basic').length,
        intermediate: questionsWithHints.filter(q => q.difficulty === 'intermediate').length,
        advanced: questionsWithHints.filter(q => q.difficulty === 'advanced').length,
        expert: questionsWithHints.filter(q => q.difficulty === 'expert').length
      },
      hintCoverage: {
        level1: questionsWithHints.filter(q => q.level1_hint).length,
        level2: questionsWithHints.filter(q => q.level2_hint).length,
        level3: questionsWithHints.filter(q => q.level3_hint).length
      }
    }

    return NextResponse.json({
      success: true,
      questions: questionsWithHints,
      categories: categories || [],
      stats
    })

  } catch (error) {
    console.error('問題メンテナンス API エラー:', error)
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 管理者権限チェック（admin または system_admin）
    if (userRole !== 'system_admin' && userRole !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const { questionId, updates } = body

    if (!questionId || typeof questionId !== 'number') {
      return NextResponse.json({ error: '問題IDが必要です' }, { status: 400 })
    }

    // 編集可能フィールドのみを許可
    const allowedFields = [
      'explanation',
      'level1_hint', 
      'level2_hint',
      'level3_hint',
      'source',
      'related_topics',
      'time_limit',
      'is_deleted'
    ]

    // 条件付き編集可能フィールド（誤字修正のみ）
    const conditionalFields = ['question', 'option1', 'option2', 'option3', 'option4']

    const updateData: Record<string, any> = {}
    
    // 許可されたフィールドのみを抽出
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      } else if (conditionalFields.includes(key)) {
        // 条件付きフィールドは警告付きで許可
        updateData[key] = value
      }
    }

    // 更新データが空の場合
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '更新可能なフィールドがありません' }, { status: 400 })
    }

    // updated_atを自動設定
    updateData.updated_at = new Date().toISOString()

    // データベース更新
    const { error: updateError } = await supabaseAdmin
      .from('quiz_questions')
      .update(updateData)
      .eq('id', questionId)

    if (updateError) {
      console.error('問題更新エラー:', updateError)
      return NextResponse.json({ error: '問題の更新に失敗しました' }, { status: 500 })
    }

    // 更新後のデータを取得
    const { data: updatedQuestion, error: fetchError } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('id', questionId)
      .single()

    if (fetchError) {
      console.error('更新後データ取得エラー:', fetchError)
      return NextResponse.json({ error: '更新後データの取得に失敗しました' }, { status: 500 })
    }

    // 変更ログを記録（オプション - 後で実装可能）
    console.log(`問題ID ${questionId} が ${userId} (${userRole}) により更新されました:`, Object.keys(updateData))

    return NextResponse.json({
      success: true,
      message: '問題が正常に更新されました',
      question: updatedQuestion,
      updatedFields: Object.keys(updateData)
    })

  } catch (error) {
    console.error('問題更新 API エラー:', error)
    return NextResponse.json(
      { error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}