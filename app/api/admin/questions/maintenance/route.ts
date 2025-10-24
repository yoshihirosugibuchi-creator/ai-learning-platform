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

    // システム管理者権限チェック
    if (userRole !== 'system_admin') {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    // 問題とヒント情報を取得
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
        difficulty,
        explanation,
        created_at,
        updated_at,
        quiz_hints (
          id,
          level1_hint,
          level2_hint,
          level3_hint,
          created_at,
          updated_at
        )
      `)
      .eq('is_deleted', false)
      .order('id', { ascending: true })

    if (questionsError) {
      console.error('問題取得エラー:', questionsError)
      return NextResponse.json({ error: '問題の取得に失敗しました' }, { status: 500 })
    }

    // カテゴリー一覧を取得
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .eq('is_visible', true)
      .order('display_order')

    if (categoriesError) {
      console.error('カテゴリー取得エラー:', categoriesError)
      return NextResponse.json({ error: 'カテゴリーの取得に失敗しました' }, { status: 500 })
    }

    // 問題データを整形（ヒント情報を含める）
    const questionsWithHints = questions.map(question => ({
      ...question,
      hints: Array.isArray(question.quiz_hints) && question.quiz_hints.length > 0 
        ? question.quiz_hints[0] 
        : null
    }))

    // 統計情報を計算
    const stats = {
      total: questionsWithHints.length,
      withHints: questionsWithHints.filter(q => 
        q.hints?.level1_hint || q.hints?.level2_hint || q.hints?.level3_hint
      ).length,
      byDifficulty: {
        basic: questionsWithHints.filter(q => q.difficulty === 'basic').length,
        intermediate: questionsWithHints.filter(q => q.difficulty === 'intermediate').length,
        advanced: questionsWithHints.filter(q => q.difficulty === 'advanced').length,
        expert: questionsWithHints.filter(q => q.difficulty === 'expert').length
      },
      hintCoverage: {
        level1: questionsWithHints.filter(q => q.hints?.level1_hint).length,
        level2: questionsWithHints.filter(q => q.hints?.level2_hint).length,
        level3: questionsWithHints.filter(q => q.hints?.level3_hint).length
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