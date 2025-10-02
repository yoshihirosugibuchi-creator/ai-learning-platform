import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { UnifiedLearningAnalysisEngine } from '@/lib/unified-learning-analytics'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const analyticsEngine = new UnifiedLearningAnalysisEngine(user.id)
    const analysis = await analyticsEngine.analyzePersonalLearningPatterns()

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error analyzing personal learning patterns:', error)
    return NextResponse.json(
      { error: 'Failed to analyze personal learning patterns' },
      { status: 500 }
    )
  }
}