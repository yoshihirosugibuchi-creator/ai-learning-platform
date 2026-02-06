import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ 学習履歴API
 * GET /api/case-study/history
 *
 * クエリパラメータ:
 * - limit: 取得件数 (デフォルト: 20, 最大: 100)
 * - offset: オフセット (デフォルト: 0)
 * - problem_id: 特定の問題の履歴のみ取得
 * - status: セッションステータスでフィルター (completed, in_progress, abandoned)
 */

// 認証付きSupabaseクライアント作成
function getSupabaseWithAuth(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  try {
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
    const { searchParams } = new URL(request.url)

    // クエリパラメータ取得
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const problemId = searchParams.get('problem_id')
    const status = searchParams.get('status')

    // セッション一覧を取得
    let query = supabaseAdmin
      .from('case_study_sessions')
      .select(`
        id,
        problem_id,
        status,
        current_step,
        is_retry,
        started_at,
        completed_at,
        total_time_seconds,
        hint_count,
        total_score,
        max_possible_score,
        score_percentage,
        xp_earned,
        skp_earned,
        scoring_result,
        bonus_details,
        case_study_problems (
          id,
          title,
          difficulty,
          industry,
          estimated_minutes,
          step_count
        )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (problemId) {
      query = query.eq('problem_id', problemId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
      return NextResponse.json(
        { success: false, error: '履歴の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 総件数を取得
    let countQuery = supabaseAdmin
      .from('case_study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (problemId) {
      countQuery = countQuery.eq('problem_id', problemId)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    // 業界カテゴリー名を取得
    type ProblemData = { id: string; title: string; difficulty: string; industry: string | null; estimated_minutes: number; step_count: number }
    const industryIds = [...new Set(
      sessions
        ?.map(s => {
          // Supabase join may return array or single object
          const problems = s.case_study_problems
          const problem = Array.isArray(problems) ? problems[0] as ProblemData : problems as ProblemData
          return problem?.industry
        })
        .filter((id): id is string => id !== null && id !== undefined) || []
    )]

    let industryMap = new Map<string, string>()
    if (industryIds.length > 0) {
      const { data: industryCategories } = await supabaseAdmin
        .from('categories')
        .select('category_id, name')
        .in('category_id', industryIds)
        .eq('type', 'industry')
      industryMap = new Map(industryCategories?.map(c => [c.category_id, c.name]) || [])
    }

    // セッションに業界名を追加
    const sessionsWithIndustryNames = sessions?.map(session => {
      // Supabase join may return array or single object
      const problems = session.case_study_problems
      const problem = Array.isArray(problems) ? problems[0] as ProblemData : problems as ProblemData
      return {
        ...session,
        case_study_problems: problem ? {
          ...problem,
          industry_name: problem.industry ? industryMap.get(problem.industry) || problem.industry : null
        } : null
      }
    }) || []

    return NextResponse.json({
      success: true,
      sessions: sessionsWithIndustryNames,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('History fetch error:', error)
    return NextResponse.json(
      { success: false, error: '履歴取得に失敗しました' },
      { status: 500 }
    )
  }
}
