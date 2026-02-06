import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ 今日のチャレンジAPI
 * GET /api/case-study/daily-challenge
 *
 * 今日のおすすめ問題を取得:
 * 1. featured_date が今日の問題があればそれを返す
 * 2. なければアルゴリズムで選定
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

    const supabaseAdmin = getSupabaseAdmin()

    // 今日の日付（JST）
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000
    const jstDate = new Date(now.getTime() + jstOffset)
    const todayString = jstDate.toISOString().split('T')[0]

    // 1. featured_date が今日の問題を検索
    const { data: featuredProblem } = await supabaseAdmin
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
        featured_date,
        created_at
      `)
      .eq('status', 'active')
      .eq('featured_date', todayString)
      .single()

    let dailyChallenge = featuredProblem

    // 2. 管理者設定がなければアルゴリズムで選定
    if (!dailyChallenge) {
      // 日付をシードにして擬似ランダム選定（同じ日は同じ問題）
      const dateHash = todayString.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0)

      const { data: problems } = await supabaseAdmin
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
          featured_date,
          created_at
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30)

      if (problems && problems.length > 0) {
        // 日付ハッシュを使って問題を選定
        const index = dateHash % problems.length
        dailyChallenge = problems[index]
      }
    }

    if (!dailyChallenge) {
      return NextResponse.json({
        success: true,
        daily_challenge: null,
        message: '今日のチャレンジはありません'
      })
    }

    // ユーザーの学習履歴を取得
    const { data: userSession } = await supabaseAdmin
      .from('case_study_sessions')
      .select('id, status, score_percentage, completed_at')
      .eq('user_id', user.id)
      .eq('problem_id', dailyChallenge.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // 統計情報を取得
    const { data: stats } = await supabaseAdmin
      .from('case_study_problem_stats')
      .select('*')
      .eq('id', dailyChallenge.id)
      .single()

    // 業界カテゴリー名を取得
    let industryName = dailyChallenge.industry
    if (dailyChallenge.industry) {
      const { data: industryCategory } = await supabaseAdmin
        .from('categories')
        .select('name')
        .eq('category_id', dailyChallenge.industry)
        .eq('type', 'industry')
        .single()
      if (industryCategory) {
        industryName = industryCategory.name
      }
    }

    return NextResponse.json({
      success: true,
      daily_challenge: {
        ...dailyChallenge,
        industry_name: industryName,
        is_admin_featured: !!featuredProblem,
        user_completed: !!userSession,
        user_score: userSession?.score_percentage || null,
        total_sessions: stats?.total_sessions || 0,
        avg_score: stats?.avg_score || 0
      },
      date: todayString
    })

  } catch (error) {
    console.error('Daily challenge error:', error)
    return NextResponse.json(
      { success: false, error: '今日のチャレンジの取得に失敗しました' },
      { status: 500 }
    )
  }
}
