import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { UnifiedLearningAnalysisEngine } from '@/lib/unified-learning-analytics'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const analyticsEngine = new UnifiedLearningAnalysisEngine(user.id)
    
    const [dueReviews, forgettingCurveRecommendations] = await Promise.all([
      analyticsEngine.getDueReviews(limit),
      analyticsEngine.getForgettingCurveRecommendations()
    ])

    return NextResponse.json({
      dueReviews,
      recommendations: forgettingCurveRecommendations
    })
  } catch (error) {
    console.error('Error fetching spaced repetition data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch spaced repetition data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, contentType, performance, reviewDate } = body

    const analyticsEngine = new UnifiedLearningAnalysisEngine(user.id)
    const result = await analyticsEngine.recordReviewSession(
      contentId,
      contentType,
      performance,
      reviewDate ? new Date(reviewDate) : new Date()
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error recording review session:', error)
    return NextResponse.json(
      { error: 'Failed to record review session' },
      { status: 500 }
    )
  }
}