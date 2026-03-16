/**
 * クイズ問題履歴管理ユーティリティ
 *
 * ユーザーの過去回答履歴を取得し、新しい問題を優先するためのロジックを提供
 * Business-AI, Self-Personalized, Category, Pack クイズで共通使用
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

export interface QuestionHistory {
  recentQuestions: Set<number>   // 直近7日間に回答した問題
  totalQuestions: Set<number>    // 過去30日間に回答した問題
}

/**
 * ユーザーの過去回答履歴を取得
 *
 * @param userId ユーザーID
 * @returns 7日間/30日間の回答済み問題IDセット
 */
export async function getUserAskedQuestions(userId: string): Promise<QuestionHistory> {
  try {
    // 過去30日間の回答履歴を取得
    const { data: answerHistory, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('⚠️ [getUserAskedQuestions] Error fetching answer history:', error)
      return { recentQuestions: new Set(), totalQuestions: new Set() }
    }

    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    const recentQuestions = new Set<number>()
    const totalQuestions = new Set<number>()

    // 時間ベースで分類
    for (const answer of answerHistory || []) {
      if (!/^\d+$/.test(answer.question_id)) continue // 非数値IDをスキップ

      const questionId = parseInt(answer.question_id, 10)
      const answerTime = new Date(answer.created_at || '').getTime()

      // 過去30日間の全回答
      totalQuestions.add(questionId)

      // 直近7日間の回答
      if (answerTime >= sevenDaysAgo) {
        recentQuestions.add(questionId)
      }
    }

    console.log(`📚 [getUserAskedQuestions] Question history:`)
    console.log(`  - Last 7 days: ${recentQuestions.size} questions`)
    console.log(`  - Last 30 days: ${totalQuestions.size} questions`)

    return { recentQuestions, totalQuestions }

  } catch (error) {
    console.error('❌ [getUserAskedQuestions] Error:', error)
    return { recentQuestions: new Set(), totalQuestions: new Set() }
  }
}

/**
 * 問題を優先度に基づいて選択
 *
 * 優先度:
 * 1. 未出題問題 (70%目標)
 * 2. 過去出題で7日以上経過した問題 (忘却曲線対応)
 * 3. 直近7日に回答した問題 (最後の手段)
 *
 * @param questions 候補問題リスト
 * @param history ユーザーの回答履歴
 * @param count 必要な問題数
 * @returns 選択された問題リスト
 */
/** Fisher-Yatesシャッフル（均一なランダム順序を保証） */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function selectQuestionsWithPriority<T extends { id: number }>(
  questions: T[],
  history: QuestionHistory,
  count: number
): T[] {
  const { recentQuestions, totalQuestions } = history

  // 候補問題のID重複排除（DB側で同一IDが複数返る可能性への防御）
  const uniqueQuestions = Array.from(new Map(questions.map(q => [q.id, q])).values())

  // 問題を3つのカテゴリに分類（排他的）
  const neverAskedQuestions = uniqueQuestions.filter(q => !totalQuestions.has(q.id))
  const oldAskedQuestions = uniqueQuestions.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id))
  const recentlyAskedQuestions = uniqueQuestions.filter(q => recentQuestions.has(q.id))

  console.log(`📊 [selectQuestionsWithPriority] Question categorization:`)
  console.log(`  - Total available: ${uniqueQuestions.length} (deduplicated from ${questions.length})`)
  console.log(`  - Never asked: ${neverAskedQuestions.length}`)
  console.log(`  - Old (8-30 days): ${oldAskedQuestions.length}`)
  console.log(`  - Recent (7 days): ${recentlyAskedQuestions.length}`)

  const selectedIds = new Set<number>()
  const selectedQuestions: T[] = []

  const addQuestions = (pool: T[], maxCount: number, label: string) => {
    const available = pool.filter(q => !selectedIds.has(q.id))
    const target = Math.min(maxCount, available.length)
    if (target > 0) {
      const selected = shuffle(available).slice(0, target)
      for (const q of selected) {
        selectedIds.add(q.id)
        selectedQuestions.push(q)
      }
      console.log(`✅ Selected ${selected.length} ${label}`)
    }
  }

  // Priority 1: 未出題問題 (70%目標)
  addQuestions(neverAskedQuestions, Math.ceil(count * 0.7), 'never-asked questions')

  // Priority 2: 過去出題で7日以上経過 (忘却曲線対応)
  addQuestions(oldAskedQuestions, count - selectedQuestions.length, 'old questions (forgetting curve)')

  // Priority 3: 直近7日の問題 (最後の手段)
  addQuestions(recentlyAskedQuestions, count - selectedQuestions.length, 'recent questions (last resort)')

  // Priority 4: まだ枠が残っていれば、未出題問題から追加選択
  addQuestions(neverAskedQuestions, count - selectedQuestions.length, 'additional never-asked questions')

  // シャッフルして返す
  const finalSelection = shuffle(selectedQuestions)

  console.log(`📋 [selectQuestionsWithPriority] Final selection:`)
  console.log(`  - Total selected: ${finalSelection.length}/${count}`)
  console.log(`  - Unique IDs: ${new Set(finalSelection.map(q => q.id)).size}`)
  console.log(`  - Never asked: ${finalSelection.filter(q => !totalQuestions.has(q.id)).length}`)
  console.log(`  - Old: ${finalSelection.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id)).length}`)
  console.log(`  - Recent: ${finalSelection.filter(q => recentQuestions.has(q.id)).length}`)

  return finalSelection
}
