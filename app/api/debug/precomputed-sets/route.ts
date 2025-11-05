import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get all precomputed sets for the user
    const { data: sets, error } = await supabaseAdmin
      .from('precomputed_quiz_sets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by quiz_type
    const groupedSets = sets?.reduce((acc, set) => {
      const type = set.quiz_type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push({
        id: set.id,
        question_ids: set.question_ids,
        used_at: set.used_at,
        expires_at: set.expires_at,
        created_at: set.created_at,
        analysis_data: set.analysis_data
      })
      return acc
    }, {} as Record<string, any[]>) || {}

    return NextResponse.json({
      userId,
      totalSets: sets?.length || 0,
      setsByType: groupedSets,
      summary: {
        'business-ai': groupedSets['business-ai']?.length || 0,
        'self-personalized': groupedSets['self-personalized']?.length || 0,
        'review': groupedSets['review']?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ Debug precomputed sets error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}