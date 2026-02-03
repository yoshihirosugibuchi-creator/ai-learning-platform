import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * コンテンツ統計API
 * GET /api/stats/content-counts
 *
 * 有効なコンテンツの数を返す
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 並列でカウントを取得
    const [quizResult, themeResult, sessionResult, caseStudyResult] = await Promise.all([
      // クイズ問題数（削除されていないもの）
      supabaseAdmin
        .from('quiz_questions')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),

      // コーステーマ数
      supabaseAdmin
        .from('learning_themes')
        .select('id', { count: 'exact', head: true }),

      // コースセッション数（レッスン数）
      supabaseAdmin
        .from('learning_sessions')
        .select('id', { count: 'exact', head: true }),

      // ケーススタディ問題数（activeのもの）
      supabaseAdmin
        .from('case_study_problems')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
    ])

    const stats = {
      quiz_questions: quizResult.count || 0,
      course_themes: themeResult.count || 0,
      course_sessions: sessionResult.count || 0,
      case_study_problems: caseStudyResult.count || 0
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Content counts API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content counts' },
      { status: 500 }
    )
  }
}
