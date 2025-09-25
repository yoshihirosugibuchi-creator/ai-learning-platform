import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
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

interface CategoryXPBreakdown {
  category_id: string
  category_name: string
  raw_xp_total: number
  stats_xp_total: number
  is_consistent: boolean
  quiz_answers_count: number
  course_answers_count: number
}

interface SubcategoryXPBreakdown {
  subcategory_id: string
  subcategory_name: string
  category_id: string
  raw_xp_total: number
  stats_xp_total: number
  is_consistent: boolean
  quiz_answers_count: number
  course_answers_count: number
}

interface QuizSessionRecord {
  id: string
  total_xp: number
  bonus_xp: number
  status: string
  created_at: string
}

interface CourseSessionRecord {
  id: string
  session_id: string
  earned_xp: number
  is_first_completion: boolean
  created_at: string
}

interface AnswerRecord {
  id: string
  session_type: string
  quiz_session_id?: string
  course_session_id?: string
  earned_xp: number
  is_correct: boolean
  category_id: string
  subcategory_id: string
  created_at: string
}

interface AdminXPVerification {
  // === メインテーブル件数 ===
  quiz_sessions_count: number
  course_completions_count: number
  unified_answers_count: number
  
  // === セッション種別内訳 ===
  quiz_answers_count: number
  course_confirmation_count: number
  
  // === XP集計検証 ===
  raw_xp_total: number
  stats_xp_total: number
  xp_consistency_check: boolean
  
  // === セッション集計検証 ===
  raw_quiz_sessions: number
  stats_quiz_sessions: number
  raw_course_sessions: number
  stats_course_sessions: number
  sessions_consistency_check: boolean
  
  // === 回答数集計検証 ===
  raw_total_answers: number
  stats_total_answers: number
  raw_correct_answers: number
  stats_correct_answers: number
  answers_consistency_check: boolean
  
  // === カテゴリー別集計検証 ===
  category_breakdown: CategoryXPBreakdown[]
  category_consistency_issues: number
  
  // === サブカテゴリー別集計検証 ===
  subcategory_breakdown: SubcategoryXPBreakdown[]
  subcategory_consistency_issues: number
  
  // === システム全体の健全性 ===
  overall_health_score: number // 0-100%
  critical_issues: string[]
  warnings: string[]
  
  // === 最新アクティビティ ===
  recent_quiz_sessions: QuizSessionRecord[]
  recent_course_sessions: CourseSessionRecord[]
  recent_answers: AnswerRecord[]
}

// 管理者用包括的XP検証API
export async function GET(request: Request) {
  try {
    console.log('🔍 Admin XP Verification Request')
    
    // 認証付きSupabaseクライアント作成
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = user.id
    console.log('👤 Admin verification for user:', userId.substring(0, 8) + '...')

    // === 並列でデータ取得 ===
    const [
      quizSessionsResult,
      courseCompletionsResult,
      unifiedAnswersResult,
      userStatsResult,
      categoryStatsResult,
      subcategoryStatsResult
    ] = await Promise.all([
      // 1. クイズセッション数
      supabase
        .from('quiz_sessions')
        .select('id, total_xp, bonus_xp, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // 2. コース学習セッション数
      supabase
        .from('course_session_completions')
        .select('id, session_id, earned_xp, is_first_completion, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // 3. 統一回答ログ（全ての回答を取得してから後でフィルタ）
      supabase
        .from('quiz_answers')
        .select('id, session_type, quiz_session_id, course_session_id, earned_xp, is_correct, category_id, subcategory_id, created_at')
        .order('created_at', { ascending: false }),

      // 4. ユーザー統計
      supabase
        .from('user_xp_stats')
        .select('*')
        .eq('user_id', userId)
        .single(),

      // 5. カテゴリー別統計
      supabase
        .from('user_category_xp_stats')
        .select('*')
        .eq('user_id', userId),

      // 6. サブカテゴリー別統計
      supabase
        .from('user_subcategory_xp_stats')
        .select('*')
        .eq('user_id', userId)
    ])

    // エラーチェック
    if (quizSessionsResult.error) throw new Error(`Quiz sessions: ${quizSessionsResult.error.message}`)
    if (courseCompletionsResult.error) throw new Error(`Course completions: ${courseCompletionsResult.error.message}`)
    if (unifiedAnswersResult.error) throw new Error(`Unified answers: ${unifiedAnswersResult.error.message}`)

    const quizSessions = quizSessionsResult.data || []
    const courseCompletions = courseCompletionsResult.data || []
    const allAnswers = unifiedAnswersResult.data || []
    const userStats = userStatsResult.data
    const categoryStats = categoryStatsResult.data || []
    const subcategoryStats = subcategoryStatsResult.data || []

    // フィルタリング: ユーザーの回答のみを抽出
    const userQuizSessionIds = new Set(quizSessions.map(s => s.id))
    const userCourseSessionIds = new Set(courseCompletions.map(c => c.session_id))
    
    const unifiedAnswers = allAnswers.filter(answer => {
      // クイズ回答の場合: quiz_session_idがユーザーのものか確認
      if (answer.quiz_session_id) {
        return userQuizSessionIds.has(answer.quiz_session_id)
      }
      // コース確認クイズの場合: course_session_idがユーザーのものか確認
      if (answer.session_type === 'course_confirmation' && answer.course_session_id) {
        return userCourseSessionIds.has(answer.course_session_id)
      }
      return false
    })

    console.log(`🔍 Filtered ${unifiedAnswers.length} answers from ${allAnswers.length} total for user ${userId.substring(0, 8)}...`)

    // === 統計計算 ===
    const quizAnswers = unifiedAnswers.filter(a => a.session_type === 'quiz' || !a.session_type)
    const courseAnswers = unifiedAnswers.filter(a => a.session_type === 'course_confirmation')

    // XP集計
    const rawXpTotal = unifiedAnswers.reduce((sum, a) => sum + (a.earned_xp || 0), 0)
    const statsXpTotal = userStats?.total_xp || 0

    // 回答数集計
    const rawTotalAnswers = unifiedAnswers.length
    const rawCorrectAnswers = unifiedAnswers.filter(a => a.is_correct).length
    const statsTotalAnswers = userStats?.quiz_questions_answered || 0
    const statsCorrectAnswers = userStats?.quiz_questions_correct || 0

    // === カテゴリー別検証 ===
    const categoryBreakdown: CategoryXPBreakdown[] = []
    const categoryXpMap = new Map<string, number>()
    const categoryQuizCountMap = new Map<string, number>()
    const categoryCourseCountMap = new Map<string, number>()

    // 生データから集計
    unifiedAnswers.forEach(answer => {
      const categoryId = answer.category_id
      if (!categoryId) return

      categoryXpMap.set(categoryId, (categoryXpMap.get(categoryId) || 0) + (answer.earned_xp || 0))
      
      if (answer.session_type === 'course_confirmation') {
        categoryCourseCountMap.set(categoryId, (categoryCourseCountMap.get(categoryId) || 0) + 1)
      } else {
        categoryQuizCountMap.set(categoryId, (categoryQuizCountMap.get(categoryId) || 0) + 1)
      }
    })

    // カテゴリー別検証結果
    for (const [categoryId, rawXp] of categoryXpMap) {
      const statsXp = categoryStats.find(s => s.category_id === categoryId)?.total_xp || 0
      const isConsistent = Math.abs(rawXp - statsXp) < 1 // 1XP以内の誤差は許容
      
      categoryBreakdown.push({
        category_id: categoryId,
        category_name: categoryId, // TODO: カテゴリー名マスタから取得
        raw_xp_total: rawXp,
        stats_xp_total: statsXp,
        is_consistent: isConsistent,
        quiz_answers_count: categoryQuizCountMap.get(categoryId) || 0,
        course_answers_count: categoryCourseCountMap.get(categoryId) || 0
      })
    }

    // === サブカテゴリー別検証 ===
    const subcategoryBreakdown: SubcategoryXPBreakdown[] = []
    const subcategoryXpMap = new Map<string, { xp: number, category: string }>()
    const subcategoryQuizCountMap = new Map<string, number>()
    const subcategoryCourseCountMap = new Map<string, number>()

    // 生データから集計
    unifiedAnswers.forEach(answer => {
      const subcategoryId = answer.subcategory_id
      const categoryId = answer.category_id
      if (!subcategoryId || !categoryId) return

      const current = subcategoryXpMap.get(subcategoryId) || { xp: 0, category: categoryId }
      subcategoryXpMap.set(subcategoryId, { 
        xp: current.xp + (answer.earned_xp || 0), 
        category: categoryId 
      })
      
      if (answer.session_type === 'course_confirmation') {
        subcategoryCourseCountMap.set(subcategoryId, (subcategoryCourseCountMap.get(subcategoryId) || 0) + 1)
      } else {
        subcategoryQuizCountMap.set(subcategoryId, (subcategoryQuizCountMap.get(subcategoryId) || 0) + 1)
      }
    })

    // サブカテゴリー別検証結果
    for (const [subcategoryId, data] of subcategoryXpMap) {
      const statsXp = subcategoryStats.find(s => s.subcategory_id === subcategoryId)?.total_xp || 0
      const isConsistent = Math.abs(data.xp - statsXp) < 1 // 1XP以内の誤差は許容
      
      subcategoryBreakdown.push({
        subcategory_id: subcategoryId,
        subcategory_name: subcategoryId, // TODO: サブカテゴリー名マスタから取得
        category_id: data.category,
        raw_xp_total: data.xp,
        stats_xp_total: statsXp,
        is_consistent: isConsistent,
        quiz_answers_count: subcategoryQuizCountMap.get(subcategoryId) || 0,
        course_answers_count: subcategoryCourseCountMap.get(subcategoryId) || 0
      })
    }

    // === 整合性チェック ===
    const xpConsistent = Math.abs(rawXpTotal - statsXpTotal) < 1
    const sessionsConsistent = 
      quizSessions.length === (userStats?.quiz_sessions_completed || 0) &&
      courseCompletions.length === (userStats?.course_sessions_completed || 0)
    const answersConsistent = 
      rawTotalAnswers === statsTotalAnswers &&
      rawCorrectAnswers === statsCorrectAnswers

    const categoryIssues = categoryBreakdown.filter(c => !c.is_consistent).length
    const subcategoryIssues = subcategoryBreakdown.filter(s => !s.is_consistent).length

    // === 健全性スコアと問題検出 ===
    const criticalIssues: string[] = []
    const warnings: string[] = []

    if (!xpConsistent) criticalIssues.push(`XP不整合: 生データ${rawXpTotal}XP vs 統計${statsXpTotal}XP`)
    if (!sessionsConsistent) criticalIssues.push('セッション数不整合')
    if (!answersConsistent) criticalIssues.push('回答数不整合')
    if (categoryIssues > 0) warnings.push(`${categoryIssues}個のカテゴリーでXP不整合`)
    if (subcategoryIssues > 0) warnings.push(`${subcategoryIssues}個のサブカテゴリーでXP不整合`)

    const healthScore = Math.max(0, 100 - (criticalIssues.length * 30) - (warnings.length * 10))

    // === レスポンス構築 ===
    const result: AdminXPVerification = {
      // メインテーブル件数
      quiz_sessions_count: quizSessions.length,
      course_completions_count: courseCompletions.length,
      unified_answers_count: unifiedAnswers.length,
      
      // セッション種別内訳
      quiz_answers_count: quizAnswers.length,
      course_confirmation_count: courseAnswers.length,
      
      // XP集計検証
      raw_xp_total: rawXpTotal,
      stats_xp_total: statsXpTotal,
      xp_consistency_check: xpConsistent,
      
      // セッション集計検証
      raw_quiz_sessions: quizSessions.length,
      stats_quiz_sessions: userStats?.quiz_sessions_completed || 0,
      raw_course_sessions: courseCompletions.length,
      stats_course_sessions: userStats?.course_sessions_completed || 0,
      sessions_consistency_check: sessionsConsistent,
      
      // 回答数集計検証
      raw_total_answers: rawTotalAnswers,
      stats_total_answers: statsTotalAnswers,
      raw_correct_answers: rawCorrectAnswers,
      stats_correct_answers: statsCorrectAnswers,
      answers_consistency_check: answersConsistent,
      
      // カテゴリー別集計検証
      category_breakdown: categoryBreakdown,
      category_consistency_issues: categoryIssues,
      
      // サブカテゴリー別集計検証
      subcategory_breakdown: subcategoryBreakdown,
      subcategory_consistency_issues: subcategoryIssues,
      
      // システム全体の健全性
      overall_health_score: healthScore,
      critical_issues: criticalIssues,
      warnings: warnings,
      
      // 最新アクティビティ
      recent_quiz_sessions: quizSessions.slice(0, 5),
      recent_course_sessions: courseCompletions.slice(0, 5),
      recent_answers: unifiedAnswers.slice(0, 10)
    }

    console.log('✅ Admin XP Verification complete:', {
      userId: userId.substring(0, 8) + '...',
      healthScore: healthScore,
      criticalIssues: criticalIssues.length,
      warnings: warnings.length
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Admin XP Verification Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to verify XP system',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}