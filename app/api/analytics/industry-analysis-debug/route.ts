import { NextResponse } from 'next/server'
import { getUserIndustryAnalysis } from '@/lib/industry-xp-analytics'

// デバッグ用: 認証チェックなしのエンドポイント
export async function GET(request: Request) {
  try {
    console.log('🔍 Industry analysis DEBUG API called (no auth check)')
    
    // 固定ユーザーIDでテスト
    const userId = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'

    // パラメータ取得
    const { searchParams } = new URL(request.url)
    const industryId = searchParams.get('industry_id') || undefined
    const selectedLevel = (searchParams.get('level') as 'basic' | 'intermediate' | 'advanced' | 'expert') || 'basic'

    console.log('📊 Debug analysis:', { userId: userId.substring(0, 8), industryId, selectedLevel })

    // 業界分析データを取得
    const analysisData = await getUserIndustryAnalysis(userId, industryId, selectedLevel)

    console.log('✅ Debug analysis result:', analysisData.length, 'industries')

    return NextResponse.json({
      success: true,
      data: analysisData,
      debug: true
    })

  } catch (error) {
    console.error('❌ Debug industry analysis API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch industry analysis (debug)',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}