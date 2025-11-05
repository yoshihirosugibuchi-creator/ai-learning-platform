import { NextRequest, NextResponse } from 'next/server'
import { generateReviewSet } from '@/lib/precomputed-quiz-engine'

export async function POST(request: NextRequest) {
  try {
    const { userId, forceRegenerate = true } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    console.log(`🧪 [Debug Test] Testing review set regeneration: userId=${userId}, force=${forceRegenerate}`)

    // Test review set regeneration directly
    const context = {
      userId,
      forceRegenerate
    }
    
    const result = await generateReviewSet(context)
    
    console.log(`🧪 [Debug Test] Review set regeneration result:`, result)

    return NextResponse.json({
      success: true,
      userId,
      forceRegenerate,
      result
    })

  } catch (error) {
    console.error('❌ Debug test review regeneration error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal error'
    }, { status: 500 })
  }
}