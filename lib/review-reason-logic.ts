/**
 * 復習理由判定ロジック - quiz_answers保存時用
 * クイズ回答時に復習理由を判定してDBに記録
 */

export type ReviewReasonType = 'incorrect' | 'hint_used' | 'low_confidence' | 'slow_response' | 'repeat_mistakes'

export interface QuizAnswerData {
  question_id: string
  is_correct: boolean
  max_hint_level?: number | null
  confidence_level?: number | null
  time_spent: number
  time_limit?: number | null
}

/**
 * クイズ回答から復習理由を判定
 * @param answer クイズ回答データ
 * @returns 復習理由タイプまたはnull
 */
export function determineReviewReasonForDB(answer: QuizAnswerData): ReviewReasonType | null {
  console.log(`🔍 [Review Reason Logic] Analyzing answer for DB:`, {
    is_correct: answer.is_correct,
    max_hint_level: answer.max_hint_level,
    confidence_level: answer.confidence_level,
    time_spent: answer.time_spent,
    time_limit: answer.time_limit
  })

  // 優先度順に判定（最も重要な理由を優先）
  
  // 条件1: 不正解（最優先）
  if (!answer.is_correct) {
    console.log(`✅ [Review Reason Logic] Reason: incorrect (highest priority)`)
    return 'incorrect'
  }
  
  // 条件2: ヒント使用（レベル2以上）- 正解でもヒント使用は復習理由
  if (answer.max_hint_level && answer.max_hint_level >= 2) {
    console.log(`✅ [Review Reason Logic] Reason: hint_used (level ${answer.max_hint_level})`)
    return 'hint_used'
  }
  
  // 条件3: 低自信レベル（1-2）- 正解でも自信なしは復習理由
  if (answer.confidence_level && answer.confidence_level <= 2) {
    console.log(`✅ [Review Reason Logic] Reason: low_confidence (level ${answer.confidence_level})`)
    return 'low_confidence'
  }
  
  // 条件4: 長時間回答（制限時間の80%以上）- 正解でも時間超過は復習理由
  if (answer.time_limit && answer.time_spent > (answer.time_limit * 0.8)) {
    console.log(`✅ [Review Reason Logic] Reason: slow_response (${answer.time_spent}s > ${answer.time_limit * 0.8}s)`)
    return 'slow_response'
  }
  
  // 条件5: 繰り返しミスは別途判定が必要（複雑なため、今回は対象外）
  // TODO: 今後実装予定
  
  console.log(`❌ [Review Reason Logic] No reason found - this is a good answer`)
  return null
}

/**
 * 復習理由タイプを表示用の情報に変換
 */
export function getReviewReasonDisplay(reasonType: ReviewReasonType) {
  const reasonMap = {
    incorrect: {
      icon: '❌',
      label: '不正解した問題',
      description: '間違えた答えを選択した問題'
    },
    hint_used: {
      icon: '💡',
      label: 'ヒントを使った問題',
      description: 'ヒントレベル2以上を使用した問題'
    },
    low_confidence: {
      icon: '😓',
      label: '自信がなかった問題',
      description: '自信レベル1-2で回答した問題'
    },
    slow_response: {
      icon: '⏱️',
      label: '時間がかかった問題',
      description: '制限時間の80%以上使用した問題'
    },
    repeat_mistakes: {
      icon: '🔄',
      label: '繰り返し間違えた問題',
      description: '同一分野で複数回間違えたパターン'
    }
  }
  
  return reasonMap[reasonType]
}