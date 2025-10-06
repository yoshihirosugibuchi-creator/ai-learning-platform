/**
 * 問題選択優先順位システム
 * 単一難易度選択時の学習履歴に基づく最適化
 */

import { Question } from './types'

// 優先順位付き問題データ
export interface PrioritizedQuestion extends Question {
  priority: 'never_attempted' | 'incorrect_history' | 'recent_incorrect' | 'random'
  lastAttemptedAt?: string
  incorrectCount?: number
  lastIncorrectAt?: string
}

// 学習履歴データ
export interface QuestionHistory {
  question_id: string
  is_correct: boolean
  created_at: string
  attempts_count: number
  incorrect_count: number
  last_attempted_at: string
  last_incorrect_at?: string
}

/**
 * 問題を優先順位付きで選択
 * @param questions 対象問題リスト
 * @param userId ユーザーID
 * @param categoryId カテゴリーID
 * @param difficulty 選択された難易度
 * @param count 必要な問題数（デフォルト: 10）
 * @returns 優先順位付きで選択された問題
 */
export async function selectQuestionsByPriority(
  questions: Question[],
  userId: string,
  categoryId: string,
  difficulty: string,
  count: number = 10
): Promise<Question[]> {
  try {
    // 1. 学習履歴を取得
    const questionHistories = await fetchQuestionHistories(userId, categoryId, difficulty)
    
    // 2. 問題を優先順位付きで分類
    const prioritizedQuestions = categorizeQuestionsByPriority(questions, questionHistories)
    
    // 3. 優先順位順で選択
    const selectedQuestions = selectByPriority(prioritizedQuestions, count)
    
    console.log(`🎯 Priority selection for ${difficulty} in ${categoryId}:`)
    console.log(`  - Never attempted: ${prioritizedQuestions.never_attempted.length}`)
    console.log(`  - Recent incorrect: ${prioritizedQuestions.recent_incorrect.length}`)
    console.log(`  - Incorrect history: ${prioritizedQuestions.incorrect_history.length}`)
    console.log(`  - Random pool: ${prioritizedQuestions.random.length}`)
    console.log(`  - Selected: ${selectedQuestions.length} questions`)
    
    return selectedQuestions
  } catch (error) {
    console.error('❌ Error in priority selection, falling back to random:', error)
    // フォールバック: ランダム選択
    return questions.slice(0, count)
  }
}

/**
 * 学習履歴を取得
 */
async function fetchQuestionHistories(
  userId: string,
  categoryId: string,
  difficulty: string
): Promise<QuestionHistory[]> {
  const response = await fetch('/api/questions/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      categoryId,
      difficulty
    })
  })
  
  if (!response.ok) {
    throw new Error(`History API failed: ${response.status}`)
  }
  
  const data = await response.json()
  return data.histories || []
}

/**
 * 問題を優先順位別に分類
 */
function categorizeQuestionsByPriority(
  questions: Question[],
  histories: QuestionHistory[]
): {
  never_attempted: PrioritizedQuestion[]
  recent_incorrect: PrioritizedQuestion[]
  incorrect_history: PrioritizedQuestion[]
  random: PrioritizedQuestion[]
} {
  const historyMap = new Map<string, QuestionHistory>()
  histories.forEach(h => historyMap.set(h.question_id, h))
  
  const categories = {
    never_attempted: [] as PrioritizedQuestion[],
    recent_incorrect: [] as PrioritizedQuestion[],
    incorrect_history: [] as PrioritizedQuestion[],
    random: [] as PrioritizedQuestion[]
  }
  
  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  
  questions.forEach(question => {
    const history = historyMap.get(question.id.toString())
    
    if (!history) {
      // 1. 未出題問題 (最優先)
      categories.never_attempted.push({
        ...question,
        priority: 'never_attempted'
      })
    } else if (history.last_incorrect_at && new Date(history.last_incorrect_at) > threeDaysAgo) {
      // 2. 直近3日以内の間違え問題 (高優先)
      categories.recent_incorrect.push({
        ...question,
        priority: 'recent_incorrect',
        lastAttemptedAt: history.last_attempted_at,
        incorrectCount: history.incorrect_count,
        lastIncorrectAt: history.last_incorrect_at
      })
    } else if (history.incorrect_count > 0) {
      // 3. 過去に間違えた問題 (中優先)
      categories.incorrect_history.push({
        ...question,
        priority: 'incorrect_history',
        lastAttemptedAt: history.last_attempted_at,
        incorrectCount: history.incorrect_count,
        lastIncorrectAt: history.last_incorrect_at
      })
    } else {
      // 4. その他 (ランダム選択)
      categories.random.push({
        ...question,
        priority: 'random',
        lastAttemptedAt: history.last_attempted_at
      })
    }
  })
  
  return categories
}

/**
 * 優先順位順で問題を選択
 */
function selectByPriority(
  categories: {
    never_attempted: PrioritizedQuestion[]
    recent_incorrect: PrioritizedQuestion[]
    incorrect_history: PrioritizedQuestion[]
    random: PrioritizedQuestion[]
  },
  count: number
): Question[] {
  const selected: Question[] = []
  
  // 1. 未出題問題から優先選択
  const neverAttempted = fisherYatesShuffle([...categories.never_attempted])
  selected.push(...neverAttempted.slice(0, Math.min(neverAttempted.length, count - selected.length)))
  
  if (selected.length >= count) return selected.slice(0, count)
  
  // 2. 直近間違え問題 (日付順でソート)
  const recentIncorrect = categories.recent_incorrect
    .sort((a, b) => new Date(b.lastIncorrectAt!).getTime() - new Date(a.lastIncorrectAt!).getTime())
  selected.push(...recentIncorrect.slice(0, Math.min(recentIncorrect.length, count - selected.length)))
  
  if (selected.length >= count) return selected.slice(0, count)
  
  // 3. 過去の間違え問題 (間違え回数順でソート)
  const incorrectHistory = categories.incorrect_history
    .sort((a, b) => (b.incorrectCount || 0) - (a.incorrectCount || 0))
  selected.push(...incorrectHistory.slice(0, Math.min(incorrectHistory.length, count - selected.length)))
  
  if (selected.length >= count) return selected.slice(0, count)
  
  // 4. ランダム選択で不足分を補完
  const randomQuestions = fisherYatesShuffle([...categories.random])
  selected.push(...randomQuestions.slice(0, count - selected.length))
  
  return selected.slice(0, count)
}

/**
 * Fisher-Yates Shuffle実装
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * 統計情報を取得
 */
export function getPrioritySelectionStats(questions: PrioritizedQuestion[]): {
  neverAttempted: number
  recentIncorrect: number
  incorrectHistory: number
  random: number
} {
  const stats = {
    neverAttempted: 0,
    recentIncorrect: 0,
    incorrectHistory: 0,
    random: 0
  }
  
  questions.forEach(q => {
    switch (q.priority) {
      case 'never_attempted':
        stats.neverAttempted++
        break
      case 'recent_incorrect':
        stats.recentIncorrect++
        break
      case 'incorrect_history':
        stats.incorrectHistory++
        break
      case 'random':
        stats.random++
        break
    }
  })
  
  return stats
}