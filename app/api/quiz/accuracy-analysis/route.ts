import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMultiCategoryRecentAccuracy } from '@/lib/period-based-accuracy'

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
function getSupabaseWithAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

interface AccuracyAnalysisRequest {
  selectedCategories: string[]
  preferredPeriod?: '1week' | '1month'
}

/**
 * 期間限定正答率分析API
 * クライアントサイドから安全に期間限定正答率分析を実行
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📊 Period-based accuracy analysis API request')

    const body: AccuracyAnalysisRequest = await request.json()
    
    // 認証付きSupabaseクライアント作成
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = user.id
    console.log('👤 Authenticated user for accuracy analysis:', userId.substring(0, 8) + '...')
    
    // バリデーション
    if (!body.selectedCategories || body.selectedCategories.length === 0) {
      return NextResponse.json(
        { error: 'Selected categories are required' },
        { status: 400 }
      )
    }

    console.log('🔍 Analyzing accuracy for categories:', {
      categoriesCount: body.selectedCategories.length,
      preferredPeriod: body.preferredPeriod || '1week',
      userId: userId.substring(0, 8) + '...'
    })

    // 期間限定正答率分析を実行
    const accuracyAnalysis = await calculateMultiCategoryRecentAccuracy(
      userId,
      body.selectedCategories,
      body.preferredPeriod || '1week'
    )

    console.log('✅ Accuracy analysis completed:', {
      period: accuracyAnalysis.period,
      accuracy: `${(accuracyAnalysis.accuracy * 100).toFixed(1)}%`,
      confidence: accuracyAnalysis.confidence,
      sampleSize: accuracyAnalysis.sampleSize
    })

    return NextResponse.json({
      success: true,
      analysis: accuracyAnalysis
    })

  } catch (error) {
    console.error('❌ Period-based accuracy analysis API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze accuracy',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}