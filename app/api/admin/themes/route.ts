import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

interface ThemeCreateRequest {
  genre_id: string
  title: string
  description: string
  estimated_minutes?: number
  display_order?: number
  reward_card_data?: any
}

interface ThemeUpdateRequest {
  title?: string
  description?: string
  estimated_minutes?: number
  display_order?: number
  reward_card_data?: any
}

// ID生成関数（既存パターンに合わせた英数記号）
const _generateThemeId = (title: string, _genre_id: string): string => {
  const baseId = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20)

  // 日本語→英語変換マップ
  const translations: { [key: string]: string } = {
    'aiツール': 'ai_tools',
    'プロンプト': 'prompt', 
    'データ分析': 'data_analysis',
    'マーケティング': 'marketing',
    'デザイン思考': 'design_thinking',
    '結論ファースト': 'conclusion_first',
    'mece': 'mece_thinking',
    'ソーワット': 'so_what_why_so',
    '3c分析': '3c_analysis',
    'カスタマージャーニー': 'customer_journey_mapping',
    '基礎': 'basics',
    '実践': 'practice', 
    '応用': 'advanced',
    '活用': 'application',
    '理解': 'understanding',
    '体験': 'experience'
  }

  let finalId = baseId
  for (const [japanese, english] of Object.entries(translations)) {
    if (title.includes(japanese)) {
      finalId = english
      break
    }
  }

  return finalId
}

// テーマ作成（POST）
export async function POST(request: NextRequest) {
  try {
    // 認証確認
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const body: ThemeCreateRequest = await request.json()
    const { genre_id, title, description, estimated_minutes, display_order, reward_card_data } = body

    // 必須フィールド検証
    if (!genre_id || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: genre_id, title, description' },
        { status: 400 }
      )
    }

    // ジャンル存在確認
    const { data: genre, error: genreError } = await supabaseAdmin
      .from('learning_genres')
      .select('id')
      .eq('id', genre_id)
      .single()

    if (genreError || !genre) {
      return NextResponse.json(
        { error: `Genre not found: ${genre_id}` },
        { status: 404 }
      )
    }

    // ID生成ヘルパー関数を使用して適切なIDを生成
    const { generateUniqueId } = await import('@/lib/id-generation-helper')
    const themeId = await generateUniqueId('theme', title)

    // テーマ作成
    const themeData = {
      id: themeId,
      genre_id,
      title,
      description,
      estimated_minutes: estimated_minutes || 15,
      display_order: display_order || 0,
      reward_card_data: reward_card_data || null
    }

    const { data: newTheme, error: insertError } = await supabaseAdmin
      .from('learning_themes')
      .insert([themeData])
      .select()
      .single()

    if (insertError) {
      console.error('Theme insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create theme', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      theme: newTheme,
      message: `Theme created: ${themeId}`
    })

  } catch (error) {
    console.error('Theme creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// テーマ一覧取得（GET）
export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const { userId } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const genre_id = searchParams.get('genre_id')

    let query = supabaseAdmin
      .from('learning_themes')
      .select(`
        *,
        learning_genres!inner(id, title, course_id)
      `)
      .order('display_order', { ascending: true })

    if (genre_id) {
      query = query.eq('genre_id', genre_id)
    }

    const { data: themes, error } = await query

    if (error) {
      console.error('Themes fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch themes', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      themes: themes || []
    })

  } catch (error) {
    console.error('Themes GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// テーマ更新（PATCH）
export async function PATCH(request: NextRequest) {
  try {
    // 認証確認
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const body: ThemeUpdateRequest & { id: string } = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // 更新データから undefined を除去
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const { data: updatedTheme, error: updateError } = await supabaseAdmin
      .from('learning_themes')
      .update({
        ...cleanUpdateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Theme update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update theme', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedTheme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      theme: updatedTheme,
      message: `Theme updated: ${id}`
    })

  } catch (error) {
    console.error('Theme PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}