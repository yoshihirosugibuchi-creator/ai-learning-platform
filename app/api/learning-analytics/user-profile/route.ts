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
    const profile = await analyticsEngine.getUserLearningProfile()

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching user learning profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user learning profile' },
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
    const { learningGoals, preferredDifficulty, studyTimePreference, focusAreas } = body

    const { data, error } = await supabase
      .from('user_learning_profiles')
      .upsert({
        user_id: user.id,
        learning_goals: learningGoals,
        preferred_difficulty: preferredDifficulty,
        study_time_preference: studyTimePreference,
        focus_areas: focusAreas,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating user learning profile:', error)
    return NextResponse.json(
      { error: 'Failed to update user learning profile' },
      { status: 500 }
    )
  }
}