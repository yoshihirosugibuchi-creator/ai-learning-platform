import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ 問題詳細API
 * GET /api/case-study/problems/[problemId]
 */

// 認証付きSupabaseクライアント作成
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

// Service Role用Supabaseクライアント
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ problemId: string }> }
) {
  try {
    const { problemId } = await params

    // 認証確認
    const supabase = getSupabaseWithAuth(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 問題情報を取得
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .select('*')
      .eq('id', problemId)
      .eq('status', 'active')
      .single()

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: '問題が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ情報を取得（ヒントと模範解答は除外）
    const { data: steps } = await supabaseAdmin
      .from('case_study_steps')
      .select(`
        id,
        step_number,
        step_name,
        description,
        category_id,
        subcategory_id,
        question_type,
        target_skills,
        max_score,
        display_order
      `)
      .eq('problem_id', problemId)
      .order('step_number')

    // 評価対象スキル軸を集約
    const targetSkillsSet = new Set<string>()
    steps?.forEach(step => {
      if (step.target_skills && Array.isArray(step.target_skills)) {
        step.target_skills.forEach((skill: string) => targetSkillsSet.add(skill))
      }
    })

    // ルーブリック軸情報を取得
    const { data: rubricAxes } = await supabaseAdmin
      .from('case_study_rubric_axes')
      .select('axis_code, axis_name, rubric_group_code, rubric_group_name, definition')
      .eq('is_active', true)
      .in('axis_code', Array.from(targetSkillsSet))
      .order('display_order')

    // ユーザーの学習履歴を取得
    const { data: userSessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('id, status, score_percentage, completed_at, xp_earned, skp_earned')
      .eq('user_id', user.id)
      .eq('problem_id', problemId)
      .order('completed_at', { ascending: false })

    const completedSessions = userSessions?.filter(s => s.status === 'completed') || []
    const inProgressSession = userSessions?.find(s => s.status === 'in_progress')

    // 統計情報を取得
    const { data: stats } = await supabaseAdmin
      .from('case_study_problem_stats')
      .select('*')
      .eq('id', problemId)
      .single()

    // 業界カテゴリー名を取得
    let industryName = problem.industry
    if (problem.industry) {
      const { data: industryCategory } = await supabaseAdmin
        .from('categories')
        .select('name')
        .eq('category_id', problem.industry)
        .eq('type', 'industry')
        .single()
      if (industryCategory) {
        industryName = industryCategory.name
      }
    }

    return NextResponse.json({
      success: true,
      problem: {
        ...problem,
        industry_name: industryName,
        // ケース本文は概要のみ（500文字まで）
        case_text_preview: problem.case_text.substring(0, 500) + (problem.case_text.length > 500 ? '...' : '')
      },
      steps: steps || [],
      target_skills: rubricAxes || [],
      user_history: {
        total_attempts: userSessions?.length || 0,
        completed_count: completedSessions.length,
        best_score: completedSessions.length > 0
          ? Math.max(...completedSessions.map(s => s.score_percentage || 0))
          : null,
        last_completed: completedSessions[0]?.completed_at || null,
        in_progress_session_id: inProgressSession?.id || null
      },
      stats: {
        total_sessions: stats?.total_sessions || 0,
        completion_rate: stats?.completion_rate || 0,
        avg_score: stats?.avg_score || 0,
        avg_time_seconds: stats?.avg_time_seconds || 0
      }
    })

  } catch (error) {
    console.error('Problem detail error:', error)
    return NextResponse.json(
      { success: false, error: '問題詳細の取得に失敗しました' },
      { status: 500 }
    )
  }
}
