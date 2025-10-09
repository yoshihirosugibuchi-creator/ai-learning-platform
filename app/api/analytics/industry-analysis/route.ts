import { NextResponse } from 'next/server'
import { getUserIndustryAnalysis } from '@/lib/industry-xp-analytics'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  try {
    console.log('🔍 Industry analysis API: Starting authentication check...')
    
    // 認証ヘッダーをログ出力
    const authHeader = request.headers.get('authorization')
    console.log('🔍 Auth header present:', !!authHeader)
    console.log('🔍 Auth header preview:', authHeader?.substring(0, 20) + '...')
    
    // 認証チェック
    const { userId, error: authError } = await getCurrentUserRole(request)
    console.log('🔍 Auth result:', { userId: userId?.substring(0, 8), authError })
    
    if (!userId) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized', details: authError || 'No user ID' }, { status: 401 })
    }

    // パラメータ取得
    const { searchParams } = new URL(request.url)
    const industryId = searchParams.get('industry_id') || undefined
    const selectedLevel = (searchParams.get('level') as 'basic' | 'intermediate' | 'advanced' | 'expert') || 'basic'

    console.log('📊 Industry analysis API called:', { userId: userId.substring(0, 8), industryId, selectedLevel })

    // 業界分析データを取得
    const analysisData = await getUserIndustryAnalysis(userId, industryId, selectedLevel)

    return NextResponse.json({
      success: true,
      data: analysisData
    })

  } catch (error) {
    console.error('❌ Industry analysis API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch industry analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}