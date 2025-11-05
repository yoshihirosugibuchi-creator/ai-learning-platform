import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, reviewQuestionsCount } = await request.json()
    
    if (!userId || !reviewQuestionsCount) {
      return NextResponse.json({ error: 'userId and reviewQuestionsCount required' }, { status: 400 })
    }

    console.log(`🧪 [Debug] Testing review settings change: userId=${userId}, count=${reviewQuestionsCount}`)

    // 復習設定変更APIを呼び出し
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/review/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // テスト用
      },
      body: JSON.stringify({
        reviewQuestionsCount: parseInt(reviewQuestionsCount)
      })
    })

    const result = await response.json()
    
    console.log(`🧪 [Debug] Review settings change result:`, result)

    return NextResponse.json({
      success: true,
      userId,
      reviewQuestionsCount,
      apiResult: result
    })

  } catch (error) {
    console.error('❌ Debug test review settings error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal error'
    }, { status: 500 })
  }
}