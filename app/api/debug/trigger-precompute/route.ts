import { NextRequest, NextResponse } from 'next/server'
import { generateAllPrecomputedSets } from '@/lib/precomputed-quiz-engine'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    console.log(`🚀 [Debug] Manually triggering precomputed quiz generation for userId: ${userId}`)

    const context = {
      userId,
      forceRegenerate: true // Force regeneration to ensure fresh sets
    }

    const results = await generateAllPrecomputedSets(context)
    
    console.log(`✅ [Debug] Precomputed generation complete:`, results)

    return NextResponse.json({
      success: true,
      userId,
      results
    })

  } catch (error) {
    console.error('❌ Debug trigger precompute error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}