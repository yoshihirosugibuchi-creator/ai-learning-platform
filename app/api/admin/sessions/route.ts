import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

interface SessionCreateRequest {
  theme_id: string
  title: string
  estimated_minutes?: number
  session_type: 'knowledge' | 'practice' | 'case_study'
  display_order?: number
}

interface SessionUpdateRequest {
  title?: string
  estimated_minutes?: number
  session_type?: 'knowledge' | 'practice' | 'case_study'
  display_order?: number
}

// ID生成関数（既存パターンに合わせた英数記号）
const _generateSessionId = (title: string, theme_id: string, session_type: string): string => {
  const baseId = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 15)

  // 日本語→英語変換マップ
  const translations: { [key: string]: string } = {
    'aiツール': 'ai_tools',
    'プロンプト': 'prompt', 
    'データ分析': 'data_analysis',
    'マーケティング': 'marketing',
    'デザイン思考': 'design_thinking',
    '結論ファースト': 'conclusion_first',
    'mece': 'mece',
    'ソーワット': 'so_what',
    '3c分析': '3c',
    'カスタマージャーニー': 'customer_journey',
    '基礎': 'basics',
    '実践': 'practice', 
    '応用': 'advanced',
    '活用': 'application',
    '理解': 'understanding',
    '体験': 'experience',
    'マスタリー': 'mastery'
  }

  let finalId = baseId
  for (const [japanese, english] of Object.entries(translations)) {
    if (title.includes(japanese)) {
      finalId = english
      break
    }
  }

  // session_typeに基づいてサフィックス追加
  const typeSuffix: Record<string, string> = {
    'knowledge': '_basics',
    'practice': '_practice', 
    'case_study': '_application'
  }

  // 既存のサフィックスがない場合のみ追加
  if (!finalId.includes('_basics') && !finalId.includes('_practice') && !finalId.includes('_application')) {
    finalId += typeSuffix[session_type] || ''
  }

  return finalId
}

// セッション作成（POST）
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

    const body: SessionCreateRequest = await request.json()
    const { theme_id, title, estimated_minutes, session_type, display_order } = body

    // デバッグログ
    console.log('🔍 [AdminSessions] Request body:', {
      theme_id, title, estimated_minutes, session_type, display_order,
      theme_id_type: typeof theme_id,
      title_type: typeof title,
      session_type_type: typeof session_type
    })

    // 必須フィールド検証
    if (!theme_id || !title || !session_type) {
      console.error('❌ [AdminSessions] Missing fields:', { theme_id, title, session_type })
      return NextResponse.json(
        { error: 'Missing required fields: theme_id, title, session_type' },
        { status: 400 }
      )
    }

    // session_type検証（Phase1-3対応）
    const validSessionTypes = ['knowledge', 'practice', 'case_study', 'review', 'assessment']
    if (!validSessionTypes.includes(session_type)) {
      return NextResponse.json(
        { error: `Invalid session_type. Must be one of: ${validSessionTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // テーマ存在確認
    const { data: theme, error: themeError } = await supabaseAdmin
      .from('learning_themes')
      .select('id')
      .eq('id', theme_id)
      .single()

    if (themeError || !theme) {
      return NextResponse.json(
        { error: `Theme not found: ${theme_id}` },
        { status: 404 }
      )
    }

    // ID生成ヘルパー関数を使用して適切なIDを生成
    const { generateUniqueId } = await import('@/lib/id-generation-helper')
    const sessionId = await generateUniqueId('session', title)

    // セッション作成
    const sessionData = {
      id: sessionId,
      theme_id,
      title,
      estimated_minutes: estimated_minutes || 5,
      session_type,
      display_order: display_order || 0
    }

    const { data: newSession, error: insertError } = await supabaseAdmin
      .from('learning_sessions')
      .insert([sessionData])
      .select()
      .single()

    if (insertError) {
      console.error('Session insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create session', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      session: newSession,
      message: `Session created: ${sessionId}`
    })

  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// セッション一覧取得（GET）
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
    const theme_id = searchParams.get('theme_id')

    let query = supabaseAdmin
      .from('learning_sessions')
      .select(`
        *,
        learning_themes!inner(id, title, genre_id)
      `)
      .order('display_order', { ascending: true })

    if (theme_id) {
      query = query.eq('theme_id', theme_id)
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Sessions fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      sessions: sessions || []
    })

  } catch (error) {
    console.error('Sessions GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// セッション更新（PATCH）
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

    const body: SessionUpdateRequest & { id: string } = await request.json()
    const { id, session_type, ...otherUpdateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // session_type検証
    if (session_type) {
      const validSessionTypes = ['knowledge', 'practice', 'case_study']
      if (!validSessionTypes.includes(session_type)) {
        return NextResponse.json(
          { error: `Invalid session_type. Must be one of: ${validSessionTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // 更新データから undefined を除去
    const updateData = { 
      ...otherUpdateData, 
      ...(session_type && { session_type }) 
    }
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('learning_sessions')
      .update({
        ...cleanUpdateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Session update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update session', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      session: updatedSession,
      message: `Session updated: ${id}`
    })

  } catch (error) {
    console.error('Session PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}