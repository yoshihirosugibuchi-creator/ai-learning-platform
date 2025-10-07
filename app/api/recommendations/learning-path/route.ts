import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get active recommendations
    const { data: activeRecommendations } = await supabaseAdmin
      .from('learning_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .limit(5)

    // Get user's weak areas for generating new recommendations
    const { data: categoryStats } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .order('quiz_average_accuracy', { ascending: true })

    // Get recent wrong answers
    const { data: recentMistakes } = await supabaseAdmin
      .from('quiz_answers')
      .select(`
        category_id,
        subcategory_id,
        difficulty,
        created_at,
        quiz_sessions!inner(user_id)
      `)
      .eq('quiz_sessions.user_id', userId)
      .eq('is_correct', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // Generate immediate recommendations
    const immediate: Array<{
      content: { id: string; type: string; title: string; description: string }
      reason: string
      expectedTime: number
      difficulty: string
      priority: number
    }> = []

    // Add existing active recommendations
    if (activeRecommendations) {
      immediate.push(...activeRecommendations.map(rec => ({
        content: {
          id: rec.recommended_content_id,
          type: rec.recommended_content_type,
          title: rec.title,
          description: rec.description
        },
        reason: rec.reasoning,
        expectedTime: 15, // Default time
        difficulty: 'intermediate',
        priority: rec.priority
      })))
    }

    // Generate new recommendations if we have fewer than 3
    if (immediate.length < 3 && recentMistakes && recentMistakes.length > 0) {
      // Group mistakes by category
      const mistakesByCategory = recentMistakes.reduce((acc, mistake) => {
        if (!acc[mistake.category_id]) {
          acc[mistake.category_id] = []
        }
        acc[mistake.category_id].push(mistake)
        return acc
      }, {} as Record<string, Array<{category_id: string, subcategory_id: string, difficulty: string, created_at: string | null, quiz_sessions: {user_id: string}}>>)

      // Create recommendations for categories with most mistakes
      Object.entries(mistakesByCategory)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 3 - immediate.length)
        .forEach(([categoryId, mistakes]) => {
          immediate.push({
            content: {
              id: `review_${categoryId}`,
              type: 'quiz',
              title: `Review ${categoryId.replace(/_/g, ' ')}`,
              description: `You have ${mistakes.length} recent mistakes in this category`
            },
            reason: `${mistakes.length} incorrect answers in the past week`,
            expectedTime: mistakes.length * 3,
            difficulty: mistakes[0]?.difficulty || 'intermediate',
            priority: immediate.length + 1
          })
        })
    }

    // Generate short-term goals (1-2 weeks)
    const shortTerm = {
      goals: [] as string[],
      recommendedCourses: [] as Array<{
        id: string
        title: string
        description: string
        estimatedTime: string
        difficulty: string
      }>,
      timeframe: '1-2 weeks'
    }

    if (categoryStats && categoryStats.length > 0) {
      // Focus on improving weakest categories
      const weakestCategories = categoryStats
        .filter(stat => stat.quiz_average_accuracy < 80 && stat.quiz_questions_answered >= 5)
        .slice(0, 2)

      shortTerm.goals = weakestCategories.map(stat => 
        `Improve ${stat.category_id.replace(/_/g, ' ')} accuracy from ${stat.quiz_average_accuracy}% to 80%`
      )

      shortTerm.recommendedCourses = weakestCategories.map(stat => ({
        id: `course_${stat.category_id}`,
        title: `${stat.category_id.replace(/_/g, ' ')} Fundamentals`,
        description: `Comprehensive course covering basic to intermediate concepts`,
        estimatedTime: '3-5 hours',
        difficulty: 'beginner-intermediate'
      }))
    }

    // Generate long-term roadmap (1-3 months)
    const longTerm = {
      careerObjective: 'Full-Stack Developer Proficiency',
      skillGaps: [] as string[],
      learningRoadmap: [] as Array<{
        phase: number
        duration: string
        focus: string
        activities: string[]
      }>
    }

    if (categoryStats && categoryStats.length > 0) {
      // Identify major skill gaps
      const majorGaps = categoryStats
        .filter(stat => stat.quiz_average_accuracy < 70)
        .map(stat => stat.category_id.replace(/_/g, ' '))

      longTerm.skillGaps = majorGaps.slice(0, 3)

      // Create learning roadmap
      const roadmapSteps = [
        {
          phase: 1,
          duration: '2-3 weeks',
          focus: 'Foundation Building',
          activities: [
            'Complete fundamental courses in weak areas',
            'Practice basic problems daily',
            'Review core concepts'
          ]
        },
        {
          phase: 2,
          duration: '3-4 weeks', 
          focus: 'Skill Development',
          activities: [
            'Work on intermediate-level projects',
            'Integrate multiple concepts',
            'Practice real-world scenarios'
          ]
        },
        {
          phase: 3,
          duration: '4-6 weeks',
          focus: 'Mastery & Application',
          activities: [
            'Build comprehensive projects',
            'Teach or explain concepts to others',
            'Contribute to open source'
          ]
        }
      ]

      longTerm.learningRoadmap = roadmapSteps
    }

    const response = {
      immediate: immediate.slice(0, 3),
      shortTerm,
      longTerm
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching learning path recommendations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}