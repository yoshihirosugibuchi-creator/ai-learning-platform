/**
 * 復習問題特定機能
 * 3日前の間違い問題から最大2問を特定し、効率的な復習を支援
 */

import { supabase } from '@/lib/supabase'
// import { Question } from './types' // Unused import
import { assessDataReliability } from './data-reliability'

// 復習問題データ
export interface ReviewQuestionData {
  questionId: string
  categoryId: string
  subcategoryId?: string
  difficulty: string
  incorrectDate: string
  incorrectCount: number
  lastAttemptAccuracy: boolean
  daysSinceIncorrect: number
  reviewPriority: 'urgent' | 'high' | 'medium' | 'low'
  reviewReason: string
  forgettingRisk: number // 0-100
}

// 復習セッション結果
export interface ReviewSession {
  userId: string
  reviewQuestions: ReviewQuestionData[]
  totalReviewQuestions: number
  targetReviewDate: Date
  sessionType: 'targeted_review' | 'spaced_repetition' | 'weakness_focus'
  expectedDuration: number // 分
  dataReliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
  lastUpdated: Date
}

/**
 * 3日前の間違い問題から復習対象を特定
 * @param userId ユーザーID
 * @param maxQuestions 最大問題数（デフォルト: 2）
 * @param lookbackDays 遡る日数（デフォルト: 3）
 * @returns 復習セッション
 */
export async function identifyReviewQuestions(
  userId: string,
  maxQuestions: number = 2,
  lookbackDays: number = 3
): Promise<ReviewSession> {
  try {
    console.log(`🔍 Identifying review questions for user: ${userId}`)
    console.log(`📅 Looking back ${lookbackDays} days for incorrect answers`)

    // 1. データ信頼度評価
    const reliability = await assessDataReliability(userId)
    console.log(`📊 Data reliability: ${reliability.reliabilityLevel}`)

    // 2. 間違い問題を取得
    const incorrectQuestions = await getIncorrectQuestions(userId, lookbackDays)
    
    if (incorrectQuestions.length === 0) {
      console.log(`✨ No incorrect questions found in the last ${lookbackDays} days`)
      return generateEmptyReviewSession(userId, reliability.reliabilityLevel)
    }

    // 3. 復習優先度を計算
    const reviewCandidates = await calculateReviewPriorities(incorrectQuestions, lookbackDays)
    
    // 4. 最適な復習問題を選択
    const selectedQuestions = selectOptimalReviewQuestions(reviewCandidates, maxQuestions)
    
    // 5. セッションタイプを決定
    const sessionType = determineSessionType(selectedQuestions, reliability.reliabilityLevel)
    
    // 6. 推定時間を計算
    const expectedDuration = calculateExpectedDuration(selectedQuestions)

    const reviewSession: ReviewSession = {
      userId,
      reviewQuestions: selectedQuestions,
      totalReviewQuestions: incorrectQuestions.length,
      targetReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
      sessionType,
      expectedDuration,
      dataReliability: reliability.reliabilityLevel,
      lastUpdated: new Date()
    }

    console.log(`✅ Review questions identified:`, {
      selectedQuestions: selectedQuestions.length,
      totalIncorrect: incorrectQuestions.length,
      sessionType,
      expectedDuration: `${expectedDuration}分`
    })

    return reviewSession

  } catch (error) {
    console.error('❌ Error in identifyReviewQuestions:', error)
    return generateEmptyReviewSession(userId, 'INSUFFICIENT')
  }
}

/**
 * 指定期間内の間違い問題を取得
 */
async function getIncorrectQuestions(userId: string, lookbackDays: number): Promise<{
  questionId: string
  categoryId: string
  subcategoryId?: string
  difficulty: string
  incorrectDate: string
  isCorrect: boolean
}[]> {
  try {
    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
    const endDate = new Date().toISOString()

    console.log(`🔍 Fetching incorrect answers from ${startDate} to ${endDate}`)

    const { data, error } = await supabase
      .from('quiz_answers')
      .select(`
        question_id,
        category_id,
        subcategory_id,
        difficulty,
        is_correct,
        created_at,
        quiz_sessions!inner (
          user_id
        )
      `)
      .eq('quiz_sessions.user_id', userId)
      .eq('is_correct', false)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching incorrect questions:', error)
      return []
    }

    const incorrectQuestions = data?.filter(record => record.created_at).map(record => ({
      questionId: record.question_id,
      categoryId: record.category_id,
      subcategoryId: record.subcategory_id || undefined,
      difficulty: record.difficulty,
      incorrectDate: record.created_at!,
      isCorrect: record.is_correct
    })) || []

    console.log(`📚 Found ${incorrectQuestions.length} incorrect questions`)
    return incorrectQuestions

  } catch (error) {
    console.error('Error in getIncorrectQuestions:', error)
    return []
  }
}

/**
 * 復習優先度を計算
 */
async function calculateReviewPriorities(
  incorrectQuestions: Array<{
    questionId: string
    categoryId: string
    subcategoryId?: string
    difficulty: string
    incorrectDate: string
    isCorrect: boolean
  }>,
  _lookbackDays: number
): Promise<ReviewQuestionData[]> {
  const questionMap = new Map<string, ReviewQuestionData>()

  // 問題ごとに統計を集計
  incorrectQuestions.forEach(question => {
    const questionId = question.questionId
    const incorrectDate = question.incorrectDate
    const daysSince = Math.floor(
      (Date.now() - new Date(incorrectDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (!questionMap.has(questionId)) {
      questionMap.set(questionId, {
        questionId,
        categoryId: question.categoryId,
        subcategoryId: question.subcategoryId,
        difficulty: question.difficulty,
        incorrectDate,
        incorrectCount: 0,
        lastAttemptAccuracy: false,
        daysSinceIncorrect: daysSince,
        reviewPriority: 'medium',
        reviewReason: '',
        forgettingRisk: 0
      })
    }

    const reviewData = questionMap.get(questionId)!
    reviewData.incorrectCount++
    
    // より最近の間違いを記録
    if (daysSince < reviewData.daysSinceIncorrect) {
      reviewData.daysSinceIncorrect = daysSince
      reviewData.incorrectDate = incorrectDate
    }
  })

  // 各問題の優先度を計算
  const reviewCandidates = Array.from(questionMap.values()).map(question => {
    // 忘却リスク計算（エビングハウスの忘却曲線に基づく）
    const forgettingRisk = calculateForgettingRisk(question.daysSinceIncorrect, question.incorrectCount)
    
    // 復習優先度判定
    const reviewPriority = determineReviewPriority(
      question.daysSinceIncorrect,
      question.incorrectCount,
      forgettingRisk
    )
    
    // 復習理由生成
    const reviewReason = generateReviewReason(
      question.daysSinceIncorrect,
      question.incorrectCount,
      reviewPriority
    )

    return {
      ...question,
      forgettingRisk,
      reviewPriority,
      reviewReason
    }
  })

  // 優先度順でソート
  return reviewCandidates.sort((a, b) => {
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 }
    const aPriority = priorityOrder[a.reviewPriority]
    const bPriority = priorityOrder[b.reviewPriority]
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }
    
    // 同じ優先度の場合は忘却リスク順
    return b.forgettingRisk - a.forgettingRisk
  })
}

/**
 * 忘却リスクを計算（0-100）
 * エビングハウスの忘却曲線：R(t) = 100 * e^(-t/S)
 */
function calculateForgettingRisk(daysSinceIncorrect: number, incorrectCount: number): number {
  // S = 記憶強度（間違い回数で調整）
  const memoryStrength = Math.max(1, 5 - incorrectCount) // 間違いが多いほど記憶が弱い
  const forgettingRate = 100 * Math.exp(-daysSinceIncorrect / memoryStrength)
  
  // リスクは忘却率の逆数（忘れやすいほど高リスク）
  const risk = 100 - forgettingRate
  
  return Math.min(100, Math.max(0, Math.round(risk)))
}

/**
 * 復習優先度を判定
 */
function determineReviewPriority(
  daysSinceIncorrect: number,
  incorrectCount: number,
  forgettingRisk: number
): 'urgent' | 'high' | 'medium' | 'low' {
  // 緊急：3日経過 + 高忘却リスク + 複数回間違い
  if (daysSinceIncorrect >= 3 && forgettingRisk >= 80 && incorrectCount >= 2) {
    return 'urgent'
  }
  
  // 高：2-3日経過 + 中程度以上のリスク
  if (daysSinceIncorrect >= 2 && forgettingRisk >= 60) {
    return 'high'
  }
  
  // 中：1-2日経過 または 複数回間違い
  if (daysSinceIncorrect >= 1 || incorrectCount >= 2) {
    return 'medium'
  }
  
  // 低：その他
  return 'low'
}

/**
 * 復習理由を生成
 */
function generateReviewReason(
  daysSinceIncorrect: number,
  incorrectCount: number,
  priority: string
): string {
  switch (priority) {
    case 'urgent':
      return `${daysSinceIncorrect}日前に間違え、${incorrectCount}回の誤答があります。忘却リスクが高いため緊急復習が必要です。`
    case 'high':
      return `${daysSinceIncorrect}日前に間違えました。記憶が薄れる前に復習しましょう。`
    case 'medium':
      return `${incorrectCount}回間違えた問題です。理解を確実にするため復習をお勧めします。`
    case 'low':
      return `最近間違えた問題です。軽く復習して記憶を定着させましょう。`
    default:
      return '復習により理解を深めることができます。'
  }
}

/**
 * 最適な復習問題を選択
 */
function selectOptimalReviewQuestions(
  candidates: ReviewQuestionData[],
  maxQuestions: number
): ReviewQuestionData[] {
  // 優先度とカテゴリーバランスを考慮した選択
  const selected: ReviewQuestionData[] = []
  const usedCategories = new Set<string>()

  // 1. 緊急・高優先度を優先選択
  const urgentHigh = candidates.filter(q => q.reviewPriority === 'urgent' || q.reviewPriority === 'high')
  
  for (const question of urgentHigh) {
    if (selected.length >= maxQuestions) break
    
    // カテゴリーの重複を避ける（ただし緊急の場合は許可）
    if (question.reviewPriority === 'urgent' || !usedCategories.has(question.categoryId)) {
      selected.push(question)
      usedCategories.add(question.categoryId)
    }
  }

  // 2. 残り枠を中・低優先度で埋める
  if (selected.length < maxQuestions) {
    const remaining = candidates.filter(q => 
      !selected.includes(q) && 
      (q.reviewPriority === 'medium' || q.reviewPriority === 'low')
    )

    for (const question of remaining) {
      if (selected.length >= maxQuestions) break
      
      // できるだけ異なるカテゴリーから選択
      if (!usedCategories.has(question.categoryId) || selected.length === maxQuestions - 1) {
        selected.push(question)
        usedCategories.add(question.categoryId)
      }
    }
  }

  return selected
}

/**
 * セッションタイプを決定
 */
function determineSessionType(
  questions: ReviewQuestionData[],
  reliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
): 'targeted_review' | 'spaced_repetition' | 'weakness_focus' {
  const urgentCount = questions.filter(q => q.reviewPriority === 'urgent').length
  const highCount = questions.filter(q => q.reviewPriority === 'high').length

  if (reliability === 'HIGH') {
    if (urgentCount >= 1) {
      return 'targeted_review' // 緊急復習
    } else if (highCount >= 1) {
      return 'spaced_repetition' // 間隔復習
    } else {
      return 'weakness_focus' // 弱点強化
    }
  } else {
    return 'weakness_focus' // データ不足時は弱点強化
  }
}

/**
 * 推定時間を計算（分）
 */
function calculateExpectedDuration(questions: ReviewQuestionData[]): number {
  // 基本時間：問題あたり3分
  const baseTime = questions.length * 3

  // 難易度調整
  let difficultyAdjustment = 0
  questions.forEach(q => {
    switch (q.difficulty) {
      case 'basic':
        difficultyAdjustment += 0
        break
      case 'intermediate':
        difficultyAdjustment += 1
        break
      case 'advanced':
        difficultyAdjustment += 2
        break
      case 'expert':
        difficultyAdjustment += 3
        break
    }
  })

  // 優先度調整（緊急・高優先度は解説時間を長く）
  let priorityAdjustment = 0
  questions.forEach(q => {
    if (q.reviewPriority === 'urgent') {
      priorityAdjustment += 2
    } else if (q.reviewPriority === 'high') {
      priorityAdjustment += 1
    }
  })

  return Math.max(5, baseTime + difficultyAdjustment + priorityAdjustment)
}

/**
 * 空の復習セッションを生成
 */
function generateEmptyReviewSession(
  userId: string,
  reliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT'
): ReviewSession {
  return {
    userId,
    reviewQuestions: [],
    totalReviewQuestions: 0,
    targetReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    sessionType: 'weakness_focus',
    expectedDuration: 0,
    dataReliability: reliability,
    lastUpdated: new Date()
  }
}

/**
 * 復習完了後の問題更新
 * @param userId ユーザーID
 * @param questionId 問題ID
 * @param isCorrect 正解したかどうか
 * @param reviewType 復習タイプ
 */
export async function updateReviewProgress(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  reviewType: 'targeted_review' | 'spaced_repetition' | 'weakness_focus'
): Promise<{
  success: boolean
  message: string
  nextReviewDate?: Date
}> {
  try {
    console.log(`📝 Updating review progress: ${questionId}, correct: ${isCorrect}`)

    // 復習履歴を記録（仮想テーブル - 実装時は実テーブルを使用）
    console.log(`Recording review session for question ${questionId}`)

    // 次回復習日を計算
    let nextReviewDate: Date | undefined
    if (isCorrect) {
      // 正解した場合は間隔を延ばす
      const intervalDays = reviewType === 'targeted_review' ? 7 : 14
      nextReviewDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000)
    } else {
      // 不正解の場合は短期間で再復習
      nextReviewDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }

    const message = isCorrect 
      ? `復習完了！次回復習は${Math.floor((nextReviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}日後です。`
      : '再度復習が必要です。明日もう一度チャレンジしましょう。'

    return {
      success: true,
      message,
      nextReviewDate
    }

  } catch (error) {
    console.error('Error updating review progress:', error)
    return {
      success: false,
      message: '復習進捗の更新に失敗しました。'
    }
  }
}

/**
 * ユーザーの復習統計を取得
 * @param userId ユーザーID
 * @returns 復習統計
 */
export async function getReviewStatistics(userId: string): Promise<{
  totalReviewQuestions: number
  completedReviews: number
  pendingReviews: number
  averageReviewAccuracy: number
  reviewStreak: number
  nextReviewDate: Date | null
}> {
  try {
    // 過去30日間の復習状況を分析（モック実装）
    console.log(`📊 Getting review statistics for user: ${userId}`)

    // 実装時は実際の復習履歴から計算
    return {
      totalReviewQuestions: 0,
      completedReviews: 0,
      pendingReviews: 0,
      averageReviewAccuracy: 0,
      reviewStreak: 0,
      nextReviewDate: null
    }

  } catch (error) {
    console.error('Error getting review statistics:', error)
    return {
      totalReviewQuestions: 0,
      completedReviews: 0,
      pendingReviews: 0,
      averageReviewAccuracy: 0,
      reviewStreak: 0,
      nextReviewDate: null
    }
  }
}