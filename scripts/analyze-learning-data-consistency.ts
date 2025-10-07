/**
 * 学習データ整合性分析スクリプト
 * 
 * 目的: 
 * 1. 各テーブルの学習時間データを比較
 * 2. データの不整合を特定
 * 3. 各学習タイプの実装状況を検証
 */

// 環境変数を明示的に読み込み
import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database-types-official'

// 型エイリアス
type UserXPStats = Database['public']['Tables']['user_xp_stats_v2']['Row']
type UserCategoryStats = Database['public']['Tables']['user_category_xp_stats_v2']['Row']
type DailyXPRecord = Database['public']['Tables']['daily_xp_records']['Row']

// テスト用ユーザーID（実際のユーザーIDに変更してください）
const TEST_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

interface DataConsistencyReport {
  userId: string
  timestamp: string
  overallStats: {
    totalLearningTime: number
    quizLearningTime: number
    courseLearningTime: number
    source: string
  }
  categoryStats: Array<{
    categoryId: string
    totalTime: number
    source: string
  }>
  dailyRecords: {
    totalTime: number
    quizTime: number
    courseTime: number
    recordCount: number
    source: string
  }
  rawSessions: {
    quizSessions: Array<{
      sessionId: string
      startTime: string
      endTime: string | null
      calculatedDuration: number
      totalQuestions: number
    }>
    courseSessions: Array<{
      sessionId: string
      courseId: string
      durationSeconds: number
      completionTime: string
      isFirstCompletion: boolean
    }>
  }
  inconsistencies: Array<{
    type: string
    description: string
    values: Record<string, any>
    severity: 'low' | 'medium' | 'high'
  }>
}

/**
 * 全体統計データを取得
 */
async function getOverallStats(userId: string) {
  console.log('📊 全体統計データを取得中...')
  
  const { data: userStats, error } = await supabaseAdmin
    .from('user_xp_stats_v2')
    .select(`
      total_learning_time_seconds,
      quiz_learning_time_seconds,
      course_learning_time_seconds,
      quiz_sessions_completed,
      course_sessions_completed
    `)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('❌ 全体統計取得エラー:', error)
    return null
  }

  console.log('✅ 全体統計取得完了:', userStats)
  return userStats
}

/**
 * カテゴリー別統計データを取得
 */
async function getCategoryStats(userId: string) {
  console.log('📊 カテゴリー別統計データを取得中...')
  
  const { data: categoryStats, error } = await supabaseAdmin
    .from('user_category_xp_stats_v2')
    .select(`
      category_id,
      quiz_sessions_completed,
      course_sessions_completed,
      total_xp,
      quiz_xp,
      course_xp
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('❌ カテゴリー別統計取得エラー:', error)
    return []
  }

  console.log(`✅ カテゴリー別統計取得完了: ${categoryStats?.length || 0}件`)
  return categoryStats || []
}

/**
 * 日別記録データを取得
 */
async function getDailyRecords(userId: string) {
  console.log('📊 日別記録データを取得中...')
  
  const { data: dailyRecords, error } = await supabaseAdmin
    .from('daily_xp_records')
    .select(`
      date,
      quiz_time_seconds,
      course_time_seconds,
      total_time_seconds
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30) // 最近30日

  if (error) {
    console.error('❌ 日別記録取得エラー:', error)
    return []
  }

  console.log(`✅ 日別記録取得完了: ${dailyRecords?.length || 0}件`)
  return dailyRecords || []
}

/**
 * クイズセッション生データを取得
 */
async function getQuizSessions(userId: string) {
  console.log('📊 クイズセッション生データを取得中...')
  
  const { data: quizSessions, error } = await supabaseAdmin
    .from('quiz_sessions')
    .select(`
      id,
      session_start_time,
      session_end_time,
      total_questions,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20) // 最近20セッション

  if (error) {
    console.error('❌ クイズセッション取得エラー:', error)
    return []
  }

  // セッション時間を計算
  const sessionsWithDuration = quizSessions?.map(session => {
    let calculatedDuration = 0
    if (session.session_start_time && session.session_end_time) {
      const start = new Date(session.session_start_time).getTime()
      const end = new Date(session.session_end_time).getTime()
      calculatedDuration = Math.round((end - start) / 1000)
    }
    
    return {
      sessionId: session.id,
      startTime: session.session_start_time,
      endTime: session.session_end_time,
      calculatedDuration,
      totalQuestions: session.total_questions
    }
  }) || []

  console.log(`✅ クイズセッション取得完了: ${sessionsWithDuration.length}件`)
  return sessionsWithDuration
}

/**
 * コースセッション生データを取得
 */
async function getCourseSessions(userId: string) {
  console.log('📊 コースセッション生データを取得中...')
  
  const { data: courseSessions, error } = await supabaseAdmin
    .from('course_session_completions')
    .select(`
      id,
      course_id,
      completion_time,
      is_first_completion,
      earned_xp,
      created_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20) // 最近20セッション

  if (error) {
    console.error('❌ コースセッション取得エラー:', error)
    return []
  }

  const sessionsWithData = courseSessions?.map(session => ({
    sessionId: session.id,
    courseId: session.course_id,
    durationSeconds: 0, // duration_secondsカラムが存在しない場合は0
    completionTime: session.completion_time,
    isFirstCompletion: session.is_first_completion
  })) || []

  console.log(`✅ コースセッション取得完了: ${sessionsWithData.length}件`)
  return sessionsWithData
}

/**
 * 回答詳細データから実際の学習時間を計算
 */
async function getActualAnswerTimes(userId: string) {
  console.log('📊 回答詳細データから実学習時間を計算中...')
  
  // クイズ回答時間を集計
  const { data: quizAnswers, error: quizError } = await supabaseAdmin
    .from('quiz_answers')
    .select('time_spent, session_type, created_at')
    .eq('session_type', 'quiz')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30日以内

  if (quizError) {
    console.error('❌ クイズ回答取得エラー:', quizError)
    return { quizAnswerTime: 0, courseAnswerTime: 0 }
  }

  // コース確認クイズ回答時間を集計
  const { data: courseAnswers, error: courseError } = await supabaseAdmin
    .from('quiz_answers')
    .select('time_spent, session_type, created_at')
    .eq('session_type', 'course')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30日以内

  if (courseError) {
    console.error('❌ コース回答取得エラー:', courseError)
    return { quizAnswerTime: 0, courseAnswerTime: 0 }
  }

  const quizAnswerTime = quizAnswers?.reduce((sum, answer) => sum + (answer.time_spent || 0), 0) || 0
  const courseAnswerTime = courseAnswers?.reduce((sum, answer) => sum + (answer.time_spent || 0), 0) || 0

  console.log(`✅ 実回答時間計算完了: クイズ${quizAnswerTime}秒, コース${courseAnswerTime}秒`)
  return { quizAnswerTime, courseAnswerTime }
}

/**
 * データ不整合を検出
 */
function detectInconsistencies(report: Partial<DataConsistencyReport>): DataConsistencyReport['inconsistencies'] {
  const inconsistencies: DataConsistencyReport['inconsistencies'] = []

  // 全体統計と日別記録の比較
  if (report.overallStats && report.dailyRecords) {
    const overallTotal = report.overallStats.totalLearningTime
    const dailyTotal = report.dailyRecords.totalTime
    const difference = Math.abs(overallTotal - dailyTotal)
    
    if (difference > 60) { // 60秒以上の差異
      inconsistencies.push({
        type: 'overall_vs_daily_time',
        description: `全体統計と日別記録の総学習時間に${difference}秒の差異があります`,
        values: {
          overallStats: overallTotal,
          dailyRecords: dailyTotal,
          difference
        },
        severity: difference > 300 ? 'high' : difference > 120 ? 'medium' : 'low'
      })
    }
  }

  // クイズ時間の整合性チェック
  if (report.overallStats && report.dailyRecords) {
    const overallQuiz = report.overallStats.quizLearningTime
    const dailyQuiz = report.dailyRecords.quizTime
    const difference = Math.abs(overallQuiz - dailyQuiz)
    
    if (difference > 30) {
      inconsistencies.push({
        type: 'quiz_time_inconsistency',
        description: `クイズ学習時間に${difference}秒の差異があります`,
        values: {
          overallStats: overallQuiz,
          dailyRecords: dailyQuiz,
          difference
        },
        severity: difference > 180 ? 'high' : difference > 60 ? 'medium' : 'low'
      })
    }
  }

  // セッション数の論理チェック
  if (report.rawSessions) {
    const quizSessionCount = report.rawSessions.quizSessions.length
    const courseSessionCount = report.rawSessions.courseSessions.length
    
    if (quizSessionCount === 0 && (report.overallStats?.quizLearningTime || 0) > 0) {
      inconsistencies.push({
        type: 'missing_quiz_sessions',
        description: 'クイズ学習時間は記録されているがセッションデータが見つかりません',
        values: {
          quizTime: report.overallStats?.quizLearningTime || 0,
          sessionCount: quizSessionCount
        },
        severity: 'high'
      })
    }
  }

  return inconsistencies
}

/**
 * メイン分析実行
 */
async function runDataConsistencyAnalysis(): Promise<DataConsistencyReport> {
  console.log('🔍 学習データ整合性分析を開始します...')
  console.log(`👤 対象ユーザー: ${TEST_USER_ID}`)
  console.log('='.repeat(50))

  const report: Partial<DataConsistencyReport> = {
    userId: TEST_USER_ID,
    timestamp: new Date().toISOString()
  }

  try {
    // 各データソースから情報を収集
    const [
      overallStats,
      categoryStats,
      dailyRecords,
      quizSessions,
      courseSessions,
      answerTimes
    ] = await Promise.all([
      getOverallStats(TEST_USER_ID),
      getCategoryStats(TEST_USER_ID),
      getDailyRecords(TEST_USER_ID),
      getQuizSessions(TEST_USER_ID),
      getCourseSessions(TEST_USER_ID),
      getActualAnswerTimes(TEST_USER_ID)
    ])

    // レポート構築
    if (overallStats) {
      report.overallStats = {
        totalLearningTime: overallStats.total_learning_time_seconds || 0,
        quizLearningTime: overallStats.quiz_learning_time_seconds || 0,
        courseLearningTime: overallStats.course_learning_time_seconds || 0,
        source: 'user_xp_stats_v2'
      }
    }

    // user_category_xp_stats_v2には学習時間フィールドが存在しないため、
    // XP値ベースでの統計を代用
    report.categoryStats = (categoryStats as UserCategoryStats[]).map(cat => ({
      categoryId: cat.category_id,
      totalTime: 0, // 学習時間フィールドが存在しないため0
      source: 'user_category_xp_stats_v2 (no time fields available)'
    }))

    if (dailyRecords.length > 0) {
      const typedDailyRecords = dailyRecords as DailyXPRecord[]
      const totalTime = typedDailyRecords.reduce((sum, record) => sum + (record.total_time_seconds || 0), 0)
      const quizTime = typedDailyRecords.reduce((sum, record) => sum + (record.quiz_time_seconds || 0), 0)
      const courseTime = typedDailyRecords.reduce((sum, record) => sum + (record.course_time_seconds || 0), 0)
      
      report.dailyRecords = {
        totalTime,
        quizTime,
        courseTime,
        recordCount: dailyRecords.length,
        source: 'daily_xp_records'
      }
    }

    report.rawSessions = {
      quizSessions,
      courseSessions
    }

    // 不整合検出
    report.inconsistencies = detectInconsistencies(report)

    console.log('\n📋 分析結果概要:')
    console.log(`- 全体学習時間: ${report.overallStats?.totalLearningTime || 0}秒`)
    console.log(`- クイズ時間: ${report.overallStats?.quizLearningTime || 0}秒`)
    console.log(`- コース時間: ${report.overallStats?.courseLearningTime || 0}秒`)
    console.log(`- カテゴリー統計: ${report.categoryStats?.length || 0}件`)
    console.log(`- 日別記録: ${report.dailyRecords?.recordCount || 0}日分`)
    console.log(`- クイズセッション: ${report.rawSessions?.quizSessions.length || 0}件`)
    console.log(`- コースセッション: ${report.rawSessions?.courseSessions.length || 0}件`)
    console.log(`- 検出された不整合: ${report.inconsistencies?.length || 0}件`)

    if (report.inconsistencies && report.inconsistencies.length > 0) {
      console.log('\n⚠️ 検出された不整合:')
      report.inconsistencies.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`)
        console.log(`   詳細:`, issue.values)
      })
    }

    return report as DataConsistencyReport

  } catch (error) {
    console.error('❌ 分析中にエラーが発生しました:', error)
    throw error
  }
}

// スクリプト実行
if (require.main === module) {
  runDataConsistencyAnalysis()
    .then(report => {
      console.log('\n✅ 学習データ整合性分析が完了しました')
      console.log('\n📄 完全なレポートをJSONで出力:')
      console.log(JSON.stringify(report, null, 2))
    })
    .catch(error => {
      console.error('❌ 分析実行エラー:', error)
      process.exit(1)
    })
}