import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * 問題の学習履歴を取得
 * POST /api/questions/history
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, categoryId, difficulty } = await request.json()

    if (!userId || !categoryId || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, categoryId, difficulty' },
        { status: 400 }
      )
    }

    console.log(`📚 Fetching question history for user ${userId}, category ${categoryId}, difficulty ${difficulty}`)

    // SQL クエリ: 学習履歴を集計
    const { data: histories, error } = await supabase.rpc('get_question_history_stats', {
      p_user_id: userId,
      p_category_id: categoryId,
      p_difficulty: difficulty
    })

    if (error) {
      console.error('❌ Database function error:', error)
      console.log('🔄 Falling back to direct table query...')
      
      // フォールバック: 直接テーブルから取得 (正しいリレーション)
      const { data: fallbackData, error: fallbackError } = await supabase
      .from('quiz_answers')
      .select(`
        question_id,
        is_correct,
        created_at,
        quiz_sessions!inner (
          user_id
        )
      `)
      .eq('quiz_sessions.user_id', userId)
      .eq('category_id', categoryId)
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false })

      if (fallbackError) {
        console.error('❌ Fallback query failed:', fallbackError)
        return NextResponse.json(
          { error: 'Failed to fetch question history' },
          { status: 500 }
        )
      }

      // 手動で集計
      const aggregatedHistories = aggregateQuestionHistory(fallbackData || [])
      
      console.log(`✅ Question history fetched (fallback): ${aggregatedHistories.length} questions`)
      return NextResponse.json({ histories: aggregatedHistories })
    }

    console.log(`✅ Question history fetched: ${histories?.length || 0} questions`)
    return NextResponse.json({ histories: histories || [] })

  } catch (error) {
    console.error('❌ Error in question history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 手動で問題履歴を集計
 */
function aggregateQuestionHistory(rawData: Record<string, unknown>[]): Record<string, unknown>[] {
  const questionMap = new Map<string, {
    question_id: string
    attempts_count: number
    incorrect_count: number
    is_correct: boolean
    created_at: string
    last_attempted_at: string
    last_incorrect_at?: string
  }>()

  rawData.forEach(record => {
    const questionId = String(record.question_id)
    const isCorrect = Boolean(record.is_correct)
    const createdAt = String(record.created_at)
    const existing = questionMap.get(questionId)
    
    if (!existing) {
      questionMap.set(questionId, {
        question_id: questionId,
        attempts_count: 1,
        incorrect_count: isCorrect ? 0 : 1,
        is_correct: isCorrect,
        created_at: createdAt,
        last_attempted_at: createdAt,
        last_incorrect_at: isCorrect ? undefined : createdAt
      })
    } else {
      existing.attempts_count++
      if (!isCorrect) {
        existing.incorrect_count++
        existing.last_incorrect_at = createdAt
      }
      // より新しい試行日時で更新
      if (new Date(createdAt) > new Date(existing.last_attempted_at)) {
        existing.last_attempted_at = createdAt
      }
    }
  })

  return Array.from(questionMap.values())
}