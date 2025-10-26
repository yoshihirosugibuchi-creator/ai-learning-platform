// 学習品質スコア算出システム
// 継続性・正確性・効率性・多様性・深度の5要素を総合評価

import './database-types-official'
import './hourly-efficiency'
import { supabase } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// 学習品質スコア構成要素の重み（合計100%）
export const QUALITY_SCORE_WEIGHTS = {
  consistency: 25,  // 継続性: 学習日数の継続性
  accuracy: 30,     // 正確性: クイズ正答率
  efficiency: 20,   // 効率性: 時間あたりのXP獲得
  diversity: 15,    // 多様性: カテゴリーの多様性
  depth: 10         // 深度: 1日の学習時間・問題数
} as const

// 各要素の最大スコア定義
export const MAX_SCORES = {
  consistency: 100,
  accuracy: 100,
  efficiency: 100,
  diversity: 100,
  depth: 100
} as const

// 分析期間の設定
export const ANALYSIS_PERIODS = {
  SHORT_TERM: 7,   // 直近7日間
  MEDIUM_TERM: 30, // 直近30日間
  LONG_TERM: 90    // 直近90日間
} as const

/**
 * 学習品質スコア計算結果の型定義
 */
export interface LearningQualityScore {
  total_score: number          // 総合スコア (0-100)
  consistency_score: number    // 継続性スコア (0-100)
  accuracy_score: number       // 正確性スコア (0-100)
  efficiency_score: number     // 効率性スコア (0-100)
  diversity_score: number      // 多様性スコア (0-100)
  depth_score: number          // 深度スコア (0-100)
  analysis_period: number      // 分析期間 (日数)
  calculated_at: string        // 計算日時 (JST)
  _stats?: LearningStats       // 内部統計データ（UI判定用）
}

/**
 * 学習統計データの型定義
 */
export interface LearningStats {
  total_days: number
  study_days: number
  total_quiz_sessions: number
  total_correct_answers: number
  total_questions_answered: number
  total_thinking_time_minutes: number
  total_xp_earned: number
  unique_categories: number
  avg_session_length_minutes: number
  max_daily_sessions: number
}

/**
 * ユーザーの学習品質スコアを計算（管理者用）
 */
export async function calculateLearningQualityScore(
  userId: string,
  targetDate: string, // YYYY-MM-DD format (JST)
  analysisPeriod: number = ANALYSIS_PERIODS.MEDIUM_TERM
): Promise<LearningQualityScore> {
  
  // 分析期間の開始日計算
  const endDate = new Date(`${targetDate}T23:59:59+09:00`)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - analysisPeriod + 1)
  
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]
  
  try {
    // 学習統計データを取得
    const stats = await getLearningStats(userId, startDateStr, endDateStr)
    return calculateQualityScoreFromStats(stats, analysisPeriod)
  } catch (error) {
    console.error('学習品質スコア計算エラー:', error)
    return getDefaultQualityScore(analysisPeriod)
  }
}

/**
 * ユーザーの学習品質スコアを計算（クライアント用）
 */
export async function calculateLearningQualityScoreClient(
  supabase: SupabaseClient,
  userId: string,
  targetDate: string, // YYYY-MM-DD format (JST)
  analysisPeriod: number = ANALYSIS_PERIODS.MEDIUM_TERM
): Promise<LearningQualityScore> {
  
  // 分析期間の開始日計算
  const endDate = new Date(`${targetDate}T23:59:59+09:00`)
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - analysisPeriod + 1)
  
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]
  
  try {
    // 学習統計データを取得
    const stats = await getLearningStatsClient(supabase, userId, startDateStr, endDateStr)
    const score = calculateQualityScoreFromStats(stats, analysisPeriod)
    
    // 統計データも含めて返す（UI表示判定用）
    return { ...score, _stats: stats }
  } catch (error) {
    console.error('学習品質スコア計算エラー:', error)
    return getDefaultQualityScore(analysisPeriod)
  }
}

/**
 * 統計データから品質スコアを計算
 */
function calculateQualityScoreFromStats(
  stats: LearningStats,
  analysisPeriod: number
): LearningQualityScore {
  // 各要素のスコアを計算
  const consistencyScore = calculateConsistencyScore(stats, analysisPeriod)
  const accuracyScore = calculateAccuracyScore(stats)
  const efficiencyScore = calculateEfficiencyScore(stats)
  const diversityScore = calculateDiversityScore(stats)
  const depthScore = calculateDepthScore(stats)
  
  // 重み付き総合スコア計算
  const totalScore = Math.round(
    (consistencyScore * QUALITY_SCORE_WEIGHTS.consistency +
     accuracyScore * QUALITY_SCORE_WEIGHTS.accuracy +
     efficiencyScore * QUALITY_SCORE_WEIGHTS.efficiency +
     diversityScore * QUALITY_SCORE_WEIGHTS.diversity +
     depthScore * QUALITY_SCORE_WEIGHTS.depth) / 100
  )
  
  return {
    total_score: Math.min(100, Math.max(0, totalScore)),
    consistency_score: Math.round(consistencyScore),
    accuracy_score: Math.round(accuracyScore),
    efficiency_score: Math.round(efficiencyScore),
    diversity_score: Math.round(diversityScore),
    depth_score: Math.round(depthScore),
    analysis_period: analysisPeriod,
    calculated_at: new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-')
  }
}

/**
 * デフォルト品質スコア取得
 */
function getDefaultQualityScore(analysisPeriod: number): LearningQualityScore {
  return {
    total_score: 0,
    consistency_score: 0,
    accuracy_score: 0,
    efficiency_score: 0,
    diversity_score: 0,
    depth_score: 0,
    analysis_period: analysisPeriod,
    calculated_at: new Date().toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo'
    }).replace(/\//g, '-')
  }
}

/**
 * 学習統計データを取得（クライアント用）
 */
async function getLearningStatsClient(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<LearningStats> {
  
  // daily_xp_records から基本統計を取得
  const { data: dailyRecords, error: dailyError } = await supabase
    .from('daily_xp_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  
  if (dailyError) {
    throw new Error(`Daily records取得エラー: ${dailyError.message}`)
  }
  
  // quiz_sessions から詳細データを取得
  const { data: quizSessions, error: quizError } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      quiz_answers(
        is_correct,
        time_spent
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', `${startDate}T00:00:00+09:00`)
    .lte('created_at', `${endDate}T23:59:59+09:00`)
  
  if (quizError) {
    throw new Error(`Quiz sessions取得エラー: ${quizError.message}`)
  }
  
  // 統計計算（getLearningStatsと同じロジック）
  const totalDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const studyDays = dailyRecords?.length || 0
  
  const totalQuizSessions = quizSessions?.length || 0
  
  // クイズ回答統計
  let totalCorrectAnswers = 0
  let totalQuestionsAnswered = 0
  let totalThinkingTimeMs = 0
  
  quizSessions?.forEach(session => {
    if (session.quiz_answers) {
      session.quiz_answers.forEach((answer: { is_correct: boolean; time_spent: number }) => {
        totalQuestionsAnswered++
        if (answer.is_correct) totalCorrectAnswers++
        totalThinkingTimeMs += answer.time_spent || 0
      })
    }
  })
  
  // XP・カテゴリー統計
  const totalXpEarned = dailyRecords?.reduce((sum, record) => 
    sum + (record.quiz_xp_earned || 0) + (record.course_xp_earned || 0) + (record.bonus_xp_earned || 0), 0) || 0
  
  const uniqueCategories = new Set(
    quizSessions?.map(session => (session as { category_id?: string }).category_id).filter(Boolean)
  ).size
  
  // セッション長統計
  const sessionLengths = quizSessions?.map(session => {
    if (session.quiz_answers && session.quiz_answers.length > 0) {
      const sessionThinkingTime = session.quiz_answers.reduce((sum: number, answer: { time_spent?: number }) => 
        sum + (answer.time_spent || 0), 0)
      return Math.round(sessionThinkingTime / 60) // 秒を分に変換
    }
    return 0
  }).filter(length => length > 0) || []
  
  const avgSessionLengthMinutes = sessionLengths.length > 0 
    ? sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length 
    : 0
  
  // 1日の最大セッション数
  const dailySessionCounts = new Map<string, number>()
  quizSessions?.forEach(session => {
    if (session.created_at) {
      const date = session.created_at.split('T')[0]
      dailySessionCounts.set(date, (dailySessionCounts.get(date) || 0) + 1)
    }
  })
  const maxDailySessions = Math.max(...Array.from(dailySessionCounts.values()), 0)
  
  return {
    total_days: totalDays,
    study_days: studyDays,
    total_quiz_sessions: totalQuizSessions,
    total_correct_answers: totalCorrectAnswers,
    total_questions_answered: totalQuestionsAnswered,
    total_thinking_time_minutes: Math.round(totalThinkingTimeMs / 60),
    total_xp_earned: totalXpEarned,
    unique_categories: uniqueCategories,
    avg_session_length_minutes: Math.round(avgSessionLengthMinutes),
    max_daily_sessions: maxDailySessions
  }
}

/**
 * 学習統計データを取得
 */
async function getLearningStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<LearningStats> {
  
  // daily_xp_records から基本統計を取得
  const { data: dailyRecords, error: dailyError } = await supabase
    .from('daily_xp_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  
  if (dailyError) {
    throw new Error(`Daily records取得エラー: ${dailyError.message}`)
  }
  
  // quiz_sessions から詳細データを取得
  const { data: quizSessions, error: quizError } = await supabase
    .from('quiz_sessions')
    .select(`
      *,
      quiz_answers(
        is_correct,
        time_spent
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', `${startDate}T00:00:00+09:00`)
    .lte('created_at', `${endDate}T23:59:59+09:00`)
  
  if (quizError) {
    throw new Error(`Quiz sessions取得エラー: ${quizError.message}`)
  }
  
  // 統計計算
  const totalDays = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  const studyDays = dailyRecords?.length || 0
  
  const totalQuizSessions = quizSessions?.length || 0
  
  // クイズ回答統計
  let totalCorrectAnswers = 0
  let totalQuestionsAnswered = 0
  let totalThinkingTimeMs = 0
  
  quizSessions?.forEach(session => {
    if (session.quiz_answers) {
      session.quiz_answers.forEach((answer: { is_correct: boolean; time_spent: number }) => {
        totalQuestionsAnswered++
        if (answer.is_correct) totalCorrectAnswers++
        totalThinkingTimeMs += answer.time_spent || 0
      })
    }
  })
  
  // XP・カテゴリー統計
  const totalXpEarned = dailyRecords?.reduce((sum, record) => 
    sum + (record.quiz_xp_earned || 0) + (record.course_xp_earned || 0) + (record.bonus_xp_earned || 0), 0) || 0
  
  const uniqueCategories = new Set(
    quizSessions?.map(session => (session as { category_id?: string }).category_id).filter(Boolean)
  ).size
  
  // セッション長統計
  const sessionLengths = quizSessions?.map(session => {
    if (session.quiz_answers && session.quiz_answers.length > 0) {
      const sessionThinkingTime = session.quiz_answers.reduce((sum: number, answer: { time_spent?: number }) => 
        sum + (answer.time_spent || 0), 0)
      return Math.round(sessionThinkingTime / 60) // 秒を分に変換
    }
    return 0
  }).filter(length => length > 0) || []
  
  const avgSessionLengthMinutes = sessionLengths.length > 0 
    ? sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length 
    : 0
  
  // 1日の最大セッション数
  const dailySessionCounts = new Map<string, number>()
  quizSessions?.forEach(session => {
    if (session.created_at) {
      const date = session.created_at.split('T')[0]
      dailySessionCounts.set(date, (dailySessionCounts.get(date) || 0) + 1)
    }
  })
  const maxDailySessions = Math.max(...Array.from(dailySessionCounts.values()), 0)
  
  return {
    total_days: totalDays,
    study_days: studyDays,
    total_quiz_sessions: totalQuizSessions,
    total_correct_answers: totalCorrectAnswers,
    total_questions_answered: totalQuestionsAnswered,
    total_thinking_time_minutes: Math.round(totalThinkingTimeMs / 60),
    total_xp_earned: totalXpEarned,
    unique_categories: uniqueCategories,
    avg_session_length_minutes: Math.round(avgSessionLengthMinutes),
    max_daily_sessions: maxDailySessions
  }
}

/**
 * 継続性スコア計算 (0-100)
 * 学習日数の割合と連続学習日数を評価
 */
function calculateConsistencyScore(stats: LearningStats, analysisPeriod: number): number {
  const studyRate = stats.study_days / stats.total_days
  const sessionConsistency = Math.min(stats.total_quiz_sessions / analysisPeriod, 2) / 2 // 1日平均2セッションで満点
  
  // 継続率70% + セッション一貫性30%
  const score = (studyRate * 70) + (sessionConsistency * 30)
  return Math.min(100, score)
}

/**
 * 正確性スコア計算 (0-100)
 * クイズ正答率を評価
 */
function calculateAccuracyScore(stats: LearningStats): number {
  if (stats.total_questions_answered === 0) return 0
  
  const accuracyRate = stats.total_correct_answers / stats.total_questions_answered
  
  // 正答率80%で満点、60%未満で大幅減点
  if (accuracyRate >= 0.8) {
    return 100
  } else if (accuracyRate >= 0.6) {
    return 50 + (accuracyRate - 0.6) * 250 // 60-80%の範囲を50-100点にマッピング
  } else {
    return accuracyRate * 83.33 // 60%未満は50点以下
  }
}

/**
 * 効率性スコア計算 (0-100)
 * 時間あたりのXP獲得効率を評価
 */
function calculateEfficiencyScore(stats: LearningStats): number {
  if (stats.total_thinking_time_minutes === 0) return 0
  
  const xpPerMinute = stats.total_xp_earned / stats.total_thinking_time_minutes
  
  // 分あたり1.5XPで満点、0.5XP未満で大幅減点
  if (xpPerMinute >= 1.5) {
    return 100
  } else if (xpPerMinute >= 0.5) {
    return (xpPerMinute - 0.5) * 100 // 0.5-1.5の範囲を0-100点にマッピング
  } else {
    return xpPerMinute * 100 // 0.5未満は50点以下相当
  }
}

/**
 * 多様性スコア計算 (0-100)
 * 学習カテゴリーの多様性を評価
 */
function calculateDiversityScore(stats: LearningStats): number {
  // カテゴリー数に応じてスコア計算
  // 5カテゴリー以上で満点
  const score = Math.min(stats.unique_categories * 20, 100)
  return score
}

/**
 * 深度スコア計算 (0-100)
 * 1セッションの長さと集中度を評価
 */
function calculateDepthScore(stats: LearningStats): number {
  if (stats.total_quiz_sessions === 0) return 0
  
  const avgSessionScore = Math.min(stats.avg_session_length_minutes / 10, 1) * 60 // 10分セッションで60点
  const intensityScore = Math.min(stats.max_daily_sessions / 5, 1) * 40 // 1日5セッションで40点
  
  return avgSessionScore + intensityScore
}

/**
 * 学習品質スコアの詳細分析結果を取得
 */
export function analyzeLearningQuality(score: LearningQualityScore, stats?: LearningStats): {
  grade: string
  message: string
  recommendations: string[]
} {
  const totalScore = score.total_score
  
  let grade: string
  let message: string
  let recommendations: string[] = []
  
  // 学習データ不足の判定（初期ユーザー向け特別処理）
  const isInsufficientData = stats && (
    stats.total_quiz_sessions < 3 ||
    stats.study_days < 3 ||
    stats.total_thinking_time_minutes < 10
  )
  
  if (isInsufficientData) {
    grade = 'START'
    message = '学習をスタートしましょう！'
    recommendations = [
      '毎日少しずつでも継続することが大切です',
      'まずは興味のあるカテゴリーから始めてみましょう',
      '短時間でも集中して取り組むことで効果的な学習ができます'
    ]
  } else if (totalScore >= 90) {
    grade = 'S'
    message = '素晴らしい学習習慣を維持しています！'
    recommendations = ['現在の学習リズムを継続してください', '新しいカテゴリーに挑戦してみましょう']
  } else if (totalScore >= 80) {
    grade = 'A'
    message = '非常に良い学習パフォーマンスです。'
    recommendations = ['より一貫した学習習慣を目指しましょう', '苦手分野の集中的な学習を検討してください']
  } else if (totalScore >= 70) {
    grade = 'B'
    message = '良い学習習慣が身についています。'
    recommendations = ['学習時間の延長を検討してください', '正答率向上のための復習を増やしましょう']
  } else if (totalScore >= 60) {
    grade = 'C'
    message = '学習習慣を安定させていきましょう。'
    recommendations = ['毎日少しずつでも学習を続けましょう', '基礎的な問題から丁寧に取り組んでください']
  } else {
    grade = 'D'
    message = '学習習慣を見直してみましょう。'
    recommendations = ['まずは週3日の学習習慣から始めましょう', '短時間でも集中して取り組んでください']
  }
  
  // 個別要素の改善提案
  if (score.consistency_score < 70) {
    recommendations.push('学習の継続性を向上させましょう')
  }
  if (score.accuracy_score < 70) {
    recommendations.push('正答率向上のための復習に重点を置きましょう')
  }
  if (score.efficiency_score < 70) {
    recommendations.push('時間効率を意識した学習方法を試しましょう')
  }
  if (score.diversity_score < 70) {
    recommendations.push('より多くのカテゴリーに挑戦してみましょう')
  }
  if (score.depth_score < 70) {
    recommendations.push('1回の学習時間を少し延ばしてみましょう')
  }
  
  return { grade, message, recommendations }
}

/**
 * デバッグ用：学習品質スコアの詳細表示
 */
export function logLearningQualityScore(score: LearningQualityScore, stats?: LearningStats): void {
  console.log('=== 学習品質スコア詳細 ===')
  console.log(`総合スコア: ${score.total_score}/100`)
  console.log(`継続性: ${score.consistency_score}/100 (重み${QUALITY_SCORE_WEIGHTS.consistency}%)`)
  console.log(`正確性: ${score.accuracy_score}/100 (重み${QUALITY_SCORE_WEIGHTS.accuracy}%)`)
  console.log(`効率性: ${score.efficiency_score}/100 (重み${QUALITY_SCORE_WEIGHTS.efficiency}%)`)
  console.log(`多様性: ${score.diversity_score}/100 (重み${QUALITY_SCORE_WEIGHTS.diversity}%)`)
  console.log(`深度: ${score.depth_score}/100 (重み${QUALITY_SCORE_WEIGHTS.depth}%)`)
  console.log(`分析期間: ${score.analysis_period}日間`)
  console.log(`計算日時: ${score.calculated_at}`)
  
  if (stats) {
    console.log('\n=== 学習統計データ ===')
    console.log(`学習日数: ${stats.study_days}/${stats.total_days}日`)
    console.log(`セッション数: ${stats.total_quiz_sessions}回`)
    console.log(`正答率: ${stats.total_questions_answered > 0 ? Math.round((stats.total_correct_answers / stats.total_questions_answered) * 100) : 0}%`)
    console.log(`総学習時間: ${stats.total_thinking_time_minutes}分`)
    console.log(`獲得XP: ${stats.total_xp_earned}XP`)
    console.log(`学習カテゴリー: ${stats.unique_categories}種類`)
  }
  
  const analysis = analyzeLearningQuality(score)
  console.log(`\n評価: ${analysis.grade}`)
  console.log(`メッセージ: ${analysis.message}`)
  console.log('推奨事項:', analysis.recommendations)
  console.log('========================')
}