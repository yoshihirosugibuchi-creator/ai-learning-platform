import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ 問題一覧API
 * GET /api/case-study/problems
 *
 * Query Parameters:
 * - category_id: カテゴリーでフィルター
 * - difficulty: 難易度でフィルター
 * - industry: 業界でフィルター
 * - keyword: キーワード検索
 * - limit: 取得件数（デフォルト: 20）
 * - offset: オフセット（ページネーション用）
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

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const difficulty = searchParams.get('difficulty')
    const industry = searchParams.get('industry')
    const keyword = searchParams.get('keyword')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabaseAdmin = getSupabaseAdmin()

    // 問題一覧クエリ構築
    let query = supabaseAdmin
      .from('case_study_problems')
      .select(`
        id,
        title,
        case_text,
        primary_category_id,
        primary_subcategory_id,
        difficulty,
        industry,
        scenario_type,
        estimated_minutes,
        step_count,
        status,
        featured_date,
        created_at
      `, { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // フィルター適用
    if (categoryId) {
      query = query.eq('primary_category_id', categoryId)
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    if (industry) {
      query = query.eq('industry', industry)
    }

    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,case_text.ilike.%${keyword}%`)
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data: problems, error: problemsError, count } = await query

    if (problemsError) {
      console.error('Problems fetch error:', problemsError)
      return NextResponse.json(
        { success: false, error: '問題の取得に失敗しました' },
        { status: 500 }
      )
    }

    // ユーザーの学習履歴を取得
    const problemIds = problems?.map(p => p.id) || []

    const { data: userSessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('problem_id, status, score_percentage, completed_at')
      .eq('user_id', user.id)
      .in('problem_id', problemIds)
      .eq('status', 'completed')

    // 問題ごとの統計情報を取得（ビューを使用）
    const { data: problemStats } = await supabaseAdmin
      .from('case_study_problem_stats')
      .select('*')
      .in('id', problemIds)

    // 業界カテゴリー名を取得（typeフィルタなしで全カテゴリーから検索）
    const industryIds = [...new Set(problems?.map(p => p.industry).filter(Boolean) || [])]
    const { data: industryCategories } = await supabaseAdmin
      .from('categories')
      .select('category_id, name')
      .in('category_id', industryIds)

    const industryMap = new Map(industryCategories?.map(c => [c.category_id, c.name]) || [])

    // 結果を結合
    const problemsWithStats = problems?.map(problem => {
      const userSession = userSessions?.find(s => s.problem_id === problem.id)
      const stats = problemStats?.find(s => s.id === problem.id)

      return {
        ...problem,
        // 業界名（日本語）
        industry_name: problem.industry ? industryMap.get(problem.industry) || problem.industry : null,
        // ユーザーの履歴
        user_completed: !!userSession,
        user_best_score: userSession?.score_percentage || null,
        user_last_completed: userSession?.completed_at || null,
        // 全体統計
        total_sessions: stats?.total_sessions || 0,
        completion_rate: stats?.completion_rate || 0,
        avg_score: stats?.avg_score || 0
      }
    }) || []

    return NextResponse.json({
      success: true,
      problems: problemsWithStats,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Problems list error:', error)
    return NextResponse.json(
      { success: false, error: '問題一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
