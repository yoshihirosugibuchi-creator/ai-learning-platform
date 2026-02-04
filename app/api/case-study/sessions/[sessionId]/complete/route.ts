import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type {
  CaseStudyCompleteResponse,
  CaseStudyScoringResult,
  CaseStudyBonusDetails,
  CaseStudyDifficulty
} from '@/lib/types/case-study'
import { getProviderForProblem } from '@/lib/ai-providers'
import type { AIScoringRequest } from '@/lib/ai-providers'

/**
 * ケーススタディ 完了・AI採点API
 * POST /api/case-study/sessions/[sessionId]/complete
 *
 * 全ステップ回答後に呼び出し、AI採点を実行してXP/SKPを付与
 */

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

// XP設定を取得
async function loadCaseStudyXPSettings(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data: settings } = await supabase
    .from('xp_level_skp_settings')
    .select('setting_category, setting_key, setting_value')
    .in('setting_category', ['xp_case_study_step', 'xp_bonus', 'skp'])

  const xpSettings: Record<string, Record<string, number>> = {}

  settings?.forEach((s) => {
    if (!xpSettings[s.setting_category]) {
      xpSettings[s.setting_category] = {}
    }
    xpSettings[s.setting_category][s.setting_key] = s.setting_value
  })

  return xpSettings
}

// AI採点エラーを表すカスタムエラー
class AIScoringError extends Error {
  public readonly userMessage: string
  constructor(userMessage: string, technicalDetail: string) {
    super(technicalDetail)
    this.name = 'AIScoringError'
    this.userMessage = userMessage
  }
}

// AI採点を実行（失敗時はエラーをthrow — 適当なスコアは絶対に返さない）
async function performAIScoring(
  sessionId: string,
  caseText: string,
  problemProviderOverride: string | null,
  steps: Array<{
    step_number: number
    step_name: string
    description: string
    options: unknown
    model_answer: unknown
    target_skills: string[]
    max_score: number
    detail: {
      selected_choices: string[] | null
      reasoning_text: string | null
    } | null
  }>,
  hintCount: number,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<{ result: CaseStudyScoringResult; providerUsed: string }> {
  // ルーブリック軸情報を取得
  const { data: rubricAxes } = await supabase
    .from('case_study_rubric_axes')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  // システムデフォルトプロバイダーを取得
  const { data: config } = await supabase
    .from('ai_system_config')
    .select('value')
    .eq('key', 'case_study_scoring_provider')
    .single()

  const systemDefault = config?.value
    ? (typeof config.value === 'string' ? config.value : String(config.value))
    : null

  try {
    const provider = getProviderForProblem(problemProviderOverride, systemDefault)

    const request: AIScoringRequest = {
      caseText,
      steps: steps.map(s => ({
        stepNumber: s.step_number,
        stepName: s.step_name,
        description: s.description,
        options: s.options,
        modelAnswer: s.model_answer,
        targetSkills: s.target_skills || [],
        maxScore: s.max_score,
        answer: s.detail ? {
          selectedChoices: s.detail.selected_choices,
          reasoningText: s.detail.reasoning_text,
        } : null,
      })),
      rubricAxes: (rubricAxes || []).map(a => ({
        axisName: a.axis_name,
        axisNameEn: a.axis_name_en,
        description: a.description,
        weight: a.weight,
        rubricGroupName: a.rubric_group_name,
      })),
      hintCount,
    }

    const aiResponse = await provider.score(request)

    // AI結果をCaseStudyScoringResult形式に変換
    const stepScores = aiResponse.stepResults.map(r => ({
      step: r.step,
      score: r.score,
      max: r.maxScore,
      feedback: r.feedback,
    }))

    // ステップ別採点結果を保存
    for (const stepResult of aiResponse.stepResults) {
      const step = steps.find(s => s.step_number === stepResult.step)
      if (step?.detail) {
        await supabase
          .from('case_study_step_details')
          .update({
            step_scoring: {
              score: stepResult.score,
              max_score: stepResult.maxScore,
              feedback: stepResult.feedback,
              skill_scores: stepResult.skillScores,
            }
          })
          .eq('session_id', sessionId)
          .eq('step_number', stepResult.step)
      }
    }

    console.log(`✅ AI scoring completed with provider: ${aiResponse.providerUsed}`)

    return {
      result: {
        step_scores: stepScores,
        skill_scores: aiResponse.skillScores,
        overall_feedback: aiResponse.overallFeedback,
      },
      providerUsed: aiResponse.providerUsed,
    }
  } catch (aiError) {
    const errorMsg = aiError instanceof Error ? aiError.message : String(aiError)
    console.error('AI scoring failed:', errorMsg)

    // プロバイダーが利用不可
    if (errorMsg.includes('not configured') || errorMsg.includes('not available')) {
      throw new AIScoringError(
        'AI採点サービスが現在設定されていません。管理者にお問い合わせください。',
        errorMsg
      )
    }
    // API側のエラー（レート制限、サーバーエラー等）
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      throw new AIScoringError(
        'AI採点サービスが混雑しています。しばらくしてから「採点を再実行」してください。',
        errorMsg
      )
    }
    if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
      throw new AIScoringError(
        'AI採点サービスが一時的に利用できません。しばらくしてから「採点を再実行」してください。',
        errorMsg
      )
    }
    // JSONパースエラー等
    if (errorMsg.includes('JSON') || errorMsg.includes('parse') || errorMsg.includes('Invalid scoring')) {
      throw new AIScoringError(
        'AI採点の応答を処理できませんでした。「採点を再実行」してください。',
        errorMsg
      )
    }
    // その他
    throw new AIScoringError(
      'AI採点に失敗しました。しばらくしてから「採点を再実行」してください。',
      errorMsg
    )
  }
}

// XP/SKP計算
function calculateRewards(
  scoringResult: CaseStudyScoringResult,
  difficulty: CaseStudyDifficulty,
  stepCount: number,
  totalTimeSeconds: number,
  hintCount: number,
  isRetry: boolean,
  xpSettings: Record<string, Record<string, number>>
): { xp: number; skp: number; bonusDetails: CaseStudyBonusDetails } {
  // 再学習時はXP/SKPなし
  if (isRetry) {
    return { xp: 0, skp: 0, bonusDetails: {} }
  }

  // 基本XP計算
  const baseXpPerStep = xpSettings['xp_case_study_step']?.[difficulty] || 20
  let totalXP = baseXpPerStep * stepCount

  // スコア計算
  const totalScore = scoringResult.step_scores.reduce((sum, s) => sum + s.score, 0)
  const maxScore = scoringResult.step_scores.reduce((sum, s) => sum + s.max, 0)
  const scorePercentage = totalScore / maxScore

  const bonusDetails: CaseStudyBonusDetails = {}

  // 高スコアボーナス（80%以上）
  if (scorePercentage >= 0.8) {
    const bonus = xpSettings['xp_bonus']?.['case_study_high_score'] || 30
    totalXP += bonus
    bonusDetails.high_score = bonus
  }

  // ヒント未使用ボーナス
  if (hintCount === 0) {
    const bonus = xpSettings['xp_bonus']?.['case_study_no_hint'] || 20
    totalXP += bonus
    bonusDetails.no_hint = bonus
  }

  // 早期完了ボーナス（20分以内）
  if (totalTimeSeconds <= 20 * 60) {
    const bonus = xpSettings['xp_bonus']?.['case_study_quick'] || 15
    totalXP += bonus
    bonusDetails.quick = bonus
  }

  // SKP計算
  let totalSKP = xpSettings['skp']?.['case_study_base'] || 50

  // 高スコアSKPボーナス
  if (scorePercentage >= 0.8) {
    totalSKP += xpSettings['skp']?.['case_study_high_score_bonus'] || 30
  }

  return {
    xp: totalXP,
    skp: totalSKP,
    bonusDetails
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

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

    // セッション情報を取得
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('case_study_sessions')
      .select(`
        *,
        case_study_problems (
          id,
          title,
          case_text,
          difficulty,
          step_count,
          estimated_minutes,
          scoring_ai_provider
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    if (session.status === 'completed') {
      return NextResponse.json(
        { success: false, error: '既に完了したセッションです' },
        { status: 400 }
      )
    }

    // ステップ情報と回答詳細を取得
    const { data: steps } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('problem_id', session.problem_id)
      .order('step_number')

    const { data: stepDetails } = await supabaseAdmin
      .from('case_study_step_details')
      .select('*')
      .eq('session_id', sessionId)
      .order('step_number')

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ステップ情報が見つかりません' },
        { status: 500 }
      )
    }

    // ステップと回答を結合
    const stepsWithDetails = steps.map(step => ({
      ...step,
      detail: stepDetails?.find(d => d.step_number === step.step_number) || null
    }))

    // XP設定を取得
    const xpSettings = await loadCaseStudyXPSettings(supabaseAdmin)

    // AI採点を実行
    const caseText = session.case_study_problems?.case_text || ''
    const problemProviderOverride = session.case_study_problems?.scoring_ai_provider || null
    const { result: scoringResult, providerUsed } = await performAIScoring(
      sessionId, caseText, problemProviderOverride, stepsWithDetails,
      session.hint_count || 0, supabaseAdmin
    )

    // 総合スコア計算
    const totalScore = scoringResult.step_scores.reduce((sum, s) => sum + s.score, 0)
    const maxPossibleScore = scoringResult.step_scores.reduce((sum, s) => sum + s.max, 0)
    const scorePercentage = Math.round((totalScore / maxPossibleScore) * 100)

    // 総所要時間計算
    const startedAt = new Date(session.started_at)
    const completedAt = new Date()
    const totalTimeSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)

    // XP/SKP計算
    const difficulty = session.case_study_problems?.difficulty as CaseStudyDifficulty || 'intermediate'
    const stepCount = session.case_study_problems?.step_count || 5
    const { xp, skp, bonusDetails } = calculateRewards(
      scoringResult,
      difficulty,
      stepCount,
      totalTimeSeconds,
      session.hint_count || 0,
      session.is_retry || false,
      xpSettings
    )

    // セッションを完了状態に更新
    await supabaseAdmin
      .from('case_study_sessions')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
        total_time_seconds: totalTimeSeconds,
        scoring_result: { ...scoringResult, provider_used: providerUsed },
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        score_percentage: scorePercentage,
        xp_earned: xp,
        skp_earned: skp,
        bonus_details: bonusDetails,
        updated_at: completedAt.toISOString()
      })
      .eq('id', sessionId)

    // 再学習でない場合のみXP/SKPを付与
    if (!session.is_retry && xp > 0) {
      // user_xp_stats_v2 を更新
      const { data: currentStats } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (currentStats) {
        await supabaseAdmin
          .from('user_xp_stats_v2')
          .update({
            total_xp: (currentStats.total_xp || 0) + xp,
            total_skp: (currentStats.total_skp || 0) + skp,
            case_study_xp: (currentStats.case_study_xp || 0) + xp,
            case_study_skp: (currentStats.case_study_skp || 0) + skp,
            case_study_sessions_completed: (currentStats.case_study_sessions_completed || 0) + 1,
            updated_at: completedAt.toISOString()
          })
          .eq('user_id', user.id)
      } else {
        await supabaseAdmin
          .from('user_xp_stats_v2')
          .insert({
            user_id: user.id,
            total_xp: xp,
            total_skp: skp,
            case_study_xp: xp,
            case_study_skp: skp,
            case_study_sessions_completed: 1
          })
      }

      // daily_xp_records を更新
      const today = new Date().toISOString().split('T')[0]
      const { data: dailyRecord } = await supabaseAdmin
        .from('daily_xp_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (dailyRecord) {
        await supabaseAdmin
          .from('daily_xp_records')
          .update({
            total_xp_earned: (dailyRecord.total_xp_earned || 0) + xp,
            case_study_sessions: (dailyRecord.case_study_sessions || 0) + 1,
            case_study_xp_earned: (dailyRecord.case_study_xp_earned || 0) + xp,
            case_study_time_seconds: (dailyRecord.case_study_time_seconds || 0) + totalTimeSeconds
          })
          .eq('user_id', user.id)
          .eq('date', today)
      } else {
        await supabaseAdmin
          .from('daily_xp_records')
          .insert({
            user_id: user.id,
            date: today,
            total_xp_earned: xp,
            case_study_sessions: 1,
            case_study_xp_earned: xp,
            case_study_time_seconds: totalTimeSeconds
          })
      }

      // quiz_answers の earned_xp を更新
      // Note: ケーススタディはquiz_session_id=NULLなので、
      //       case_study_step_details.quiz_answer_idを使用
      const xpPerStep = Math.round(xp / stepCount)
      for (let i = 0; i < stepCount; i++) {
        const stepDetail = stepDetails?.find(d => d.step_number === i + 1)
        if (!stepDetail?.quiz_answer_id) continue

        const stepScore = scoringResult.step_scores[i]
        const isCorrect = stepScore && (stepScore.score / stepScore.max) >= 0.6

        await supabaseAdmin
          .from('quiz_answers')
          .update({
            earned_xp: xpPerStep,
            is_correct: isCorrect,
            review_needed: !isCorrect,
            review_reason: !isCorrect ? 'low_score' : null
          })
          .eq('id', stepDetail.quiz_answer_id)
      }

      // skp_transactions に記録
      if (skp > 0) {
        await supabaseAdmin
          .from('skp_transactions')
          .insert({
            user_id: user.id,
            amount: skp,
            type: 'earned',
            source: `case_study_${sessionId}`,
            description: `ケーススタディ完了 (スコア: ${scorePercentage}%)`
          })
      }
    }

    console.log(`✅ Session completed: ${sessionId}, score: ${scorePercentage}%, xp: ${xp}, skp: ${skp}`)

    const response: CaseStudyCompleteResponse = {
      success: true,
      scoring_result: {
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        score_percentage: scorePercentage,
        step_scores: scoringResult.step_scores,
        skill_scores: scoringResult.skill_scores,
        overall_feedback: scoringResult.overall_feedback
      },
      rewards: {
        xp_earned: xp,
        skp_earned: skp,
        is_retry: session.is_retry || false,
        bonus_details: bonusDetails
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    // AI採点エラー: セッションは in_progress のまま残し、再試行可能にする
    if (error instanceof AIScoringError) {
      console.error('AI scoring error:', error.message)
      return NextResponse.json(
        {
          success: false,
          error: error.userMessage,
          scoring_unavailable: true,
        },
        { status: 503 }
      )
    }

    console.error('Case study complete error:', error)
    return NextResponse.json(
      { success: false, error: 'セッション完了処理に失敗しました' },
      { status: 500 }
    )
  }
}
