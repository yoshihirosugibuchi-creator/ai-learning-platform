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
export function selectQuestionsWithPriority<T extends { id: number }>(
  questions: T[],
  history: QuestionHistory,
  count: number
): T[] {
  const { recentQuestions, totalQuestions } = history

  // 問題を3つのカテゴリに分類
  const neverAskedQuestions = questions.filter(q => !totalQuestions.has(q.id))
  const oldAskedQuestions = questions.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id))
  const recentlyAskedQuestions = questions.filter(q => recentQuestions.has(q.id))

  console.log(`📊 [selectQuestionsWithPriority] Question categorization:`)
  console.log(`  - Total available: ${questions.length}`)
  console.log(`  - Never asked: ${neverAskedQuestions.length}`)
  console.log(`  - Old (8-30 days): ${oldAskedQuestions.length}`)
  console.log(`  - Recent (7 days): ${recentlyAskedQuestions.length}`)

  const selectedQuestions: T[] = []

  // Priority 1: 未出題問題 (70%目標)
  const targetNeverAsked = Math.min(Math.ceil(count * 0.7), neverAskedQuestions.length)
  if (targetNeverAsked > 0) {
    const selected = neverAskedQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, targetNeverAsked)
    selectedQuestions.push(...selected)
    console.log(`✅ Selected ${selected.length} never-asked questions`)
  }

  // Priority 2: 過去出題で7日以上経過 (忘却曲線対応)
  let remainingSlots = count - selectedQuestions.length
  if (remainingSlots > 0 && oldAskedQuestions.length > 0) {
    const targetOld = Math.min(remainingSlots, oldAskedQuestions.length)
    const selected = oldAskedQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, targetOld)
    selectedQuestions.push(...selected)
    console.log(`✅ Selected ${selected.length} old questions (forgetting curve)`)
  }

  // Priority 3: 直近7日の問題 (最後の手段)
  remainingSlots = count - selectedQuestions.length
  if (remainingSlots > 0 && recentlyAskedQuestions.length > 0) {
    const targetRecent = Math.min(remainingSlots, recentlyAskedQuestions.length)
    const selected = recentlyAskedQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, targetRecent)
    selectedQuestions.push(...selected)
    console.log(`⚠️ Selected ${selected.length} recent questions (last resort)`)
  }

  // Priority 4: まだ枠が残っていれば、未出題問題から追加選択
  remainingSlots = count - selectedQuestions.length
  if (remainingSlots > 0) {
    // 既に選択済みのIDを除外
    const selectedIds = new Set(selectedQuestions.map(q => q.id))
    const remainingNeverAsked = neverAskedQuestions.filter(q => !selectedIds.has(q.id))

    if (remainingNeverAsked.length > 0) {
      const targetRemaining = Math.min(remainingSlots, remainingNeverAsked.length)
      const selected = remainingNeverAsked
        .sort(() => Math.random() - 0.5)
        .slice(0, targetRemaining)
      selectedQuestions.push(...selected)
      console.log(`✅ Selected ${selected.length} additional never-asked questions (fill remaining)`)
    }
  }

  // シャッフルして返す
  const finalSelection = selectedQuestions.sort(() => Math.random() - 0.5)

  console.log(`📋 [selectQuestionsWithPriority] Final selection:`)
  console.log(`  - Total selected: ${finalSelection.length}/${count}`)
  console.log(`  - Never asked: ${finalSelection.filter(q => !totalQuestions.has(q.id)).length}`)
  console.log(`  - Old: ${finalSelection.filter(q => totalQuestions.has(q.id) && !recentQuestions.has(q.id)).length}`)
  console.log(`  - Recent: ${finalSelection.filter(q => recentQuestions.has(q.id)).length}`)

  return finalSelection
}
