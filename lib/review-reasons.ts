/**
 * 復習対象理由の個別問題識別機能
 * quiz_answersテーブルのデータから復習理由を判定
 */

import { Question } from '@/lib/types'
import { QuizAnswerData } from '@/lib/review-reason-logic'

export interface ReviewReason {
  type: 'incorrect' | 'hint_used' | 'low_confidence' | 'slow_response' | 'repeat_mistakes'
  icon: string
  label: string
  description: string
}

export const REVIEW_REASON_MAP: Record<string, ReviewReason> = {
  incorrect: {
    type: 'incorrect',
    icon: '❌',
    label: '不正解した問題',
    description: '間違えた答えを選択した問題'
  },
  hint_used: {
    type: 'hint_used', 
    icon: '💡',
    label: 'ヒントを使った問題',
    description: 'ヒントレベル2以上を使用した問題'
  },
  low_confidence: {
    type: 'low_confidence',
    icon: '😓', 
    label: '自信がなかった問題',
    description: '自信レベル1-2で回答した問題'
  },
  slow_response: {
    type: 'slow_response',
    icon: '⏱️',
    label: '時間がかかった問題', 
    description: '制限時間の80%以上使用した問題'
  },
  repeat_mistakes: {
    type: 'repeat_mistakes',
    icon: '🔄',
    label: '繰り返し間違えた問題',
    description: '同一分野で複数回間違えたパターン'
  }
}

/**
 * quiz_answersレコードから復習理由を判定
 */
export function determineReviewReasonFromAnswer(answer: {
  is_correct: boolean
  max_hint_level?: number | null
  confidence_level?: number | null
  time_spent: number
  quiz_questions?: {
    time_limit?: number | null
  }
}): ReviewReason | null {
  console.log(`🔍 [determineReviewReasonFromAnswer] Analyzing answer:`, {
    is_correct: answer.is_correct,
    max_hint_level: answer.max_hint_level,
    confidence_level: answer.confidence_level,
    time_spent: answer.time_spent,
    time_limit: answer.quiz_questions?.time_limit
  })

  // 条件1: 不正解
  if (!answer.is_correct) {
    console.log(`✅ [determineReviewReasonFromAnswer] Reason: incorrect`)
    return REVIEW_REASON_MAP.incorrect
  }
  
  // 条件2: ヒント使用（レベル2以上）
  if (answer.max_hint_level && answer.max_hint_level >= 2) {
    console.log(`✅ [determineReviewReasonFromAnswer] Reason: hint_used (level ${answer.max_hint_level})`)
    return REVIEW_REASON_MAP.hint_used
  }
  
  // 条件3: 低自信レベル（1-2）
  if (answer.confidence_level && answer.confidence_level <= 2) {
    console.log(`✅ [determineReviewReasonFromAnswer] Reason: low_confidence (level ${answer.confidence_level})`)
    return REVIEW_REASON_MAP.low_confidence
  }
  
  // 条件4: 長時間回答（制限時間の80%以上）
  if (answer.quiz_questions?.time_limit) {
    const timeLimit = answer.quiz_questions.time_limit
    if (answer.time_spent > (timeLimit * 0.8)) {
      console.log(`✅ [determineReviewReasonFromAnswer] Reason: slow_response (${answer.time_spent}s > ${timeLimit * 0.8}s)`)
      return REVIEW_REASON_MAP.slow_response
    }
  }
  
  // 条件5: 繰り返しミスは別途判定が必要（複雑なため、ここでは対象外）
  // 実際の使用時は checkRepeatMistakes() 関数を使用
  
  console.log(`❌ [determineReviewReasonFromAnswer] No reason found`)
  return null
}

/**
 * 復習問題の一覧に理由を付与
 */
export function addReviewReasonsToQuestions(
  questions: Question[], 
  answers: QuizAnswerData[]
): Question[] {
  console.log(`🔍 [addReviewReasonsToQuestions] Processing ${questions.length} questions with ${answers.length} answers`)
  
  return questions.map(question => {
    // 該当する回答レコードを検索
    const relatedAnswer = answers.find(answer => 
      parseInt(answer.question_id) === question.id
    )
    
    console.log(`🔍 [addReviewReasonsToQuestions] Question ${question.id}: found answer = ${!!relatedAnswer}`)
    
    if (relatedAnswer) {
      const reviewReason = determineReviewReasonFromAnswer(relatedAnswer)
      console.log(`🔍 [addReviewReasonsToQuestions] Question ${question.id}: reason = ${reviewReason?.type || 'none'}`)
      return {
        ...question,
        reviewReason: reviewReason
      }
    }
    
    console.log(`🔍 [addReviewReasonsToQuestions] Question ${question.id}: no related answer found, using fallback reason`)
    // フォールバック: 回答履歴がない場合は復習対象として選定された理由を表示
    return {
      ...question,
      reviewReason: REVIEW_REASON_MAP.repeat_mistakes // デフォルト理由
    }
  })
}

/**
 * 復習理由の統計情報を取得
 */
export function getReviewReasonStats(answers: QuizAnswerData[]): Record<string, number> {
  const stats: Record<string, number> = {}
  
  answers.forEach(answer => {
    const reason = determineReviewReasonFromAnswer(answer)
    if (reason) {
      stats[reason.type] = (stats[reason.type] || 0) + 1
    }
  })
  
  return stats
}