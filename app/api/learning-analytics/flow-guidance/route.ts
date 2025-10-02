import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { UnifiedLearningAnalysisEngine } from '@/lib/unified-learning-analytics'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      sessionId, 
      accuracy, 
      timeElapsed, 
      recentResponseTimes = [],
      currentDifficulty = 'intermediate'
    } = body

    if (!sessionId || typeof accuracy !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, accuracy' },
        { status: 400 }
      )
    }

    const analyticsEngine = new UnifiedLearningAnalysisEngine(user.id)
    const flowGuidance = await analyticsEngine.provideFlowStateGuidance(
      sessionId,
      accuracy,
      timeElapsed,
      recentResponseTimes,
      currentDifficulty
    )

    return NextResponse.json(flowGuidance)
  } catch (error) {
    console.error('Error providing flow state guidance:', error)
    return NextResponse.json(
      { error: 'Failed to provide flow state guidance' },
      { status: 500 }
    )
  }
}