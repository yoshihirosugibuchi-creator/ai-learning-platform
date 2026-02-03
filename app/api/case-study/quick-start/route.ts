import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CaseStudyDifficulty } from '@/lib/types/case-study'

/**
 * ケーススタディ クイックスタートAPI
 * GET /api/case-study/quick-start
 *
 * すぐに始められる問題を1つ返す:
 * 1. 未完了の問題から選択
 * 2. ユーザーの適正難易度に合った問題を優先
 * 3. ランダム要素を含める
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

    // ユーザーの完了済み問題を取得
    const { data: completedSessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('problem_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const completedProblemIds = completedSessions?.map(s => s.problem_id) || []

    // ユーザーの適正難易度を推定
    const { data: userStats } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('case_study_average_score, case_study_sessions_completed')
      .eq('user_id', user.id)
      .single()

    let targetDifficulties: CaseStudyDifficulty[] = ['basic', 'intermediate']
    if (userStats?.case_study_sessions_completed && userStats.case_study_sessions_completed >= 3) {
      const avgScore = userStats.case_study_average_score || 0
      if (avgScore >= 85) {
        targetDifficulties = ['advanced', 'expert']
      } else if (avgScore >= 70) {
        targetDifficulties = ['intermediate', 'advanced']
      } else if (avgScore >= 50) {
        targetDifficulties = ['basic', 'intermediate']
      } else {
        targetDifficulties = ['basic']
      }
    }

    // 未完了の問題から適正難易度のものを取得
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
        created_at
      `)
      .eq('status', 'active')
      .in('difficulty', targetDifficulties)

    // 完了済み問題を除外
    if (completedProblemIds.length > 0) {
      query = query.not('id', 'in', `(${completedProblemIds.join(',')})`)
    }

    const { data: problems } = await query.limit(10)

    // 適正難易度の未完了問題がなければ、全難易度から検索
    let selectedProblem = null
    if (problems && problems.length > 0) {
      // ランダムに1つ選択
      const randomIndex = Math.floor(Math.random() * problems.length)
      selectedProblem = problems[randomIndex]
    } else {
      // 全難易度から未完了問題を検索
      let fallbackQuery = supabaseAdmin
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
          created_at
        `)
        .eq('status', 'active')

      if (completedProblemIds.length > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${completedProblemIds.join(',')})`)
      }

      const { data: fallbackProblems } = await fallbackQuery.limit(10)

      if (fallbackProblems && fallbackProblems.length > 0) {
        const randomIndex = Math.floor(Math.random() * fallbackProblems.length)
        selectedProblem = fallbackProblems[randomIndex]
      } else {
        // 全問題完了済みの場合、復習推奨問題を返す
        const { data: reviewProblems } = await supabaseAdmin
          .from('case_study_sessions')
          .select(`
            problem_id,
            score_percentage,
            case_study_problems (
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
              created_at
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .lt('score_percentage', 70)
          .order('score_percentage', { ascending: true })
          .limit(1)

        if (reviewProblems && reviewProblems.length > 0 && reviewProblems[0].case_study_problems) {
          // case_study_problems は単一オブジェクト（FK join）
          const problemData = reviewProblems[0].case_study_problems
          // 配列でないことを確認
          if (problemData && !Array.isArray(problemData)) {
            selectedProblem = problemData
          }
        }
      }
    }

    if (!selectedProblem) {
      return NextResponse.json({
        success: true,
        problem: null,
        message: '始められる問題がありません'
      })
    }

    // selectedProblem の型を安全に扱う
    const problemId = 'id' in selectedProblem ? selectedProblem.id : null

    return NextResponse.json({
      success: true,
      problem: selectedProblem,
      is_review: problemId ? completedProblemIds.includes(problemId) : false,
      target_difficulties: targetDifficulties
    })

  } catch (error) {
    console.error('Quick start error:', error)
    return NextResponse.json(
      { success: false, error: 'クイックスタートの取得に失敗しました' },
      { status: 500 }
    )
  }
}
