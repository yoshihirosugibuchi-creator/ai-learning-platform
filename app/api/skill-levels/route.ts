import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { data: skillLevels, error } = await supabase
      .from('skill_levels')
      .select(`
        id,
        name,
        display_name,
        description,
        target_experience,
        display_order,
        color
      `)
      .order('display_order')

    if (error) {
      console.error('Error fetching skill levels:', error)
      return NextResponse.json(
        { error: 'Failed to fetch skill levels' },
        { status: 500 }
      )
    }

    // クイズ数の統計を取得
    const { data: quizStats, error: statsError } = await supabase
      .from('quiz_questions')
      .select('difficulty')
      .neq('is_deleted', true)

    const difficultyStats: Record<string, number> = {}
    if (!statsError && quizStats) {
      quizStats.forEach(quiz => {
        if (quiz.difficulty) {
          difficultyStats[quiz.difficulty] = (difficultyStats[quiz.difficulty] || 0) + 1
        }
      })
    }

    // スキルレベルにクイズ数を追加
    const enrichedSkillLevels = skillLevels?.map(level => ({
      ...level,
      quiz_count: difficultyStats[level.id] || 0
    }))

    // レスポンス形式を整形
    const response = {
      skill_levels: enrichedSkillLevels || [],
      meta: {
        total: enrichedSkillLevels?.length || 0,
        total_quiz_count: Object.values(difficultyStats).reduce((sum, count) => sum + count, 0),
        distribution: difficultyStats
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}