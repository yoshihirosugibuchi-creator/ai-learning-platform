import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CaseStudyDifficulty } from '@/lib/types/case-study'

/**
 * ケーススタディ おすすめ問題API
 * GET /api/case-study/recommendations
 *
 * レコメンドロジック:
 * 1. 弱点カテゴリーの問題を優先
 * 2. 適切な難易度の問題を優先
 * 3. 未学習・長期間未学習の問題を優先
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

// 難易度の順序
const DIFFICULTY_ORDER: CaseStudyDifficulty[] = ['basic', 'intermediate', 'advanced', 'expert']

// レコメンドスコア計算
function calculateRecommendationScore(
  problem: {
    id: string
    primary_category_id: string
    difficulty: CaseStudyDifficulty
    created_at: string
  },
  weakCategories: string[],
  userDifficulty: CaseStudyDifficulty,
  completedProblemIds: string[],
  sessionHistory: Array<{ problem_id: string; completed_at: string; score_percentage: number }>
): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  // 1. 弱点カテゴリーボーナス（+40点）
  if (weakCategories.includes(problem.primary_category_id)) {
    score += 40
    reasons.push('弱点カテゴリー')
  }

  // 2. 難易度適合ボーナス（+30点 最適、+15点 隣接）
  const problemDiffIndex = DIFFICULTY_ORDER.indexOf(problem.difficulty)
  const userDiffIndex = DIFFICULTY_ORDER.indexOf(userDifficulty)
  const diffDelta = Math.abs(problemDiffIndex - userDiffIndex)

  if (diffDelta === 0) {
    score += 30
    reasons.push('最適な難易度')
  } else if (diffDelta === 1) {
    score += 15
    reasons.push('適度なチャレンジ')
  }

  // 3. 未学習ボーナス（+25点）
  if (!completedProblemIds.includes(problem.id)) {
    score += 25
    reasons.push('新しい問題')
  } else {
    // 再学習の場合、前回スコアが低ければボーナス
    const lastSession = sessionHistory.find(s => s.problem_id === problem.id)
    if (lastSession && lastSession.score_percentage < 60) {
      score += 20
      reasons.push('復習推奨')
    }
  }

  // 4. 長期間未学習ボーナス（最終学習から14日以上）
  const lastSession = sessionHistory.find(s => s.problem_id === problem.id)
  if (lastSession) {
    const daysSinceLastSession = Math.floor(
      (Date.now() - new Date(lastSession.completed_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLastSession >= 14) {
      score += 15
      reasons.push('復習タイミング')
    }
  }

  // 5. 新しい問題ボーナス（作成から7日以内）
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(problem.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceCreation <= 7) {
    score += 10
    reasons.push('新着問題')
  }

  return {
    score,
    reason: reasons.length > 0 ? reasons.join('、') : 'おすすめ'
  }
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
    const limit = parseInt(searchParams.get('limit') || '5', 10)

    const supabaseAdmin = getSupabaseAdmin()

    // ユーザーのカテゴリー別統計を取得（弱点特定用）
    const { data: categoryStats } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('category_id, accuracy_rate, total_questions')
      .eq('user_id', user.id)
      .order('accuracy_rate', { ascending: true })
      .limit(5)

    // 弱点カテゴリー（正答率60%未満、または問題数10問以上で70%未満）
    const weakCategories = categoryStats
      ?.filter(s =>
        s.accuracy_rate < 60 ||
        (s.total_questions >= 10 && s.accuracy_rate < 70)
      )
      .map(s => s.category_id) || []

    // ユーザーの適正難易度を推定
    const { data: userStats } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('case_study_average_score, case_study_sessions_completed')
      .eq('user_id', user.id)
      .single()

    let userDifficulty: CaseStudyDifficulty = 'intermediate'
    if (userStats?.case_study_sessions_completed && userStats.case_study_sessions_completed >= 3) {
      const avgScore = userStats.case_study_average_score || 0
      if (avgScore >= 85) userDifficulty = 'expert'
      else if (avgScore >= 70) userDifficulty = 'advanced'
      else if (avgScore >= 50) userDifficulty = 'intermediate'
      else userDifficulty = 'basic'
    }

    // ユーザーの学習履歴を取得
    const { data: userSessions } = await supabaseAdmin
      .from('case_study_sessions')
      .select('problem_id, score_percentage, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    const completedProblemIds = userSessions?.map(s => s.problem_id) || []

    // アクティブな問題を取得
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
        created_at
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50) // 候補を50件取得

    if (!problems || problems.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: '現在おすすめできる問題がありません'
      })
    }

    // レコメンドスコアを計算してソート
    const scoredProblems = problems.map(problem => {
      const { score, reason } = calculateRecommendationScore(
        problem as {
          id: string
          primary_category_id: string
          difficulty: CaseStudyDifficulty
          created_at: string
        },
        weakCategories,
        userDifficulty,
        completedProblemIds,
        (userSessions || []) as Array<{ problem_id: string; completed_at: string; score_percentage: number }>
      )

      const userSession = userSessions?.find(s => s.problem_id === problem.id)

      return {
        ...problem,
        recommendation_score: score,
        recommendation_reason: reason,
        user_completed: completedProblemIds.includes(problem.id),
        user_best_score: userSession?.score_percentage || null
      }
    })

    // スコア順でソートして上位を取得
    scoredProblems.sort((a, b) => b.recommendation_score - a.recommendation_score)
    const recommendations = scoredProblems.slice(0, limit)

    return NextResponse.json({
      success: true,
      recommendations,
      user_difficulty: userDifficulty,
      weak_categories: weakCategories
    })

  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { success: false, error: 'おすすめの取得に失敗しました' },
      { status: 500 }
    )
  }
}
